import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeatureTabsSection } from "@/components/sections/FeatureTabsSection";
import { FeatureDetailCards } from "@/components/sections/FeatureDetailCards";
import { ShowcaseGrid } from "@/components/sections/ShowcaseGrid";
import { DemoVideoSection } from "@/components/sections/DemoVideoSection";
import { IntegrationGrid } from "@/components/sections/IntegrationGrid";
import { ApiSection } from "@/components/sections/ApiSection";
import { TrustBadgesSection } from "@/components/sections/TrustBadgesSection";
import { CtaSection } from "@/components/sections/CtaSection";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <FeatureTabsSection />
        <FeatureDetailCards />
        <ShowcaseGrid />
        <DemoVideoSection />
        <IntegrationGrid />
        <ApiSection />
        <TrustBadgesSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
