import { describe, expect, it, vi } from "vitest";
import { approvalWhatsAppUrl, customerRegistrationSchema, registerUniqueEmail } from "@/lib/customer-access";

const registration = { name: "Pessoa Teste", whatsapp: "11987654321", email: "pessoa@example.com", password: "senha123" };
describe("Cadastro com e-mail e senha", () => {
  it.each(["pendente", "aprovado", "e-mail não confirmado"])("não envia novo cadastro para e-mail existente: %s", async () => {
    const signup = vi.fn();
    await expect(registerUniqueEmail(" Pessoa@Example.com ", async (email) => email === "pessoa@example.com", signup)).rejects.toThrow("Esse e-mail já foi cadastrado no sistema");
    expect(signup).not.toHaveBeenCalled();
  });
  it("permite um e-mail ainda não cadastrado", async () => {
    const signup = vi.fn(async () => ({ data: { user: { identities: [{}] }, session: null }, error: null }));
    await registerUniqueEmail(" NOVO@Example.com ", async () => false, signup);
    expect(signup).toHaveBeenCalledWith("novo@example.com");
  });
  it("não trata resposta disfarçada de duplicidade como cadastro enviado", async () => {
    await expect(registerUniqueEmail(registration.email, async () => false, async () => ({ data: { user: { identities: [] }, session: null }, error: null }))).rejects.toThrow("Esse e-mail já foi cadastrado no sistema");
  });
  it("interrompe o envio se a verificação estiver indisponível", async () => {
    const signup = vi.fn();
    await expect(registerUniqueEmail(registration.email, async () => { throw new Error("indisponível"); }, signup)).rejects.toThrow("indisponível");
    expect(signup).not.toHaveBeenCalled();
  });
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