import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { SocialProof } from "@/components/marketing/social-proof";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { CtaSection } from "@/components/marketing/cta-section";
import { BackgroundLayer } from "@/components/marketing/background-layer";

export default function HomePage() {
  return (
    <BackgroundLayer>
      <div className="relative z-10 pointer-events-none">
        <section id="hero" className="pointer-events-auto">
          <Hero />
        </section>
        <section id="social-proof" className="pointer-events-auto">
          <SocialProof />
        </section>
        <section id="how-it-works" className="pointer-events-auto">
          <HowItWorks />
        </section>
        <section id="features" className="pointer-events-auto">
          <FeaturesGrid />
        </section>
        <section id="pricing" className="pointer-events-auto">
          <PricingSection />
        </section>
        <section id="faq" className="pointer-events-auto">
          <FaqSection />
        </section>
        <section id="cta" className="pointer-events-auto">
          <CtaSection />
        </section>
      </div>
    </BackgroundLayer>
  );
}
