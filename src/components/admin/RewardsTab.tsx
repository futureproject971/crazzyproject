import { useEffect, useState } from "react";
import { Gift, Loader2, RefreshCw, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

async function adminRewards(action: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessão expirada");
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rewards?action=${action}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || "Falha no Rewards");
  return body;
}

export default function RewardsTab() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [manual, setManual] = useState<Record<string,string>>({});

  const load = async () => {
    setLoading(true);
    try { const data = await adminRewards("admin-queue"); setSessions(data.sessions || []); }
    catch (e: any) { toast({ title: "Erro no Rewards", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const deliver = async (id: string) => {
    setBusy(id);
    try {
      await adminRewards("admin-deliver", { method: "POST", body: JSON.stringify({ session_id: id, content: manual[id]?.trim() || undefined }) });
      toast({ title: "Trial entregue" });
      setManual((m) => ({ ...m, [id]: "" }));
      await load();
    } catch (e: any) { toast({ title: "Não foi possível entregar", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  };

  return <div>
    <div className="flex items-center justify-between gap-4"><div><h2 className="flex items-center gap-2 text-xl font-bold"><Gift className="h-5 w-5 text-primary"/> Crazzy Rewards</h2><p className="mt-1 text-xs text-muted-foreground">Fila de trials concluídos e aguardando entrega.</p></div><button onClick={load} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"><RefreshCw className="h-3.5 w-3.5"/> Atualizar</button></div>
    {loading ? <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin"/></div> : sessions.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">Nenhuma solicitação pendente.</div> : <div className="mt-6 space-y-3">{sessions.map((s) => <div key={s.id} className="rounded-xl border border-border bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-mono text-xs text-muted-foreground">{s.id}</div><div className="mt-1 text-sm font-bold">Status: {s.status}</div><div className="mt-1 text-xs text-muted-foreground">Usuário: {s.user_id}</div></div><div className="text-right text-xs text-muted-foreground"><div>{Math.floor(Number(s.watched_seconds || 0))}s assistidos</div><div>{new Date(s.created_at).toLocaleString("pt-BR")}</div></div></div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={manual[s.id] || ""} onChange={(e) => setManual((m) => ({...m,[s.id]:e.target.value}))} placeholder="Conteúdo manual (opcional; vazio tenta estoque de trial)" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"/><button onClick={() => deliver(s.id)} disabled={busy===s.id} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy===s.id?<Loader2 className="h-4 w-4 animate-spin"/>:<Send className="h-4 w-4"/>} Entregar</button></div></div>)}</div>}
  </div>;
}
