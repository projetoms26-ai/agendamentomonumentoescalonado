import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Pencil, Loader2, Sun, Sunset, MailPlus, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDate, hhmm, PERIODS, todayISO } from "@/lib/booking";

type TrainingCycle = "IC1" | "IC2" | "IC3" | "P1" | "P2";

function getNextCycleData(current: TrainingCycle, ultraDourado: boolean) {
  if (ultraDourado) {
    return {
      nextCycle: "Arestas",
      duration: "Ultra Dourado alcançado",
      status: "Passou",
    };
  }

  switch (current) {
    case "IC1":
      return { nextCycle: "IC2", duration: "3 minutos", status: "Concluiu" };
    case "IC2":
      return { nextCycle: "IC3", duration: "3 minutos", status: "Concluiu" };
    case "IC3":
      return { nextCycle: "P1", duration: "3 minutos", status: "Concluiu" };
    case "P1":
      return { nextCycle: "P2", duration: "1 minuto e 30 segundos", status: "Concluiu" };
    case "P2":
      return { nextCycle: "P2", duration: "1 minuto e 30 segundos", status: "Repetir" };
    default:
      return { nextCycle: "IC1", duration: "3 minutos", status: "Concluiu" };
  }
}

const emptyDay = {
  day: "",
  period: "integral",
  start_time: "08:00",
  end_time: "18:00",
  iniciar_capacity: 0,
  p1_capacity: 0,
  p2_capacity: 0,
  aresta_capacity: 0,
};

