import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_DISCORD = "https://discord.gg/zKUtxQcwh2";

export function useDiscordUrl(): string {
  const { data } = useQuery({
    queryKey: ["discord-invite-url"],
    queryFn: async () => {
      const { data: cred, error } = await supabase
        .from("system_credentials")
        .select("value")
        .eq("env_key", "DISCORD_INVITE_URL")
        .maybeSingle();
      if (error || !cred?.value?.trim()) return DEFAULT_DISCORD;
      const url = String(cred.value).trim();
      return url.startsWith("http") ? url : `https://discord.gg/${url.replace(/^\/+/, "")}`;
    },
    staleTime: 30_000, // 30s para refletir alterações no admin
  });
  return data ?? DEFAULT_DISCORD;
}
