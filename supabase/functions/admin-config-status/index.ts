import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function secretKey() {
  const jsonKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (jsonKeys) {
    try {
      const parsed = JSON.parse(jsonKeys);
      if (parsed?.default) return String(parsed.default);
    } catch {}
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

function publishableKey() {
  const jsonKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (jsonKeys) {
    try {
      const parsed = JSON.parse(jsonKeys);
      if (parsed?.default) return String(parsed.default);
    } catch {}
  }
  return Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const adminSecret = secretKey();
  const publicKey = publishableKey();
  const authHeader = req.headers.get("Authorization") || "";
  if (!url || !adminSecret || !publicKey || !authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const authClient = createClient(url, publicKey, { global: { headers: { Authorization: authHeader } } });
  const { data: authData, error: authError } = await authClient.auth.getUser(authHeader.slice(7));
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(url, adminSecret);
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return json({ error: "Forbidden" }, 403);

  const purinKey = Deno.env.get("PURINCASH_API_KEY") || "";
  const integrations = [
    {
      id: "purincash",
      name: "PurinCash",
      configured: Boolean(purinKey),
      environment: purinKey.startsWith("ps_live_") ? "live" : purinKey.startsWith("ps_test_") ? "sandbox" : purinKey ? "unknown" : "missing",
      requiredSecrets: {
        PURINCASH_API_KEY: Boolean(purinKey),
        PURINCASH_WEBHOOK_SECRET: Boolean(Deno.env.get("PURINCASH_WEBHOOK_SECRET")),
        CHECKOUT_SIGNING_SECRET: Boolean(Deno.env.get("CHECKOUT_SIGNING_SECRET")),
      },
      features: {
        cardCheckout: Deno.env.get("ENABLE_CARD_CHECKOUT") === "true",
      },
    },
    {
      id: "lzt",
      name: "Fornecedor de contas",
      configured: Boolean(Deno.env.get("LZT_MARKET_TOKEN")),
      requiredSecrets: { LZT_MARKET_TOKEN: Boolean(Deno.env.get("LZT_MARKET_TOKEN")) },
    },
    {
      id: "site",
      name: "URL pública do site",
      configured: Boolean(Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL")),
      requiredSecrets: { PUBLIC_SITE_URL: Boolean(Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL")) },
    },
  ];

  return json({ integrations });
});
