import { describe, expect, it } from "vitest";
import { countByApproval, filterCustomers, type CustomerRow } from "@/lib/customer-list";

const rows: CustomerRow[] = [
  { id: "1", full_name: "Paulo leandro klein", whatsapp: "51998295488", email: "pauloleandroklein@gmail.com", cycle: "ABC", requested_cycle: "ABC", confirmed: true, last_activity_date: null, dependents: [] },
  { id: "2", full_name: "Eduardo Burti Ribeiro", whatsapp: "19982148983", email: "eburti999@gmail.com", cycle: null, requested_cycle: "Iniciar", confirmed: true, last_activity_date: null, dependents: [] },
  { id: "3", full_name: "Novo cadastro", whatsapp: "67999998888", email: "novo@example.com", cycle: null, requested_cycle: null, confirmed: false, last_activity_date: null, dependents: [] },
];

const ids = (r: CustomerRow[]) => r.map((c) => c.id);

describe("lista de cadastros do painel", () => {
  it("mostra somente cadastros aprovados no filtro Aprovados", () => {
    expect(ids(filterCustomers(rows, "aprovados", ""))).toEqual(["1", "2"]);
  });

  it("mostra somente cadastros sem aprovação no filtro A confirmar", () => {
    expect(ids(filterCustomers(rows, "pendentes", ""))).toEqual(["3"]);
  });

  it("busca cadastro aprovado pelo e-mail cadastrado", () => {
    expect(ids(filterCustomers(rows, "aprovados", "EBURTI999@gmail.com"))).toEqual(["2"]);
  });

  it("busca cadastro aprovado pelo whatsapp cadastrado", () => {
    expect(ids(filterCustomers(rows, "aprovados", "51 99829-5488"))).toEqual(["1"]);
  });

  it("separa aprovados e a confirmar na contagem", () => {
    expect(countByApproval(rows)).toEqual({ approved: 2, pending: 1 });
  });
});
