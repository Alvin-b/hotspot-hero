import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, package_id } = await req.json();
    if (!phone || !package_id) {
      return new Response(JSON.stringify({ error: "Phone and package_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get package details
    const { data: pkg, error: pkgErr } = await supabase
      .from("packages")
      .select("*")
      .eq("id", package_id)
      .single();
    if (pkgErr || !pkg) {
      return new Response(JSON.stringify({ error: "Package not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format phone to 254...
    let formatted = phone.replace(/\s/g, "");
    if (formatted.startsWith("0")) formatted = "254" + formatted.slice(1);
    if (formatted.startsWith("+")) formatted = formatted.slice(1);

    // Create order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_phone: formatted,
        package_id: pkg.id,
        amount: pkg.price,
        status: "pending",
      })
      .select()
      .single();
    if (orderErr) throw orderErr;

    // Get MPESA credentials
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const shortcode = Deno.env.get("MPESA_SHORTCODE");
    const passkey = Deno.env.get("MPESA_PASSKEY");
    const callbackUrl = Deno.env.get("MPESA_CALLBACK_URL") || `${supabaseUrl}/functions/v1/payment-callback`;

    if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
      // Update order to failed if no credentials
      await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
      return new Response(JSON.stringify({ error: "MPESA not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get OAuth token
    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenRes = await fetch(
      "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${auth}` } }
    );
    const { access_token } = await tokenRes.json();

    // STK Push
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, "")
      .slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const stkRes = await fetch(
      "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Math.ceil(pkg.price),
          PartyA: formatted,
          PartyB: "522522",
          PhoneNumber: formatted,
          CallBackURL: callbackUrl,
          AccountReference: "7718913",
          TransactionDesc: `Payment for ${pkg.name}`,
        }),
      }
    );

    const stkData = await stkRes.json();

    if (stkData.ResponseCode === "0") {
      await supabase
        .from("orders")
        .update({ checkout_request_id: stkData.CheckoutRequestID })
        .eq("id", order.id);

      return new Response(
        JSON.stringify({ success: true, order_id: order.id, checkout_request_id: stkData.CheckoutRequestID }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
      return new Response(
        JSON.stringify({ error: stkData.errorMessage || "STK Push failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
