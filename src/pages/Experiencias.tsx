import { PointerEvent, useEffect, useRef, useState } from "react";
import { Copy, Gift, Loader2, RotateCw, ShoppingCart, Sparkles, Ticket, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CRAZZY_SUPABASE_PUBLIC } from "@/config/supabasePublic";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  description: string | null;
}

interface WheelPrize {
  id: string;
  label: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  sort_order: number;
}

interface WheelResult {
  id: string;
  prize_id: string;
  label: string;
  sort_order: number;
  code: string;
  coupon_id?: string;
  discount_type?: "percentage" | "fixed";
  discount_value?: number;
  min_order_value: number;
  spin_date: string;
  next_spin_at: string;
}

interface Reveal {
  id: string;
  result_key: "rewards_trial" | "featured_product" | "try_tomorrow";
  product_id: string | null;
  reveal_date: string;
}

const resultCopy = {
  rewards_trial: {
    kicker: "CONHEÇA OS TESTES",
    title: "Você encontrou um atalho para o Rewards",
    description: "Complete a missão de vídeo e dispute seu teste grátis de 1 hora.",
  },
  featured_product: {
    kicker: "DESTAQUE DO DIA",
    title: "A raspadinha escolheu um produto para você",
    description: "Abra o produto sorteado e confira os planos disponíveis.",
  },
  try_tomorrow: {
    kicker: "QUASE!",
    title: "Volte amanhã para uma nova raspadinha",
    description: "Sua tentativa de hoje já ficou registrada. Amanhã tem outra.",
  },
} as const;

const fallbackWheelPrizes: WheelPrize[] = [
  { id: "percent5", label: "5% OFF", discount_type: "percentage", discount_value: 5, sort_order: 0 },
  { id: "percent10", label: "10% OFF", discount_type: "percentage", discount_value: 10, sort_order: 1 },
  { id: "fixed5", label: "R$ 5", discount_type: "fixed", discount_value: 5, sort_order: 2 },
  { id: "percent15", label: "15% OFF", discount_type: "percentage", discount_value: 15, sort_order: 3 },
  { id: "percent20", label: "20% OFF", discount_type: "percentage", discount_value: 20, sort_order: 4 },
  { id: "fixed10", label: "R$ 10", discount_type: "fixed", discount_value: 10, sort_order: 5 },
  { id: "fixed20", label: "R$ 20", discount_type: "fixed", discount_value: 20, sort_order: 6 },
];

