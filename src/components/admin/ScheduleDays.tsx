import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Pencil, Loader2, Sun, Sunset, MailPlus, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

  const days = useQuery({
    queryKey: ["admin-schedule-days"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_periods")
        .select("*")
        .gte("day", todayISO())
        .order("day")
        .order("period");
      if (error) throw error;
      return data;
    },
  });

  const invites = useQuery({
    queryKey: ["admin-invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_invites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.day || draft.day < todayISO() || draft.start_time >= draft.end_time) {
      toast
