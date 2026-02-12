import { useState } from "react";
import { Wifi, Clock, Zap, Phone, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Package {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  speed_limit: string;
}

export default function CaptivePortal() {
  const [loginCode, setLoginCode] = useState("");
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentCode, setPaymentCode] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [connectedCode, setConnectedCode] = useState<{
    code: string;
    expires_at: string;
    package_name: string;
  } | null>(null);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("status", "active")
        .order("price", { ascending: true });
      if (error) throw error;
      return data as Package[];
    },
  });

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${minutes / 60} hr${minutes / 60 > 1 ? "s" : ""}`;
    return `${minutes / 1440} day${minutes / 1440 > 1 ? "s" : ""}`;
  };

  const handleBuy = async () => {
    if (!selectedPkg || !phone) return;
    const cleaned = phone.replace(/\s/g, "");
    if (!/^(07|01|2547|2541)\d{7,8}$/.test(cleaned)) {
      toast.error("Enter a valid Safaricom phone number");
      return;
    }
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("mpesa-stk-push", {
        body: { phone: cleaned, package_id: selectedPkg.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("STK Push sent! Check your phone to complete payment.");
      // Poll for payment completion
      const orderId = data.order_id;
      const poll = setInterval(async () => {
        const { data: order } = await supabase
          .from("orders")
          .select("status")
          .eq("id", orderId)
          .maybeSingle();
        if (order?.status === "paid") {
          clearInterval(poll);
          const { data: code } = await supabase
            .from("connection_codes")
            .select("code")
            .eq("order_id", orderId)
            .maybeSingle();
          if (code) {
            setPaymentCode(code.code);
            setSelectedPkg(null);
          }
          setPaying(false);
        } else if (order?.status === "failed") {
          clearInterval(poll);
          toast.error("Payment failed. Please try again.");
          setPaying(false);
        }
      }, 3000);
      setTimeout(() => {
        clearInterval(poll);
        if (paying) {
          setPaying(false);
          toast.error("Payment timeout. Check your M-PESA and try again.");
        }
      }, 120000);
    } catch (e: any) {
      toast.error(e.message || "Payment failed");
      setPaying(false);
    }
  };

  const handleLogin = async () => {
    const code = loginCode.toUpperCase().trim();
    if (code.length !== 5) {
      toast.error("Enter a valid 5-letter connection code");
      return;
    }
    setLoggingIn(true);
    try {
      const { data, error } = await supabase
        .from("connection_codes")
        .select("code, expires_at, status, packages(name)")
        .eq("code", code)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error("Invalid or expired code");
        setLoggingIn(false);
        return;
      }
      if (new Date(data.expires_at) < new Date()) {
        toast.error("This code has expired");
        setLoggingIn(false);
        return;
      }
      setConnectedCode({
        code: data.code,
        expires_at: data.expires_at,
        package_name: (data.packages as any)?.name || "Unknown",
      });
      toast.success("Connected! Enjoy your internet.");
    } catch (e: any) {
      toast.error(e.message || "Login failed");
    }
    setLoggingIn(false);
  };

  if (connectedCode) {
    const remaining = Math.max(0, new Date(connectedCode.expires_at).getTime() - Date.now());
    const hours = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm border-primary/20">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto mb-2 h-12 w-12 text-primary" />
            <CardTitle className="font-display text-2xl">Connected!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Package</p>
              <p className="font-display text-lg font-semibold">{connectedCode.package_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Code (for reconnection)</p>
              <p className="font-display text-3xl font-bold tracking-widest text-primary">
                {connectedCode.code}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time Remaining</p>
              <p className="font-display text-lg font-semibold">
                {hours}h {mins}m
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <Wifi className="h-8 w-8 text-primary" />
          <h1 className="font-display text-2xl font-bold">HotSpot WiFi</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Fast & affordable internet access</p>
      </header>

      <main className="mx-auto max-w-lg space-y-6 p-4">
        {/* Login Section */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Already have a code?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter 5-letter code"
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value.toUpperCase().slice(0, 5))}
                className="font-display text-center text-xl tracking-widest uppercase"
                maxLength={5}
              />
              <Button onClick={handleLogin} disabled={loggingIn || loginCode.length !== 5}>
                {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Packages */}
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold">Buy a Package</h2>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-3">
              {packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                  onClick={() => setSelectedPkg(pkg)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-display font-semibold">{pkg.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(pkg.duration_minutes)} • {pkg.speed_limit}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-primary">
                        KES {pkg.price}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Payment Code Display */}
        {paymentCode && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="p-6 text-center">
              <CheckCircle className="mx-auto mb-2 h-10 w-10 text-primary" />
              <p className="text-sm text-muted-foreground">Payment successful! Your connection code:</p>
              <p className="my-3 font-display text-4xl font-bold tracking-widest text-primary">
                {paymentCode}
              </p>
              <p className="text-xs text-muted-foreground">
                Enter this code above to connect. Save it for reconnection.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Buy Dialog */}
      <Dialog open={!!selectedPkg} onOpenChange={() => !paying && setSelectedPkg(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Pay with M-PESA</DialogTitle>
            <DialogDescription>
              {selectedPkg?.name} — KES {selectedPkg?.price}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Safaricom Phone Number</label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="0712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  maxLength={13}
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleBuy} disabled={paying || !phone}>
              {paying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Waiting for payment...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Pay KES {selectedPkg?.price}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