export default function Experiencias() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [wheelPrizes, setWheelPrizes] = useState<WheelPrize[]>(fallbackWheelPrizes);
  const [wheelLoading, setWheelLoading] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState<WheelResult | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [revealProduct, setRevealProduct] = useState<Product | null>(null);
  const [loadingReveal, setLoadingReveal] = useState(false);
  const [scratched, setScratched] = useState(false);
  const [scratchCount, setScratchCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratchingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("wheel_prizes")
      .select("id,label,discount_type,discount_value,sort_order")
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (!error && data?.length) setWheelPrizes(data as WheelPrize[]);
        setWheelLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  const spinDailyWheel = async () => {
    if (spinning) return;
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (!wheelPrizes.length) {
      toast({ title: "Roleta indisponível", description: "Os prêmios ainda não foram carregados.", variant: "destructive" });
      return;
    }

    setSpinning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sua sessão expirou. Entre novamente.");

      const response = await fetch(
        CRAZZY_SUPABASE_PUBLIC.url + "/functions/v1/daily-wheel",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: CRAZZY_SUPABASE_PUBLIC.publishableKey,
            Authorization: "Bearer " + session.access_token,
          },
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.code || !body?.prize_id) {
        throw new Error(body?.error || "Não foi possível girar a roleta.");
      }

      const result = body as WheelResult;
      const foundIndex = wheelPrizes.findIndex((prize) => prize.id === result.prize_id);
      const index = foundIndex >= 0 ? foundIndex : Math.max(0, Number(result.sort_order || 0));
      const step = 360 / wheelPrizes.length;
      const target = Math.ceil(rotation / 360) * 360 + 1440 - index * step;
      setRotation(target);

      window.setTimeout(() => {
        setWheelResult(result);
        setSpinning(false);
      }, 1700);
    } catch (error: any) {
      setSpinning(false);
      toast({ title: "Roleta indisponível", description: error?.message || "Tente novamente.", variant: "destructive" });
    }
  };

  const copyCoupon = async () => {
    if (!wheelResult?.code) return;
    await navigator.clipboard.writeText(wheelResult.code);
    toast({ title: "Cupom copiado", description: wheelResult.code });
  };

  const useWheelCoupon = () => {
    if (!wheelResult?.code) return;
    window.localStorage.setItem("crazzy:pending-coupon", wheelResult.code);
    navigate("/carrinho?coupon=" + encodeURIComponent(wheelResult.code));
  };

  const loadReveal = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (loadingReveal) return;

    setLoadingReveal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${CRAZZY_SUPABASE_PUBLIC.url}/functions/v1/promo-reveal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Não foi possível carregar a raspadinha.");

      setReveal(body.reveal as Reveal);
      setRevealProduct(body.product || null);
      setScratched(false);
      setScratchCount(0);
      requestAnimationFrame(drawScratchCover);
    } catch (error: any) {
      toast({ title: "Raspadinha indisponível", description: error.message, variant: "destructive" });
    } finally {
      setLoadingReveal(false);
    }
  };

  const drawScratchCover = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, "#082c8e");
    gradient.addColorStop(.5, "#0b58ff");
    gradient.addColorStop(1, "#041b62");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "rgba(255,255,255,.94)";
    ctx.font = "800 16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("RASPE AQUI", rect.width / 2, rect.height / 2 - 2);
    ctx.font = "500 11px system-ui";
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.fillText("arraste o mouse ou o dedo", rect.width / 2, rect.height / 2 + 18);
  };

  useEffect(() => {
    if (!reveal) return;
    const frame = requestAnimationFrame(drawScratchCover);
    const onResize = () => drawScratchCover();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [reveal?.id]);

  const scratch = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!reveal || scratched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (event.type === "pointerdown") {
      scratchingRef.current = true;
      canvas.setPointerCapture(event.pointerId);
    }
    if (event.type === "pointerup" || event.type === "pointercancel") {
      scratchingRef.current = false;
      return;
    }
    if (event.type === "pointermove" && !scratchingRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    setScratchCount((count) => {
      const next = count + 1;
      if (next >= 22) setScratched(true);
      return next;
    });
  };

  const result = reveal ? resultCopy[reveal.result_key] : null;

  return (
    <div className="min-h-screen text-foreground">
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultTab="login" />
      <Header />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-blue-500/20 bg-[radial-gradient(circle_at_top,#08245e_0%,#071226_35%,#050914_100%)] p-6 shadow-2xl md:p-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[.22em] text-blue-300">
              <Sparkles className="h-4 w-4" /> CRAZZY LAB
            </div>
            <h1 className="mt-5 text-3xl font-black text-white md:text-5xl">Roleta de prêmios + raspadinha diária</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-blue-100/65">
              Benefícios extras da CRAZZY PROJECT. A roleta é validada no servidor e cada conta tem um giro por dia.
            </p>
          </div>

          <div className="mt-10 grid gap-6 xl:grid-cols-2">
            <section className="rounded-3xl border border-blue-300/15 bg-black/25 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">1 GIRO POR CONTA / DIA</p>
                  <h2 className="mt-1 text-xl font-black text-white">Roleta CRAZZY</h2>
                </div>
                <RotateCw className={"h-5 w-5 text-blue-400 " + (spinning ? "animate-spin" : "")} />
              </div>

              <div className="relative mt-6 h-[360px] overflow-hidden rounded-2xl border border-blue-300/10 bg-[radial-gradient(circle_at_center,rgba(0,0,255,.24),transparent_65%)] [perspective:1100px]">
                <div className="pointer-events-none absolute left-1/2 top-3 z-20 h-0 w-0 -translate-x-1/2 border-x-[11px] border-t-[18px] border-x-transparent border-t-white drop-shadow-[0_0_10px_rgba(50,125,255,.9)]" />
                {wheelLoading ? (
                  <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-400" /></div>
                ) : (
                  <div
                    className="absolute left-1/2 top-1/2 h-0 w-0 transition-transform duration-[1700ms] ease-[cubic-bezier(.16,.9,.2,1)] [transform-style:preserve-3d]"
                    style={{ transform: "rotateY(" + rotation + "deg)" }}
                  >
                    {wheelPrizes.map((prize, index) => {
                      const angle = (360 / wheelPrizes.length) * index;
                      return (
                        <div
                          key={prize.id}
                          className="absolute left-[-72px] top-[-94px] flex h-[188px] w-[144px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-blue-300/35 bg-[linear-gradient(155deg,#0d3b99,#0000ff_48%,#03164e)] px-3 text-center shadow-[0_22px_50px_rgba(0,0,0,.45)]"
                          style={{ transform: "rotateY(" + angle + "deg) translateZ(245px)" }}
                        >
                          <Gift className="h-8 w-8 text-white" />
                          <strong className="mt-4 text-xl font-black text-white">{prize.label}</strong>
                          <span className="mt-2 text-[9px] font-bold uppercase tracking-[.18em] text-blue-100/70">CUPOM CRAZZY</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={spinning || wheelLoading || Boolean(wheelResult)}
                onClick={spinDailyWheel}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0000ff] text-sm font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCw className="h-4 w-4" />
                {spinning ? "Validando e girando..." : wheelResult ? "Giro de hoje concluído" : user ? "Girar roleta" : "Entrar para girar"}
              </button>

              {wheelResult ? (
                <div className="mt-4 rounded-2xl border border-blue-300/25 bg-blue-500/10 p-4 text-center">
                  <span className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">SEU PRÊMIO DE HOJE</span>
                  <strong className="mt-2 block text-2xl font-black text-white">{wheelResult.label}</strong>
                  <div className="mx-auto mt-3 flex max-w-sm items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                    <code className="truncate text-sm font-black tracking-wider text-white">{wheelResult.code}</code>
                    <button type="button" onClick={copyCoupon} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/15" aria-label="Copiar cupom">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-blue-100/65">
                    Cupom de um uso, vinculado à sua conta. O desconto é validado novamente pelo servidor no checkout.
                  </p>
                  <button type="button" onClick={useWheelCoupon} className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#0000cc] hover:bg-blue-50">
                    <ShoppingCart className="h-4 w-4" /> Usar no carrinho
                  </button>
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-white/10 bg-black/25 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">1 POR DIA</p>
                  <h2 className="mt-1 text-xl font-black text-white">Raspadinha CRAZZY</h2>
                </div>
                <Ticket className="h-5 w-5 text-blue-400" />
              </div>

              <div className="relative mt-6 min-h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#08162f,#050914)] p-5">
                {!reveal ? (
                  <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-400">
                      <Trophy className="h-8 w-8" />
                    </div>
                    <h3 className="mt-5 text-xl font-black text-white">Sua raspadinha de hoje</h3>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">Você pode raspar uma vez por dia. Volte amanhã para uma nova chance.</p>
                    <button
                      type="button"
                      onClick={loadReveal}
                      disabled={loadingReveal}
                      className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {loadingReveal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {user ? "Gerar raspadinha" : "Entrar para raspar"}
                    </button>
                  </div>
                ) : (
                  <div className="relative min-h-[320px]">
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-[radial-gradient(circle_at_top,#0d327e,#061127_70%)] p-7 text-center">
                      <span className="text-[10px] font-black uppercase tracking-[.24em] text-blue-300">{result?.kicker}</span>
                      <h3 className="mt-3 max-w-sm text-2xl font-black text-white">{result?.title}</h3>
                      <p className="mt-3 max-w-sm text-sm leading-relaxed text-blue-100/65">{result?.description}</p>

                      {scratched ? (
                        <div className="mt-6">
                          {reveal.result_key === "rewards_trial" ? (
                            <button onClick={() => navigate("/rewards")} className="rounded-xl bg-white px-5 py-3 text-sm font-black text-blue-700">Ir para Rewards</button>
                          ) : reveal.result_key === "featured_product" && revealProduct ? (
                            <button onClick={() => navigate(`/produto/${revealProduct.id}`)} className="rounded-xl bg-white px-5 py-3 text-sm font-black text-blue-700">Abrir {revealProduct.name}</button>
                          ) : (
                            <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300">Nova tentativa amanhã</span>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {!scratched ? (
                      <canvas
                        ref={canvasRef}
                        onPointerDown={scratch}
                        onPointerMove={scratch}
                        onPointerUp={scratch}
                        onPointerCancel={scratch}
                        className="absolute inset-0 h-full w-full touch-none cursor-crosshair rounded-xl"
                        aria-label="Raspadinha: arraste para revelar"
                      />
                    ) : null}
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
