const approaches = [
  {
    badge: "AAC",
    heading: "Augmentative & Alternative Communication",
    body: "AAC encompasses any tool that helps someone communicate beyond speech — from picture boards and PECS books to high-tech speech-generating devices. It supplements or replaces spoken language for children who struggle to communicate verbally.",
    detail: "Bridges generates custom AAC apps with Fitzgerald color coding, motor-planning grids, and text-to-speech built in.",
  },
  {
    badge: "Core Vocabulary",
    heading: "Core + Fringe Vocabulary",
    body: "Core words (like 'more', 'go', 'want', 'stop') make up 80% of everything we say. Fringe words are topic-specific. Effective AAC teaches core words first, then expands into fringe.",
    detail: "Bridges apps can be built around core vocabulary grids, with fringe categories accessible from a single tap.",
  },
  {
    badge: "PECS",
    heading: "Picture Exchange Communication System",
    body: "PECS teaches children to initiate communication by exchanging a picture card for a desired item. It progresses through six phases from basic exchange to using sentence strips with attributes.",
    detail: "Bridges can generate PECS-style visual boards with custom photos and printable sentence strip layouts.",
  },
  {
    badge: "Social Narratives",
    heading: "Social Stories & Visual Supports",
    body: "Social stories describe social situations in a reassuring way to help children understand expectations and appropriate behavior. Visual schedules reduce anxiety by making routines predictable.",
    detail: "Bridges generates illustrated social stories and visual schedule apps in minutes — personalized to the child.",
  },
  {
    badge: "DTT",
    heading: "Discrete Trial Training",
    body: "DTT breaks skills into small, teachable components with clear antecedents, responses, and consequences. It uses structured repetition with data collection to track mastery.",
    detail: "Bridges can build interactive drill apps that present stimuli, record responses, and track progress across trials.",
  },
  {
    badge: "NLP",
    heading: "Naturalistic Language Paradigm",
    body: "NLP embeds language targets into natural routines and play. Instead of structured drills, the child leads the interaction and the therapist follows their interest to model language.",
    detail: "Bridges supports naturalistic practice with play-based interactive apps that embed language targets in activities children enjoy.",
  },
];

export function TherapyApproaches() {
  return (
    <section className="bg-canvas px-6 py-20">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-on-surface-variant mb-3">
            Evidence-Based Methods
          </p>
          <h2 className="font-headline font-normal text-4xl md:text-[2.5rem] leading-[1.2] tracking-[-0.02em] text-on-surface max-w-xl">
            Therapy approaches that work
          </h2>
          <p className="mt-4 text-on-surface-variant text-lg max-w-2xl">
            These are the methods SLPs use every day. Each has decades of
            research behind it — and Bridges can help you build tools that bring
            them to life.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {approaches.map(({ badge, heading, body, detail }) => (
            <div
              key={badge}
              className="bg-surface rounded-xl p-6 flex flex-col gap-4"
            >
              <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {badge}
              </span>
              <div>
                <h3 className="font-semibold text-on-surface text-base mb-2">
                  {heading}
                </h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {body}
                </p>
              </div>
              <p className="text-xs text-primary/80 font-medium mt-auto pt-3 border-t border-border">
                {detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
