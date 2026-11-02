import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const statuses = [
  { status: "Iniciante", criterion: "Usuário cadastrado iniciando a rotina", action: "3 min", wait: "9 min", photo: "Nenhuma" },
  { status: "P1", criterion: "Não aprovado no ciclo inicial (IC3)", action: "3 min", wait: "9 min", photo: "1ª foto" },
  { status: "P2", criterion: "Não aprovado na etapa P1", action: "1 min 30 s", wait: "4 min 30 s", photo: "2ª foto ou mais" },
  { status: "Aresta", criterion: "Aprovado em qualquer validação", action: "—", wait: "—", photo: "Concluído" },
];

export function BookingInformation({ onContinue }: { onContinue: () => void }) {
  return (
    <section aria-labelledby="booking-information-title">
      <h2 id="booking-information-title" className="text-xl font-semibold">Informações sobre o agendamento</h2>
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
      <Button size="lg" className="mt-6 w-full" onClick={onContinue}>Fazer cadastro <ArrowRight /></Button>
    </section>
  );
}