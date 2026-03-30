const steps = [
  {
    number: "01",
    title: "Describe",
    description: (
      <>
        Tell Bridges what your child needs in everyday language.{" "}
        <span className="font-medium text-primary">
          &quot;A visual schedule for a trip to the dentist.&quot;
        </span>
      </>
    ),
  },
  {
    number: "02",
    title: "Build",
    description:
      "AI creates an interactive therapy app in seconds, complete with vetted icons and clear structures designed for cognitive clarity.",
  },
  {
    number: "03",
    title: "Share",
    description:
      "Use at home, school, or therapy — share with your team instantly via private link or high-quality printouts for physical use.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-surface-container-low py-20 md:py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-16 md:text-left">
          <h2 className="font-headline text-3xl md:text-[2rem] font-normal text-on-surface mb-4">
            How it Works
          </h2>
          <div className="h-1.5 w-24 bg-primary rounded-full mb-6" />
        </div>

        <div className="flex flex-col gap-12 md:gap-0 md:flex-row md:items-start md:justify-between">
          {steps.map((step, i) => (
            <div key={step.title} className="flex-1 flex items-start gap-5 md:flex-col md:items-start md:px-6 relative">
              {/* Connector line between steps (desktop only) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-3 left-[calc(50%+1rem)] w-[calc(100%-2rem)] h-px bg-border" />
              )}

              <span className="font-mono text-sm text-primary font-medium tracking-wider shrink-0 mt-0.5 md:mb-4">
                {step.number}
              </span>

              <div>
                <h3 className="text-xl font-medium font-body mb-2 text-on-surface">
                  {step.title}
                </h3>
                <p className="text-on-surface-variant leading-relaxed text-[15px]">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
