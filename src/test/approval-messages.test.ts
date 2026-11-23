import { describe, expect, it, vi } from "vitest";
import { approvalRequestSchema, prepareApprovalMessages, draftWhatsAppUrl } from "@/lib/approval-messages";

const id = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";
const input = { customerIds: [id], template: "Olá, {nome}, seu cadastro foi aprovado.", notes: "" };
const customer = { id, full_name: "Pessoa de teste", cycle: "ABC", confirmed: true };
function dependencies() {
  return { isAdmin: vi.fn(async () => true), loadCustomers: vi.fn(async () => [customer]), generate: vi.fn(async () => ({ messages: [{ key: "0", message: "Olá! Cadastro aprovado para ABC." }] })) };
}
describe("Mensagens de aprovação com IA", () => {
  it("recusa não administradores antes de consultar cadastros ou usar IA", async () => {
    const deps = dependencies(); deps.isAdmin.mockResolvedValue(false);
    await expect(prepareApprovalMessages(input, deps)).rejects.toThrow("Somente administradores");
    expect(deps.loadCustomers).not.toHaveBeenCalled(); expect(deps.generate).not.toHaveBeenCalled();
  });
  it("não gera confirmação de aprovação para cadastro pendente", async () => {
    const deps = dependencies(); deps.loadCustomers.mockResolvedValue([{ ...customer, confirmed: false }]);
    await expect(prepareApprovalMessages(input, deps)).rejects.toThrow("aprovação já salva"); expect(deps.generate).not.toHaveBeenCalled();
  });
  it("recusa cadastros ausentes sem enviar dados parciais à IA", async () => {
    const deps = dependencies(); deps.loadCustomers.mockResolvedValue([]);
    await expect(prepareApprovalMessages(input, deps)).rejects.toThrow("aprovação já salva"); expect(deps.generate).not.toHaveBeenCalled();
  });
  it("envia apenas nome e ciclo com chave temporária ao modelo", async () => {
    const deps = dependencies(); await prepareApprovalMessages(input, deps);
    expect(deps.generate).toHaveBeenCalledWith([{ key: "0", name: "Pessoa de teste", cycle: "ABC" }], input.template, "");
  });
  it("associa cada mensagem ao cadastro correto, mesmo se a IA inverter a ordem", async () => {
    const deps = dependencies(); deps.loadCustomers.mockResolvedValue([customer, { ...customer, id: secondId }]);
    deps.generate.mockResolvedValue({ messages: [{ key: "1", message: "Segunda" }, { key: "0", message: "Primeira" }] });
    const result = await prepareApprovalMessages({ ...input, customerIds: [id, secondId] }, deps);
    expect(result[0]?.customerId).toBe(id); expect(result[0]?.message.startsWith("Primeira")).toBe(true);
    expect(result[1]?.customerId).toBe(secondId); expect(result[1]?.message.startsWith("Segunda")).toBe(true);
  });
  it("recusa respostas com mensagens ausentes ou duplicadas", async () => {
    const deps = dependencies(); deps.generate.mockResolvedValue({ messages: [] });
    await expect(prepareApprovalMessages(input, deps)).rejects.toThrow("incompletas");
  });
  it("recusa seleção duplicada", () => {
    expect(approvalRequestSchema.safeParse({ ...input, customerIds: [id, id] }).success).toBe(false);
  });
  it("aceita até 20 cadastros por geração e recusa 21", () => {
    const ids = Array.from({ length: 21 }, (_, i) => `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`);
    expect(approvalRequestSchema.safeParse({ ...input, customerIds: ids.slice(0, 20) }).success).toBe(true);
    expect(approvalRequestSchema.safeParse({ ...input, customerIds: ids }).success).toBe(false);
  });
  it("abre somente o contato individual com o texto revisado, sem enviar", () => {
    expect(draftWhatsAppUrl("11912345678", "Revisada!")).toBe("https://wa.me/5511912345678?text=Revisada!");
    expect(draftWhatsAppUrl("123", "Revisada!")).toBeNull();
  });
});