import { describe, expect, it } from "vitest";
import { cycleOptionsFor, cycleSelectable, CYCLE_OPTIONS } from "@/lib/cycle-lock";

describe("ciclo travado no escolhido no cadastro", () => {
  it("só o ciclo do cadastro pode ser marcado", () => {
    expect(cycleSelectable("P1", "P1")).toBe(true);
    expect(cycleSelectable("P1", "P2")).toBe(false);
    expect(cycleSelectable("P1", "Iniciar")).toBe(false);
    expect(cycleSelectable("P1", "Aresta")).toBe(false);
    expect(cycleSelectable("P1", "ABC")).toBe(false);
  });

  it("cada ciclo do cadastro libera exatamente uma opção", () => {
    for (const option of CYCLE_OPTIONS) {
      const liberadas = cycleOptionsFor(option.value).filter((o) => o.selectable);
      expect(liberadas.map((o) => o.value)).toEqual([option.value]);
    }
  });

  it("mantém os cinco ciclos visíveis, com os demais bloqueados", () => {
    const options = cycleOptionsFor("ABC");
    expect(options).toHaveLength(5);
    expect(options.find((o) => o.value === "ABC")?.selectable).toBe(true);
    expect(options.filter((o) => !o.selectable)).toHaveLength(4);
  });
});
