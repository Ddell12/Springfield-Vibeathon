const facts = [
  {
    icon: "child_care",
    heading: "Who it helps",
    body: "Children with autism, Down syndrome, apraxia, stuttering, language delays, hearing loss, or any condition affecting communication.",
  },
  {
    icon: "psychology",
    heading: "What SLPs do",
    body: "Speech-Language Pathologists assess, diagnose, and treat communication and swallowing disorders. They hold a master's degree and state licensure.",
  },
  {
    icon: "event_repeat",
    heading: "How sessions work",
    body: "Sessions are 30–60 minutes, one-on-one or in small groups. Goals are set collaboratively with families and tracked over time.",
  },
  {
    icon: "home",
    heading: "Beyond the clinic",
    body: "Generalization — using skills in real life — is the goal. Families practice techniques at home to reinforce what's learned in sessions.",
  },
];

export function WhatIsSpeechTherapy() {
  return (
    <section className="bg-surface px-6 py-20">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-on-surface-variant mb-3">
            The Basics
          </p>
          <h2 className="font-headline font-normal text-4xl md:text-[2.5rem] leading-[1.2] tracking-[-0.02em] text-on-surface max-w-xl">
            What is speech-language therapy?
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {facts.map(({ icon, heading, body }) => (
            <div
              key={heading}
              className="bg-canvas rounded-xl p-6"
            >
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
