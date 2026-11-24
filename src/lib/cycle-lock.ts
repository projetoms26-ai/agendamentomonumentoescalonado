// O ciclo escolhido no cadastro é o único que a pessoa pode agendar:
// na etapa "Qual ciclo você vai agendar?" ele já vem marcado e os demais ficam bloqueados.

export type CycleCategory = "Iniciar" | "P1" | "P2" | "Aresta" | "ABC";

export const CYCLE_OPTIONS: { value: CycleCategory; title: string; desc: string }[] = [
  { value: "Iniciar", title: "Iniciar (i1, i2, i3)", desc: "Para iniciantes: 3 ciclos." },
  { value: "P1", title: "P1", desc: "1 ciclo, em 1 data." },
  { value: "P2", title: "P2", desc: "1 ciclo, em 1 data." },
  { value: "Aresta", title: "Aresta", desc: "Escolha o dia." },
  { value: "ABC", title: "ABC", desc: "1 ciclo, em 1 data." },
];

/** Só o ciclo do cadastro pode ser marcado; os demais ficam sem opção de escolha. */
export function cycleSelectable(allowed: CycleCategory, option: CycleCategory) {
  return option === allowed;
}

export function cycleOptionsFor(allowed: CycleCategory) {
  return CYCLE_OPTIONS.map((option) => ({ ...option, selectable: cycleSelectable(allowed, option.value) }));
}
