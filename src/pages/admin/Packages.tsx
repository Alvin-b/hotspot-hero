import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type DurationUnit = "minutes" | "hours" | "days" | "weeks" | "months";

interface PkgForm {
  name: string;
  price: string;
  duration_value: string;
  duration_unit: DurationUnit;
  speed_limit: string;
}

const emptyForm: PkgForm = {
  name: "",
  price: "",
  duration_value: "",
  duration_unit: "hours",
  speed_limit: "2M/2M",
};

const unitToMinutes: Record<DurationUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
  months: 43200,
};

const minutesToBestUnit = (minutes: number): { value: number; unit: DurationUnit } => {
  if (minutes % 43200 === 0) return { value: minutes / 43200, unit: "months" };
  if (minutes % 10080 === 0) return { value: minutes / 10080, unit: "weeks" };
  if (minutes % 1440 === 0) return { value: minutes / 1440, unit: "days" };
  if (minutes % 60 === 0) return { value: minutes / 60, unit: "hours" };
  return { value: minutes, unit: "minutes" };
};

const formatDuration = (minutes: number) => {
  const { value, unit } = minutesToBestUnit(minutes);
  const labels: Record<DurationUnit, string> = {
    minutes: value === 1 ? "minute" : "minutes",
    hours: value === 1 ? "hour" : "hours",
    days: value === 1 ? "day" : "days",
    weeks: value === 1 ? "week" : "weeks",
    months: value === 1 ? "month" : "months",
  };
  return `${value} ${labels[unit]}`;
};

export default function PackagesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PkgForm>(emptyForm);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["admin-packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("packages").select("*").order("price");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const durationMinutes =
        parseInt(form.duration_value) * unitToMinutes[form.duration_unit];
      if (isNaN(durationMinutes) || durationMinutes <= 0) throw new Error("Invalid duration");

      const payload = {
        name: form.name,
        price: parseFloat(form.price),
        duration_minutes: durationMinutes,
        speed_limit: form.speed_limit,
      };
      if (editId) {
        const { error } = await supabase.from("packages").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("packages").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-packages"] });
      setDialogOpen(false);
      setEditId(null);
      setForm(emptyForm);
      toast.success(editId ? "Package updated" : "Package created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-packages"] });
      toast.success("Package deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (pkg: any) => {
    const { value, unit } = minutesToBestUnit(pkg.duration_minutes);
    setEditId(pkg.id);
    setForm({
      name: pkg.name,
      price: String(pkg.price),
      duration_value: String(value),
      duration_unit: unit,
      speed_limit: pkg.speed_limit || "2M/2M",
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Packages</h2>
        <Button onClick={() => { setEditId(null); setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Package
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price (KES)</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No packages yet
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((pkg: any) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell>{pkg.price}</TableCell>
                    <TableCell>{formatDuration(pkg.duration_minutes)}</TableCell>
                    <TableCell>{pkg.speed_limit}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${pkg.status === "active" ? "text-primary" : "text-muted-foreground"}`}>
                        {pkg.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(pkg)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(pkg.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editId ? "Edit" : "Add"} Package</DialogTitle>
            <DialogDescription>Configure the package details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 1 Hour" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Price (KES)</label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="20" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Duration</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={form.duration_value}
                  onChange={(e) => setForm({ ...form, duration_value: e.target.value })}
                  placeholder="1"
                  className="flex-1"
                  min={1}
                />
                <Select
                  value={form.duration_unit}
                  onValueChange={(v) => setForm({ ...form, duration_unit: v as DurationUnit })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Speed Limit</label>
              <Input value={form.speed_limit} onChange={(e) => setForm({ ...form, speed_limit: e.target.value })} placeholder="2M/2M" />
            </div>
            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editId ? "Update" : "Create"} Package
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
