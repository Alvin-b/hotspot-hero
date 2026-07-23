import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const callback = body.Body?.stkCallback;
    if (!callback) {
      return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: "No callback data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const checkoutRequestId = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;

    // Find the order
    const { data: order } = await supabase
      .from("orders")
      .select("*, packages(*)")
      .eq("checkout_request_id", checkoutRequestId)
      .maybeSingle();

    if (!order) {
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (resultCode !== 0) {
      await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract MPESA receipt
    let mpesaReceipt = "";
    const items = callback.CallbackMetadata?.Item || [];
    for (const item of items) {
      if (item.Name === "MpesaReceiptNumber") mpesaReceipt = item.Value;
    }

    // Update order as paid
    await supabase
      .from("orders")
      .update({ status: "paid", mpesa_receipt: mpesaReceipt })
      .eq("id", order.id);

    // Generate unique 5-letter code
    let code: string;
    let attempts = 0;
    do {
      code = generateCode();
      const { data: existing } = await supabase
        .from("connection_codes")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (!existing) break;
      attempts++;
    } while (attempts < 50);

    const pkg = order.packages;
    const expiresAt = new Date(Date.now() + pkg.duration_minutes * 60000).toISOString();
    const radiusUsername = `hs-${code}`;
    const radiusPassword = Math.random().toString(36).slice(2, 10);

    // Create connection code
    await supabase.from("connection_codes").insert({
      code,
      order_id: order.id,
      package_id: pkg.id,
      radius_username: radiusUsername,
      radius_password: radiusPassword,
      expires_at: expiresAt,
      status: "active",
    });

    // Create RADIUS credentials (radcheck)
    await supabase.from("radcheck").insert([
      { username: radiusUsername, attribute: "Cleartext-Password", op: ":=", value: radiusPassword },
      { username: radiusUsername, attribute: "Session-Timeout", op: ":=", value: String(pkg.duration_minutes * 60) },
    ]);

    // Create RADIUS reply attributes (radreply)
    if (pkg.speed_limit) {
      const [down, up] = pkg.speed_limit.split("/");
      await supabase.from("radreply").insert([
        { username: radiusUsername, attribute: "WISPr-Bandwidth-Max-Down", op: ":=", value: String(parseSpeed(down)) },
        { username: radiusUsername, attribute: "WISPr-Bandwidth-Max-Up", op: ":=", value: String(parseSpeed(up || down)) },
      ]);
    }

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Callback error:", e);
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseSpeed(s: string): number {
  const str = s.trim().toUpperCase();
  const num = parseFloat(str);
  if (str.endsWith("M")) return num * 1000000;
  if (str.endsWith("K")) return num * 1000;
  return num;
}
