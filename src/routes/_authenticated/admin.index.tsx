import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { useDayBookings } from "@/lib/admin-queries";
import { fmtDate, fmtLong, hhmm, maskPhone, todayISO } from "@/lib/booking";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const [date, setDate] = useState(todayISO());
  const [slot, setSlot] = useState("all");
  const [q, setQ] = useState("");
  const bookings = useDayBookings(date);
  const settings = useQuery({ queryKey: ["settings"], queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).single()).data });

  const list = bookings.data ?? [];
  const active = list.filter((b) => b.status !== "cancelado");
  const total = active.reduce((s, b) => s + b.party_size, 0);
  const arrived = active.filter((b) => b.status === "chegou" || b.status === "atendido").length;
  const waiting = active.filter((b) => b.status === "agendado").length;
  const cap = settings.data?.daily_capacity ?? 0;
  const slotsInDay = Array.from(new Set(list.map((b) => b.slot_time)));

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    return list.filter((b) =>
      (slot === "all" || b.slot_time === slot) &&
      (!term || b.full_name.toLowerCase().includes(term) || (digits && b.whatsapp.includes(digits)) || b.code.toLowerCase() === term));
  }, [list, slot, q]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Painel</h1>
          <p className="capitalize text-muted-foreground">{fmtLong(date)}</p>
        </div>
        <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-11 w-auto" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Agendamentos" value={total} />
        <Stat label="Vagas disponíveis" value={Math.max(cap - total, 0)} sub={`de ${cap}`} accent />
        <Stat label="Já chegaram" value={arrived} />
        <Stat label="Aguardados" value={waiting} />
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-11 pl-9" placeholder="Buscar por nome, WhatsApp ou código" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={slot} onValueChange={setSlot}>
          <SelectTrigger className="h-11 sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os horários</SelectItem>
            {slotsInDay.map((s) => <SelectItem key={s} value={s}>{hhmm(s)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border bg-card">
        {bookings.isLoading ? <p className="p-6 text-muted-foreground">Carregando…</p> :
          !filtered.length ? <p className="p-6 text-muted-foreground">Nenhum agendamento em {fmtDate(date)}.</p> : (
          <div className="divide-y">
            {filtered.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
                <span className="w-14 font-display text-lg font-semibold">{hhmm(b.slot_time)}</span>
                <div className="min-w-40 flex-1">
                  <div className="font-medium">{b.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    <a className="hover:underline" href={`https://wa.me/55${b.whatsapp}`} target="_blank" rel="noreferrer">{maskPhone(b.whatsapp)}</a>
                    {b.email && <> · {b.email}</>} · <span className="font-mono">{b.code}</span>
                  </div>
                </div>
                <StatusSelect id={b.id} value={b.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-accent bg-accent/15" : "bg-card"}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-3xl font-semibold">{value} {sub && <span className="text-base font-normal text-muted-foreground">{sub}</span>}</div>
    </div>
  );
}
