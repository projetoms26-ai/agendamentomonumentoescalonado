import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Clock, Loader2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/Brand";
import {
  addDays, dayNum, fmtDate, fmtLong, hhmm, maskPhone, monthShort, todayISO, weekdayShort,
} from "@/lib/booking";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agende seu horário — Agendamento online" },
      { name: "description", content: "Escolha o dia e o horário e confirme sua reserva em poucos passos. Pagamento no local." },
      { property: "og:title", content: "Agende seu horário online" },
      { property: "og:description", content: "Escolha o dia e o horário e confirme sua reserva em poucos passos." },
    ],
  }),
  component: BookingPage,
});

const formSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  whatsapp: z.string().refine((v) => { const n = v.replace(/\D/g, ""); return n.length >= 10 && n.length <= 11; }, "WhatsApp inválido"),
  email: z.string().trim().max(255).email("E-mail inválido").or(z.literal("")),
});

type Step = "date" | "time" | "form" | "review" | "done";

function BookingPage() {
  const [step, setStep] = useState<Step>("date");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", whatsapp: "", email: "" });
  const [errors, setErrors] = useState<{ name?: string; whatsapp?: string; email?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string } | null>(null);

  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).single()).data,
  });

  const days = useQuery({
    queryKey: ["availability", settings.data?.days_ahead],
    enabled: !!settings.data,
    queryFn: async () => {
      const from = todayISO();
      const { data, error } = await supabase.rpc("get_availability", { _from: from, _to: addDays(from, settings.data!.days_ahead) });
      if (error) throw error;
      return data.filter((d) => d.open && !d.blocked);
    },
  });

  const slots = useQuery({
    queryKey: ["slots", date],
    enabled: !!date,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_day_slots", { _date: date! });
      if (error) throw error;
      return data;
    },
  });

  const dayInfo = days.data?.find((d) => d.day === date);
  const dayLeft = dayInfo ? dayInfo.capacity - dayInfo.booked : 0;
  const nowTime = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date());

  function goForm() {
    const r = formSchema.safeParse(form);
    if (!r.success) {
      const e: Record<string, string> = {};
      r.error.issues.forEach((i) => (e[String(i.path[0])] = i.message));
      setErrors(e as typeof errors);
      return;
    }
    setErrors({});
    setStep("review");
  }

  async function confirm() {
    setSubmitting(true);
    setSubmitError(null);
    const { data, error } = await supabase.rpc("create_booking", {
      _name: form.name, _whatsapp: form.whatsapp, _email: form.email, _date: date!, _time: time!,
    });
    setSubmitting(false);
    if (error || !data?.[0]) {
      setSubmitError(error?.message ?? "Não foi possível concluir. Tente novamente.");
      days.refetch(); slots.refetch();
      return;
    }
    setResult({ code: data[0].code });
    setStep("done");
  }

  function reset() {
    setStep("date"); setDate(null); setTime(null); setForm({ name: "", whatsapp: "", email: "" }); setResult(null);
    days.refetch();
  }

  const stepIdx = { date: 0, time: 1, form: 2, review: 3, done: 4 }[step];
  const back = { time: "date", form: "time", review: "form" } as Record<Step, Step>;

  return (
    <div className="min-h-screen">
      <header className="hero-band px-5 pb-16 pt-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Brand light />
          <Link to="/admin" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">Área restrita</Link>
        </div>
        <div className="mx-auto mt-10 max-w-2xl">
          <h1 className="text-3xl font-semibold sm:text-4xl">Agende seu horário</h1>
          <p className="mt-2 text-primary-foreground/75">Escolha o dia, o horário e confirme. Pagamento no local.</p>
          {step !== "done" && (
            <div className="mt-6 flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= stepIdx ? "bg-accent" : "bg-primary-foreground/20"}`} />
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto -mt-10 max-w-2xl px-4 pb-16">
        <div className="rounded-2xl border bg-card p-5 shadow-xl shadow-primary/5 sm:p-7">
          {back[step] && (
            <button onClick={() => setStep(back[step])} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> Voltar
            </button>
          )}

          {step === "date" && (
            <section>
              <h2 className="text-xl font-semibold">1. Escolha a data</h2>
              {days.isLoading || settings.isLoading ? (
                <Loader2 className="mx-auto my-10 size-6 animate-spin text-muted-foreground" />
              ) : !days.data?.length ? (
                <p className="mt-6 text-muted-foreground">Nenhuma data disponível no momento.</p>
              ) : (
                <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {days.data.map((d) => {
                    const left = d.capacity - d.booked;
                    const full = left <= 0;
                    return (
                      <button
                        key={d.day}
                        disabled={full}
                        onClick={() => { setDate(d.day); setTime(null); setStep("time"); }}
                        className="flex flex-col items-center rounded-xl border-2 bg-background px-2 py-3 transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border"
                      >
                        <span className="text-xs font-medium uppercase text-muted-foreground">{weekdayShort(d.day)}</span>
                        <span className="font-display text-2xl font-semibold">{dayNum(d.day)}</span>
                        <span className="text-xs uppercase text-muted-foreground">{monthShort(d.day)}</span>
                        <span className={`mt-1.5 text-[11px] font-semibold ${full ? "text-destructive" : left <= 10 ? "text-warning" : "text-success"}`}>
                          {full ? "Esgotado" : `${left} vagas`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {step === "time" && date && (
            <section>
              <h2 className="text-xl font-semibold">2. Escolha o horário</h2>
              <p className="mt-1 capitalize text-muted-foreground">{fmtLong(date)}</p>
              {slots.isLoading ? (
                <Loader2 className="mx-auto my-10 size-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {slots.data?.map((s) => {
                    const left = Math.min(s.capacity - s.booked, dayLeft);
                    const past = date === todayISO() && hhmm(s.slot_time) <= nowTime;
                    const off = left <= 0 || past;
                    return (
                      <button
                        key={s.slot_time}
                        disabled={off}
                        onClick={() => { setTime(s.slot_time); setStep("form"); }}
                        className="flex min-h-16 flex-col items-center justify-center rounded-xl border-2 bg-background py-3 transition hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-background disabled:hover:text-foreground"
                      >
                        <span className="font-display text-xl font-semibold">{hhmm(s.slot_time)}</span>
                        <span className="text-xs opacity-75">{past ? "Encerrado" : left <= 0 ? "Esgotado" : `${left} ${left === 1 ? "vaga" : "vagas"}`}</span>
                      </button>
                    );
                  })}
                  {!slots.data?.length && <p className="col-span-full text-muted-foreground">Sem horários neste dia.</p>}
                </div>
              )}
            </section>
          )}

          {step === "form" && (
            <section>
              <h2 className="text-xl font-semibold">3. Seus dados</h2>
              <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); goForm(); }}>
                <Field label="Nome completo" error={errors.name}>
                  <Input className="h-12 text-base" autoComplete="name" maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="WhatsApp" error={errors.whatsapp}>
                  <Input className="h-12 text-base" inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: maskPhone(e.target.value) })} />
                </Field>
                <Field label="E-mail (opcional)" error={errors.email}>
                  <Input className="h-12 text-base" type="email" autoComplete="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
                <Button type="submit" size="lg" className="h-13 w-full text-base">Continuar</Button>
              </form>
            </section>
          )}

          {step === "review" && date && time && (
            <section>
              <h2 className="text-xl font-semibold">4. Confira sua reserva</h2>
              <dl className="mt-5 divide-y rounded-xl border bg-background">
                <Row k="Nome" v={form.name} />
                <Row k="WhatsApp" v={form.whatsapp} />
                {form.email && <Row k="E-mail" v={form.email} />}
                <Row k="Data" v={<span className="capitalize">{fmtLong(date)}</span>} />
                <Row k="Horário" v={hhmm(time)} />
              </dl>
              <p className="mt-4 flex gap-2 text-sm text-muted-foreground"><Wallet className="size-4 shrink-0" /> {settings.data?.payment_note}</p>
              {submitError && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">{submitError}</p>}
              <Button size="lg" className="mt-6 h-14 w-full text-base" disabled={submitting} onClick={confirm}>
                {submitting && <Loader2 className="animate-spin" />} Confirmar agendamento
              </Button>
            </section>
          )}

          {step === "done" && result && date && time && (
            <section className="text-center">
              <CheckCircle2 className="mx-auto size-16 text-success" />
              <h2 className="mt-3 text-2xl font-semibold">Agendamento confirmado!</h2>
              <p className="mt-1 text-muted-foreground">Guarde o código da sua reserva.</p>
              <div className="mx-auto mt-5 inline-block rounded-xl border-2 border-dashed border-accent bg-accent/10 px-6 py-3">
                <div className="text-xs font-medium uppercase text-muted-foreground">Código</div>
                <div className="font-display text-3xl font-bold tracking-[0.2em]">{result.code}</div>
              </div>
              <dl className="mt-6 divide-y rounded-xl border bg-background text-left">
                <Row k="Nome" v={form.name} />
                <Row k="Data" v={fmtDate(date)} />
                <Row k="Horário" v={<span className="inline-flex items-center gap-1"><Clock className="size-4" />{hhmm(time)}</span>} />
              </dl>
              <div className="mt-4 flex gap-2 rounded-xl bg-secondary p-4 text-left text-sm">
                <Wallet className="size-5 shrink-0 text-primary" />
                <span>{settings.data?.payment_note}</span>
              </div>
              <Button variant="outline" size="lg" className="mt-6 w-full" onClick={reset}>Fazer outro agendamento</Button>
            </section>
          )}
        </div>
      </main>
    </div>
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
