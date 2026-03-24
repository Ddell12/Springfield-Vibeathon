import { HeroSection } from "@/features/landing/components/hero-section";
import { HowItWorks } from "@/features/landing/components/how-it-works";
import { LandingFooter } from "@/features/landing/components/landing-footer";
import { ProductPreview } from "@/features/landing/components/product-preview";

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
