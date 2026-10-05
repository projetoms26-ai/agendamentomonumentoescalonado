export const TZ = "America/Sao_Paulo";

export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function d(iso: string) {
  return new Date(iso + "T12:00:00Z");
}
export const fmtDate = (iso: string) =>
  d(iso).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
export const fmtLong = (iso: string) =>
  d(iso).toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
export const weekdayShort = (iso: string) =>
  d(iso).toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short" }).replace(".", "");
export const monthShort = (iso: string) =>
  d(iso).toLocaleDateString("pt-BR", { timeZone: "UTC", month: "short" }).replace(".", "");
export const dayNum = (iso: string) => String(d(iso).getUTCDate());
export const hhmm = (t: string) => t.slice(0, 5);

export function maskPhone(v: string) {
  const n = v.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

export type Status = "agendado" | "chegou" | "atendido" | "cancelado" | "nao_compareceu";
export const STATUSES: { value: Status; label: string; cls: string }[] = [
  { value: "agendado", label: "Agendado", cls: "bg-info/15 text-info border-info/30" },
  { value: "chegou", label: "Chegou", cls: "bg-warning/20 text-foreground border-warning/50" },
  { value: "atendido", label: "Atendido", cls: "bg-success/15 text-success border-success/30" },
  { value: "cancelado", label: "Cancelado", cls: "bg-muted text-muted-foreground border-border" },
  { value: "nao_compareceu", label: "Não compareceu", cls: "bg-destructive/10 text-destructive border-destructive/30" },
];
export const statusInfo = (s: string) => STATUSES.find((x) => x.value === s) ?? STATUSES[0]!;
export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
