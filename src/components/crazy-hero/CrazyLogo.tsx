import { motion } from "framer-motion";
import { Download, Gauge, ShieldCheck, Unlock } from "lucide-react";

export function CrazyLogo() {
  return (
    <motion.div
      className="crazy-logo"
      initial={{ opacity: 0, scale: 0.94, filter: "blur(8px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="crazy-logo__main" aria-label="Crazzy Projet">
        <span className="crazy-logo__crazzy">CRAZZY</span>
        <span className="crazy-logo__project">PROJET</span>
      </div>
      <p className="crazy-logo__tagline">
        SOFTWARES PRA <strong>MILHARES</strong> DE JOGOS!
      </p>
      <div className="crazy-logo__features" aria-label="Destaques da plataforma">
        <span><Gauge aria-hidden="true" /> PERFORMANCE</span>
        <span><ShieldCheck aria-hidden="true" /> ESTABILIDADE</span>
        <span><Unlock aria-hidden="true" /> LIBERDADE</span>
        <span><Download aria-hidden="true" /> ENTREGA DIGITAL</span>
      </div>
      <div className="crazy-logo__microcopy" aria-hidden="true">
        <span>GAMES</span><i /> <span>PERFORMANCE</span><i /> <span>LIBERDADE</span><i /> <span>SEM LIMITES</span>
      </div>
    </motion.div>
  );
}
