import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body safely (invoke always sends POST)
    let body: any = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch { /* empty body = list users */ }

    const { action, target_user_id, reason } = body;

    // If no action, list users
    if (!action) {
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (listError) throw listError;

      const { data: profiles } = await supabase.from("profiles").select("user_id, username, avatar_url, banned, banned_at, banned_reason");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const { data: ips } = await supabase.from("user_login_ips").select("user_id, ip_address, logged_at").order("logged_at", { ascending: false });
      const { data: payments } = await supabase.from("payments").select("user_id, amount, status, created_at, cart_snapshot, coupon_id, discount_amount").order("created_at", { ascending: false });
      const { data: tickets } = await supabase.from("order_tickets").select("id, user_id, product_id, product_plan_id, status, created_at, stock_content");
      const { data: rewardSessions } = await supabase.from("reward_sessions").select("id, user_id, status, watched_seconds, completed_at, created_at").order("created_at", { ascending: false });
      const { data: rewardDeliveries } = await supabase.from("reward_deliveries").select("id, user_id, content, delivered_at, expires_at").order("delivered_at", { ascending: false });
      const { data: promoReveals } = await supabase.from("promo_daily_reveals").select("id, user_id, prize_type, prize_value, created_at").order("created_at", { ascending: false });

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      const roleMap = new Map<string, string[]>();
      (roles || []).forEach((r: any) => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      const ipMap = new Map<string, { ip_address: string; logged_at: string }[]>();
      (ips || []).forEach((ip: any) => {
        const existing = ipMap.get(ip.user_id) || [];
        if (existing.length < 1) existing.push({ ip_address: ip.ip_address, logged_at: ip.logged_at });
        ipMap.set(ip.user_id, existing);
      });

      // Calculate total spent, total orders, and recent payments per user
      const spentMap = new Map<string, number>();
      const ordersMap = new Map<string, number>();
      const recentPaymentsMap = new Map<string, any[]>();
      const couponIds = [...new Set((payments || []).map((p: any) => p.coupon_id).filter(Boolean))];
      const { data: coupons } = couponIds.length > 0
        ? await supabase.from("coupons").select("id, code").in("id", couponIds)
        : { data: [] };
      const couponMap = new Map((coupons || []).map((c: any) => [c.id, c.code]));

      (payments || []).forEach((p: any) => {
        if (p.status === "COMPLETED") {
          spentMap.set(p.user_id, (spentMap.get(p.user_id) || 0) + p.amount);
        }
        const couponCode = p.coupon_id ? couponMap.get(p.coupon_id) : null;
        const existing = recentPaymentsMap.get(p.user_id) || [];
        if (existing.length < 5) existing.push({
          amount: p.amount,
          status: p.status,
          created_at: p.created_at,
          cart_snapshot: p.cart_snapshot,
          coupon_id: p.coupon_id,
          coupon_code: couponCode,
          discount_amount: p.discount_amount,
        });
        recentPaymentsMap.set(p.user_id, existing);
      });
      (tickets || []).forEach((t: any) => {
        ordersMap.set(t.user_id, (ordersMap.get(t.user_id) || 0) + 1);
      });

      const groupByUser = (rows: any[] | null, limit = 20) => {
        const map = new Map<string, any[]>();
        (rows || []).forEach((row: any) => {
          const current = map.get(row.user_id) || [];
          if (current.length < limit) current.push(row);
          map.set(row.user_id, current);
        });
        return map;
      };
      const rewardSessionMap = groupByUser(rewardSessions);
      const rewardDeliveryMap = groupByUser(rewardDeliveries);
      const promoRevealMap = groupByUser(promoReveals);

      const result = (users || []).map((u: any) => {
        const profile = profileMap.get(u.id);
        return {
          id: u.id,
          email: u.email || "",
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          email_confirmed_at: u.email_confirmed_at,
          username: profile?.username || null,
          avatar_url: profile?.avatar_url || null,
          banned: profile?.banned || false,
          banned_at: profile?.banned_at || null,
          banned_reason: profile?.banned_reason || null,
          roles: roleMap.get(u.id) || [],
          login_ips: ipMap.get(u.id) || [],
          total_spent: spentMap.get(u.id) || 0,
          total_orders: ordersMap.get(u.id) || 0,
          recent_payments: recentPaymentsMap.get(u.id) || [],
          reward_sessions: rewardSessionMap.get(u.id) || [],
          reward_deliveries: rewardDeliveryMap.get(u.id) || [],
          promo_reveals: promoRevealMap.get(u.id) || [],
          provider: u.app_metadata?.provider || "email",
        };
      });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action handling
    {
      if (!target_user_id) {
        return new Response(JSON.stringify({ error: "Missing target_user_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent self-actions
      if (target_user_id === caller.id && (action === "ban" || action === "remove_admin")) {
        return new Response(JSON.stringify({ error: "Não é possível executar esta ação em si mesmo" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      switch (action) {
        case "ban": {
          await supabase.from("profiles").update({
            banned: true,
            banned_at: new Date().toISOString(),
            banned_reason: reason || "Banido pelo admin",
          }).eq("user_id", target_user_id);

          return new Response(JSON.stringify({ ok: true, message: "Usuário banido" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        case "unban": {
          await supabase.from("profiles").update({
            banned: false,
            banned_at: null,
            banned_reason: null,
          }).eq("user_id", target_user_id);

          return new Response(JSON.stringify({ ok: true, message: "Usuário desbanido" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        case "add_admin": {
          const { error } = await supabase.from("user_roles").insert({
            user_id: target_user_id,
            role: "admin",
          });
          if (error && error.code === "23505") {
            return new Response(JSON.stringify({ error: "Usuário já é admin" }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (error) throw error;
          return new Response(JSON.stringify({ ok: true, message: "Admin adicionado" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        case "remove_admin": {
          await supabase.from("user_roles").delete()
            .eq("user_id", target_user_id)
            .eq("role", "admin");
          return new Response(JSON.stringify({ ok: true, message: "Admin removido" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        default:
          return new Response(JSON.stringify({ error: "Unknown action" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
      }
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
