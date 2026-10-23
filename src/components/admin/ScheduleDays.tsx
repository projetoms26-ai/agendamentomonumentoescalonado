import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDate, hhmm, PERIODS, todayISO } from "@/lib/booking";

const emptyDay = { day: "", period: "integral", start_time: "08:00", end_time: "18:00", iniciar_capacity: 0, p1_capacity: 0, p2_capacity: 0, aresta_capacity: 0 };

export function ScheduleDays() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(emptyDay);
  const [busy, setBusy] = useState(false);
  const days = useQuery({
    queryKey: ["admin-schedule-days"],
    queryFn: async () => {
      const { data, error } = await supabase.from("schedule_days").select("*").gte("day", todayISO()).order("day");
      if (error) throw error;
      return data;
    },
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.day || draft.day < todayISO() || draft.start_time >= draft.end_time) {
      toast.error("Informe uma data futura ou de hoje e um horário final após o inicial.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("schedule_days").upsert(draft, { onConflict: "day" });
    setBusy(false);
    if (error) { toast.error("Não foi possível publicar as vagas. Tente novamente."); return; }
    toast.success("Data e vagas publicadas");
    setDraft(emptyDay);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin-schedule-days"] }),
      qc.invalidateQueries({ queryKey: ["schedule"] }),
    ]);
  }

  return (
    <section className="space-y-4 border-b pb-8">
      <h2 className="text-lg font-semibold">Agenda e vagas por data</h2>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="schedule-day">Data</Label><Input id="schedule-day" type="date" min={todayISO()} required value={draft.day} onChange={(e) => setDraft({ ...draft, day: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="schedule-period">Turno</Label><select id="schedule-period" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.period} onChange={(e) => setDraft({ ...draft, period: e.target.value })}>{Object.entries(PERIODS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div className="space-y-1.5"><Label htmlFor="schedule-start">Início</Label><Input id="schedule-start" type="time" required value={draft.start_time} onChange={(e) => setDraft({ ...draft, start_time: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="schedule-end">Fim</Label><Input id="schedule-end" type="time" required value={draft.end_time} onChange={(e) => setDraft({ ...draft, end_time: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([['iniciar_capacity', 'Vagas Iniciar'], ['p1_capacity', 'Vagas P1'], ['p2_capacity', 'Vagas P2'], ['aresta_capacity', 'Vagas Aresta']] as const).map(([key, label]) => <div key={key} className="space-y-1.5"><Label htmlFor={key}>{label}</Label><Input id={key} type="number" required min={0} step={1} value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: Math.max(0, Math.trunc(Number(e.target.value) || 0)) })} /></div>)}
        </div>
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <CalendarPlus />} Publicar vagas</Button>{draft.day && <Button type="button" variant="outline" onClick={() => setDraft(emptyDay)}>Limpar</Button>}</div>
      </form>
      {days.isLoading ? <p className="text-sm text-muted-foreground">Carregando datas…</p> : days.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar a agenda.</p> : !days.data?.length ? <p className="text-sm text-muted-foreground">Nenhuma data publicada.</p> : (
        <div className="divide-y">
          {days.data.map((day) => <div key={day.day} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="font-semibold">{fmtDate(day.day)}</p><p className="text-sm text-muted-foreground">{PERIODS[day.period]} · {hhmm(day.start_time)}–{hhmm(day.end_time)}</p><p className="text-sm">Iniciar: {day.iniciar_capacity} · P1: {day.p1_capacity} · P2: {day.p2_capacity} · Aresta: {day.aresta_capacity}</p></div><Button variant="outline" size="icon" aria-label={`Editar ${fmtDate(day.day)}`} title="Editar data e vagas" onClick={() => setDraft({ day: day.day, period: day.period, start_time: hhmm(day.start_time), end_time: hhmm(day.end_time), iniciar_capacity: day.iniciar_capacity, p1_capacity: day.p1_capacity, p2_capacity: day.p2_capacity, aresta_capacity: day.aresta_capacity })}><Pencil /></Button></div>)}
        </div>
      )}
    </section>
  );
}