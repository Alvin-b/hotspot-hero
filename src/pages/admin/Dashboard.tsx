import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseAuthFetch, supabaseAuthCount } from "@/lib/supabase-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, KeyRound, Package, Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const { session } = useAuth();
  const token = session?.access_token || "";

  const { data: activeCodes = 0 } = useQuery({
    queryKey: ["admin-active-codes", token],
    queryFn: () => supabaseAuthCount("connection_codes", "status=eq.active", token),
    enabled: !!token,
    retry: 1,
  });

  const { data: totalRevenue = 0 } = useQuery({
    queryKey: ["admin-revenue", token],
    queryFn: async () => {
      const data = await supabaseAuthFetch<any[]>("orders", "status=eq.paid&select=amount", token);
      return (data || []).reduce((sum: number, o: any) => sum + Number(o.amount), 0);
    },
    enabled: !!token,
    retry: 1,
  });

  const { data: activePackages = 0 } = useQuery({
    queryKey: ["admin-packages-count", token],
    queryFn: () => supabaseAuthCount("packages", "status=eq.active", token),
    enabled: !!token,
    retry: 1,
  });

  const { data: recentPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["recent-payments", token],
    queryFn: () =>
      supabaseAuthFetch<any[]>(
        "orders",
        "select=*,packages(name)&order=created_at.desc&limit=10",
        token
      ),
    enabled: !!token,
    retry: 1,
  });

  const cards = [
    { label: "Active Codes", value: activeCodes, icon: KeyRound, color: "text-primary" },
    { label: "Total Revenue", value: `KES ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-accent" },
    { label: "Active Packages", value: activePackages, icon: Package, color: "text-info" },
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
          {paymentsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : recentPayments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No payments yet</p>
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
