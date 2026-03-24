import { HeroSection } from "@/features/landing/components/hero-section";
import { HowItWorks } from "@/features/landing/components/how-it-works";
import { ProductPreview } from "@/features/landing/components/product-preview";
import { LandingFooter } from "@/features/landing/components/landing-footer";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <HowItWorks />
      <ProductPreview />
      <LandingFooter />
    </>
  );
}
