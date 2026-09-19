import { useEffect, useState } from "react";
import { Coins, CreditCard, LockKeyhole, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PaymentMethod {
  method: string;
  label: string;
}

const FALLBACK_METHODS: PaymentMethod[] = [
  { method: "pix", label: "PIX" },
  { method: "crypto", label: "Litecoin (LTC)" },
];

function PaymentBadge({ method }: { method: PaymentMethod }) {
  const normalized = method.method.toLowerCase();

  if (normalized === "pix") {
    return <span className="crazy-trustbar__pix">PIX</span>;
  }

  if (normalized === "card") {
    return (
      <span className="crazy-trustbar__coin">
        <CreditCard aria-hidden="true" /> Cartão
      </span>
    );
  }

  if (normalized === "crypto" || normalized === "ltc" || normalized === "litecoin") {
    return (
      <span className="crazy-trustbar__coin">
        <Coins aria-hidden="true" /> LTC
      </span>
    );
  }

  return <span className="crazy-trustbar__coin">{method.label}</span>;
}

export function HeroTrustBar() {
  const [methods, setMethods] = useState<PaymentMethod[]>(FALLBACK_METHODS);

  useEffect(() => {
    let mounted = true;

    supabase
      .from("payment_settings")
      .select("method,label,enabled")
      .eq("enabled", true)
      .then(({ data, error }) => {
        if (!mounted || error || !data?.length) return;
        setMethods(data.map(({ method, label }) => ({ method, label })));
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="crazy-trustbar" aria-label="Recursos da loja">
      <div className="crazy-trustbar__item">
        <LockKeyhole aria-hidden="true" />
        <span><strong>Pagamento seguro</strong><small>Processamento protegido</small></span>
      </div>

      <div className="crazy-trustbar__payments" aria-label="Métodos de pagamento habilitados">
        <span className="crazy-trustbar__label">ACEITAMOS</span>
        {methods.map((method, index) => (
          <span key={method.method} className="contents">
            {index > 0 ? <span className="crazy-trustbar__divider" aria-hidden="true" /> : null}
            <PaymentBadge method={method} />
          </span>
        ))}
      </div>

      <div className="crazy-trustbar__item crazy-trustbar__item--right">
        <Zap aria-hidden="true" />
        <span><strong>Entrega automática</strong><small>Quando o produto permitir</small></span>
      </div>
    </div>
  );
}
