import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { attendanceSchema } from "@/lib/attendance";
import { CYCLES } from "@/lib/booking";

export function AttendanceRecord({ id, status, duration, nextCycle }: { id: string; status: string; duration: number | null; nextCycle: string | null }) {
  const qc = useQueryClient();
  const [result, setResult] = useState(["concluiu", "faltou", "repetir", "passou", "atendido", "nao_compareceu"].includes(status) ? status : "concluiu");
  const [minutes, setMinutes] = useState(duration === null ? "" : String(Math.floor(duration / 60)));
  const [seconds, setSeconds] = useState(duration === null ? "0" : String(duration % 60));
  const [next, setNext] = useState(nextCycle ?? "");
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = attendanceSchema.safeParse({ result, durationSeconds: minutes === "" ? null : Number(minutes) * 60 + Number(seconds), nextCycle: next || null });
    if (!parsed.success) { toast.error("Confira a duração e o próximo ciclo"); return; }
    setBusy(true);
    const { error } = await supabase.from("bookings").update({ status: parsed.data.result, attendance_duration_seconds: parsed.data.durationSeconds, attendance_next_cycle: parsed.data.nextCycle }).eq("id", id);
    setBusy(false);
    if (error) { toast.error("Não foi possível registrar o atendimento"); return; }
    toast.success("Atendimento registrado no histórico");
    qc.invalidateQueries({ queryKey: ["bookings"] });
    qc.invalidateQueries({ queryKey: ["attendance-history"] });
  }
  return <details className="mt-4 border-t pt-3">
    <summary className="cursor-pointer text-sm font-semibold">Registrar atendimento</summary>
    <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={save}>
      <div className="space-y-1"><Label htmlFor={`result-${id}`}>Resultado</Label><select id={`result-${id}`} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={result} onChange={e => setResult(e.target.value)}>
        <option value="concluiu">Concluiu</option><option value="faltou">Faltou</option><option value="repetir">Repetir</option><option value="passou">Passou</option><option value="atendido">Atendido</option><option value="nao_compareceu">Não compareceu</option>
      </select></div>
      <div className="space-y-1"><Label htmlFor={`next-${id}`}>Próximo ciclo</Label><select id={`next-${id}`} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={next} onChange={e => setNext(e.target.value)}><option value="">Usar ciclo atual do cadastro</option>{CYCLES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
      <div className="space-y-1"><Label htmlFor={`minutes-${id}`}>Duração (minutos)</Label><Input id={`minutes-${id}`} type="number" min={0} max={1440} step={1} placeholder="Não informada" value={minutes} onChange={e => setMinutes(e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor={`seconds-${id}`}>Segundos</Label><Input id={`seconds-${id}`} type="number" min={0} max={59} step={1} value={seconds} onChange={e => setSeconds(e.target.value)} /></div>
      <Button type="submit" disabled={busy} className="sm:col-span-2">Salvar atendimento</Button>
    </form>
  </details>;
}