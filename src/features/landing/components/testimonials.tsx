const testimonials = [
  {
    quote:
      "I described our morning routine in plain language and Bridges built a complete visual schedule in under a minute. My son now gets ready independently for the first time.",
    name: "Sarah M.",
    role: "Parent of a 7-year-old",
    avatar: "SM",
    color: "bg-primary-fixed text-on-primary-fixed",
  },
  {
    quote:
      "As an ABA therapist I've tried every tool out there. This is the first one that speaks my language. I built a token board with custom reinforcers in literally 30 seconds.",
    name: "Danielle R.",
    role: "Board Certified Behavior Analyst",
    avatar: "DR",
    color: "bg-secondary-fixed text-on-secondary-fixed",
  },
  {
    quote:
      "My daughter is non-verbal. Being able to describe what communication board she needs and have it built instantly changed our daily life completely.",
    name: "Marcus T.",
    role: "Parent of a 5-year-old",
    avatar: "MT",
    color: "bg-tertiary-fixed text-on-tertiary-fixed",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 md:py-28 px-6 max-w-7xl mx-auto">
      <div className="mb-16 text-center md:text-left">
        <h2 className="font-headline text-3xl md:text-4xl font-normal text-on-surface mb-4">
          Families &amp; Therapists Love Bridges
        </h2>
        <div className="h-1.5 w-24 bg-primary rounded-full mx-auto md:mx-0" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="bg-surface-container-lowest rounded-xl p-8 sanctuary-shadow flex flex-col gap-6"
          >
            <p className="text-on-surface-variant leading-relaxed text-sm italic flex-1">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${t.color}`}
              >
                {t.avatar}
              </div>
              <div>
                <p className="font-semibold text-on-surface text-sm">{t.name}</p>
                <p className="text-on-surface-variant text-xs">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
