import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calculateServerTotal } from "../_shared/checkout.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const authHeader = req.headers.get("Authorization") || "";

    if (!supabaseUrl || !serviceRoleKey || !authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.slice(7);
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "").trim().toUpperCase();
    const cartSnapshot = Array.isArray(body?.cart_snapshot) ? body.cart_snapshot : [];

    if (!/^[A-Z0-9]{1,32}$/.test(code)) {
      return json({ error: "Cupom inválido" }, 400);
    }
    if (!cartSnapshot.length) {
      return json({ error: "Carrinho vazio" }, 400);
    }

    const { data: coupon, error: couponError } = await admin
      .from("coupons")
      .select("id, code")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();

    if (couponError || !coupon) {
      // Keep the response generic so this endpoint cannot be used to distinguish
      // inactive/private coupon records from nonexistent codes.
      return json({ error: "Cupom inválido ou indisponível" }, 400);
    }

    const authoritative = await calculateServerTotal(
      admin,
      cartSnapshot,
      coupon.id,
      user.id,
    );

    if (authoritative.error) {
      return json({ error: authoritative.error }, 400);
    }

    return json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
      },
      authoritativeSubtotalCents: authoritative.subtotal,
      authoritativeTotalCents: authoritative.total,
      authoritativeDiscountCents: authoritative.discountAmount,
    });
  } catch (error) {
    console.error("[coupon-validate]", error);
    return json({ error: "Não foi possível validar o cupom" }, 500);
  }
});
