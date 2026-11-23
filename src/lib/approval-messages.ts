import { z } from "zod";

export const APPROVAL_TEMPLATE = "Olá, {nome}! Seu cadastro no App MME foi aprovado para o ciclo {ciclo}. Que bom ter você conosco!";
export const APPROVAL_LOGIN = "Faça login com o e-mail e a senha que você criou no cadastro para agendar. Confirme também seu e-mail pelo link enviado, caso ainda não tenha confirmado. A confirmação do e-mail não substitui a aprovação do cadastro.";

export const approvalRequestSchema = z.object({
  customerIds: z.array(z.string().uuid()).min(1).max(20).refine((ids) => new Set(ids).size === ids.length, "Selecione cada cadastro apenas uma vez."),
  template: z.string().trim().min(10).max(2000),
  notes: z.string().trim().max(1000),
});
export type ApprovalCustomer = { id: string; full_name: string; cycle: string | null; confirmed: boolean };
export type ApprovalDraft = { customerId: string; message: string };

export async function prepareApprovalMessages(
  input: z.infer<typeof approvalRequestSchema>,
  deps: {
    isAdmin: () => Promise<boolean>;
    loadCustomers: (ids: string[]) => Promise<ApprovalCustomer[]>;
    generate: (customers: { key: string; name: string; cycle: string }[], template: string, notes: string) => Promise<unknown>;
  },
): Promise<ApprovalDraft[]> {
  if (!(await deps.isAdmin())) throw new Error("Somente administradores podem gerar mensagens de aprovação.");
  const data = approvalRequestSchema.parse(input);
  const customers = await deps.loadCustomers(data.customerIds);
  const ordered = data.customerIds.map((id) => {
    const customer = customers.find((c) => c.id === id);
    if (!customer || !customer.confirmed) throw new Error("Selecione somente cadastros com aprovação já salva.");
    return customer;
  });
  const result = await deps.generate(ordered.map((c, i) => ({ key: String(i), name: c.full_name, cycle: c.cycle ?? "Iniciar (IC1, IC2 e IC3)" })), data.template, data.notes);
  const parsed = z.object({ messages: z.array(z.object({ key: z.string(), message: z.string().trim().min(1).max(2500) })) }).parse(result);
  if (parsed.messages.length !== ordered.length || new Set(parsed.messages.map((m) => m.key)).size !== ordered.length) throw new Error("A IA retornou mensagens incompletas. Nenhuma mensagem foi enviada.");
  return ordered.map((c, i) => {
    const draft = parsed.messages.find((m) => m.key === String(i));
    if (!draft) throw new Error("A IA retornou uma identificação inválida.");
    return { customerId: c.id, message: `${draft.message}\n\n${APPROVAL_LOGIN}\n\nhttps://agendamentomonumentoescalonado.lovable.app` };
  });
}

export function draftWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  if (!/^\d{10,11}$/.test(digits) || !message.trim()) return null;
  return `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`;
}