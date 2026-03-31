import { MaterialIcon } from "@/shared/components/material-icon";

const FEATURES = [
  {
    icon: "auto_awesome",
    title: "AI App Builder",
    description: "Describe it in plain language, get a working therapy app",
  },
  {
    icon: "grid_view",
    title: "Template Library",
    description: "Start from proven therapy tools, customize to fit your needs",
  },
  {
    icon: "style",
    title: "Flashcard Creator",
    description: "Generate interactive flashcard decks with AI",
  },
  {
    icon: "record_voice_over",
    title: "Speech Coach",
    description: "Practice speech skills with an AI-powered coach",
  },
  {
    icon: "child_care",
    title: "Family Play Mode",
    description: "Kid-friendly interface with PIN-protected exit",
  },
];

export function ProductPreview() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="font-headline text-3xl md:text-[2rem] text-center text-on-surface mb-4">
          Every tool, built around your child.
        </h2>
        <p className="text-center text-on-surface-variant text-lg mb-12 max-w-2xl mx-auto">
          Bridges creates personalized therapy apps from a plain-language description — no two tools look the same, because no two kids are alike.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl bg-surface-container-lowest p-6 shadow-[0_4px_16px_rgba(25,28,32,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(25,28,32,0.08)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <MaterialIcon icon={feature.icon} className="text-primary text-2xl" />
              </div>
              <h3 className="font-body text-lg font-medium text-on-surface mb-2">{feature.title}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