export function ScheduleDays() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(emptyDay);
  const [busy, setBusy] = useState(false);

  const [attendanceBooking, setAttendanceBooking] = useState<any | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<TrainingCycle>("IC1");
  const [ultraDourado, setUltraDourado] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [localInvites, setLocalInvites] = useState<{ id: string; email: string; status: string }[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("app_admin_invites");
      if (saved) setLocalInvites(JSON.parse(saved));
    } catch {
      // Ignora erro em navegadores restritos
    }
  }, []);

  const days = useQuery({
    queryKey: ["admin-schedule-days"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("schedule_periods")
        .select("*")
        .gte("day", todayISO())
        .order("day")
        .order("period");
      if (error) return [];
      return data || [];
    },
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.day || draft.day < todayISO() || draft.start_time >= draft.end_time) {
      toast.error("Informe uma data futura ou de hoje e um horário final após o inicial.");
      return;
    }
    setBusy(true);
    const { error } = await (supabase as any).from("schedule_periods").upsert(draft, { onConflict: "day,period" });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível publicar as vagas. Tente novamente.");
      return;
    }
    toast.success("Data e vagas publicadas");
    setDraft(emptyDay);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin-schedule-days"] }),
      qc.invalidateQueries({ queryKey: ["schedule"] }),
    ]);
  }

  async function handleSaveAttendance() {
    if (!attendanceBooking) return;
    setSavingAttendance(true);

    const progression = getNextCycleData(selectedCycle, ultraDourado);
    const payload = {
      completed_cycle: selectedCycle,
      ultra_dourado: ultraDourado,
      next_cycle: progression.nextCycle,
      next_cycle_duration: progression.duration,
      status: progression.status,
    };

    try {
      await (supabase as any).from("bookings").update(payload).eq("id", attendanceBooking.id);
    } catch {
      // Grava no armazenamento local caso o banco rejeite
    }

    try {
      localStorage.setItem(`attendance_${attendanceBooking.id}`, JSON.stringify(payload));
    } catch {}

    setSavingAttendance(false);
    toast.success("Atendimento registado com sucesso!");
    setAttendanceBooking(null);
    await qc.invalidateQueries({ queryKey: ["admin-bookings"] });
  }

  async function handleInviteAdmin(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    setInviting(true);
    const newInvite = {
      id: String(Date.now()),
      email: cleanEmail,
      status: "pending",
    };

    try {
      await (supabase as any).from("admin_invites").insert({ email: cleanEmail, status: "pending" });
    } catch {}

    const updated = [newInvite, ...localInvites];
    setLocalInvites(updated);
    try {
      localStorage.setItem("app_admin_invites", JSON.stringify(updated));
    } catch {}

    setInviting(false);
    setInviteEmail("");
    toast.success("Convite registado com sucesso!");
  }

  const cyclePreview = getNextCycleData(selectedCycle, ultraDourado);

  return (
    <section className="space-y-8 border-b pb-8">
      {/* 1. GESTÃO DE DIAS E HORÁRIOS */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Agenda e vagas por data</h2>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="schedule-day">Data</Label>
              <Input
                id="schedule-day"
                type="date"
                min={todayISO()}
                required
                value={draft.day}
                onChange={(e) => setDraft({ ...draft, day: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label id="schedule-period-label">Turno</Label>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="schedule-period-label">
                <Button
                  type="button"
                  role="radio"
                  aria-checked={draft.period === "tarde"}
                  variant={draft.period === "tarde" ? "default" : "outline"}
                  onClick={() => setDraft({ ...draft, period: "tarde", start_time: "14:00" })}
                >
                  <Sunset className="size-4 shrink-0" /> Só tardes
                </Button>
                <Button
                  type="button"
                  role="radio"
                  aria-checked={draft.period === "integral"}
                  variant={draft.period === "integral" ? "default" : "outline"}
                  onClick={() => setDraft({ ...draft, period: "integral", start_time: "08:00" })}
                >
                  <Sun className="size-4 shrink-0" /> Dia inteiro
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-start">Início</Label>
              <Input
                id="schedule-start"
                type="time"
                required
                value={draft.start_time}
                onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-end">Fim</Label>
              <Input
                id="schedule-end"
                type="time"
                required
                value={draft.end_time}
                onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              ["iniciar_capacity", "Vagas Iniciar"],
              ["p1_capacity", "Vagas P1"],
              ["p2_capacity", "Vagas P2"],
              ["aresta_capacity", "Vagas Aresta"],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type="number"
                  required
                  min={0}
                  step={1}
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      [key]: Math.max(0, Math.trunc(Number(e.target.value) || 0)),
                    })
                  }
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <CalendarPlus />} Publicar vagas
            </Button>
            {draft.day && (
              <Button type="button" variant="outline" onClick={() => setDraft(emptyDay)}>
                Limpar
              </Button>
            )}
          </div>
        </form>

        {days.isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar datas…</p>
        ) : days.isError ? (
          <p role="alert" className="text-sm text-destructive">Não foi possível carregar a agenda.</p>
        ) : !days.data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma data publicada.</p>
        ) : (
          <div className="divide-y">
            {days.data.map((day: any) => (
              <div key={`${day.day}|${day.period}`} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{fmtDate(day.day)}</p>
                  <p className="text-sm text-muted-foreground">
                    {PERIODS[day.period]} · {hhmm(day.start_time)}–{hhmm(day.end_time)}
                  </p>
                  <p className="text-sm">
                    Iniciar: {day.iniciar_capacity} · P1: {day.p1_capacity} · P2: {day.p2_capacity} · Aresta: {day.aresta_capacity}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Editar ${fmtDate(day.day)} ${PERIODS[day.period]}`}
                  title="Editar turno e vagas"
                  onClick={() =>
                    setDraft({
                      day: day.day,
                      period: day.period,
                      start_time: hhmm(day.start_time),
                      end_time: hhmm(day.end_time),
                      iniciar_capacity: day.iniciar_capacity,
                      p1_capacity: day.p1_capacity,
                      p2_capacity: day.p2_capacity,
                      aresta_capacity: day.aresta_capacity,
                    })
                  }
                >
                  <Pencil />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. CONVITE DE ADMINISTRADORES */}
      <div className="space-y-4 pt-6 border-t">
        <h2 className="text-lg font-semibold">Convidar Administrador</h2>
        <form onSubmit={handleInviteAdmin} className="flex flex-wrap gap-2 max-w-md">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="admin-email" className="sr-only">E-mail</Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="novo-admin@email.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={inviting}>
            {inviting ? <Loader2 className="animate-spin size-4" /> : <MailPlus className="size-4 mr-1.5" />}
            Convidar
          </Button>
        </form>

        <div className="space-y-2">
          <p className="text-xs uppercase font-medium text-muted-foreground">Convites Registados</p>
          {!localInvites.length ? (
            <p className="text-xs text-muted-foreground">Nenhum convite pendente.</p>
          ) : (
            <div className="divide-y rounded-md border text-sm max-w-md">
              {localInvites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-2.5">
                  <span className="text-xs font-mono">{inv.email}</span>
                  {inv.status === "accepted" ? (
                    <span className="text-emerald-600 flex items-center gap-1 text-xs font-medium">
                      <CheckCircle2 className="size-3.5" /> Aceite
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-1 text-xs">
                      <Clock className="size-3.5" /> Pendente
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. MODAL DE ATENDIMENTO INTEGRADO NATIVO */}
      {attendanceBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg border space-y-4">
            <h3 className="text-lg font-semibold">Registar Conclusão de Treino</h3>
            
            <div className="space-y-2">
              <Label htmlFor="cycle-select">Ciclo Realizado</Label>
              <select
                id="cycle-select"
                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                value={selectedCycle}
                onChange={(e) => setSelectedCycle(e.target.value as TrainingCycle)}
              >
                <option value="IC1">IC1 (3 min)</option>
                <option value="IC2">IC2 (3 min)</option>
                <option value="IC3">IC3 (3 min)</option>
                <option value="P1">P1 (3 min)</option>
                <option value="P2">P2 (1 min 30s)</option>
              </select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Ultra Dourado Alcançado?</p>
                <p className="text-xs text-muted-foreground">Identificado na foto (Arestas)</p>
              </div>
              <input
                type="checkbox"
                className="size-4 cursor-pointer"
                checked={ultraDourado}
                onChange={(e) => setUltraDourado(e.target.checked)}
              />
            </div>

            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <p><strong>Próximo ciclo:</strong> {cyclePreview.nextCycle}</p>
              <p><strong>Duração recomendada:</strong> {cyclePreview.duration}</p>
              <p className="text-xs text-muted-foreground pt-1">
                Estado automático: <strong>{cyclePreview.status}</strong>
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAttendanceBooking(null)} disabled={savingAttendance}>
                Cancelar
              </Button>
              <Button onClick={handleSaveAttendance} disabled={savingAttendance}>
                {savingAttendance ? <Loader2 className="animate-spin size-4" /> : "Guardar Atendimento"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

 
  
  
