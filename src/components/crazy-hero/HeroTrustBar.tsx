import { Bitcoin, CheckCircle2, LockKeyhole, Zap } from "lucide-react";

export function HeroTrustBar() {
  return (
    <div className="crazy-trustbar" aria-label="Recursos da loja">
      <div className="crazy-trustbar__item">
        <LockKeyhole aria-hidden="true" />
        <span><strong>Pagamento seguro</strong><small>Processamento protegido</small></span>
      </div>
      <div className="crazy-trustbar__payments" aria-label="Métodos de pagamento">
        <span className="crazy-trustbar__label">ACEITAMOS</span>
        <span className="crazy-trustbar__pix">PIX</span>
        <span className="crazy-trustbar__divider" />
        <span className="crazy-trustbar__coin"><Bitcoin aria-hidden="true" /> LTC</span>
      </div>
      <div className="crazy-trustbar__item crazy-trustbar__item--right">
        <Zap aria-hidden="true" />
        <span><strong>Entrega automática</strong><small>Quando o produto permitir</small></span>
      </div>
      <CheckCircle2 className="crazy-trustbar__seal" aria-hidden="true" />
    </div>
  );
}
