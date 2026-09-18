import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, Gift, Loader2, LockKeyhole, PlayCircle, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CrazyHeader } from "@/components/crazy-hero/CrazyHeader";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RewardProduct {
  id: string;
  campaign_id: string;
  product_id: string;
  product_plan_id: string | null;
  trial_duration_minutes: number;
  delivery_mode: "manual" | "automatic";
  auto_delay_seconds: number;
  product: { id: string; name: string; image_url: string | null };
  plan: { id: string; name: string } | null;
}
interface Campaign {
  id: string;
  title: string;
  description: string;
  video_url: string;
  required_watch_seconds: number;
  cooldown_hours: number;
  requirements: Record<string, boolean>;
  products: RewardProduct[];
}
interface RewardSession {
  id: string;
  status: string;
  watched_seconds: number;
  campaign_product_id: string;
  eligible_delivery_at?: string | null;
}

function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1);
    return parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop() || "";
  } catch { return ""; }
}

async function callRewards(action: string, init?: RequestInit, query?: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();
  const params = new URLSearchParams({ action, ...(query || {}) });
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rewards?${params.toString()}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || "Falha ao processar recompensa");
  return body;
}

export default function Rewards() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<RewardProduct | null>(null);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [rewardSession, setRewardSession] = useState<RewardSession | null>(null);
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerInstanceRef = useRef<any>(null);
  const playingRef = useRef(false);
  const positionRef = useRef(0);

  useEffect(() => {
    callRewards("catalog")
      .then((data) => setCampaigns(data.campaigns || []))
      .catch((e) => toast({ title: "Rewards indisponível", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const progress = useMemo(() => currentCampaign && rewardSession
    ? Math.min(100, Math.round((Number(rewardSession.watched_seconds || 0) / currentCampaign.required_watch_seconds) * 100))
    : 0, [currentCampaign, rewardSession]);

  useEffect(() => {
    if (!rewardSession || rewardSession.status !== "watching") return;
    const timer = window.setInterval(async () => {
      try {
        const body = await callRewards("heartbeat", {
          method: "POST",
          body: JSON.stringify({
            session_id: rewardSession.id,
            visible: document.visibilityState === "visible" && document.hasFocus(),
            playing: playingRef.current,
            position: positionRef.current,
          }),
        });
        setRewardSession(body.session);
      } catch { /* next heartbeat retries naturally */ }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [rewardSession?.id, rewardSession?.status]);

  useEffect(() => {
    if (!currentCampaign || !rewardSession || rewardSession.status !== "watching") return;
    const videoId = youtubeId(currentCampaign.video_url);
    if (!videoId || !playerHostRef.current) return;

    let cancelled = false;
    let positionTimer: number | undefined;

    const initPlayer = () => {
      if (cancelled || !playerHostRef.current || !(window as any).YT?.Player) return;
      playerInstanceRef.current?.destroy?.();
      playerInstanceRef.current = new (window as any).YT.Player(playerHostRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, origin: window.location.origin },
        events: {
          onStateChange: (event: any) => {
            playingRef.current = event.data === (window as any).YT.PlayerState.PLAYING;
          },
        },
      });
      positionTimer = window.setInterval(() => {
        try {
          const value = Number(playerInstanceRef.current?.getCurrentTime?.());
          if (Number.isFinite(value) && value >= 0) positionRef.current = value;
        } catch { /* player not ready yet */ }
      }, 1000);
    };

    if ((window as any).YT?.Player) {
      initPlayer();
    } else {
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      const previousReady = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (typeof previousReady === "function") previousReady();
        initPlayer();
      };
      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      playingRef.current = false;
      positionRef.current = 0;
      if (positionTimer) window.clearInterval(positionTimer);
      playerInstanceRef.current?.destroy?.();
      playerInstanceRef.current = null;
    };
  }, [currentCampaign?.id, rewardSession?.id, rewardSession?.status]);

  useEffect(() => {
    if (!rewardSession || !["requested", "delivering", "delivered"].includes(rewardSession.status)) return;
    const poll = async () => {
      try {
        const body = await callRewards("status", undefined, { session_id: rewardSession.id });
        setRewardSession(body.session);
        setDelivery(body.delivery);
      } catch { /* keep UI */ }
    };
    poll();
    const timer = rewardSession.status === "delivered" ? undefined : window.setInterval(poll, 5000);
    return () => { if (timer) window.clearInterval(timer); };
  }, [rewardSession?.id, rewardSession?.status]);

  const start = async (campaign: Campaign, product: RewardProduct) => {
    if (!user) {
      toast({ title: "Entre na sua conta", description: "Você precisa estar logado para iniciar um teste." });
      setAuthOpen(true);
      return;
    }
    setBusy(true);
    try {
      const body = await callRewards("start", { method: "POST", body: JSON.stringify({ campaign_product_id: product.id }) });
      setCurrentCampaign(campaign); setSelected(product); setRewardSession(body.session); setDelivery(null);
    } catch (e: any) {
      toast({ title: "Não foi possível iniciar", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const requestReward = async () => {
    if (!rewardSession) return;
    setBusy(true);
    try {
      const body = await callRewards("request", { method: "POST", body: JSON.stringify({ session_id: rewardSession.id }) });
      setRewardSession(body.session);
      toast({ title: body.delivery_mode === "automatic" ? "Entrega em processamento" : "Solicitação enviada ao staff" });
    } catch (e: any) {
      toast({ title: "Falha ao solicitar", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  if (loading || authLoading) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultTab="login" />
      <CrazyHeader />
      <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-border/70 bg-card/80 p-6 shadow-2xl backdrop-blur-xl md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[.2em] text-primary"><Gift className="h-4 w-4"/> Crazzy Rewards</div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">Ganhe um teste grátis de 1 hora</h1>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">Escolha um produto elegível, cumpra a missão e solicite seu trial. O progresso pausa se o vídeo parar, a aba ficar oculta ou a janela perder foco.</p>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-primary"/> validação no backend</span><span className="flex items-center gap-1"><LockKeyhole className="h-4 w-4 text-primary"/> estoque separado</span></div>
          </div>

          {!currentCampaign ? (
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {campaigns.flatMap((campaign) => campaign.products.map((product) => (
                <article key={product.id} className="overflow-hidden rounded-3xl border border-border bg-background/65 p-5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
                  <div className="flex gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-secondary">
                      {product.product.image_url ? <img src={product.product.image_url} alt="" className="h-full w-full object-cover"/> : <Gift className="m-6 h-8 w-8 text-primary"/>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold uppercase tracking-wider text-primary">{campaign.title}</div>
                      <h2 className="mt-1 truncate text-xl font-black">{product.product.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{product.plan?.name || "Plano de teste"} · {product.trial_duration_minutes} min</p>
                      <p className="mt-2 text-xs text-muted-foreground">{product.delivery_mode === "automatic" ? `Entrega automática após ~${Math.max(1, Math.ceil(product.auto_delay_seconds / 60))} min` : "Entrega após aprovação do staff"}</p>
                    </div>
                  </div>
                  <button disabled={busy} onClick={() => start(campaign, product)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"><PlayCircle className="h-4 w-4"/> Começar missão</button>
                </article>
              )))}
              {!campaigns.some(c => c.products.length) && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground lg:col-span-2">Nenhuma campanha de teste está ativa agora.</div>}
            </div>
          ) : (
            <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_.6fr]">
              <section className="overflow-hidden rounded-3xl border border-border bg-black shadow-2xl">
                <div className="aspect-video w-full">
                  <div ref={playerHostRef} className="h-full w-full" aria-label="Vídeo da missão" />
                </div>
              </section>

              <aside className="rounded-3xl border border-border bg-background/70 p-6">
                <div className="flex items-center justify-between"><span className="text-sm font-black">Progresso da missão</span><strong className="text-primary">{progress}%</strong></div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }}/></div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{Math.floor(Number(rewardSession?.watched_seconds || 0))}s assistidos</span><span>{currentCampaign.required_watch_seconds}s necessários</span></div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"><CheckCircle2 className={`mt-0.5 h-5 w-5 ${progress >= 100 ? "text-emerald-500" : "text-muted-foreground"}`}/><div><strong className="text-sm">Assistir ao vídeo</strong><p className="mt-1 text-xs text-muted-foreground">Só conta enquanto a aba está visível, a janela está em foco e o vídeo está reproduzindo.</p></div></div>
                  <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"><Clock3 className="mt-0.5 h-5 w-5 text-primary"/><div><strong className="text-sm">Entrega</strong><p className="mt-1 text-xs text-muted-foreground">{selected?.delivery_mode === "automatic" ? "Automática quando o prazo e o estoque permitirem." : "Vai para a fila do staff após a solicitação."}</p></div></div>
                </div>

                {rewardSession?.status === "completed" && <button disabled={busy} onClick={requestReward} className="mt-6 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground">Solicitar meu teste</button>}
                {["requested","delivering"].includes(rewardSession?.status || "") && <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm"><strong>Solicitação recebida.</strong><p className="mt-1 text-xs text-muted-foreground">Aguarde a entrega. Esta tela atualiza automaticamente.</p></div>}
                {rewardSession?.status === "delivered" && <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4"><strong className="text-emerald-500">Teste entregue 🎁</strong>{delivery?.content && <pre className="mt-3 whitespace-pre-wrap break-all rounded-xl bg-background p-3 text-xs">{delivery.content}</pre>}{delivery?.expires_at && <p className="mt-2 text-xs text-muted-foreground">Validade: {new Date(delivery.expires_at).toLocaleString("pt-BR")}</p>}</div>}
              </aside>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
