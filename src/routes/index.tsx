import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Check, CheckCircle2, Loader2, Sun, Sunset, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/Brand";
import {
  addDays, dayFitsFormat, dayNum, fmtDate, fmtLong, hhmm, maskPhone, monthShort, PERIODS, planCycles,
  requiredDates, todayISO, weekdayShort, type IniciarFormat,
} from "@/lib/booking";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agende seu ciclo — App MME" },
      { name: "description", content: "Faça seu cadastro, escolha as datas e confirme seu agendamento. Pagamento no local." },
      { property: "og:title", content: "Agende seu ciclo — App MME" },
      { property: "og:description", content: "Cadastro e agendamento online de ciclos Iniciar, P1 e P2." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookingPage,
});

const formSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  whatsapp: z.string().refine((v) => { const n = v.replace(/\D/g, ""); return n.length >= 10 && n.length <= 11; }, "Celular inválido"),
  email: z.string().trim().max(255).email("E-mail inválido").or(z.literal("")),
});

type Step = "form" | "format" | "dates" | "review" | "done";
type Category = "Iniciar" | "P1" | "P2";

function BookingPage() {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ name: "", whatsapp: "", email: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<string>("iniciante");
  const [category, setCategory] = useState<Category>("Iniciar");
  const [format, setFormat] = useState<IniciarFormat | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; booking_date: string; cycle: string }[]>([]);

  const settings = useQuery({ queryKey: ["settings"], queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).single()).data });
  const schedule = useQuery({
    queryKey: ["schedule"],
    queryFn: async () => {
      const from = todayISO();
      const { data, error } = await supabase.rpc("get_schedule", { _from: from, _to: addDays(from, 120) });
      if (error) throw error;
      return data;
    },
  });

  const isIniciar = category === "Iniciar";
  const need = isIniciar && format ? requiredDates(format) : 1;
  const plan = isIniciar && format ? planCycles(format, dates) : dates.map((d) => ({ date: d, cycle: category }));
  const cyclesDone = isIniciar && format ? (format === "dia_inteiro" ? dates.length * 3 : dates.length === 0 ? 0 : dates.length === 1 ? 2 : 3) : 0;
  const ready = dates.length === need;

  const available = (schedule.data ?? []).filter((d) => {
    if (isIniciar) return !!format && dayFitsFormat(d.period, format);
    return true;
  });
  const leftOf = (d: NonNullable<typeof schedule.data>[number]) => (category === "Iniciar" ? d.iniciar_left : category === "P1" ? d.p1_left : d.p2_left);

  async function submitForm() {
    const r = formSchema.safeParse(form);
    if (!r.success) {
      const e: Record<string, string> = {};
      r.error.issues.forEach((i) => (e[String(i.path[0])] = i.message));
      setErrors(e); return;
    }
    setErrors({}); setBusy(true);
    const { data, error } = await supabase.rpc("lookup_profile", { _whatsapp: form.whatsapp });
    setBusy(false);
    if (error) { toast.error("Não foi possível verificar seu cadastro"); return; }
    const p = data ?? "iniciante";
    setProfile(p); setDates([]); setFormat(null);
    if (p === "iniciante") { setCategory("Iniciar"); setStep("format"); }
    else if (p === "Aresta") { setCategory("P1"); setStep("format"); }
    else { setCategory(p as Category); setStep("dates"); }
  }

  function toggleDate(day: string) {
    if (dates.includes(day)) return setDates(dates.filter((d) => d !== day));
    if (need === 1) return setDates([day]);
    if (dates.length >= need) { toast.warning(`Você já selecionou ${need} datas. Desmarque uma para trocar.`); return; }
    setDates([...dates, day]);
  }

  function goReview() {
    if (!ready) {
      toast.error(isIniciar ? `Selecione ${need === 1 ? "1 data" : `${need} datas`} para completar os 3 ciclos (faltam ${3 - cyclesDone}).` : "Selecione uma data.");
      return;
    }
    setStep("review");
  }

  async function confirm() {
    setBusy(true); setSubmitError(null);
    const { data, error } = await supabase.rpc("book_cycles", {
      _name: form.name, _whatsapp: form.whatsapp, _email: form.email, _category: category,
      _format: isIniciar ? format! : "", _dates: dates,
    });
    setBusy(false);
    if (error || !data?.length) { setSubmitError(error?.message ?? "Não foi possível concluir."); schedule.refetch(); return; }
    setResult(data); setStep("done");
  }

  function reset() {
    setStep("form"); setDates([]); setFormat(null); setResult([]); schedule.refetch();
  }

  const order: Step[] = ["form", "format", "dates", "review"];
  const stepIdx = step === "done" ? 4 : order.indexOf(step);
  const back: Partial<Record<Step, Step>> = { format: "form", dates: profile === "P1" || profile === "P2" ? "form" : "format", review: "dates" };

  return (
    <div className="min-h-screen">
      <header className="hero-band px-5 pb-16 pt-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Brand light />
          <Link to="/admin" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">Área restrita</Link>
        </div>
        <div className="mx-auto mt-10 max-w-2xl">
          <h1 className="text-3xl font-semibold sm:text-4xl">Agende seu ciclo</h1>
          <p className="mt-2 text-primary-foreground/75">Cadastro, escolha das datas e confirmação. Pagamento no local.</p>
          {step !== "done" && (
            <div className="mt-6 flex gap-1.5">
              {[0, 1, 2, 3].map((i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= stepIdx ? "bg-accent" : "bg-primary-foreground/20"}`} />)}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto -mt-10 max-w-2xl space-y-6 px-4 pb-16">
        <div className="rounded-2xl border bg-card p-5 shadow-xl shadow-primary/5 sm:p-7">
          {back[step] && (
            <button onClick={() => setStep(back[step]!)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> Voltar
            </button>
          )}

          {step === "form" && (
            <section>
              <h2 className="text-xl font-semibold">1. Cadastro</h2>
              <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); submitForm(); }}>
                <Field label="Nome completo" error={errors["name"]}>
                  <Input className="h-12 text-base" autoComplete="name" maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="Celular (WhatsApp)" error={errors["whatsapp"]}>
                  <Input className="h-12 text-base" inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: maskPhone(e.target.value) })} />
                </Field>
                <Field label="E-mail (opcional)" error={errors["email"]}>
                  <Input className="h-12 text-base" type="email" autoComplete="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
                <p className="text-xs text-muted-foreground">Seu ciclo é definido pela equipe após a confirmação do cadastro.</p>
                <Button type="submit" size="lg" className="w-full text-base" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Continuar</Button>
              </form>
            </section>
          )}

          {step === "format" && profile === "iniciante" && (
            <section>
              <h2 className="text-xl font-semibold">2. Iniciar — 3 ciclos</h2>
              <p className="mt-1 text-muted-foreground">Escolha como distribuir seus 3 ciclos (i1, i2, i3):</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup">
                <FormatCard active={format === "dia_inteiro"} onClick={() => { setFormat("dia_inteiro"); setDates([]); }} icon={<Sun className="size-6" />}
                  title="Dia inteiro" desc="Os 3 ciclos no mesmo dia (período integral)." />
                <FormatCard active={format === "duas_tardes"} onClick={() => { setFormat("duas_tardes"); setDates([]); }} icon={<Sunset className="size-6" />}
                  title="Duas tardes" desc="Ciclos distribuídos em 2 tardes (i1+i2 e i3)." />
              </div>
              <Button size="lg" className="mt-6 w-full" disabled={!format} onClick={() => setStep("dates")}>Escolher datas</Button>
            </section>
          )}

          {step === "format" && profile === "Aresta" && (
            <section>
              <h2 className="text-xl font-semibold">2. Escolha a categoria</h2>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {(["P1", "P2"] as const).map((c) => (
                  <FormatCard key={c} active={category === c} onClick={() => setCategory(c)} title={c} desc={`Agendar vaga de ${c}`} />
                ))}
              </div>
              <Button size="lg" className="mt-6 w-full" onClick={() => { setDates([]); setStep("dates"); }}>Escolher data</Button>
            </section>
          )}

          {step === "dates" && (
            <section>
              <h2 className="text-xl font-semibold">3. Escolha {need === 1 ? "a data" : "as datas"} — {category}</h2>
              {isIniciar && format && (
                <div className="mt-4 rounded-xl border border-accent bg-accent/10 p-4 text-sm">
                  <p className="font-semibold">Como iniciante, você precisa completar exatamente 3 ciclos para concluir.</p>
                  <p className="mt-1 text-muted-foreground">
                    {format === "dia_inteiro" ? "Dia inteiro: selecione 1 data de período integral." : "Duas tardes: selecione 2 datas com turno da tarde."}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex gap-1.5">{[0, 1, 2].map((i) => <div key={i} className={`grid size-7 place-items-center rounded-full text-xs font-bold ${i < cyclesDone ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>{i < cyclesDone ? <Check className="size-4" /> : `i${i + 1}`}</div>)}</div>
                    <span className="font-semibold">Ciclos selecionados: {cyclesDone} de 3</span>
                  </div>
                </div>
              )}
              {schedule.isLoading ? <Loader2 className="mx-auto my-10 size-6 animate-spin text-muted-foreground" /> :
                !available.length ? <p className="mt-6 text-muted-foreground">Nenhuma data disponível no momento.</p> : (
                <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {available.map((d) => {
                    const left = leftOf(d);
                    const sel = dates.includes(d.day);
                    return (
                      <button key={d.day} disabled={left <= 0 && !sel} onClick={() => toggleDate(d.day)} aria-pressed={sel}
                        className={`relative flex flex-col items-center rounded-xl border-2 px-2 py-3 transition disabled:cursor-not-allowed disabled:opacity-40 ${sel ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary"}`}>
                        {sel && <Check className="absolute right-2 top-2 size-4" />}
                        <span className="text-xs font-medium uppercase opacity-70">{weekdayShort(d.day)}</span>
                        <span className="font-display text-2xl font-semibold">{dayNum(d.day)}</span>
                        <span className="text-xs uppercase opacity-70">{monthShort(d.day)}</span>
                        <span className="mt-1 text-[11px] opacity-80">{PERIODS[d.period]} · {hhmm(d.start_time)}–{hhmm(d.end_time)}</span>
                        <span className={`mt-1 text-[11px] font-semibold ${sel ? "" : left <= 0 ? "text-destructive" : left <= 3 ? "text-warning" : "text-success"}`}>
                          {left <= 0 ? "Esgotado" : `${left} ${left === 1 ? "vaga" : "vagas"}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {ready && plan.length > 0 && (
                <div className="mt-5 rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
                  <p className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 className="size-4" /> Tudo certo! Resumo:</p>
                  <ul className="mt-2 space-y-1">{plan.map((p, i) => <li key={i}><b>{p.cycle}</b> — <span className="capitalize">{fmtLong(p.date)}</span></li>)}</ul>
                </div>
              )}
              <Button size="lg" className="mt-6 w-full" disabled={!ready} onClick={goReview}
                onPointerDown={() => { if (!ready) goReview(); }}>Concluir seleção</Button>
            </section>
          )}

          {step === "review" && (
            <section>
              <h2 className="text-xl font-semibold">4. Confira seu agendamento</h2>
              <dl className="mt-5 divide-y rounded-xl border bg-background">
                <Row k="Nome" v={form.name} />
                <Row k="Celular" v={form.whatsapp} />
                <Row k="Categoria" v={isIniciar ? `Iniciar — ${format === "dia_inteiro" ? "Dia inteiro" : "Duas tardes"}` : category} />
                {plan.map((p, i) => <Row key={i} k={p.cycle} v={<span className="capitalize">{fmtLong(p.date)}</span>} />)}
              </dl>
              <p className="mt-4 flex gap-2 text-sm text-muted-foreground"><Wallet className="size-4 shrink-0" /> {settings.data?.payment_note}</p>
              {submitError && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">{submitError}</p>}
              <Button size="lg" className="mt-6 h-14 w-full text-base" disabled={busy} onClick={confirm}>
                {busy && <Loader2 className="animate-spin" />} Confirmar agendamento
              </Button>
            </section>
          )}

          {step === "done" && (
            <section className="text-center">
              <CheckCircle2 className="mx-auto size-16 text-success" />
              <h2 className="mt-3 text-2xl font-semibold">Agendamento confirmado!</h2>
              <p className="mt-1 text-muted-foreground">Guarde os códigos das suas reservas.</p>
              <dl className="mt-6 divide-y rounded-xl border bg-background text-left">
                {result.map((r) => <Row key={r.code} k={`${r.cycle} · ${fmtDate(r.booking_date)}`} v={<span className="font-mono text-lg font-bold tracking-widest">{r.code}</span>} />)}
              </dl>
              <div className="mt-4 flex gap-2 rounded-xl bg-secondary p-4 text-left text-sm"><Wallet className="size-5 shrink-0 text-primary" /><span>{settings.data?.payment_note}</span></div>
              <Button variant="outline" size="lg" className="mt-6 w-full" onClick={reset}>Fazer outro agendamento</Button>
            </section>
          )}
        </div>

        <MyBooking onReschedule={() => { setStep("form"); setDates([]); }} />
      </main>
    </div>
  );
}

function MyBooking({ onReschedule }: { onReschedule: () => void }) {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  async function act(action: "chegou" | "cancelado" | "reagendou") {
    if (code.trim().length < 6 || phone.replace(/\D/g, "").length < 10) { toast.error("Informe o código e o celular"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("customer_action", { _code: code, _whatsapp: phone, _action: action });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(action === "chegou" ? "Chegada registrada" : action === "cancelado" ? "Reserva cancelada" : "Reserva liberada — escolha uma nova data");
    if (action === "reagendou") { onReschedule(); window.scrollTo({ top: 0, behavior: "smooth" }); }
    setCode("");
  }
  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-7">
      <h2 className="text-lg font-semibold">Minha reserva</h2>
      <p className="text-sm text-muted-foreground">Avise sua chegada, cancele ou reagende.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Input className="h-11 font-mono uppercase" placeholder="Código" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <Input className="h-11" inputMode="tel" placeholder="Celular" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => act("chegou")}>Cheguei</Button>
        <Button variant="outline" disabled={busy} onClick={() => act("reagendou")}>Reagendar</Button>
        <Button variant="outline" disabled={busy} onClick={() => confirm("Cancelar esta reserva?") && act("cancelado")}>Cancelar</Button>
      </div>
    </section>
  );
}

function FormatCard({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon?: React.ReactNode; title: string; desc: string }) {
  return (
    <button role="radio" aria-checked={active} onClick={onClick}
      className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition ${active ? "border-primary bg-primary/10" : "bg-background hover:border-primary/50"}`}>
      {icon && <span className="text-primary">{icon}</span>}
      <span><span className="block font-semibold">{title}</span><span className="text-sm text-muted-foreground">{desc}</span></span>
    </button>
  );
}

function Field({ label, error, children }: { label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
