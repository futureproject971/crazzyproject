import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { Gift, Loader2, RotateCw, Sparkles, Ticket, Trophy } from "lucide-react";
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

export default function Experiencias() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [revealProduct, setRevealProduct] = useState<Product | null>(null);
  const [loadingReveal, setLoadingReveal] = useState(false);
  const [scratched, setScratched] = useState(false);
  const [scratchCount, setScratchCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratchingRef = useRef(false);

  useEffect(() => {
    supabase
      .from("products")
      .select("id,name,image_url,description")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .limit(12)
      .then(({ data }) => {
        setProducts((data || []) as Product[]);
        setLoadingProducts(false);
      });
  }, []);

  const wheelProducts = useMemo(() => products.slice(0, 10), [products]);

  const spin = () => {
    if (spinning || wheelProducts.length === 0) return;
    setSpinning(true);
    const index = Math.floor(Math.random() * wheelProducts.length);
    const step = 360 / wheelProducts.length;
    const target = rotation + 1440 + (360 - index * step);
    setRotation(target);
    window.setTimeout(() => {
      setSelectedProduct(wheelProducts[index]);
      setSpinning(false);
    }, 1700);
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
            <h1 className="mt-5 text-3xl font-black text-white md:text-5xl">Roleta 3D + raspadinha diária</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-blue-100/65">
              Uma área extra da loja para descobrir produtos e liberar benefícios. Não precisa comprar nada para usar.
            </p>
          </div>

          <div className="mt-10 grid gap-6 xl:grid-cols-2">
            <section className="rounded-3xl border border-white/10 bg-black/25 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">ROTAÇÃO 3D</p>
                  <h2 className="mt-1 text-xl font-black text-white">Roleta de produtos</h2>
                </div>
                <RotateCw className={`h-5 w-5 text-blue-400 ${spinning ? "animate-spin" : ""}`} />
              </div>

              <div className="relative mt-6 h-[360px] overflow-hidden rounded-2xl border border-white/5 bg-[radial-gradient(circle_at_center,rgba(0,89,255,.18),transparent_65%)] [perspective:1100px]">
                {loadingProducts ? (
                  <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-400" /></div>
                ) : wheelProducts.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-8 text-center text-sm text-zinc-500">Cadastre produtos ativos para alimentar a roleta.</div>
                ) : (
                  <div
                    className="absolute left-1/2 top-1/2 h-0 w-0 transition-transform duration-[1700ms] ease-[cubic-bezier(.16,.9,.2,1)] [transform-style:preserve-3d]"
                    style={{ transform: `rotateY(${rotation}deg)` }}
                  >
                    {wheelProducts.map((product, index) => {
                      const angle = (360 / wheelProducts.length) * index;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => navigate(`/produto/${product.id}`)}
                          className="absolute left-[-74px] top-[-105px] h-[210px] w-[148px] overflow-hidden rounded-2xl border border-blue-400/30 bg-[#09152e] text-left shadow-[0_22px_50px_rgba(0,0,0,.45)]"
                          style={{ transform: `rotateY(${angle}deg) translateZ(250px)` }}
                        >
                          <div className="h-[138px] bg-[#071022]">
                            {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <Gift className="m-auto h-full w-10 text-blue-400" />}
                          </div>
                          <div className="p-3">
                            <p className="truncate text-[11px] font-black uppercase tracking-wide text-white">{product.name}</p>
                            <p className="mt-1 text-[9px] text-blue-200/55">Abrir produto</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={spinning || wheelProducts.length === 0}
                onClick={spin}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white transition hover:bg-blue-500 disabled:opacity-40"
              >
                <RotateCw className="h-4 w-4" /> {spinning ? "Girando..." : "Girar roleta"}
              </button>

              {selectedProduct ? (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  type="button"
                  onClick={() => navigate(`/produto/${selectedProduct.id}`)}
                  className="mt-3 w-full rounded-xl border border-blue-400/20 bg-blue-500/10 p-3 text-left"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wide text-blue-300">Selecionado</span>
                  <strong className="mt-1 block truncate text-sm text-white">{selectedProduct.name}</strong>
                </motion.button>
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
