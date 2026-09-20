import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  Gift,
  Loader2,
  LockKeyhole,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
import { CrazyHeader } from "@/components/crazy-hero/CrazyHeader";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CRAZZY_SUPABASE_PUBLIC } from "@/config/supabasePublic";
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
  requirements: Record<string, unknown>;
  products: RewardProduct[];
}

interface WatchGuard {
  checkpoint_enabled?: boolean;
  checkpoint_active?: boolean;
  checkpoint_passed?: boolean;
  checkpoint_nonce?: string | null;
  checkpoint_at_seconds?: number | null;
  next_heartbeat_nonce?: string;
  seek_violations?: number;
  playback_violations?: number;
  replay_violations?: number;
}

interface RewardSession {
  id: string;
  status: string;
  watched_seconds: number;
  campaign_product_id: string;
  eligible_delivery_at?: string | null;
  started_at?: string;
  created_at?: string;
  requirements_completed?: {
    watch_guard?: WatchGuard;
    attention_checkpoint?: boolean;
    [key: string]: unknown;
  } | null;
}

interface AttentionChallenge {
  nonce: string;
  checkpoint_at_seconds?: number | null;
}

function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1);
    return parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop() || "";
  } catch {
    return "";
  }
}

const REWARDS_BASE_URL = import.meta.env.VITE_SUPABASE_URL || CRAZZY_SUPABASE_PUBLIC.url;

