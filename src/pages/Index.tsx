import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { CrazyHeader } from "@/components/crazy-hero/CrazyHeader";
import { CrazyHero } from "@/components/crazy-hero/CrazyHero";
import "@/components/crazy-hero/crazy-hero.css";

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash !== "#categorias") return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById("categorias")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash]);

  return (
    <div className="crazy-page-shell">
      <CrazyHeader />
      <CrazyHero />
    </div>
  );
};

export default Index;
