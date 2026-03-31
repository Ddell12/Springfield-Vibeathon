const benefits = [
  {
    number: "01",
    heading: "Describe it in plain language",
    body: 'Skip the coding. Tell Bridges what you need: "An AAC board for food requests with 20 core words and Fitzgerald colors." The AI speaks therapy.',
  },
  {
    number: "02",
    heading: "Get a working app in seconds",
    body: "Bridges builds a fully interactive React app with your custom vocabulary, symbols, TTS voices, and layout — ready to use in session or send home.",
  },
  {
    number: "03",
    heading: "Customize and share",
    body: "Adjust vocabulary, colors, and layout. Publish a link your client's family can open on any device — no app store, no downloads.",
  },
  {
    number: "04",
    heading: "Build a library for your caseload",
    body: "Save apps per client, reuse templates across sessions, and track what you've built. Your entire digital toolkit, organized.",
  },
];

export function HowBridgesHelps() {
  return (
    <section className="bg-surface px-6 py-20">
      <div className="mx-auto max-w-[1120px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-on-surface-variant mb-3">
              How It Works
            </p>
            <h2 className="font-headline font-normal text-4xl md:text-[2.5rem] leading-[1.2] tracking-[-0.02em] text-on-surface mb-6">
              AI that speaks therapy language
            </h2>
            <p className="text-on-surface-variant text-lg leading-relaxed">
              SLPs spend hours building materials — picture boards, social
              stories, drill apps. Bridges turns a plain-language description
              into a working interactive app. No design skills needed. No
              subscription per tool.
            </p>
          </div>
          <div className="flex flex-col gap-8">
            {benefits.map(({ number, heading, body }) => (
              <div key={number} className="flex gap-5">
                <span className="font-mono text-sm text-primary/60 font-medium mt-0.5 shrink-0 w-6">
                  {number}
                </span>
                <div>
                  <h3 className="font-semibold text-on-surface text-base mb-1">
                    {heading}
                  </h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
