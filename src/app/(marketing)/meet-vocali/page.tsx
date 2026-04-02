import type { Metadata } from "next";

import { MeetVocaliPage } from "@/features/landing/components/meet-vocali-page";

export const metadata: Metadata = {
  title: "Meet Vocali — AI Therapy App Builder",
  description:
    "Vocali is an AI-powered app builder made for speech therapists, ABA therapists, and parents of autistic children. Describe the therapy tool you need — Vocali builds it in seconds.",
};

export default function Page() {
  return <MeetVocaliPage />;
}
