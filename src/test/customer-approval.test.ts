import { describe, expect, it } from "vitest";
import {
  approvalStateFor,
  buildApprovalIndex,
  emptyApprovalIndex,
  phoneKey,
  type ApprovalCustomer,
} from "@/lib/customer-approval";

const customers: ApprovalCustomer[] = [
  { id: "c1", whatsapp: "51998295488", email: "pauloleandroklein@gmail.com", confirmed: true },
  { id: "c2", whatsapp: "19982148983", email: "eburti999@gmail.com", confirmed: true },
  { id: "c3", whatsapp: "67999998888", email: "novo@example.com", confirmed: false },
];

const index = buildApprovalIndex(customers);

const booking = (over: Partial<{ customer_id: string | null; whatsapp: string; email: string | null }>) => ({
  customer_id: null,
  whatsapp: "",
  email: null,
  ...over,
});

describe("situação do cadastro ao lado do agendamento", () => {
  it("reconhece o celular mesmo com espaços e traços", () => {
    expect(phoneKey("(51) 99829-5488")).toBe("51998295488");
    expect(approvalStateFor(booking({ whatsapp: "(51) 99829-5488" }), index)).toBe("aprovado");
  });

  it("diz que o cadastro ainda está para confirmar", () => {
    expect(approvalStateFor(booking({ whatsapp: "67 99999-8888" }), index)).toBe("pendente");
  });

  it("avisa quando não há cadastro nenhum com aquele contato", () => {
    expect(approvalStateFor(booking({ whatsapp: "11 91234-5678", email: "ninguem@exemplo.com" }), index)).toBe("nao_encontrado");
  });

  it("acha a pessoa pelo e-mail quando o celular do agendamento está diferente", () => {
    expect(approvalStateFor(booking({ whatsapp: "11000000000", email: "PauloLeandroKlein@gmail.com " }), index)).toBe("aprovado");
  });

  it("usa o vínculo direto do agendamento antes de procurar pelo celular", () => {
    expect(approvalStateFor(booking({ customer_id: "c3", whatsapp: "51998295488" }), index)).toBe("pendente");
  });

  it("trata agendamento sem nenhum contato informado", () => {
    expect(approvalStateFor(booking({}), emptyApprovalIndex)).toBe("nao_encontrado");
  });
});
