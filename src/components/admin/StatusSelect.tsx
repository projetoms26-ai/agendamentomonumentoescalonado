import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUSES, statusInfo, type Status } from "@/lib/booking";

export function StatusSelect({ id, value }: { id: string; value: string }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async (status: Status) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
    onError: () => toast.error("Não foi possível alterar o status"),
  });
  return (
    <Select value={value} onValueChange={(v) => m.mutate(v as Status)}>
      <SelectTrigger className={`h-9 w-40 border font-medium ${statusInfo(value).cls}`}><SelectValue /></SelectTrigger>
      <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export function QuickStatus({ id, value }: { id: string; value: string }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async (status: Status) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
    onError: () => toast.error("Não foi possível alterar o status"),
  });
  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUSES.map((s) => (
        <button key={s.value} disabled={m.isPending} onClick={() => m.mutate(s.value)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${value === s.value ? s.cls + " ring-2 ring-ring/30" : "bg-background text-muted-foreground hover:bg-muted"}`}>
          {s.label}
        </button>
      ))}
    </div>
  );
}
