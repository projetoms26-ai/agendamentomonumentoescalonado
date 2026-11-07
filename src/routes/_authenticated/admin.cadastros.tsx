import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CYCLES, fmtDate, maskPhone } from "@/lib/booking";

export const Route = createFileRoute("/_authenticated/admin/cadastros")({
  head: () => ({ meta: [
    { title: "Cadastros — Painel MME" },
    { name: "description", content: "Conferência de cadastros, dependentes e ciclos no painel administrativo do App MME." },
    { property: "og:title", content: "Cadastros — Painel MME" },
    { property: "og:description", content: "Gestão administrativa de cadastros, dependentes e ciclos do App MME." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
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
    mutationFn: async (v: { id: string; cycle: string | null; confirmed: boolean; dependents?: string[] }) => {
      const { error } = await supabase.from("customers").update({ cycle: v.cycle, confirmed: v.confirmed, ...(v.dependents ? { dependents: v.dependents } : {}) }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cadastro atualizado"); qc.invalidateQueries({ queryKey: ["customers"] }); qc.invalidateQueries({ queryKey: ["pending-count"] }); },
    onError: () => toast.error("Não foi possível salvar o cadastro"),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cadastro apagado"); qc.invalidateQueries({ queryKey: ["customers"] }); qc.invalidateQueries({ queryKey: ["pending-count"] }); },
    onError: () => toast.error("Não foi possível apagar o cadastro"),
  });

  const term = q.trim().toLowerCase();
  const rows = (list.data ?? []).filter((c) => (!onlyPending || !c.confirmed) && (!term || c.full_name.toLowerCase().includes(term) || c.whatsapp.includes(term.replace(/\D/g, "") || "§")));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold sm:text-2xl">Cadastros</h1>
      <p className="mt-1 text-sm text-muted-foreground">Confirme o cadastro e defina o ciclo para liberar o agendamento.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Buscar por nome ou celular" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant={onlyPending ? "default" : "outline"} onClick={() => setOnlyPending(true)}>A confirmar</Button>
        <Button variant={!onlyPending ? "default" : "outline"} onClick={() => setOnlyPending(false)}>Todos</Button>
      </div>
      {list.isLoading ? <p className="mt-6 text-muted-foreground">Carregando…</p> : list.isError ? <p role="alert" className="mt-6 text-destructive">Não foi possível carregar os cadastros.</p> : !rows.length ? (
        <p className="mt-6 rounded-xl border bg-card p-6 text-muted-foreground">{onlyPending ? "Nenhum cadastro aguardando confirmação." : "Nenhum cadastro encontrado."}</p>
      ) : (
        <div className="mt-6 space-y-2">
          {rows.map((c) => <Row key={c.id} c={c} busy={save.isPending || del.isPending} onSave={(cycle, confirmed) => save.mutate({ id: c.id, cycle, confirmed })} onRemoveDep={(i) => save.mutate({ id: c.id, cycle: c.cycle, confirmed: c.confirmed, dependents: c.dependents.filter((_, j) => j !== i) })} onDelete={() => del.mutate(c.id)} />)}
        </div>
      )}
    </div>
  );
}

function Row({ c, busy, onSave, onDelete, onRemoveDep }: { c: { id: string; full_name: string; whatsapp: string; cycle: string | null; requested_cycle: string | null; confirmed: boolean; last_activity_date: string | null; dependents: string[] }; busy: boolean; onSave: (cycle: string | null, confirmed: boolean) => void; onDelete: () => void; onRemoveDep: (i: number) => void }) {
  const [cycle, setCycle] = useState(c.cycle ?? (c.requested_cycle && c.requested_cycle !== "Iniciar" ? c.requested_cycle : ""));
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-lg font-semibold">{c.full_name}</div>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${c.confirmed ? "bg-success/15 text-success border-success/30" : "bg-warning/20 border-warning/50"}`}>{c.confirmed ? "Confirmado" : "A confirmar"}</span>
      </div>
      <a href={`https://wa.me/55${c.whatsapp}`} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><Phone className="size-3.5" /> {maskPhone(c.whatsapp)}</a>
      <p className="text-sm text-muted-foreground">Ciclo escolhido no cadastro: {c.requested_cycle ?? "—"}</p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">Dependentes: {c.dependents?.length ? c.dependents.map((d, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">{d}
          <button type="button" aria-label={`Excluir dependente ${d}`} disabled={busy} className="text-destructive" onClick={() => confirm(`Excluir o dependente ${d}?`) && onRemoveDep(i)}><Trash2 className="size-3.5" /></button>
        </span>)) : "nenhum"}</div>
      <p className="text-sm text-muted-foreground">Última atividade: {c.last_activity_date ? fmtDate(c.last_activity_date) : "—"}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium" htmlFor={`cy-${c.id}`}>Ciclo atual</label>
        <select id={`cy-${c.id}`} className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={cycle} onChange={(e) => setCycle(e.target.value)}>
          <option value="">Iniciar (i1, i2, i3)</option>
          {CYCLES.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <Button size="sm" disabled={busy} onClick={() => onSave(cycle || null, true)}><Check /> {c.confirmed ? "Salvar" : "Confirmar cadastro"}</Button>
        <Button size="sm" variant="outline" className="text-destructive" disabled={busy} onClick={() => confirm(`Apagar o cadastro de ${c.full_name}? Os agendamentos já feitos continuam na agenda.`) && onDelete()}><Trash2 /> Apagar</Button>
      </div>
    </div>
  );
}
