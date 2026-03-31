import { ForParents } from "./for-parents";
import { HowBridgesHelps } from "./how-bridges-helps";
import { LearnCta } from "./learn-cta";
import { LearnHero } from "./learn-hero";
import { TherapyApproaches } from "./therapy-approaches";
import { WhatIsSpeechTherapy } from "./what-is-speech-therapy";

export function LearnPage() {
  return (
    <div className="bg-canvas font-body text-on-surface min-h-screen">
      <LearnHero />
      <WhatIsSpeechTherapy />
      <HowBridgesHelps />
      <TherapyApproaches />
      <ForParents />
      <LearnCta />
    </div>
  );
}
