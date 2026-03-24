"use client";

import { SharedToolPage } from "@/features/shared-tool/components/shared-tool-page";

const mockTool = {
  title: "Emma's Feelings Board",
  description: "Tap an emoji to express how you're feeling today",
  config: {
    type: "communication-board" as const,
    title: "Emma's Feelings Board",
    sentenceStarter: "I FEEL...",
    cards: [
      { id: "1", label: "Happy", icon: "\u{1F60A}", category: "emotion" },
      { id: "2", label: "Sad", icon: "\u{1F622}", category: "emotion" },
      { id: "3", label: "Angry", icon: "\u{1F620}", category: "emotion" },
      { id: "4", label: "Tired", icon: "\u{1F634}", category: "emotion" },
      { id: "5", label: "Confused", icon: "\u{1F615}", category: "emotion" },
      { id: "6", label: "Excited", icon: "\u{1F929}", category: "emotion" },
      { id: "7", label: "Scared", icon: "\u{1F628}", category: "emotion" },
      { id: "8", label: "Loved", icon: "\u{1F970}", category: "emotion" },
    ],
    enableTTS: true,
    voiceId: "default",
    columns: 4,
  },
  creatorName: "Sarah Miller, LMFT",
  creatorSpecialty: "Child Psychology Specialist",
};

export default function SharedToolViewPage() {
  return <SharedToolPage tool={mockTool} />;
}
