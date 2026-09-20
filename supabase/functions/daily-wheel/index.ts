import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const secret =
      Deno.env.get("SUPABASE_SECRET_KEY") ||
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      "";
    if (!url || !secret) return json({ error: "Backend not configured" }, 500);

    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "";
    if (!token) return json({ error: "Entre na sua conta para girar." }, 401);

    const admin = createClient(url, secret);
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user || user.is_anonymous) {
      return json({ error: "Entre na sua conta para girar." }, 401);
    }

    const { data, error: claimError } = await admin.rpc("claim_daily_wheel", {
      p_user_id: user.id,
    });

    if (claimError) {
      console.error("[daily-wheel]", claimError.code, claimError.message);
      return json({ error: "Não foi possível abrir sua roleta. Tente novamente." }, 500);
    }

    return json(data);
  } catch (error) {
    console.error("[daily-wheel]", error);
    return json({ error: "Roleta temporariamente indisponível." }, 500);
  }
});
