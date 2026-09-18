import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, ExternalLink, KeyRound, Loader2, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface IntegrationStatus {
  id: string;
  name: string;
  configured: boolean;
  environment?: "live" | "sandbox" | "unknown" | "missing";
  requiredSecrets: Record<string, boolean>;
}

const DEFAULT_DISCORD = "https://discord.gg/zKUtxQcwh2";

const CredentialsTab = () => {
  const queryClient = useQueryClient();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [discordUrl, setDiscordUrl] = useState(DEFAULT_DISCORD);
  const [savingDiscord, setSavingDiscord] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const [{ data: statusData, error: statusError }, { data: discordData }] = await Promise.all([
        supabase.functions.invoke("admin-config-status"),
        supabase
          .from("system_credentials")
          .select("value")
          .eq("env_key", "DISCORD_INVITE_URL")
          .maybeSingle(),
      ]);

      if (statusError) throw statusError;
      setIntegrations((statusData?.integrations || []) as IntegrationStatus[]);
      if (discordData?.value?.trim()) setDiscordUrl(String(discordData.value).trim());
    } catch (error: any) {
      toast({
        title: "Não foi possível verificar as integrações",
        description: error?.message || "Confira a Edge Function admin-config-status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const saveDiscord = async () => {
    const normalized = discordUrl.trim();
    if (!/^https:\/\//i.test(normalized)) {
      toast({ title: "URL inválida", description: "Use uma URL HTTPS completa.", variant: "destructive" });
      return;
    }

    setSavingDiscord(true);
    const { error } = await supabase
      .from("system_credentials")
      .upsert(
        {
          name: "Discord Invite URL",
          env_key: "DISCORD_INVITE_URL",
          value: normalized,
          description: "Configuração pública. Não armazenar tokens ou API keys nesta tabela.",
          help_url: "https://discord.com/",
        },
        { onConflict: "env_key" },
      );
    setSavingDiscord(false);

    if (error) {
      toast({ title: "Erro ao salvar Discord", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["discord-invite-url"] });
    toast({ title: "Link do Discord atualizado" });
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Integrações & Segredos</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Chaves privadas não são mais carregadas no navegador. O painel mostra somente se cada segredo do backend está configurado.
          </p>
        </div>
        <button
          onClick={loadStatus}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground transition hover:border-success/40 hover:text-foreground disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Verificar
        </button>
      </div>

      <div className="rounded-xl border border-success/20 bg-success/[0.04] p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <div>
            <p className="text-sm font-bold text-foreground">Segredo fica no servidor</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Configure API keys nos Secrets das Edge Functions. Nunca salve <code className="rounded bg-secondary px-1 py-0.5">ps_live_...</code>, tokens ou webhook secrets em tabelas públicas, VITE_*, localStorage ou bundles do frontend.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-border py-20">
          <Loader2 className="h-6 w-6 animate-spin text-success" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {integrations.map((integration) => {
            const allRequired = Object.values(integration.requiredSecrets).every(Boolean);
            return (
              <div key={integration.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">{integration.name}</h3>
                        {integration.environment && integration.environment !== "missing" && (
                          <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            {integration.environment === "live" ? "produção" : integration.environment}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 space-y-2">
                        {Object.entries(integration.requiredSecrets).map(([key, configured]) => (
                          <div key={key} className="flex items-center gap-2">
                            {configured ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            ) : (
                              <CircleAlert className="h-3.5 w-3.5 text-amber-500" />
                            )}
                            <code className="text-[10px] text-muted-foreground">{key}</code>
                            <span className={`ml-auto text-[9px] font-bold uppercase tracking-wider ${configured ? "text-success" : "text-amber-500"}`}>
                              {configured ? "configurado" : "faltando"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${allRequired ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-500"}`}>
                    {allRequired ? "pronto" : "atenção"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-success" />
          <h3 className="text-sm font-bold text-foreground">Link público do Discord</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Este campo é público e pode ficar no banco. Ele não é uma credencial secreta.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={discordUrl}
            onChange={(event) => setDiscordUrl(event.target.value.slice(0, 300))}
            className="min-w-0 flex-1 rounded-lg border border-border bg-secondary/40 px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-success/50"
            placeholder="https://discord.gg/..."
          />
          <button
            onClick={saveDiscord}
            disabled={savingDiscord}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-success px-5 py-2.5 text-sm font-semibold text-success-foreground disabled:opacity-50"
          >
            {savingDiscord ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CredentialsTab;
