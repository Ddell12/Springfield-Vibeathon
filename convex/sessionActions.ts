"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

export const fetchAudio = internalAction({
  args: { meetingRecordId: v.id("meetingRecords") },
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.meetingRecords.updateStatus, {
        meetingRecordId: args.meetingRecordId,
        status: "transcribing",
      });

      await ctx.scheduler.runAfter(0, internal.sessionActions.transcribeAudio, {
        meetingRecordId: args.meetingRecordId,
      });
    } catch (error) {
      console.error("[fetchAudio] Failed:", error);
      await ctx.runMutation(internal.meetingRecords.updateStatus, {
        meetingRecordId: args.meetingRecordId,
        status: "failed",
      });
    }
  },
});

export const transcribeAudio = internalAction({
  args: { meetingRecordId: v.id("meetingRecords") },
  handler: async (ctx, args) => {
    try {
      const record = await ctx.runQuery(internal.meetingRecords.getInternal, {
        meetingRecordId: args.meetingRecordId,
      });
      if (!record || !record.audioFileId) {
        await ctx.runMutation(internal.meetingRecords.updateStatus, {
          meetingRecordId: args.meetingRecordId,
          status: "summarizing",
        });
        await ctx.scheduler.runAfter(0, internal.sessionActions.generateNotes, {
          meetingRecordId: args.meetingRecordId,
        });
        return;
      }

      const audioUrl = await ctx.storage.getUrl(record.audioFileId);
      if (!audioUrl) throw new Error("Audio file URL not found");

      const audioResponse = await fetch(audioUrl);
      const audioBuffer = await audioResponse.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });

      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
      if (!elevenLabsApiKey) throw new Error("ElevenLabs API key not configured");

      const formData = new FormData();
      formData.append("file", audioBlob, "session-audio.webm");
      formData.append("model_id", "scribe_v2");
      formData.append("language_code", "en");

      const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: { "xi-api-key": elevenLabsApiKey },
        body: formData,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`ElevenLabs STT error ${response.status}: ${body}`);
      }

      const data = (await response.json()) as { text: string };

      const transcriptBlob = new Blob([data.text], { type: "text/plain" });
      const transcriptFileId = await ctx.storage.store(transcriptBlob);

      await ctx.runMutation(internal.meetingRecords.updateStatus, {
        meetingRecordId: args.meetingRecordId,
        status: "summarizing",
        transcript: data.text,
        transcriptFileId,
      });

      await ctx.scheduler.runAfter(0, internal.sessionActions.generateNotes, {
        meetingRecordId: args.meetingRecordId,
      });
    } catch (error) {
      console.error("[transcribeAudio] Failed:", error);
      await ctx.runMutation(internal.meetingRecords.updateStatus, {
        meetingRecordId: args.meetingRecordId,
        status: "failed",
      });
    }
  },
});

export const generateNotes = internalAction({
  args: { meetingRecordId: v.id("meetingRecords") },
  handler: async (ctx, args) => {
    try {
      const record = await ctx.runQuery(internal.meetingRecords.getInternal, {
        meetingRecordId: args.meetingRecordId,
      });
      if (!record) throw new Error("Meeting record not found");

      const patient = await ctx.runQuery(internal.patients.getInternal, {
        patientId: record.patientId,
      });

      const goals = await ctx.runQuery(internal.goals.listByPatientInternal, {
        patientId: record.patientId,
      });

      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicApiKey) throw new Error("Anthropic API key not configured");

      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const anthropic = new Anthropic({ apiKey: anthropicApiKey });

      const patientName = patient
        ? `${patient.firstName} ${patient.lastName}`
        : "Patient";
      const patientAge = patient?.dateOfBirth
        ? `${Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years old`
        : "unknown age";
      const diagnosis = patient?.diagnosis ?? "not specified";
      const activeGoals =
        goals
          ?.filter((g) => g.status === "active")
          .map((g) => `${g.domain}: ${g.shortDescription}`)
          .join("\n  - ") || "none specified";

      const transcript = record.transcript || "No transcript available.";
      const interactionLog = record.interactionLog || "";

      const prompt = `Given this teletherapy session transcript between an SLP and a patient:
- Patient: ${patientName}, ${patientAge}, diagnosis: ${diagnosis}
- Active goals:
  - ${activeGoals}
${interactionLog ? `- Interactive content session data: ${interactionLog}` : ""}

Transcript:
${transcript}

Generate:
1. A concise meeting summary (3-5 bullet points)
2. A SOAP note draft:
   - Subjective: caregiver/patient reports from the conversation
   - Objective: observable behaviors, responses, accuracy noted
   - Assessment: progress toward goals mentioned
   - Plan: next steps discussed, homework assigned

Return as JSON:
{
  "summary": "bullet point summary",
  "soap": {
    "subjective": "...",
    "objective": "...",
    "assessment": "...",
    "plan": "..."
  }
}`;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text response from Claude");
      }
      const text = textBlock.text;

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Failed to parse AI response as JSON");

      const parsed = JSON.parse(jsonMatch[0]) as {
        summary: string;
        soap: { subjective: string; objective: string; assessment: string; plan: string };
      };

      const appointment = await ctx.runQuery(internal.appointments.getInternal, {
        appointmentId: record.appointmentId,
      });

      const soapNoteId = await ctx.runMutation(internal.sessionNotes.createFromMeeting, {
        patientId: record.patientId,
        slpUserId: record.slpId,
        sessionDate: new Date(appointment?.scheduledAt ?? Date.now()).toISOString().split("T")[0]!,
        sessionDuration: Math.max(5, Math.round(record.duration / 60)),
        soap: parsed.soap,
        meetingRecordId: args.meetingRecordId,
      });

      await ctx.runMutation(internal.meetingRecords.updateStatus, {
        meetingRecordId: args.meetingRecordId,
        status: "complete",
        aiSummary: parsed.summary,
        soapNoteId,
      });

      await ctx.runMutation(internal.notifications.createNotification, {
        userId: record.slpId,
        type: "notes-ready",
        title: "Session Notes Ready",
        body: `AI-generated notes for your session with ${patientName} are ready for review`,
        link: `/sessions/${record.appointmentId}/notes`,
        appointmentId: record.appointmentId,
      });
    } catch (error) {
      console.error("[generateNotes] Failed:", error);
      await ctx.runMutation(internal.meetingRecords.updateStatus, {
        meetingRecordId: args.meetingRecordId,
        status: "failed",
      });
    }
  },
});
