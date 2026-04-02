import type { Metadata } from "next";

import { PlatformPage } from "@/features/landing/components/platform-page";

export const metadata: Metadata = {
  title: "Platform — Vocali",
  description:
    "Vocali uses Claude to generate complete, interactive therapy apps from plain-language descriptions. No code required. No templates to fight with.",
};

export default function Page() {
  return <PlatformPage />;
}
