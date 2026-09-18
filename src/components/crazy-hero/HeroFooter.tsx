import { Headphones, PackageCheck, ShieldCheck, UsersRound } from "lucide-react";

export function HeroFooter() {
  return (
    <footer className="crazy-hero-footer" aria-label="Resumo da plataforma">
      <div className="crazy-hero-footer__brand">
        <strong>CRAZZY <span>PROJECT</span></strong>
        <small>SOFTWARES PARA MILHARES DE JOGOS</small>
      </div>
      <div className="crazy-hero-footer__stats">
        <span><UsersRound aria-hidden="true" /><b>COMUNIDADE</b><small>Clientes e parceiros</small></span>
        <span><ShieldCheck aria-hidden="true" /><b>SEGURANÇA</b><small>Operações protegidas</small></span>
        <span><Headphones aria-hidden="true" /><b>SUPORTE</b><small>Atendimento dedicado</small></span>
        <span><PackageCheck aria-hidden="true" /><b>ENTREGA</b><small>Automática quando disponível</small></span>
      </div>
      <div className="crazy-hero-footer__community">
        <small>MAIS QUE JOGOS</small>
        <strong>UMA COMUNIDADE</strong>
      </div>
    </footer>
  );
}
