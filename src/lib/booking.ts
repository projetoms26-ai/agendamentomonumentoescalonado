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

export type Status = "agendado" | "chegou" | "concluiu" | "faltou" | "cancelado" | "reagendou" | "repetir" | "passou" | "atendido" | "nao_compareceu";
// adminOnly = ações marcadas com * (só o administrador pode aplicar)
export const STATUSES: { value: Status; label: string; cls: string; adminOnly?: boolean }[] = [
  { value: "agendado", label: "Agendado", cls: "bg-info/15 text-info border-info/30" },
  { value: "chegou", label: "Chegou", cls: "bg-warning/20 text-foreground border-warning/50" },
  { value: "concluiu", label: "Concluiu", cls: "bg-success/15 text-success border-success/30", adminOnly: true },
  { value: "faltou", label: "Faltou", cls: "bg-destructive/10 text-destructive border-destructive/30", adminOnly: true },
  { value: "cancelado", label: "Cancelou", cls: "bg-muted text-muted-foreground border-border" },
  { value: "reagendou", label: "Reagendou", cls: "bg-muted text-foreground border-border" },
  { value: "repetir", label: "Repetir", cls: "bg-warning/20 text-foreground border-warning/50", adminOnly: true },
  { value: "passou", label: "Passou", cls: "bg-success/25 text-success border-success/40", adminOnly: true },
];
const LEGACY = [
  { value: "atendido" as Status, label: "Atendido", cls: "bg-success/15 text-success border-success/30" },
  { value: "nao_compareceu" as Status, label: "Não compareceu", cls: "bg-destructive/10 text-destructive border-destructive/30" },
];
export const statusInfo = (s: string) => [...STATUSES, ...LEGACY].find((x) => x.value === s) ?? STATUSES[0]!;
export const CYCLES = ["i1", "i2", "i3", "P1", "P2", "Aresta"] as const;
export const PERIODS: Record<string, string> = { integral: "Período integral", tarde: "Tarde" };

/** Regra do Iniciar: 3 ciclos. Dia inteiro = 1 data integral (i1,i2,i3); Duas tardes = 2 datas com tarde (i1,i2 | i3). */
export type IniciarFormat = "dia_inteiro" | "duas_tardes" | "tarde_integral";
export const requiredDates = (f: IniciarFormat) => (f === "dia_inteiro" ? 1 : 2);
export function planCycles(f: IniciarFormat, dates: string[]): { date: string; cycle: string }[] {
  const ds = [...dates].sort();
  if (f === "dia_inteiro") return ds.length === 1 ? ["i1", "i2", "i3"].map((c) => ({ date: ds[0]!, cycle: c })) : [];
  return ds.length === 2 ? [{ date: ds[0]!, cycle: "i1" }, { date: ds[0]!, cycle: "i2" }, { date: ds[1]!, cycle: "i3" }] : [];
}
export function dayFitsFormat(period: string, f: IniciarFormat) {
  if (f === "tarde_integral") return period === "tarde" || period === "integral";
  return f === "dia_inteiro" ? period === "integral" : period !== "manha";
}
export const FORMAT_LABEL: Record<IniciarFormat, string> = { dia_inteiro: "Dia inteiro", duas_tardes: "Duas tardes", tarde_integral: "1 tarde + 1 dia integral" };
/** 1 tarde + 1 integral: uma data à tarde e outra de período integral. */
export function manhaTardeOk(a: string, b: string) {
  return (a === "tarde" && b === "integral") || (a === "integral" && b === "tarde");
}
export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
