import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, KeyRound, Package } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [codes, orders, packages] = await Promise.all([
        supabase.from("connection_codes").select("id", { count: "exact" }).eq("status", "active"),
        supabase.from("orders").select("amount").eq("status", "paid"),
        supabase.from("packages").select("id", { count: "exact" }).eq("status", "active"),
      ]);
      const totalRevenue = (orders.data || []).reduce((sum, o) => sum + Number(o.amount), 0);
      return {
        activeCodes: codes.count || 0,
        totalRevenue,
        activePackages: packages.count || 0,
      };
    },
  });

  const { data: recentPayments = [] } = useQuery({
    queryKey: ["recent-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, packages(name)")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const cards = [
    { label: "Active Codes", value: stats?.activeCodes ?? 0, icon: KeyRound, color: "text-primary" },
    { label: "Total Revenue", value: `KES ${stats?.totalRevenue?.toLocaleString() ?? 0}`, icon: DollarSign, color: "text-accent" },
    { label: "Active Packages", value: stats?.activePackages ?? 0, icon: Package, color: "text-info" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${c.color}`}>
                <c.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="font-display text-2xl font-bold">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet</p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{p.user_phone}</p>
                    <p className="text-xs text-muted-foreground">{(p.packages as any)?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-sm font-semibold">KES {p.amount}</p>
                    <span className={`text-xs ${p.status === "paid" ? "text-primary" : p.status === "failed" ? "text-destructive" : "text-warning"}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
