import { MaterialIcon } from "@/shared/components/material-icon";

const steps = [
  {
    icon: "chat_bubble",
    title: "Describe",
    description: (
      <>
        Tell Bridges what your child needs in everyday language.{" "}
        <span className="font-medium text-primary">
          &quot;A visual schedule for a trip to the dentist.&quot;
        </span>
      </>
    ),
    bg: "bg-primary-fixed text-on-primary-fixed",
  },
  {
    icon: "auto_awesome",
    title: "Build",
    description:
      "AI creates an interactive therapy app in seconds, complete with vetted icons and clear structures designed for cognitive clarity.",
    bg: "bg-secondary-fixed text-on-secondary-fixed",
  },
  {
    icon: "share",
    title: "Share",
    description:
      "Use at home, school, or therapy — share with your team instantly via private link or high-quality printouts for physical use.",
    bg: "bg-tertiary-fixed text-on-tertiary-fixed",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-surface-container-low py-20 md:py-28 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 text-center md:text-left">
          <h2 className="font-headline text-3xl md:text-4xl font-normal text-on-surface mb-4">
            How it Works
          </h2>
          <div className="h-1.5 w-24 bg-primary rounded-full mb-6 mx-auto md:mx-0" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step) => (
            <div
              key={step.title}
              className="bg-surface-container-lowest rounded-xl p-8 sanctuary-shadow hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
            >
              <div
                className={`w-14 h-14 ${step.bg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
              >
                <MaterialIcon icon={step.icon} className="text-3xl" />
              </div>
              <h3 className="text-2xl font-medium font-headline mb-4 text-on-surface">
                {step.title}
              </h3>
              <p className="text-on-surface-variant leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
