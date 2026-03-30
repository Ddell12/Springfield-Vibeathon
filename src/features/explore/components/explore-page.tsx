import { ExploreHero } from "./explore-hero";
import { DemoToolGrid } from "./demo-tool-grid";
import { ExploreCtaSection } from "./explore-cta-section";

export function ExplorePage() {
  return (
    <div className="bg-surface font-body text-on-surface min-h-screen">
      <ExploreHero />
      <section className="max-w-7xl mx-auto px-6 pb-12">
        <DemoToolGrid />
      </section>
      <ExploreCtaSection />
    </div>
  );
}
