import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickStatus } from "@/components/admin/StatusSelect";
import { addDays, fmtDate, hhmm, maskPhone, todayISO } from "@/lib/booking";
import { useDayBookings } from "@/lib/admin-queries";

export const Route = createFileRoute("/_authenticated/admin/agenda")({
  component: Agenda,
});

function Agenda() {
  const [date, setDate] = useState(todayISO());
  const { data, isLoading } = useDayBookings(date);
  const groups = new Map<string, NonNullable<typeof data>>();
  (data ?? []).forEach((b) => groups.set(b.slot_time, [...(groups.get(b.slot_time) ?? []), b]));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold sm:text-2xl">Agenda do dia — {fmtDate(date)}</h1>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, -1))}><ChevronLeft /></Button>
          <Button variant="outline" onClick={() => setDate(todayISO())}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))}><ChevronRight /></Button>
        </div>
      </div>

      {isLoading ? <p className="mt-8 text-muted-foreground">Carregando…</p> :
        !groups.size ? <p className="mt-8 rounded-xl border bg-card p-6 text-muted-foreground">Nenhum agendamento para este dia.</p> : (
        <div className="mt-6 space-y-6">
          {[...groups.entries()].map(([t, list]) => (
            <section key={t}>
              <h2 className="sticky top-0 z-10 mb-2 bg-background py-1 font-display text-2xl font-semibold">{hhmm(t)} <span className="text-sm font-normal text-muted-foreground">{list.filter((b) => b.status !== "cancelado").length} pessoas</span></h2>
              <div className="space-y-2">
                {list.map((b) => (
                  <div key={b.id} className={`rounded-xl border bg-card p-4 ${b.status === "cancelado" ? "opacity-60" : ""}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="text-lg font-semibold">{b.full_name}</div>
                      <span className="font-mono text-sm text-muted-foreground">{b.code}</span>
                    </div>
                    {(b.category || b.cycle) && (
                      <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                        {b.category && <span className="rounded-full border bg-muted px-2 py-0.5 font-medium">{b.category === "iniciar" ? "Iniciar" : b.category}</span>}
                        {b.cycle && <span className="rounded-full border bg-info/15 px-2 py-0.5 font-medium text-info">Ciclo {b.cycle}</span>}
                        {b.format && <span className="rounded-full border px-2 py-0.5 text-muted-foreground">{b.format === "dia_inteiro" ? "Dia inteiro" : b.format === "duas_tardes" ? "Duas tardes" : b.format}</span>}
                      </div>
                    )}
                    <a href={`https://wa.me/55${b.whatsapp}`} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                      <Phone className="size-3.5" /> {maskPhone(b.whatsapp)}
                    </a>
                    <p className="mt-3 text-xs font-medium text-muted-foreground">Gerenciar atividade (Concluiu, Faltou, Repetir e Passou são só do administrador; Passou avança o ciclo)</p>
                    <div className="mt-1.5"><QuickStatus id={b.id} value={b.status} /></div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
