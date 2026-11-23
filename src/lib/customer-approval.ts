// Situação do cadastro de uma pessoa que aparece na agenda.
// Regra: o cadastro precisa estar aprovado (confirmed) para a pessoa poder agendar,
// então o painel mostra isso ao lado do status do agendamento.

export type ApprovalCustomer = {
  id: string;
  whatsapp: string;
  email: string | null;
  confirmed: boolean;
};

export type ApprovalMatch = {
  customer_id: string | null;
  whatsapp: string;
  email: string | null;
};

export type ApprovalState = "aprovado" | "pendente" | "nao_encontrado";

export const phoneKey = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

export type ApprovalIndex = {
  byId: Map<string, ApprovalCustomer>;
  byPhone: Map<string, ApprovalCustomer>;
  byEmail: Map<string, ApprovalCustomer>;
};

export const emptyApprovalIndex: ApprovalIndex = {
  byId: new Map(),
  byPhone: new Map(),
  byEmail: new Map(),
};

export function buildApprovalIndex(customers: ApprovalCustomer[]): ApprovalIndex {
  const index: ApprovalIndex = { byId: new Map(), byPhone: new Map(), byEmail: new Map() };
  for (const c of customers) {
    index.byId.set(c.id, c);
    const phone = phoneKey(c.whatsapp);
    if (phone && !index.byPhone.has(phone)) index.byPhone.set(phone, c);
    const email = (c.email ?? "").trim().toLowerCase();
    if (email && !index.byEmail.has(email)) index.byEmail.set(email, c);
  }
  return index;
}

/** Liga o agendamento ao cadastro: primeiro pelo vínculo direto, depois pelo celular, depois pelo e-mail. */
export function approvalStateFor(booking: ApprovalMatch, index: ApprovalIndex): ApprovalState {
  const linked = booking.customer_id ? index.byId.get(booking.customer_id) : undefined;
  if (linked) return linked.confirmed ? "aprovado" : "pendente";

  const phone = phoneKey(booking.whatsapp);
  const byPhone = phone ? index.byPhone.get(phone) : undefined;
  if (byPhone) return byPhone.confirmed ? "aprovado" : "pendente";

  const email = (booking.email ?? "").trim().toLowerCase();
  const byEmail = email ? index.byEmail.get(email) : undefined;
  if (byEmail) return byEmail.confirmed ? "aprovado" : "pendente";

  return "nao_encontrado";
}

export const APPROVAL_INFO: Record<ApprovalState, { label: string; cls: string }> = {
  aprovado: { label: "Cadastro aprovado", cls: "bg-success/15 text-success border-success/30" },
  pendente: { label: "Cadastro a confirmar", cls: "bg-warning/20 text-foreground border-warning/50" },
  nao_encontrado: { label: "Cadastro não encontrado", cls: "bg-muted text-muted-foreground border-border" },
};
