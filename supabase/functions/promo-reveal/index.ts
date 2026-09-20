import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function secret() {
  return Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

function secureRandom() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] / 0xffffffff;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = secret();
  if (!supabaseUrl || !serviceKey) return json({ error: "Backend not configured" }, 500);

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: authData, error: authError } = await admin.auth.getUser(authHeader.slice(7));
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

  const userId = authData.user.id;
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await admin
    .from("promo_daily_reveals")
    .select("id,result_key,product_id,reveal_date,created_at")
    .eq("user_id", userId)
    .eq("reveal_date", today)
    .maybeSingle();

  if (existing) {
    let product = null;
    if (existing.product_id) {
      const { data } = await admin
        .from("products")
        .select("id,name,image_url")
        .eq("id", existing.product_id)
        .maybeSingle();
      product = data || null;
    }
    return json({ reveal: existing, product, reused: true });
  }

  const roll = secureRandom();
  let resultKey: "rewards_trial" | "featured_product" | "try_tomorrow";
  if (roll < 0.34) resultKey = "rewards_trial";
  else if (roll < 0.74) resultKey = "featured_product";
  else resultKey = "try_tomorrow";

  let productId: string | null = null;
  let product: any = null;

  if (resultKey === "featured_product") {
    const { data: products } = await admin
      .from("products")
      .select("id,name,image_url")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .limit(40);

    if (products?.length) {
      const index = Math.min(products.length - 1, Math.floor(secureRandom() * products.length));
      product = products[index];
      productId = product.id;
    } else {
      resultKey = "rewards_trial";
    }
  }

  const { data: reveal, error } = await admin
    .from("promo_daily_reveals")
    .insert({
      user_id: userId,
      reveal_date: today,
      result_key: resultKey,
      product_id: productId,
    })
    .select("id,result_key,product_id,reveal_date,created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: winner } = await admin
        .from("promo_daily_reveals")
        .select("id,result_key,product_id,reveal_date,created_at")
        .eq("user_id", userId)
        .eq("reveal_date", today)
        .single();
      return json({ reveal: winner, product: null, reused: true });
    }
    return json({ error: error.message }, 500);
  }

  return json({ reveal, product, reused: false }, 201);
});
