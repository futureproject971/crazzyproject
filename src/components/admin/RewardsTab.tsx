import { useEffect, useMemo, useState } from "react";
import { Ban, Gift, Loader2, PackagePlus, Plus, RefreshCw, Save, Send, Settings2, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CRAZZY_SUPABASE_PUBLIC } from "@/config/supabasePublic";
import { toast } from "@/hooks/use-toast";

async function adminRewards(action: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessão expirada");
  const rewardsUrl = import.meta.env.VITE_SUPABASE_URL || CRAZZY_SUPABASE_PUBLIC.url;
  const res = await fetch(`${rewardsUrl}/functions/v1/rewards?action=${action}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || "Falha no Rewards");
  return body;
}

type Campaign = {
  id: string;
  title: string;
  description: string;
  video_url: string;
  required_watch_seconds: number;
  cooldown_hours: number;
  active: boolean;
  sort_order: number;
  requirements: Record<string, unknown>;
};

type CampaignProduct = {
  id: string;
  campaign_id: string;
  product_id: string;
  product_plan_id: string | null;
  trial_duration_minutes: number;
  delivery_mode: string;
  auto_delay_seconds: number;
  active: boolean;
};

type Product = {
  id: string;
  name: string;
  product_plans: { id: string; name: string; active: boolean }[];
};

type TrialStock = {
  id: string;
  product_plan_id: string;
  content: string;
  duration_minutes: number;
  used: boolean;
  used_at: string | null;
  created_at: string;
};

export default function RewardsTab() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignProducts, setCampaignProducts] = useState<CampaignProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [trialStock, setTrialStock] = useState<TrialStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [manual, setManual] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [watchSeconds, setWatchSeconds] = useState(60);
  const [cooldownHours, setCooldownHours] = useState(24);
  const [productId, setProductId] = useState("");
  const [planId, setPlanId] = useState("");
  const [trialMinutes, setTrialMinutes] = useState(60);
  const [deliveryMode, setDeliveryMode] = useState<"manual" | "automatic">("manual");
  const [autoDelay, setAutoDelay] = useState(0);
  const [attentionCheckpoint, setAttentionCheckpoint] = useState(true);
  const [maxPlaybackRate, setMaxPlaybackRate] = useState(1.25);

  const [stockPlanId, setStockPlanId] = useState("");
  const [stockContent, setStockContent] = useState("");
  const [stockDuration, setStockDuration] = useState(60);

  const selectedProduct = useMemo(() => products.find((p) => p.id === productId), [products, productId]);

  useEffect(() => {
    if (!selectedProduct?.product_plans.some((p) => p.id === planId)) {
      setPlanId(selectedProduct?.product_plans.find((p) => p.active)?.id || "");
    }
  }, [selectedProduct, planId]);

  const load = async () => {
    setLoading(true);
    try {
      const [queue, campaignsRes, linksRes, productsRes, stockRes] = await Promise.all([
        adminRewards("admin-queue"),
        supabase.from("reward_campaigns").select("*").order("sort_order", { ascending: true }),
        supabase.from("reward_campaign_products").select("*").order("sort_order", { ascending: true }),
        supabase.from("products").select("id,name,product_plans(id,name,active)").eq("active", true).order("sort_order", { ascending: true }),
        supabase.from("trial_stock_items").select("*").order("created_at", { ascending: false }).limit(250),
      ]);

      if (campaignsRes.error) throw campaignsRes.error;
      if (linksRes.error) throw linksRes.error;
      if (productsRes.error) throw productsRes.error;
      if (stockRes.error) throw stockRes.error;

      setSessions(queue.sessions || []);
      setCampaigns((campaignsRes.data || []) as Campaign[]);
      setCampaignProducts((linksRes.data || []) as CampaignProduct[]);
      setProducts((productsRes.data || []) as unknown as Product[]);
      setTrialStock((stockRes.data || []) as TrialStock[]);

      const firstProduct = (productsRes.data || [])[0] as any;
      if (!productId && firstProduct) setProductId(firstProduct.id);
      if (!stockPlanId && firstProduct?.product_plans?.[0]) setStockPlanId(firstProduct.product_plans[0].id);
    } catch (e: any) {
      toast({ title: "Erro no Rewards", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createCampaign = async () => {
    if (!title.trim() || !videoUrl.trim() || !productId || !planId) {
      toast({ title: "Preencha campanha, vídeo, produto e plano", variant: "destructive" });
      return;
    }
    setBusy("create-campaign");
    try {
      const nextSort = campaigns.length ? Math.max(...campaigns.map((c) => c.sort_order || 0)) + 1 : 0;
      const { data: campaign, error } = await supabase.from("reward_campaigns").insert({
        title: title.trim(),
        description: description.trim(),
        video_url: videoUrl.trim(),
        video_provider: "youtube",
        required_watch_seconds: Math.max(1, Math.trunc(watchSeconds)),
        cooldown_hours: Math.max(0, Math.trunc(cooldownHours)),
        requirements: {
          attention_checkpoint: attentionCheckpoint,
          checkpoint_min_percent: 45,
          checkpoint_max_percent: 65,
          max_playback_rate: Math.min(2, Math.max(1, Number(maxPlaybackRate) || 1.25)),
          heartbeat_nonce: true,
        },
        active: true,
        sort_order: nextSort,
      }).select("id").single();
      if (error || !campaign) throw error || new Error("Campanha não criada");

      const { error: linkError } = await supabase.from("reward_campaign_products").insert({
        campaign_id: campaign.id,
        product_id: productId,
        product_plan_id: planId,
        trial_duration_minutes: Math.max(1, Math.trunc(trialMinutes)),
        delivery_mode: deliveryMode,
        auto_delay_seconds: Math.max(0, Math.trunc(autoDelay)),
        active: true,
        sort_order: 0,
      });
      if (linkError) {
        await supabase.from("reward_campaigns").delete().eq("id", campaign.id);
        throw linkError;
      }

      setTitle("");
      setDescription("");
      setVideoUrl("");
      toast({ title: "Campanha criada" });
      await load();
    } catch (e: any) {
      toast({ title: "Não foi possível criar a campanha", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const toggleCampaign = async (campaign: Campaign) => {
    setBusy(`campaign-${campaign.id}`);
    try {
      const { error } = await supabase.from("reward_campaigns").update({ active: !campaign.active }).eq("id", campaign.id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      toast({ title: "Erro ao alterar campanha", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const addTrialStock = async () => {
    if (!stockPlanId || !stockContent.trim()) {
      toast({ title: "Selecione o plano e informe a chave/conteúdo", variant: "destructive" });
      return;
    }
    setBusy("stock");
    try {
      const entries = stockContent.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).slice(0, 500);
      if (!entries.length) throw new Error("Nenhuma chave válida");
      const { error } = await supabase.from("trial_stock_items").insert(entries.map((content) => ({
        product_plan_id: stockPlanId,
        content,
        duration_minutes: Math.max(1, Math.trunc(stockDuration)),
        used: false,
      })));
      if (error) throw error;
      setStockContent("");
      toast({ title: "Estoque de trial adicionado", description: `${entries.length} item(ns) inseridos.` });
      await load();
    } catch (e: any) {
      toast({ title: "Erro ao adicionar estoque", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const rejectSession = async (id: string) => {
    setBusy(`reject-${id}`);
    try {
      await adminRewards("admin-reject", { method: "POST", body: JSON.stringify({ session_id: id }) });
      toast({ title: "Solicitação recusada" });
      await load();
    } catch (e: any) {
      toast({ title: "Não foi possível recusar", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const deliver = async (id: string) => {
    setBusy(id);
    try {
      await adminRewards("admin-deliver", { method: "POST", body: JSON.stringify({ session_id: id, content: manual[id]?.trim() || undefined }) });
      toast({ title: "Trial entregue" });
      setManual((m) => ({ ...m, [id]: "" }));
      await load();
    } catch (e: any) {
      toast({ title: "Não foi possível entregar", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const availableStock = trialStock.filter((s) => !s.used).length;
  const usedStock = trialStock.filter((s) => s.used).length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold"><Gift className="h-5 w-5 text-primary" /> CRAZZY Club</h2>
          <p className="mt-1 text-xs text-muted-foreground">FREE + Prêmios: campanhas, testes grátis e entregas em um único lugar.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </button>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          <div><h3 className="font-bold">FREE + Prêmios</h3><p className="mt-1 text-xs text-muted-foreground">Crie missões de vídeo que liberam trial ou recompensa para o cliente.</p></div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da campanha" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="URL do vídeo YouTube" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" className="min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2" />
          <label className="grid gap-1 text-xs text-muted-foreground">Tempo obrigatório (segundos)<input type="number" min={1} value={watchSeconds} onChange={(e) => setWatchSeconds(Number(e.target.value))} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" /></label>
          <label className="grid gap-1 text-xs text-muted-foreground">Cooldown (horas)<input type="number" min={0} value={cooldownHours} onChange={(e) => setCooldownHours(Number(e.target.value))} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" /></label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">Produto</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">Plano</option>
            {(selectedProduct?.product_plans || []).filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <label className="grid gap-1 text-xs text-muted-foreground">Duração do trial (min)<input type="number" min={1} value={trialMinutes} onChange={(e) => setTrialMinutes(Number(e.target.value))} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" /></label>
          <select value={deliveryMode} onChange={(e) => setDeliveryMode(e.target.value as "manual" | "automatic")} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="manual">Entrega manual</option>
            <option value="automatic">Entrega automática</option>
          </select>
          <label className="grid gap-1 text-xs text-muted-foreground md:col-span-2">Atraso da entrega automática (segundos)<input type="number" min={0} value={autoDelay} onChange={(e) => setAutoDelay(Number(e.target.value))} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" /></label>

          <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-3 text-xs text-muted-foreground">
            <span>
              <strong className="block text-foreground">Checkpoint de atenção</strong>
              Pausa o contador uma vez entre 45% e 65% da missão até o usuário confirmar presença.
            </span>
            <input
              type="checkbox"
              checked={attentionCheckpoint}
              onChange={(e) => setAttentionCheckpoint(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
          </label>

          <label className="grid gap-1 text-xs text-muted-foreground">
            Velocidade máxima que conta
            <select
              value={maxPlaybackRate}
              onChange={(e) => setMaxPlaybackRate(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value={1}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
            </select>
          </label>
        </div>
        <button onClick={createCampaign} disabled={busy === "create-campaign"} className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {busy === "create-campaign" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Criar campanha
        </button>

        {campaigns.length > 0 && (
          <div className="mt-5 grid gap-2 lg:grid-cols-2">
            {campaigns.map((campaign) => {
              const linked = campaignProducts.filter((cp) => cp.campaign_id === campaign.id);
              return (
                <div key={campaign.id} className="rounded-lg border border-border bg-background/50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold">{campaign.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {campaign.required_watch_seconds}s • cooldown {campaign.cooldown_hours}h • {linked.length} recompensa(s)
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {(campaign.requirements as any)?.attention_checkpoint !== false ? "checkpoint ativo" : "sem checkpoint"} • máx. {(campaign.requirements as any)?.max_playback_rate || 1.25}x
                      </div>
                    </div>
                    <button onClick={() => toggleCampaign(campaign)} disabled={busy === `campaign-${campaign.id}`} className={campaign.active ? "text-emerald-500" : "text-muted-foreground"} aria-label={campaign.active ? "Desativar campanha" : "Ativar campanha"}>
                      {campaign.active ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="flex items-center gap-2 font-bold"><PackagePlus className="h-4 w-4 text-primary" /> Prêmios / estoque de trial</h3><p className="mt-1 text-xs text-muted-foreground">{availableStock} disponível(is) • {usedStock} usado(s)</p></div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_140px]">
          <select value={stockPlanId} onChange={(e) => setStockPlanId(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">Selecione um plano</option>
            {products.flatMap((p) => p.product_plans.filter((plan) => plan.active).map((plan) => <option key={plan.id} value={plan.id}>{p.name} • {plan.name}</option>))}
          </select>
          <input type="number" min={1} value={stockDuration} onChange={(e) => setStockDuration(Number(e.target.value))} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" title="Duração em minutos" />
          <textarea value={stockContent} onChange={(e) => setStockContent(e.target.value)} placeholder="Uma chave/conteúdo por linha" className="min-h-28 rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2" />
        </div>
        <button onClick={addTrialStock} disabled={busy === "stock"} className="mt-3 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-bold text-primary disabled:opacity-50">
          {busy === "stock" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Adicionar estoque
        </button>
      </section>

      <section>
        <h3 className="font-bold">Entregas pendentes</h3>
        {sessions.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">Nenhuma solicitação pendente.</div>
        ) : (
          <div className="mt-3 space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><div className="text-sm font-bold">Status: {s.status}</div><div className="mt-1 text-xs text-muted-foreground">Solicitação de recompensa</div></div>
                  <div className="text-right text-xs text-muted-foreground"><div>{Math.floor(Number(s.watched_seconds || 0))}s assistidos</div><div>{new Date(s.created_at).toLocaleString("pt-BR")}</div></div>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input value={manual[s.id] || ""} onChange={(e) => setManual((m) => ({ ...m, [s.id]: e.target.value }))} placeholder="Conteúdo manual (opcional; vazio tenta estoque de trial)" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  <button onClick={() => rejectSession(s.id)} disabled={busy !== null} className="flex items-center justify-center gap-2 rounded-lg border border-destructive/40 px-4 py-2 text-sm font-bold text-destructive disabled:opacity-50">
                    {busy === `reject-${s.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Recusar
                  </button>
                  <button onClick={() => deliver(s.id)} disabled={busy !== null} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
                    {busy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Entregar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
