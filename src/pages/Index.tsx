import { CrazyHeader } from "@/components/crazy-hero/CrazyHeader";
import { CrazyHero } from "@/components/crazy-hero/CrazyHero";
import "@/components/crazy-hero/crazy-hero.css";

const Index = () => (
  <div className="crazy-page-shell">
    <CrazyHeader />
    <CrazyHero />
  </div>
);

export default Index;
