import { describe, expect, it } from "vitest";
import { approvalWhatsAppUrl, customerRegistrationSchema } from "@/lib/customer-access";

const registration = { name: "Pessoa Teste", whatsapp: "11987654321", email: "pessoa@example.com", password: "senha123" };
describe("Cadastro com e-mail e senha", () => {
  it("exige e-mail válido", () => {
    expect(customerRegistrationSchema.safeParse({ ...registration, email: "" }).success).toBe(false);
    expect(customerRegistrationSchema.safeParse(registration).success).toBe(true);
  });
  it("exige senha de ao menos oito caracteres", () => {
    expect(customerRegistrationSchema.safeParse({ ...registration, password: "1234567" }).success).toBe(false);
    expect(customerRegistrationSchema.safeParse(registration).success).toBe(true);
  });
  it("usa o celular do cadastro para o aviso de aprovação", () => {
    expect(new URL(approvalWhatsAppUrl("(11) 98765-4321", "Pessoa", "https://example.com") ?? "").pathname).toBe("/5511987654321");
    expect(approvalWhatsAppUrl("123", "Pessoa", "https://example.com")).toBe(null);
  });
});