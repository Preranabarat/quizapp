
import HeroSection from "./components/landing-page/hero-section";
import GlowDashboardCard from "./components/landing-page/feature-section";
import GlowingGridBackground from "./components/ui/grid-bg";
import HowItsWork from "./components/landing-page/how-its-work";
import PricingCard from "./components/landing-page/pricing-card";

export default function Home() {
  return (
    <>
      <div className="fixed inset-0 -z-10">
        <GlowingGridBackground />
      </div>
      <HeroSection />
      <GlowDashboardCard />
      <HowItsWork />
      <PricingCard/>
    </>
  );
}
