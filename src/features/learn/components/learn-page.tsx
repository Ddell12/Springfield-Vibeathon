import { ForParents } from "./for-parents";
import { HowVocaliHelps } from "./how-vocali-helps";
import { LearnCta } from "./learn-cta";
import { LearnHero } from "./learn-hero";
import { TherapyApproaches } from "./therapy-approaches";
import { WhatIsSpeechTherapy } from "./what-is-speech-therapy";

export function LearnPage() {
  return (
    <div className="bg-canvas font-body text-on-surface min-h-screen">
      <LearnHero />
      <WhatIsSpeechTherapy />
      <HowVocaliHelps />
      <TherapyApproaches />
      <ForParents />
      <LearnCta />
    </div>
  );
}
