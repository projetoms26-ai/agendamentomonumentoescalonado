import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const CYCLES = ["IC1", "IC2", "IC3", "P1", "P2", "Aresta"] as const;
type Cycle = (typeof CYCLES)[number];
function recommendation(cycle: Cycle, ultra: boolean): { cycle: Cycle; seconds: number } | null {
  if (ultra) return null;
  if (cycle === "IC1") return { cycle: "IC2", seconds: 180 };
  if (cycle === "IC2") return { cycle: "IC3", seconds: 180 };
  if (cycle === "IC3") return { cycle: "P1", seconds: 180 };
  if (cycle === "P1") return { cycle: "P2", seconds: 90 };
  if (cycle === "P2") return { cycle: "P2", seconds: 90 };
  return null;
}
export function AttendanceRecord({
  bookingId,
  scheduledCycle,
}: {
  bookingId: string;
  scheduledCycle: string | null;
}) {
  const qc = useQueryClient();
  const scheduled = (scheduledCycle ?? "").replace(/^i([123])$/i, "IC$1");
  const initial = CYCLES.find((c) => c.toLowerCase() === scheduled.toLowerCase()) ?? "IC1";
  const [cycle, setCycle] = useState<Cycle>(initial);
  const [ultra, setUltra] = useState(false);
  const initialRecommendation = recommendation(initial, false);
  const [nextCycle, setNextCycle] = useState<Cycle | "">(initialRecommendation?.cycle ?? "");
  const [seconds, setSeconds] = useState(initialRecommendation?.seconds ?? 0);
  const [busy, setBusy] = useState(false);
  const suggested = useMemo(() => recommendation(cycle, ultra), [cycle, ultra]);
  function updateCycle(value: Cycle) {
    setCycle(value);
    const rec = recommendation(value, ultra);
    setNextCycle(rec?.cycle ?? "");
    setSeconds(rec?.seconds ?? 0);
  }
  function updateUltra(value: boolean) {
    setUltra(value);
    const rec = recommendation(cycle, value);
    setNextCycle(rec?.cycle ?? "");
    setSeconds(rec?.seconds ?? 0);
  }
  async function save() {
    if (!!nextCycle !== seconds > 0) {
      toast.error("Informe o próximo ciclo e sua duração, ou deixe ambos vazios");
      return;
    }
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setBusy(false);
      toast.error("Sua sessão expirou. Entre novamente.");
      return;
    }
    const { error } = await supabase.from("attendance_history").insert({
      booking_id: bookingId,
      cycle_performed: cycle,
      ultra_dourado: ultra,
      next_cycle: nextCycle || null,
      next_duration_seconds: nextCycle ? seconds : null,
      recorded_by: auth.user.id,
    });
    setBusy(false);
    if (error) {
      toast.error(
        "Não foi possível registrar o atendimento. Verifique se a migração do histórico foi aplicada.",
      );
      return;
    }
    toast.success("Resultado registrado; o histórico anterior foi preservado");
    qc.invalidateQueries({ queryKey: ["my-attendance-history"] });
    qc.invalidateQueries({ queryKey: ["bookings"] });
  }
  return (
    <div className="mt-4 rounded-lg border bg-background p-3">
      <h3 className="text-sm font-semibold">Registrar atendimento</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Ciclo realizado
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={cycle}
            onChange={(e) => updateCycle(e.target.value as Cycle)}
          >
            {CYCLES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Ultra Dourado na foto?
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={String(ultra)}
            onChange={(e) => updateUltra(e.target.value === "true")}
          >
            <option value="false">Não alcançado</option>
            <option value="true">Alcançado</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Próximo ciclo indicado
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={nextCycle}
            onChange={(e) => setNextCycle(e.target.value as Cycle | "")}
          >
            <option value="">Nenhum / não indicado</option>
            {CYCLES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Duração
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={seconds}
            onChange={(e) => setSeconds(Number(e.target.value))}
          >
            <option value={0}>Não definida</option>
            <option value={90}>1 minuto e 30 segundos</option>
            <option value={180}>3 minutos</option>
          </select>
        </label>
      </div>
      {suggested && !ultra && (
        <p className="mt-2 text-xs text-muted-foreground">
          Sugestão pelas regras: {suggested.cycle} — {suggested.seconds === 90 ? "1:30" : "3:00"}.
          Você pode ajustar.
        </p>
      )}
      <Button className="mt-3" size="sm" disabled={busy} onClick={save}>
        {busy ? "Salvando…" : "Salvar resultado"}
      </Button>
    </div>
  );
}
