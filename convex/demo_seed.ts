import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

/**
 * Seeds a complete demo dataset for two pre-created Clerk users.
 *
 * Run via: npx tsx scripts/seed-demo.ts
 *   or:    npx convex run demo_seed:seedDemoData \
 *            '{"slpUserId":"...","caregiverUserId":"...","caregiverEmail":"..."}'
 *
 * Pass reset:true to wipe the SLP's existing data and reseed from scratch.
 */
export const seedDemoData = internalMutation({
  args: {
    slpUserId: v.string(),
    caregiverUserId: v.string(),
    caregiverEmail: v.string(),
    reset: v.optional(v.boolean()),
  },
  handler: async (ctx, { slpUserId, caregiverUserId, caregiverEmail, reset }) => {
    // ─── Idempotency / Reset ────────────────────────────────────────────────

    const existingPatient = await ctx.db
      .query("patients")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", slpUserId))
      .first();

    if (existingPatient && !reset) {
      return { status: "skipped", reason: "Demo data already seeded. Pass reset:true to wipe and reseed." };
    }

    if (existingPatient && reset) {
      // Delete all patients belonging to this SLP (cascades everything below)
      const patients = await ctx.db
        .query("patients")
        .withIndex("by_slpUserId", (q) => q.eq("slpUserId", slpUserId))
        .collect();

      for (const patient of patients) {
        const pid = patient._id;

        // Delete all child documents in dependency order
        for (const row of await ctx.db.query("progressData").withIndex("by_patientId_date", (q) => q.eq("patientId", pid)).collect())
          await ctx.db.delete(row._id);
        for (const row of await ctx.db.query("practiceLog").withIndex("by_patientId_date", (q) => q.eq("patientId", pid)).collect())
          await ctx.db.delete(row._id);
        for (const row of await ctx.db.query("goals").withIndex("by_patientId", (q) => q.eq("patientId", pid)).collect())
          await ctx.db.delete(row._id);
        for (const row of await ctx.db.query("homePrograms").withIndex("by_patientId", (q) => q.eq("patientId", pid)).collect())
          await ctx.db.delete(row._id);
        for (const row of await ctx.db.query("sessionNotes").withIndex("by_patientId_sessionDate", (q) => q.eq("patientId", pid)).collect())
          await ctx.db.delete(row._id);
        for (const row of await ctx.db.query("appointments").withIndex("by_patientId", (q) => q.eq("patientId", pid)).collect())
          await ctx.db.delete(row._id);
        for (const row of await ctx.db.query("meetingRecords").withIndex("by_patientId", (q) => q.eq("patientId", pid)).collect())
          await ctx.db.delete(row._id);
        for (const row of await ctx.db.query("patientMaterials").withIndex("by_patientId", (q) => q.eq("patientId", pid)).collect())
          await ctx.db.delete(row._id);
        for (const row of await ctx.db.query("patientMessages").withIndex("by_patientId_timestamp", (q) => q.eq("patientId", pid)).collect())
          await ctx.db.delete(row._id);
        for (const row of await ctx.db.query("activityLog").withIndex("by_patientId_timestamp", (q) => q.eq("patientId", pid)).collect())
          await ctx.db.delete(row._id);
        for (const row of await ctx.db.query("caregiverLinks").withIndex("by_patientId", (q) => q.eq("patientId", pid)).collect())
          await ctx.db.delete(row._id);
        for (const row of await ctx.db.query("childApps").withIndex("by_patientId", (q) => q.eq("patientId", pid)).collect())
          await ctx.db.delete(row._id);
        for (const row of await ctx.db.query("progressReports").withIndex("by_patientId", (q) => q.eq("patientId", pid)).collect())
          await ctx.db.delete(row._id);

        await ctx.db.delete(pid);
      }

      // Wipe SLP availability
      for (const row of await ctx.db.query("availability").withIndex("by_slpId", (q) => q.eq("slpId", slpUserId)).collect())
        await ctx.db.delete(row._id);

      // Wipe SLP notifications
      for (const row of await ctx.db.query("notifications").withIndex("by_userId", (q) => q.eq("userId", slpUserId)).collect())
        await ctx.db.delete(row._id);
      for (const row of await ctx.db.query("notifications").withIndex("by_userId", (q) => q.eq("userId", caregiverUserId)).collect())
        await ctx.db.delete(row._id);

      // Wipe SLP sessions + apps
      for (const row of await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", slpUserId)).collect()) {
        for (const file of await ctx.db.query("files").withIndex("by_session", (q) => q.eq("sessionId", row._id)).collect())
          await ctx.db.delete(file._id);
        for (const msg of await ctx.db.query("messages").withIndex("by_session", (q) => q.eq("sessionId", row._id)).collect())
          await ctx.db.delete(msg._id);
        for (const app of await ctx.db.query("apps").withIndex("by_session", (q) => q.eq("sessionId", row._id)).collect())
          await ctx.db.delete(app._id);
        await ctx.db.delete(row._id);
      }

      console.log("  ↺  Existing demo data wiped.");
    }

    // ─── Time helpers ───────────────────────────────────────────────────────

    const now = Date.now();
    const DAY = 86_400_000;

    /** ISO date string offset by ms from now */
    const ds = (msOffset: number) =>
      new Date(now + msOffset).toISOString().split("T")[0];

    // ─── PATIENTS ───────────────────────────────────────────────────────────

    const patientAId = await ctx.db.insert("patients", {
      slpUserId,
      firstName: "Ace",
      lastName: "Rivera",
      dateOfBirth: "2019-06-15",
      diagnosis: "articulation",
      status: "active",
      communicationLevel: "single-words",
      interests: ["dinosaurs", "bubbles", "cars"],
      sensoryNotes: "Sensitive to loud sounds and bright lights. Prefers a calm, predictable environment.",
      behavioralNotes: "Responds well to visual supports, specific praise, and short task intervals (5–8 min).",
      notes: "Making strong progress on /s/ sounds since January. Highly motivated by dinosaur themes.",
      parentEmail: caregiverEmail,
    });

    const patientBId = await ctx.db.insert("patients", {
      slpUserId,
      firstName: "Maya",
      lastName: "Chen",
      dateOfBirth: "2018-03-22",
      diagnosis: "language",
      status: "on-hold",
      communicationLevel: "phrases",
      interests: ["music", "dogs", "drawing"],
      notes: "On hold pending insurance authorization renewal. Expected to resume next month.",
    });

    // ─── CAREGIVER LINK ─────────────────────────────────────────────────────

    // SHA-256("1234") — hardcoded so demo PIN is always 1234
    const PIN_HASH =
      "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";

    await ctx.db.insert("caregiverLinks", {
      patientId: patientAId,
      caregiverUserId,
      email: caregiverEmail,
      inviteToken: "demo-token-ace-rivera-0001",
      inviteStatus: "accepted",
      relationship: "parent",
      kidModePIN: PIN_HASH,
    });

    // ─── GOALS ──────────────────────────────────────────────────────────────

    const goal1Id = await ctx.db.insert("goals", {
      patientId: patientAId,
      slpUserId,
      domain: "articulation",
      shortDescription: "/s/ in initial position",
      fullGoalText:
        "Ace will produce /s/ in the initial position of words with 80% accuracy across 3 consecutive sessions, given minimal verbal cues, as measured by clinician data.",
      targetAccuracy: 80,
      targetConsecutiveSessions: 3,
      status: "active",
      startDate: ds(-28 * DAY),
      targetDate: ds(60 * DAY),
    });

    const goal2Id = await ctx.db.insert("goals", {
      patientId: patientAId,
      slpUserId,
      domain: "language-expressive",
      shortDescription: "2-word combinations",
      fullGoalText:
        "Ace will spontaneously produce 2-word combinations to request and comment during structured play activities with 70% accuracy across 3 consecutive sessions.",
      targetAccuracy: 70,
      targetConsecutiveSessions: 3,
      status: "active",
      startDate: ds(-28 * DAY),
      targetDate: ds(90 * DAY),
    });

    const goal3Id = await ctx.db.insert("goals", {
      patientId: patientAId,
      slpUserId,
      domain: "articulation",
      shortDescription: "/r/ in all positions",
      fullGoalText:
        "Ace will produce /r/ in all word positions with 90% accuracy across 3 consecutive sessions, independently, as measured by clinician data.",
      targetAccuracy: 90,
      targetConsecutiveSessions: 3,
      status: "met",
      startDate: ds(-90 * DAY),
      targetDate: ds(-7 * DAY),
      notes: "Goal met on March 23. Excellent progress — discharge from /r/ target.",
    });

    // ─── PROGRESS DATA ──────────────────────────────────────────────────────

    // Goal 1 (/s/): 6 sessions over 25 days, 42% → 78% (approaching target)
    const g1Data: Array<[number, number, "independent" | "verbal-cue" | "model"]> = [
      [42, 20, "model"],
      [51, 20, "verbal-cue"],
      [58, 20, "verbal-cue"],
      [65, 20, "verbal-cue"],
      [72, 20, "independent"],
      [78, 20, "independent"],
    ];
    for (let i = 0; i < g1Data.length; i++) {
      const [acc, trials, prompt] = g1Data[i];
      const daysAgo = (g1Data.length - 1 - i) * 5;
      await ctx.db.insert("progressData", {
        goalId: goal1Id,
        patientId: patientAId,
        source: "session-note",
        date: ds(-daysAgo * DAY),
        trials,
        correct: Math.round((acc / 100) * trials),
        accuracy: acc,
        promptLevel: prompt,
        timestamp: now - daysAgo * DAY,
      });
    }

    // Goal 2 (2-word): 6 sessions over 25 days, 35% → 65%
    const g2Data: Array<[number, number, "independent" | "verbal-cue" | "model"]> = [
      [35, 15, "model"],
      [44, 15, "model"],
      [50, 15, "verbal-cue"],
      [55, 15, "verbal-cue"],
      [60, 15, "verbal-cue"],
      [65, 15, "verbal-cue"],
    ];
    for (let i = 0; i < g2Data.length; i++) {
      const [acc, trials, prompt] = g2Data[i];
      const daysAgo = (g2Data.length - 1 - i) * 5;
      await ctx.db.insert("progressData", {
        goalId: goal2Id,
        patientId: patientAId,
        source: "session-note",
        date: ds(-daysAgo * DAY),
        trials,
        correct: Math.round((acc / 100) * trials),
        accuracy: acc,
        promptLevel: prompt,
        timestamp: now - daysAgo * DAY,
      });
    }

    // Goal 3 (/r/ met): 4 entries ending at 92%
    const g3Data: Array<[number, number, "independent" | "verbal-cue"]> = [
      [68, 25, "verbal-cue"],
      [78, 25, "verbal-cue"],
      [88, 25, "independent"],
      [92, 25, "independent"],
    ];
    for (let i = 0; i < g3Data.length; i++) {
      const [acc, trials, prompt] = g3Data[i];
      const daysAgo = (3 - i) * 7 + 7;
      await ctx.db.insert("progressData", {
        goalId: goal3Id,
        patientId: patientAId,
        source: "session-note",
        date: ds(-daysAgo * DAY),
        trials,
        correct: Math.round((acc / 100) * trials),
        accuracy: acc,
        promptLevel: prompt,
        timestamp: now - daysAgo * DAY,
      });
    }

    // ─── HOME PROGRAMS ──────────────────────────────────────────────────────

    const hp1Id = await ctx.db.insert("homePrograms", {
      patientId: patientAId,
      slpUserId,
      title: "/s/ Sound Practice",
      instructions:
        "Practice /s/ at the beginning of words with the speech coach. Say each word 3 times clearly. Great targets: sun, sock, sit, seal, soup, sand. Reward with 5 bubbles after 10 correct!",
      goalId: goal1Id,
      frequency: "daily",
      status: "active",
      startDate: ds(-21 * DAY),
      type: "speech-coach",
      speechCoachConfig: {
        targetSounds: ["s"],
        ageRange: "5-7",
        defaultDurationMinutes: 5,
      },
    });

    const hp2Id = await ctx.db.insert("homePrograms", {
      patientId: patientAId,
      slpUserId,
      title: "Minimal Pairs: S vs Sh",
      instructions:
        "Use the minimal pairs cards to practice distinguishing /s/ vs /sh/. Examples: sun/shun, sock/shock, sip/ship. Do 2 rounds of 10 cards, 3 times this week.",
      goalId: goal1Id,
      frequency: "3x-week",
      status: "active",
      startDate: ds(-14 * DAY),
      type: "standard",
    });

    // ─── PRACTICE LOG ───────────────────────────────────────────────────────

    // 5 consecutive days of practice on HP1 — this gives the streak tracker data
    const hp1Logs = [
      { daysAgo: 4, duration: 5, confidence: 3, notes: undefined },
      { daysAgo: 3, duration: 5, confidence: 4, notes: undefined },
      { daysAgo: 2, duration: 6, confidence: 3, notes: undefined },
      { daysAgo: 1, duration: 5, confidence: 4, notes: undefined },
      { daysAgo: 0, duration: 5, confidence: 5, notes: "He got 8/10 today — really focused!" },
    ];
    for (const { daysAgo, duration, confidence, notes } of hp1Logs) {
      await ctx.db.insert("practiceLog", {
        homeProgramId: hp1Id,
        patientId: patientAId,
        caregiverUserId,
        date: ds(-daysAgo * DAY),
        duration,
        confidence,
        notes,
        timestamp: now - daysAgo * DAY + 18 * 3_600_000, // ~6 PM
      });
    }

    // 2 entries for HP2 (3x/week schedule)
    await ctx.db.insert("practiceLog", {
      homeProgramId: hp2Id,
      patientId: patientAId,
      caregiverUserId,
      date: ds(-3 * DAY),
      duration: 10,
      confidence: 3,
      timestamp: now - 3 * DAY + 16 * 3_600_000,
    });
    await ctx.db.insert("practiceLog", {
      homeProgramId: hp2Id,
      patientId: patientAId,
      caregiverUserId,
      date: ds(-1 * DAY),
      duration: 10,
      confidence: 4,
      notes: "He really liked the sock/shock cards!",
      timestamp: now - 1 * DAY + 16 * 3_600_000,
    });

    // ─── PATIENT MESSAGES ───────────────────────────────────────────────────

    const messages = [
      {
        senderUserId: slpUserId,
        senderRole: "slp" as const,
        content: "Hi! Just a note — Ace did really well with /s/ during today's session. Keep up the daily practice at home, it's making a big difference! 🦕",
        timestamp: now - 3 * DAY,
        readAt: now - 3 * DAY + 3_600_000,
      },
      {
        senderUserId: caregiverUserId,
        senderRole: "caregiver" as const,
        content: "Thank you! He's been asking to do the speech coach app before dinner every night — absolutely loves it.",
        timestamp: now - 3 * DAY + 7_200_000,
        readAt: now - 2 * DAY,
      },
      {
        senderUserId: slpUserId,
        senderRole: "slp" as const,
        content: "That's wonderful to hear! I've updated the home program with some new /s/ blend targets (st-, sp-) for this week. Let me know if you have any questions.",
        timestamp: now - 1 * DAY,
        readAt: undefined, // unread — shows notification badge for caregiver
      },
      {
        senderUserId: slpUserId,
        senderRole: "slp" as const,
        content: "Also, I just posted the session notes from Tuesday — they include a progress summary and a plan for next session. Feel free to review when you get a chance.",
        timestamp: now - 2 * 3_600_000,
        readAt: undefined, // unread
      },
    ];
    for (const { readAt, ...rest } of messages) {
      await ctx.db.insert("patientMessages", {
        patientId: patientAId,
        ...rest,
        ...(readAt !== undefined ? { readAt } : {}),
      });
    }

    // ─── AVAILABILITY ────────────────────────────────────────────────────────
    //
    // Required for caregiver booking page — getAvailableSlots returns [] without this.

    for (const [dayOfWeek, endTime] of [
      [1, "17:00"],
      [2, "17:00"],
      [3, "17:00"],
      [4, "17:00"],
      [5, "12:00"], // Friday half-day
    ] as Array<[number, string]>) {
      await ctx.db.insert("availability", {
        slpId: slpUserId,
        dayOfWeek,
        startTime: "09:00",
        endTime,
        isRecurring: true,
        timezone: "America/Chicago",
      });
    }

    // ─── APPOINTMENTS ────────────────────────────────────────────────────────

    const LIVEKIT_ROOM = "bridges-demo-ace-rivera";

    // A: Scheduled (2 days from now) — caregiver can cancel, SLP can start
    const apptScheduledId = await ctx.db.insert("appointments", {
      slpId: slpUserId,
      patientId: patientAId,
      caregiverId: caregiverUserId,
      scheduledAt: now + 2 * DAY + 10 * 3_600_000,
      duration: 30,
      status: "scheduled",
      livekitRoom: LIVEKIT_ROOM,
      joinLink: "placeholder",
      timezone: "America/Chicago",
    });
    await ctx.db.patch(apptScheduledId, {
      joinLink: `/sessions/${apptScheduledId}/call`,
    });

    // B: Completed (3 days ago) — has meeting record + AI notes
    const apptCompletedId = await ctx.db.insert("appointments", {
      slpId: slpUserId,
      patientId: patientAId,
      caregiverId: caregiverUserId,
      scheduledAt: now - 3 * DAY,
      duration: 45,
      status: "completed",
      livekitRoom: LIVEKIT_ROOM,
      joinLink: "placeholder",
      timezone: "America/Chicago",
    });
    await ctx.db.patch(apptCompletedId, {
      joinLink: `/sessions/${apptCompletedId}/call`,
    });

    // C: Cancelled (7 days ago) — shows cancelled badge in calendar
    const apptCancelledId = await ctx.db.insert("appointments", {
      slpId: slpUserId,
      patientId: patientAId,
      caregiverId: caregiverUserId,
      scheduledAt: now - 7 * DAY,
      duration: 30,
      status: "cancelled",
      cancelledBy: caregiverUserId,
      livekitRoom: LIVEKIT_ROOM,
      joinLink: "placeholder",
      notes: "Family emergency — rescheduled.",
      timezone: "America/Chicago",
    });
    await ctx.db.patch(apptCancelledId, {
      joinLink: `/sessions/${apptCancelledId}/call`,
    });

    // D: In-progress (started 20 min ago) — shows "Join" CTA
    const apptInProgressId = await ctx.db.insert("appointments", {
      slpId: slpUserId,
      patientId: patientAId,
      caregiverId: caregiverUserId,
      scheduledAt: now - 20 * 60_000,
      duration: 30,
      status: "in-progress",
      livekitRoom: LIVEKIT_ROOM,
      joinLink: "placeholder",
      timezone: "America/Chicago",
    });
    await ctx.db.patch(apptInProgressId, {
      joinLink: `/sessions/${apptInProgressId}/call`,
    });

    // ─── MEETING RECORD ──────────────────────────────────────────────────────
    //
    // Required for /sessions/[id]/notes to render content.

    const meetingRecordId = await ctx.db.insert("meetingRecords", {
      appointmentId: apptCompletedId,
      slpId: slpUserId,
      patientId: patientAId,
      duration: 43,
      status: "complete",
      transcript: [
        "Therapist: Okay Ace, let's start! Can you say 'sun'?",
        "Ace: Thun.",
        "Therapist: Good try! Let's use our /s/ sound — ssssun. Your turn.",
        "Ace: Ssssun! Sun!",
        "Therapist: Perfect! Two in a row! How about 'sock'?",
        "Ace: Shhhock... sock!",
        "Therapist: Great self-correction! That totally counts. Let's try 'seal'...",
        "Ace: Seal! Seal! Seal!",
        "Therapist: Wow, three times! You're on fire today.",
      ].join("\n"),
      aiSummary:
        "Ace demonstrated improved /s/ production in initial position with 78% accuracy (15/20 trials). Self-corrections were observed on 3 occasions, indicating emerging phonological awareness. 2-word combinations were elicited during play with 60% accuracy (7/12 trials). Motivation and engagement were high throughout.",
    });

    // ─── SESSION NOTES ───────────────────────────────────────────────────────

    // N1: Signed + AI-generated, linked to completed appointment — fully signed off
    await ctx.db.insert("sessionNotes", {
      patientId: patientAId,
      slpUserId,
      sessionDate: ds(-3 * DAY),
      sessionDuration: 45,
      sessionType: "teletherapy",
      status: "signed",
      structuredData: {
        targetsWorkedOn: [
          {
            target: "/s/ initial position",
            goalId: goal1Id as unknown as string,
            trials: 20,
            correct: 15,
            promptLevel: "independent",
            notes: "Self-corrections observed on 3 trials.",
          },
          {
            target: "2-word combinations in play",
            goalId: goal2Id as unknown as string,
            trials: 12,
            correct: 7,
            promptLevel: "verbal-cue",
          },
        ],
        behaviorNotes: "Excellent engagement throughout. Motivated by dinosaur sticker reward chart.",
        homeworkAssigned: "Continue daily /s/ Sound Practice app (5–10 min).",
        nextSessionFocus: "Introduce /s/ blends: st-, sp- at word level.",
      },
      soapNote: {
        subjective:
          "Parent reports Ace has been using the speech coach app daily and is 'obsessed with it.' No behavioral concerns noted this week.",
        objective:
          "Ace produced /s/ in initial position with 78% accuracy (15/20 trials), including 3 spontaneous self-corrections. 2-word combinations elicited with 60% accuracy (7/12 trials) with minimal verbal cueing.",
        assessment:
          "Ace continues to make measurable gains on /s/ production. Emerging self-monitoring is a positive prognostic indicator. 2-word combinations remain a developing area.",
        plan:
          "Advance /s/ targets to blend level (st-, sp-) next session. Continue reinforcing 2-word combinations across multiple contexts. Provide parent coaching on modeling 2-word utterances at home.",
      },
      aiGenerated: true,
      meetingRecordId,
      signedAt: now - 2 * DAY,
    });

    // N2: Complete (has SOAP, not yet signed) — tests the Sign button
    await ctx.db.insert("sessionNotes", {
      patientId: patientAId,
      slpUserId,
      sessionDate: ds(-10 * DAY),
      sessionDuration: 30,
      sessionType: "teletherapy",
      status: "complete",
      structuredData: {
        targetsWorkedOn: [
          {
            target: "/s/ initial position",
            goalId: goal1Id as unknown as string,
            trials: 20,
            correct: 13,
            promptLevel: "verbal-cue",
          },
        ],
        behaviorNotes: "Some distraction mid-session, redirected quickly with transition warning.",
        nextSessionFocus: "Increase /s/ trial count to 25. Introduce carrier phrases.",
      },
      soapNote: {
        subjective: "Parent reports 3 home practice sessions this week. Ace asked to do extra on Saturday.",
        objective:
          "Ace produced /s/ in initial position with 65% accuracy (13/20 trials) with verbal cues. No self-corrections noted.",
        assessment: "Steady upward progress. Approaching the 70% midpoint milestone.",
        plan: "Increase trial count to 25 next session. Introduce /s/ in carrier phrases (e.g., 'I see a ___').",
      },
      aiGenerated: false,
    });

    // N3: Draft — minimal data, tests the draft editing / AI generation flow
    await ctx.db.insert("sessionNotes", {
      patientId: patientAId,
      slpUserId,
      sessionDate: ds(-14 * DAY),
      sessionDuration: 30,
      sessionType: "in-person",
      status: "draft",
      structuredData: {
        targetsWorkedOn: [],
      },
      aiGenerated: false,
    });

    // ─── NOTIFICATIONS ───────────────────────────────────────────────────────

    await ctx.db.insert("notifications", {
      userId: slpUserId,
      type: "session-booked",
      title: "Session booked",
      body: "Jamie Rivera booked a 30-min session for Ace on " +
        new Date(now + 2 * DAY).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) + ".",
      link: `/sessions/${apptScheduledId}`,
      read: false,
      appointmentId: apptScheduledId,
    });

    await ctx.db.insert("notifications", {
      userId: slpUserId,
      type: "notes-ready",
      title: "Session notes ready",
      body: "AI-generated notes from Ace Rivera's session are ready to review and sign.",
      link: `/sessions/${apptCompletedId}/notes`,
      read: false,
      appointmentId: apptCompletedId,
    });

    await ctx.db.insert("notifications", {
      userId: caregiverUserId,
      type: "session-reminder",
      title: "Session tomorrow",
      body: "Reminder: Ace has a speech therapy session tomorrow at 10:00 AM CT.",
      link: `/sessions/${apptScheduledId}`,
      read: true,
      appointmentId: apptScheduledId,
    });

    // ─── BUILDER SESSIONS + APPS ─────────────────────────────────────────────

    const builderSession1Id = await ctx.db.insert("sessions", {
      userId: slpUserId,
      title: "Dinosaur Naming App",
      query: "Build a dinosaur naming flashcard game for preschoolers practicing initial consonant sounds",
      state: "live",
      patientId: patientAId,
      type: "builder",
    });

    const builderSession2Id = await ctx.db.insert("sessions", {
      userId: slpUserId,
      title: "Feelings Check-In Board",
      query: "Create a feelings identification board with 6 basic emotions, visual icons, and a text-to-speech button for each",
      state: "live",
      type: "builder",
    });

    const app1Id = await ctx.db.insert("apps", {
      title: "Dinosaur Naming App",
      description:
        "Interactive flashcard game for practicing initial consonant sounds with dinosaur-themed visuals. Tap each card to hear the word.",
      userId: slpUserId,
      sessionId: builderSession1Id,
      shareSlug: "dinosaur-naming-demo",
      previewUrl: `/api/tool/dinosaur-naming-demo`,
      createdAt: now - 7 * DAY,
      updatedAt: now - 7 * DAY,
    });

    const app2Id = await ctx.db.insert("apps", {
      title: "Feelings Check-In Board",
      description:
        "Visual feelings board with 6 core emotions (happy, sad, angry, scared, surprised, calm), illustrated icons, and TTS support.",
      userId: slpUserId,
      sessionId: builderSession2Id,
      shareSlug: "feelings-board-demo",
      previewUrl: `/api/tool/feelings-board-demo`,
      createdAt: now - 14 * DAY,
      updatedAt: now - 14 * DAY,
    });

    // ─── PATIENT MATERIALS ───────────────────────────────────────────────────

    await ctx.db.insert("patientMaterials", {
      patientId: patientAId,
      sessionId: builderSession1Id,
      appId: app1Id,
      assignedBy: slpUserId,
      assignedAt: now - 6 * DAY,
      notes: "Great for practicing /d/ and /n/ in initial position. Ace loves the dino theme!",
      goalId: goal1Id,
    });

    // ─── CHILD APPS (Kid Mode) ───────────────────────────────────────────────

    await ctx.db.insert("childApps", {
      patientId: patientAId,
      appId: app1Id,
      assignedBy: slpUserId,
      assignedByRole: "slp",
      label: "Dino Words",
      sortOrder: 1,
    });

    await ctx.db.insert("childApps", {
      patientId: patientAId,
      appId: app2Id,
      assignedBy: slpUserId,
      assignedByRole: "slp",
      label: "How Do I Feel?",
      sortOrder: 2,
    });

    // ─── ACTIVITY LOG ────────────────────────────────────────────────────────

    const activityEntries: Array<{
      action: Parameters<typeof ctx.db.insert<"activityLog">>[1]["action"];
      details?: string;
      daysAgo: number;
      actorUserId: string;
    }> = [
      { action: "patient-created", daysAgo: 28, actorUserId: slpUserId },
      { action: "invite-sent", details: caregiverEmail, daysAgo: 27, actorUserId: slpUserId },
      { action: "invite-accepted", daysAgo: 26, actorUserId: caregiverUserId },
      { action: "goal-created", details: "/s/ in initial position", daysAgo: 28, actorUserId: slpUserId },
      { action: "goal-created", details: "2-word combinations", daysAgo: 28, actorUserId: slpUserId },
      { action: "home-program-assigned", details: "/s/ Sound Practice", daysAgo: 21, actorUserId: slpUserId },
      { action: "home-program-assigned", details: "Minimal Pairs: S vs Sh", daysAgo: 14, actorUserId: slpUserId },
      { action: "material-assigned", details: "Dinosaur Naming App", daysAgo: 6, actorUserId: slpUserId },
      { action: "session-documented", daysAgo: 3, actorUserId: slpUserId },
      { action: "session-signed", daysAgo: 2, actorUserId: slpUserId },
      { action: "goal-met", details: "/r/ in all positions", daysAgo: 7, actorUserId: slpUserId },
      { action: "practice-logged", daysAgo: 1, actorUserId: caregiverUserId },
      { action: "message-sent", daysAgo: 1, actorUserId: slpUserId },
    ];

    for (const { action, details, daysAgo, actorUserId } of activityEntries) {
      await ctx.db.insert("activityLog", {
        patientId: patientAId,
        actorUserId,
        action,
        ...(details ? { details } : {}),
        timestamp: now - daysAgo * DAY,
      });
    }

    // ─── Done ────────────────────────────────────────────────────────────────

    return {
      status: "seeded",
      credentials: {
        slp: { note: "See scripts/seed-demo.ts for login info" },
        caregiver: { note: "See scripts/seed-demo.ts for login info" },
        kidModePIN: "1234",
      },
      patients: { aceRivera: patientAId, mayaChen: patientBId },
      goals: { sInitial: goal1Id, twoWordCombos: goal2Id, rAllPositions: goal3Id },
      appointments: {
        scheduled: apptScheduledId,
        completed: apptCompletedId,
        cancelled: apptCancelledId,
        inProgress: apptInProgressId,
      },
      homePrograms: { speechCoach: hp1Id, minimalPairs: hp2Id },
      apps: { dinoNaming: app1Id, feelingsBoard: app2Id },
      meetingRecord: meetingRecordId,
    };
  },
});
