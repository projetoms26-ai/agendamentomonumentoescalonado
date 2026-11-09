import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const cycleGuidance = [
  { title: "Iniciante", description: "Primeira vez que faz o treinamento, ou não tenha concluído os 3 ciclos (IC1, IC2, IC3) de 3 min. cada." },
  { title: "P1", description: "Segunda vez que faz o treinamento, após fazer o ciclo iniciante e não sair o ultra dourado na foto, repete 1 ciclo de 3 min." },
  { title: "P2", description: "Terceira vez ou mais que faz o treinamento, após fazer o ciclo P1 e não sair o ultra dourado na foto, repete 1 ciclo de 1 min. e 30 s." },
  { title: "Arestas", description: "Após ter saído o ultra dourado na foto em qualquer etapa." },
];

export function CycleGuidance() {
  return (
    <div className="text-left">
      <h2 className="text-xl font-semibold">Selecione o seu ciclo:</h2>
      <dl className="mt-4 divide-y">
        {cycleGuidance.map((item) => (
          <div key={item.title} className="py-4">
            <dt className="font-semibold text-primary">{item.title}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function BookingInformation({ onContinue }: { onContinue: () => void }) {
  return (
    <section>
      <CycleGuidance />
      <Button size="lg" className="mt-6 w-full" onClick={onContinue}>Fazer cadastro <ArrowRight /></Button>
    </section>
  );
}