import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { durationLabel } from "@/lib/attendance";
import { fmtDate, statusInfo } from "@/lib/booking";

export function AttendanceHistory() {
  const history = useQuery({
    queryKey: ["attendance-history"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_attendance_history");
      if (error) throw error;
      return data;
    },
  });
  return <section className="py-5" aria-label="Histórico dos atendimentos">
    <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Meus atendimentos</h2><Button variant="outline" size="sm" disabled={history.isFetching} onClick={() => history.refetch()}>Atualizar</Button></div>
    {history.isPending ? <p className="mt-4 text-muted-foreground">Carregando histórico…</p> : history.isError ? <p role="alert" className="mt-4 text-destructive">Não foi possível carregar o histórico. Tente atualizar.</p> : !history.data?.length ? <p className="mt-4 text-muted-foreground">Nenhum atendimento registrado.</p> : <div className="mt-4 divide-y">
      {history.data.map(h => <article key={h.id} className="py-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{fmtDate(h.attendance_date)} · {h.cycle ?? "Ciclo não informado"}</h3><span className={`rounded-md border px-2 py-1 text-sm ${statusInfo(h.result).cls}`}>{statusInfo(h.result).label}</span></div>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">Próximo ciclo</dt><dd className="mt-1 font-medium">{h.next_cycle ?? "Não informado"}</dd></div><div><dt className="text-muted-foreground">Duração</dt><dd className="mt-1 font-medium">{durationLabel(h.duration_seconds)}</dd></div></dl>
        <p className="mt-2 text-xs text-muted-foreground">Registro em {new Date(h.recorded_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
      </article>)}
    </div>}
  </section>;
}