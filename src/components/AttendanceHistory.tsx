import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, hhmm, statusInfo } from "@/lib/booking";
export function AttendanceHistory() {
  const query = useQuery({
    queryKey: ["my-attendance-history"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_attendance_history");
      if (error) throw error;
      return data;
    },
  });
  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-7">
      <h2 className="text-lg font-semibold">Histórico dos atendimentos</h2>
      {query.isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Carregando histórico…</p>
      ) : query.isError ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Histórico indisponível. A migração do atendimento pode ainda não estar aplicada.
        </p>
      ) : !query.data?.length ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Seus resultados registrados pela equipe aparecerão aqui.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {query.data.map((item) => (
            <article key={item.history_id} className="rounded-xl border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b>
                  {fmtDate(item.booking_date)} · {hhmm(item.slot_time)}
                </b>
                <span className="rounded-full border px-2 py-0.5 text-xs">
                  {statusInfo(item.booking_status).label}
                </span>
              </div>
              <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Ciclo realizado</dt>
                  <dd className="font-medium">{item.cycle_performed}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Ultra Dourado</dt>
                  <dd className="font-medium">
                    {item.ultra_dourado ? "Alcançado" : "Não alcançado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Próximo ciclo</dt>
                  <dd className="font-medium">{item.next_cycle ?? "Não indicado"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Duração</dt>
                  <dd className="font-medium">
                    {item.next_duration_seconds == null
                      ? "—"
                      : item.next_duration_seconds === 90
                        ? "1 minuto e 30 segundos"
                        : `${Math.floor(item.next_duration_seconds / 60)} minutos${item.next_duration_seconds % 60 ? ` e ${item.next_duration_seconds % 60} segundos` : ""}`}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