async function callRewards(action: string, init?: RequestInit, query?: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();
  const params = new URLSearchParams({ action, ...(query || {}) });
  const res = await fetch(`${REWARDS_BASE_URL}/functions/v1/rewards?${params.toString()}`, {
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

function challengeFromSession(session: RewardSession | null): AttentionChallenge | null {
  const guard = session?.requirements_completed?.watch_guard;
  if (guard?.checkpoint_active && !guard?.checkpoint_passed && guard.checkpoint_nonce) {
    return {
      nonce: guard.checkpoint_nonce,
      checkpoint_at_seconds: guard.checkpoint_at_seconds,
    };
  }
  return null;
}

export default function Rewards() {
  const { user, loading: authLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<RewardProduct | null>(null);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [rewardSession, setRewardSession] = useState<RewardSession | null>(null);
  const [delivery, setDelivery] = useState<any>(null);
  const [attentionChallenge, setAttentionChallenge] = useState<AttentionChallenge | null>(null);
  const [pageActive, setPageActive] = useState(true);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [guardNotice, setGuardNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerInstanceRef = useRef<any>(null);
  const playingRef = useRef(false);
  const positionRef = useRef(0);
  const playbackRateRef = useRef(1);
  const heartbeatNonceRef = useRef("");
  const heartbeatBusyRef = useRef(false);

  const maxPlaybackRate = useMemo(() => {
    const configured = Number(currentCampaign?.requirements?.max_playback_rate ?? 1.25);
    return Number.isFinite(configured) ? Math.min(2, Math.max(1, configured)) : 1.25;
  }, [currentCampaign]);

  const syncSession = (session: RewardSession | null) => {
    setRewardSession(session);
    const guard = session?.requirements_completed?.watch_guard;
    heartbeatNonceRef.current = guard?.next_heartbeat_nonce || "";
    setAttentionChallenge(challengeFromSession(session));
  };

  useEffect(() => {
    callRewards("catalog")
      .then((data) => setCampaigns(data.campaigns || []))
      .catch((e) => toast({ title: "Rewards indisponível", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const update = () => {
      setPageActive(document.visibilityState === "visible" && document.hasFocus());
    };
    update();
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
    };
  }, []);

  const progress = useMemo(
    () => currentCampaign && rewardSession
      ? Math.min(100, Math.round((Number(rewardSession.watched_seconds || 0) / currentCampaign.required_watch_seconds) * 100))
      : 0,
    [currentCampaign, rewardSession],
  );

  useEffect(() => {
    if (!rewardSession || rewardSession.status !== "watching") return;

    const timer = window.setInterval(async () => {
      if (heartbeatBusyRef.current) return;
      heartbeatBusyRef.current = true;
      try {
        const body = await callRewards("heartbeat", {
          method: "POST",
          body: JSON.stringify({
            session_id: rewardSession.id,
            visible: document.visibilityState === "visible" && document.hasFocus(),
            playing: playingRef.current,
            position: positionRef.current,
            playback_rate: playbackRateRef.current,
            heartbeat_nonce: heartbeatNonceRef.current,
          }),
        });

        if (body.session) syncSession(body.session);
        if (body.challenge) setAttentionChallenge(body.challenge);

        if (body?.watch_state?.seek_violation) {
          setGuardNotice("Um salto grande no vídeo foi detectado. Esse intervalo não contou.");
        } else if (body?.watch_state?.playback_violation) {
          setGuardNotice(`Velocidade acima de ${body.watch_state.max_playback_rate}x não conta para o teste.`);
        } else if (body?.accepted) {
          setGuardNotice("");
        }
      } catch {
        // A heartbeat failure never grants progress. The next interval retries.
      } finally {
        heartbeatBusyRef.current = false;
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [rewardSession?.id, rewardSession?.status]);

  useEffect(() => {
    if (!attentionChallenge) return;
    try {
      playerInstanceRef.current?.pauseVideo?.();
    } catch {
      // Player may still be initializing.
    }
    playingRef.current = false;
    setVideoPlaying(false);
  }, [attentionChallenge]);

  useEffect(() => {
    if (!currentCampaign || !rewardSession || rewardSession.status !== "watching") return;
    const videoId = youtubeId(currentCampaign.video_url);
    if (!videoId || !playerHostRef.current) return;

    let cancelled = false;
    let positionTimer: number | undefined;

    const normalizePlaybackRate = () => {
      try {
        let rate = Number(playerInstanceRef.current?.getPlaybackRate?.() || 1);
        if (!Number.isFinite(rate) || rate <= 0) rate = 1;
        if (rate > maxPlaybackRate) {
          playerInstanceRef.current?.setPlaybackRate?.(1);
          rate = 1;
          setGuardNotice(`Para valer no Rewards, o vídeo deve ficar em até ${maxPlaybackRate}x.`);
        }
        playbackRateRef.current = rate;
        setPlaybackRate(rate);
      } catch {
        playbackRateRef.current = 1;
        setPlaybackRate(1);
      }
    };

    const initPlayer = () => {
      if (cancelled || !playerHostRef.current || !(window as any).YT?.Player) return;
      playerInstanceRef.current?.destroy?.();
      playerInstanceRef.current = new (window as any).YT.Player(playerHostRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onStateChange: (event: any) => {
            const playing = event.data === (window as any).YT.PlayerState.PLAYING;
            playingRef.current = playing;
            setVideoPlaying(playing);
            normalizePlaybackRate();
          },
          onPlaybackRateChange: () => normalizePlaybackRate(),
        },
      });

      positionTimer = window.setInterval(() => {
        try {
          const value = Number(playerInstanceRef.current?.getCurrentTime?.());
          if (Number.isFinite(value) && value >= 0) positionRef.current = value;
          normalizePlaybackRate();
        } catch {
          // Player not ready yet.
        }
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
      setVideoPlaying(false);
      positionRef.current = 0;
      playbackRateRef.current = 1;
      setPlaybackRate(1);
      if (positionTimer) window.clearInterval(positionTimer);
      playerInstanceRef.current?.destroy?.();
      playerInstanceRef.current = null;
    };
  }, [currentCampaign?.id, rewardSession?.id, rewardSession?.status, maxPlaybackRate]);

  useEffect(() => {
    if (!rewardSession || !["requested", "delivering", "delivered"].includes(rewardSession.status)) return;

    const poll = async () => {
      try {
        const body = await callRewards("status", undefined, { session_id: rewardSession.id });
        syncSession(body.session);
        setDelivery(body.delivery);
      } catch {
        // Keep the last known UI state and try again.
      }
    };

    poll();
    const timer = rewardSession.status === "delivered" ? undefined : window.setInterval(poll, 5000);
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [rewardSession?.id, rewardSession?.status]);

  const start = async (campaign: Campaign, product: RewardProduct) => {
    if (!user) {
      toast({ title: "Entre na sua conta", description: "Você precisa estar logado para iniciar um teste." });
      setAuthOpen(true);
      return;
    }

    setBusy(true);
    try {
      const body = await callRewards("start", {
        method: "POST",
        body: JSON.stringify({ campaign_product_id: product.id }),
      });
      setCurrentCampaign(campaign);
      setSelected(product);
      syncSession(body.session);
      setDelivery(null);
      setGuardNotice("");
    } catch (e: any) {
      toast({ title: "Não foi possível iniciar", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const confirmAttention = async () => {
    if (!rewardSession || !attentionChallenge || busy) return;

    setBusy(true);
    try {
      const body = await callRewards("attention", {
        method: "POST",
        body: JSON.stringify({
          session_id: rewardSession.id,
          challenge_nonce: attentionChallenge.nonce,
        }),
      });
      syncSession(body.session);
      setAttentionChallenge(null);
      setGuardNotice("");
      toast({ title: "Presença confirmada", description: "O contador pode continuar." });
      try {
        playerInstanceRef.current?.playVideo?.();
      } catch {
        // The normal player control remains available.
      }
    } catch (e: any) {
      toast({ title: "Checkpoint não confirmado", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const requestReward = async () => {
    if (!rewardSession) return;
    setBusy(true);
    try {
      const body = await callRewards("request", {
        method: "POST",
        body: JSON.stringify({ session_id: rewardSession.id }),
      });
      syncSession(body.session);
      toast({
        title: body.delivery_mode === "automatic"
          ? "Entrega em processamento"
          : "Solicitação enviada ao staff",
      });
    } catch (e: any) {
      toast({ title: "Falha ao solicitar", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const counterState = attentionChallenge
    ? { active: false, label: "Checkpoint de atenção", detail: "Confirme que você ainda está assistindo para o contador continuar." }
    : !pageActive
      ? { active: false, label: "Contador pausado", detail: "Volte para esta janela. Tempo fora da tela não conta." }
      : !videoPlaying
        ? { active: false, label: "Contador pausado", detail: "Dê play no vídeo para continuar acumulando tempo." }
        : { active: true, label: "Contando agora", detail: `Janela ativa, vídeo reproduzindo em ${playbackRate.toFixed(2)}x.` };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-foreground">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultTab="login" />
      <CrazyHeader />

      <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-border/70 bg-card/80 p-6 shadow-2xl backdrop-blur-xl md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[.2em] text-primary">
                <Gift className="h-4 w-4" /> CRAZZY Rewards
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">Ganhe um teste grátis de 1 hora</h1>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
                Escolha um produto elegível e assista à missão. Se o vídeo parar, você trocar de aba,
                perder o foco ou tentar pular trechos, o contador deixa de avançar.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-primary" /> validação no backend
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4 text-primary" /> checkpoint de atenção
              </span>
              <span className="flex items-center gap-1">
                <LockKeyhole className="h-4 w-4 text-primary" /> estoque separado
              </span>
            </div>
          </div>

          {!currentCampaign ? (
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {campaigns.flatMap((campaign) => campaign.products.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-3xl border border-border bg-background/65 p-5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
                >
                  <div className="flex gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-secondary">
                      {product.product.image_url
                        ? <img src={product.product.image_url} alt="" className="h-full w-full object-cover" />
                        : <Gift className="m-6 h-8 w-8 text-primary" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold uppercase tracking-wider text-primary">{campaign.title}</div>
                      <h2 className="mt-1 truncate text-xl font-black">{product.product.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {product.plan?.name || "Plano de teste"} · {product.trial_duration_minutes} min
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {product.delivery_mode === "automatic"
                          ? `Entrega automática após ~${Math.max(1, Math.ceil(product.auto_delay_seconds / 60))} min`
                          : "Entrega após aprovação do staff"}
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={busy}
                    onClick={() => start(campaign, product)}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
                  >
                    <PlayCircle className="h-4 w-4" /> Começar missão
                  </button>
                </article>
              )))}

              {!campaigns.some((campaign) => campaign.products.length) && (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground lg:col-span-2">
                  Nenhuma campanha de teste está ativa agora.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_.6fr]">
              <section className="relative overflow-hidden rounded-3xl border border-border bg-black shadow-2xl">
                <div className="aspect-video w-full">
                  <div ref={playerHostRef} className="h-full w-full" aria-label="Vídeo da missão" />
                </div>

                {attentionChallenge && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/85 p-6 text-center backdrop-blur-sm">
                    <div className="max-w-sm">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-primary">
                        <Eye className="h-7 w-7" />
                      </div>
                      <h3 className="mt-4 text-xl font-black text-white">Ainda está assistindo?</h3>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                        O contador foi pausado neste checkpoint. Confirme sua presença para continuar.
                      </p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={confirmAttention}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                        Continuar assistindo
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <aside className="rounded-3xl border border-border bg-background/70 p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">Progresso da missão</span>
                  <strong className="text-primary">{progress}%</strong>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>{Math.floor(Number(rewardSession?.watched_seconds || 0))}s válidos</span>
                  <span>{currentCampaign.required_watch_seconds}s necessários</span>
                </div>

                <div className={`mt-5 rounded-2xl border p-4 ${counterState.active
                  ? "border-emerald-500/25 bg-emerald-500/10"
                  : "border-amber-500/25 bg-amber-500/10"}`}>
                  <div className="flex items-start gap-3">
                    {counterState.active
                      ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
                      : <PauseCircle className="mt-0.5 h-5 w-5 text-amber-500" />}
                    <div>
                      <strong className="text-sm">{counterState.label}</strong>
                      <p className="mt-1 text-xs text-muted-foreground">{counterState.detail}</p>
                    </div>
                  </div>
                </div>

                {guardNotice && (
                  <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{guardNotice}</span>
                  </div>
                )}

                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                    <CheckCircle2 className={`mt-0.5 h-5 w-5 ${progress >= 100 ? "text-emerald-500" : "text-muted-foreground"}`} />
                    <div>
                      <strong className="text-sm">Assistir de verdade</strong>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Só conta com a aba visível, janela em foco, vídeo tocando e sem saltos grandes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                    <Eye className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <strong className="text-sm">Checkpoint de atenção</strong>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Em um ponto da missão o vídeo pausa e pede uma confirmação rápida.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                    <Clock3 className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <strong className="text-sm">Entrega</strong>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selected?.delivery_mode === "automatic"
                          ? "Automática quando o prazo e o estoque permitirem."
                          : "Vai para a fila do staff após a solicitação."}
                      </p>
                    </div>
                  </div>
                </div>

                {rewardSession?.status === "completed" && (
                  <button
                    disabled={busy}
                    onClick={requestReward}
                    className="mt-6 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground disabled:opacity-50"
                  >
                    Solicitar meu teste
                  </button>
                )}

                {["requested", "delivering"].includes(rewardSession?.status || "") && (
                  <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm">
                    <strong>Solicitação recebida.</strong>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Aguarde a entrega. Esta tela atualiza automaticamente.
                    </p>
                  </div>
                )}

                {rewardSession?.status === "delivered" && (
                  <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <strong className="text-emerald-500">Teste entregue 🎁</strong>
                    {delivery?.content && (
                      <pre className="mt-3 whitespace-pre-wrap break-all rounded-xl bg-background p-3 text-xs">
                        {delivery.content}
                      </pre>
                    )}
                    {delivery?.expires_at && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Validade: {new Date(delivery.expires_at).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                )}
              </aside>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
