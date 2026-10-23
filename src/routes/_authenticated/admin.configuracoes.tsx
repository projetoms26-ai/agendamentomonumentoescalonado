import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate, hhmm, WEEKDAYS } from "@/lib/booking";
import { ScheduleDays } from "@/components/admin/ScheduleDays";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  head: () => ({ meta: [
    { title: "Agenda e configurações — App MME" },
    { name: "description", content: "Gestão administrativa de datas, turnos e vagas dos ciclos do App MME." },
    { property: "og:title", content: "Agenda e configurações — App MME" },
    { property: "og:description", content: "Gestão de datas e vagas dos ciclos Iniciar, P1 e P2." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["settings"], queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).single()).data });
  const slots = useQuery({ queryKey: ["admin-slots"], queryFn: async () => (await supabase.from("time_slots").select("*").order("start_time")).data ?? [] });
  const blocked = useQuery({ queryKey: ["blocked"], queryFn: async () => (await supabase.from("blocked_dates").select("*").order("day")).data ?? [] });

  const [s, setS] = useState<NonNullable<typeof settings.data> | null>(null);
  useEffect(() => { if (settings.data) setS(settings.data); }, [settings.data]);
  const [newTime, setNewTime] = useState("");
  const [blockDay, setBlockDay] = useState("");
  const [blockReason, setBlockReason] = useState("");

  async function saveSettings() {
    if (!s) return;
    const { error } = await supabase.from("settings").update({
      daily_capacity: s.daily_capacity, slot_capacity: s.slot_capacity, group_size: s.group_size,
      open_weekdays: s.open_weekdays, days_ahead: s.days_ahead, payment_note: s.payment_note.slice(0, 500),
    }).eq("id", 1);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["settings"] });
  }
  const refreshSlots = () => qc.invalidateQueries({ queryKey: ["admin-slots"] });
  async function addSlot() {
    if (!newTime) return;
    const { error } = await supabase.from("time_slots").insert({ start_time: newTime });
    if (error) { toast.error("Horário já existe ou é inválido"); return; }
    setNewTime(""); refreshSlots();
  }
  async function blockDate() {
    if (!blockDay) return;
    const { error } = await supabase.from("blocked_dates").insert({ day: blockDay, reason: blockReason.slice(0, 200) || null });
    if (error) { toast.error("Data já bloqueada"); return; }
    setBlockDay(""); setBlockReason(""); qc.invalidateQueries({ queryKey: ["blocked"] });
  }

  if (!s) return null;
  const num = (k: "daily_capacity" | "slot_capacity" | "group_size" | "days_ahead") => (
    <Input type="number" min={k === "group_size" || k === "days_ahead" ? 1 : 0} className="h-11" value={s[k]}
      onChange={(e) => setS({ ...s, [k]: Math.max(0, parseInt(e.target.value) || 0) })} />
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">Configurações</h1>

      <ScheduleDays />

      <Card title="Capacidade e dias">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Capacidade por dia</Label>{num("daily_capacity")}</div>
          <div className="space-y-1.5">
            <Label>Capacidade padrão por horário</Label>{num("slot_capacity")}
            <div className="flex gap-1.5 pt-1">
              {[1, 2, 3].map((m) => (
                <button key={m} onClick={() => setS({ ...s, slot_capacity: s.group_size * m })} className="rounded-md border px-2 py-1 text-xs hover:bg-muted">{s.group_size * m}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5"><Label>Pessoas por grupo</Label>{num("group_size")}</div>
          <div className="space-y-1.5"><Label>Abrir agenda para os próximos (dias)</Label>{num("days_ahead")}</div>
        </div>
        <div className="mt-5 space-y-2">
          <Label>Dias de atendimento</Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((w, i) => {
              const on = s.open_weekdays.includes(i);
              return (
                <button key={w} onClick={() => setS({ ...s, open_weekdays: on ? s.open_weekdays.filter((x) => x !== i) : [...s.open_weekdays, i].sort() })}
                  className={`h-11 w-14 rounded-lg border-2 text-sm font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>{w}</button>
              );
            })}
          </div>
        </div>
        <div className="mt-5 space-y-1.5">
          <Label>Orientação sobre pagamento</Label>
          <Textarea maxLength={500} value={s.payment_note} onChange={(e) => setS({ ...s, payment_note: e.target.value })} />
        </div>
        <Button size="lg" className="mt-5" onClick={saveSettings}>Salvar configurações</Button>
      </Card>

      <Card title="Horários">
        <div className="divide-y rounded-lg border">
          {slots.data?.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="w-16 font-display text-lg font-semibold">{hhmm(t.start_time)}</span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                Vagas
                <Input type="number" min={0} placeholder={String(s.slot_capacity)} defaultValue={t.capacity ?? ""} className="h-9 w-20"
                  onBlur={async (e) => { const v = e.target.value === "" ? null : Math.max(0, parseInt(e.target.value)); await supabase.from("time_slots").update({ capacity: v }).eq("id", t.id); refreshSlots(); }} />
              </div>
              <div className="ml-auto flex items-center gap-3">
                <Switch checked={t.active} onCheckedChange={async (v) => { await supabase.from("time_slots").update({ active: v }).eq("id", t.id); refreshSlots(); }} />
                <Button variant="ghost" size="icon" onClick={async () => { if (confirm("Excluir este horário?")) { await supabase.from("time_slots").delete().eq("id", t.id); refreshSlots(); } }}><Trash2 /></Button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Deixe "vagas" vazio para usar a capacidade padrão. Desligue para cancelar o horário.</p>
        <div className="mt-4 flex gap-2">
          <Input type="time" className="h-11 w-36" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
          <Button variant="outline" className="h-11" onClick={addSlot}><Plus /> Criar horário</Button>
        </div>
      </Card>

      <Card title="Datas bloqueadas">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input type="date" className="h-11 sm:w-44" value={blockDay} onChange={(e) => setBlockDay(e.target.value)} />
          <Input className="h-11" placeholder="Motivo (opcional)" maxLength={200} value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
          <Button className="h-11" onClick={blockDate}>Bloquear</Button>
        </div>
        <div className="mt-4 space-y-2">
          {blocked.data?.map((b) => (
            <div key={b.day} className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span><b>{fmtDate(b.day)}</b> {b.reason && <span className="text-muted-foreground">— {b.reason}</span>}</span>
              <Button variant="outline" size="sm" onClick={async () => { await supabase.from("blocked_dates").delete().eq("day", b.day); qc.invalidateQueries({ queryKey: ["blocked"] }); }}>Reabrir</Button>
            </div>
          ))}
          {!blocked.data?.length && <p className="text-sm text-muted-foreground">Nenhuma data bloqueada.</p>}
        </div>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
