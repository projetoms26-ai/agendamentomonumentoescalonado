import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CYCLES, fmtDate, maskPhone } from "@/lib/booking";

export const Route = createFileRoute("/_authenticated/admin/cadastros")({
  head: () => ({ meta: [{ title: "Cadastros — Painel MME" }, { name: "robots", content: "noindex" }] }),
  component: Cadastros,
});

function Cadastros() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [onlyPending, setOnlyPending] = useState(true);
  const list = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const save = useMutation({
    mutationFn: async (v: { id: string; cycle: string | null; confirmed: boolean }) => {
      const { error } = await supabase.from("customers").update({ cycle: v.cycle, confirmed: v.confirmed }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cadastro atualizado"); qc.invalidateQueries({ queryKey: ["customers"] }); },
    onError: () => toast.error("Não foi possível salvar o cadastro"),
  });

  const term = q.trim().toLowerCase();
  const rows = (list.data ?? []).filter((c) => (!onlyPending || !c.confirmed) && (!term || c.full_name.toLowerCase().includes(term) || c.whatsapp.includes(term.replace(/\D/g, "") || "§")));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold sm:text-2xl">Cadastros</h1>
      <p className="mt-1 text-sm text-muted-foreground">Confirme cada cadastro e coloque o ciclo atual da pessoa.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Buscar por nome ou celular" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant={onlyPending ? "default" : "outline"} onClick={() => setOnlyPending(true)}>A confirmar</Button>
        <Button variant={!onlyPending ? "default" : "outline"} onClick={() => setOnlyPending(false)}>Todos</Button>
      </div>
      {list.isLoading ? <p className="mt-6 text-muted-foreground">Carregando…</p> : list.isError ? <p role="alert" className="mt-6 text-destructive">Não foi possível carregar os cadastros.</p> : !rows.length ? (
        <p className="mt-6 rounded-xl border bg-card p-6 text-muted-foreground">{onlyPending ? "Nenhum cadastro aguardando confirmação." : "Nenhum cadastro encontrado."}</p>
      ) : (
        <div className="mt-6 space-y-2">
          {rows.map((c) => <Row key={c.id} c={c} busy={save.isPending} onSave={(cycle, confirmed) => save.mutate({ id: c.id, cycle, confirmed })} />)}
        </div>
      )}
    </div>
  );
}

function Row({ c, busy, onSave }: { c: { id: string; full_name: string; whatsapp: string; cycle: string | null; confirmed: boolean; last_activity_date: string | null }; busy: boolean; onSave: (cycle: string | null, confirmed: boolean) => void }) {
  const [cycle, setCycle] = useState(c.cycle ?? "");
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-lg font-semibold">{c.full_name}</div>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${c.confirmed ? "bg-success/15 text-success border-success/30" : "bg-warning/20 border-warning/50"}`}>{c.confirmed ? "Confirmado" : "A confirmar"}</span>
      </div>
      <a href={`https://wa.me/55${c.whatsapp}`} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><Phone className="size-3.5" /> {maskPhone(c.whatsapp)}</a>
      <p className="text-sm text-muted-foreground">Última atividade: {c.last_activity_date ? fmtDate(c.last_activity_date) : "—"}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium" htmlFor={`cy-${c.id}`}>Ciclo atual</label>
        <select id={`cy-${c.id}`} className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={cycle} onChange={(e) => setCycle(e.target.value)}>
          <option value="">Sem ciclo (iniciante)</option>
          {CYCLES.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <Button size="sm" disabled={busy} onClick={() => onSave(cycle || null, true)}><Check /> {c.confirmed ? "Salvar" : "Confirmar cadastro"}</Button>
      </div>
    </div>
  );
}
