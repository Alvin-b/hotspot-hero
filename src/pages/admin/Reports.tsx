import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function ReportsPage() {
  const { data: dailyRevenue = [] } = useQuery({
    queryKey: ["daily-revenue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("amount, created_at")
        .eq("status", "paid")
        .order("created_at", { ascending: true });
      if (!data) return [];
      const grouped: Record<string, number> = {};
      data.forEach((o) => {
        const day = new Date(o.created_at).toLocaleDateString("en-KE", { month: "short", day: "numeric" });
        grouped[day] = (grouped[day] || 0) + Number(o.amount);
      });
      return Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));
    },
  });

  const { data: codeStats } = useQuery({
    queryKey: ["code-stats"],
    queryFn: async () => {
      const [active, expired, terminated] = await Promise.all([
        supabase.from("connection_codes").select("id", { count: "exact" }).eq("status", "active"),
        supabase.from("connection_codes").select("id", { count: "exact" }).eq("status", "expired"),
        supabase.from("connection_codes").select("id", { count: "exact" }).eq("status", "terminated"),
      ]);
      return {
        active: active.count || 0,
        expired: expired.count || 0,
        terminated: terminated.count || 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="font-display text-lg font-semibold">Reports</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Active Codes</p>
            <p className="font-display text-3xl font-bold text-primary">{codeStats?.active ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Expired Codes</p>
            <p className="font-display text-3xl font-bold">{codeStats?.expired ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Terminated Codes</p>
            <p className="font-display text-3xl font-bold text-destructive">{codeStats?.terminated ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Daily Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyRevenue.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No revenue data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="revenue" fill="hsl(145, 70%, 36%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
