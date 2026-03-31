const tips = [
  {
    icon: "repeat",
    heading: "Repetition is the point",
    body: "Skills learned in therapy need hundreds of practice opportunities. A 30-minute session is the seed — home practice is the water.",
  },
  {
    icon: "volume_up",
    heading: "Model, don't drill",
    body: 'Instead of asking "What do you want?", show the AAC device and say the word yourself first. Modeling takes pressure off and builds vocabulary naturally.',
  },
  {
    icon: "celebration",
    heading: "Celebrate approximations",
    body: "A child pointing at a picture, making a sound, or swiping toward a symbol is communication. Reinforce every attempt — not just perfect speech.",
  },
  {
    icon: "schedule",
    heading: "Predictable routines help",
    body: "Autistic children and those with language delays often thrive on predictability. Visual schedules and consistent language in routines reduce anxiety and build vocabulary.",
  },
  {
    icon: "group",
    heading: "You are the expert on your child",
    body: "Your SLP knows the evidence. You know your child. The best outcomes happen when families and therapists collaborate — share what motivates your child.",
  },
  {
    icon: "phone_iphone",
    heading: "AAC is not giving up on speech",
    body: "Research consistently shows that AAC does not reduce spoken language development — it often supports it. Communication first, in whatever form it takes.",
  },
];

export function ForParents() {
  return (
    <section className="bg-canvas px-6 py-20">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-on-surface-variant mb-3">
            For Families
          </p>
          <h2 className="font-headline font-normal text-4xl md:text-[2.5rem] leading-[1.2] tracking-[-0.02em] text-on-surface max-w-xl">
            Supporting your child between sessions
          </h2>
          <p className="mt-4 text-on-surface-variant text-lg max-w-2xl">
            You don&apos;t need to be a therapist to make a difference. Here&apos;s what
            the research says actually helps.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tips.map(({ icon, heading, body }) => (
            <div key={heading} className="bg-surface rounded-xl p-6">
              <span className="material-symbols-outlined text-primary text-2xl mb-4 block">
                {icon}
              </span>
              <h3 className="font-semibold text-on-surface text-base mb-2">
                {heading}
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
