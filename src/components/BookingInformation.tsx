import { ArrowRight, CheckCircle2, Clock3, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const statuses = [
  { status: "Iniciante", criterion: "Usuário cadastrado iniciando a rotina", action: "3 min", wait: "9 min", photo: "Nenhuma" },
  { status: "P1", criterion: "Não aprovado no ciclo inicial (IC3)", action: "3 min", wait: "9 min", photo: "1ª foto" },
  { status: "P2", criterion: "Não aprovado na etapa P1", action: "1 min 30 s", wait: "4 min 30 s", photo: "2ª foto ou mais" },
  { status: "Aresta", criterion: "Aprovado em qualquer validação", action: "—", wait: "—", photo: "Concluído" },
];

const stages = [
  {
    title: "Etapa 1: Iniciante",
    cycles: "3 ciclos consecutivos no 1º dia (IC1, IC2 e IC3).",
    duration: "3 minutos de ação + 9 minutos de espera por ciclo.",
    validation: "Validação ao concluir IC3",
    notApproved: "Status atualizado para P1 (envio da 1ª foto).",
  },
  {
    title: "Etapa 2: P1",
    cycles: "1 ciclo único.",
    duration: "3 minutos de ação + 9 minutos de espera.",
    validation: "Validação",
    notApproved: "Status atualizado para P2 (envio da 2ª foto).",
  },
  {
    title: "Etapa 3: P2 (Recorrente)",
    cycles: "Ciclos contínuos: repetição de ciclos curtos.",
    duration: "1 minuto e 30 segundos de ação + 4 minutos e 30 segundos de espera.",
    validation: "Validação",
    notApproved: "Mantém o status P2 e repete o ciclo reduzido.",
  },
];

export function BookingInformation({ onContinue }: { onContinue: () => void }) {
  return (
    <section aria-labelledby="booking-information-title">
      <h2 id="booking-information-title" className="text-xl font-semibold">Classificação e Regras de Transição</h2>
      <h3 className="mt-5 text-lg font-semibold">1. Tabela de Status do Usuário</h3>
      <div className="mt-5 hidden sm:block">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">Critérios, tempos e fotos por status</caption>
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th scope="col" className="w-[17%] px-2 py-3 font-semibold">Status</th>
              <th scope="col" className="w-[29%] px-2 py-3 font-semibold">Critério de Entrada</th>
              <th scope="col" className="w-[18%] px-2 py-3 font-semibold">Tempo de Ação</th>
              <th scope="col" className="w-[18%] px-2 py-3 font-semibold">Tempo de Espera</th>
              <th scope="col" className="w-[18%] px-2 py-3 font-semibold">Foto Enviada</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {statuses.map((item) => (
              <tr key={item.status} className="align-top">
                <th scope="row" className="break-words px-2 py-4 font-semibold text-primary">{item.status}</th>
                <td className="px-2 py-4">{item.criterion}</td>
                <td className="px-2 py-4">{item.action}</td>
                <td className="px-2 py-4">{item.wait}</td>
                <td className="px-2 py-4">{item.photo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 divide-y sm:hidden">
        {statuses.map((item) => (
          <article key={item.status} className="py-4">
            <h3 className="font-semibold text-primary">{item.status}</h3>
            <dl className="mt-2 space-y-2 text-sm">
              <div><dt className="text-muted-foreground">Critério de Entrada</dt><dd>{item.criterion}</dd></div>
              <div className="grid grid-cols-2 gap-3">
                <div><dt className="text-muted-foreground">Tempo de Ação</dt><dd className="font-medium">{item.action}</dd></div>
                <div><dt className="text-muted-foreground">Tempo de Espera</dt><dd className="font-medium">{item.wait}</dd></div>
              </div>
              <div><dt className="text-muted-foreground">Foto Enviada</dt><dd>{item.photo}</dd></div>
            </dl>
          </article>
        ))}
      </div>
      <div className="mt-6 border-t pt-6" aria-labelledby="booking-stages-title">
        <h3 id="booking-stages-title" className="text-lg font-semibold">2. Fluxo e Ciclos de Execução</h3>
        <div className="mt-2 divide-y">
          {stages.map((stage) => (
            <article key={stage.title} className="space-y-3 py-5">
              <h4 className="font-semibold text-primary">{stage.title}</h4>
              <p className="text-sm">{stage.cycles}</p>
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Clock3 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>{stage.duration}</span>
              </p>
              <p className="text-sm font-semibold">{stage.validation}</p>
              <dl className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                  <div><dt className="font-semibold text-success">Aprovado</dt><dd>Status atualizado para Aresta.</dd></div>
                </div>
                <div className="flex items-start gap-2">
                  <Repeat2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div><dt className="font-semibold">Reprovado</dt><dd>{stage.notApproved}</dd></div>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>
      <Button size="lg" className="mt-6 w-full" onClick={onContinue}>Fazer cadastro <ArrowRight /></Button>
    </section>
  );
}