import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CodesPage() {
  const qc = useQueryClient();

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["admin-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connection_codes")
        .select("*, packages(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const terminateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("connection_codes").update({ status: "terminated" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-codes"] });
      toast.success("Code terminated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusColor = (status: string) => {
    if (status === "active") return "default";
    if (status === "expired") return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-semibold">Connection Codes</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : codes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No codes yet
                  </TableCell>
                </TableRow>
              ) : (
                codes.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-display font-bold tracking-widest">{c.code}</TableCell>
                    <TableCell>{(c.packages as any)?.name}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(c.expires_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColor(c.status) as any}>{c.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.status === "active" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => terminateMutation.mutate(c.id)}
                          disabled={terminateMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
