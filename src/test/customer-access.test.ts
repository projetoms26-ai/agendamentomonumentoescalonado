import { describe, expect, it, vi } from "vitest";
import { approvalWhatsAppUrl, customerRegistrationSchema, registerUniqueEmail, registerUniquePhone } from "@/lib/customer-access";

const registration = { name: "Pessoa Teste", whatsapp: "11987654321", email: "pessoa@example.com", password: "senha123" };
describe("Cadastro com e-mail e senha", () => {
  it("bloqueia celular existente antes de enviar um novo cadastro", async () => {
    const signup = vi.fn();
    const check = vi.fn(async (phone) => phone === "11987654321");
    await expect(registerUniquePhone("(11) 98765-4321", check, signup)).rejects.toThrow("Este celular já possui cadastro");
    expect(check).toHaveBeenCalledWith("11987654321");
    expect(signup).not.toHaveBeenCalled();
  });
  it("envia cadastro com celular novo", async () => {
    const signup = vi.fn(async () => "enviado");
    expect(await registerUniquePhone("11987654321", async () => false, signup)).toBe("enviado");
    expect(signup).toHaveBeenCalledOnce();
  });
  it("interrompe o cadastro quando não pode verificar o celular", async () => {
    const signup = vi.fn();
    await expect(registerUniquePhone("11987654321", async () => { throw new Error("indisponível"); }, signup)).rejects.toThrow("indisponível");
    expect(signup).not.toHaveBeenCalled();
  });
  it("identifica celular repetido em envio simultâneo", async () => {
    const check = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(registerUniquePhone("11987654321", check, async () => { throw new Error("Database error saving new user"); })).rejects.toThrow("Este celular já possui cadastro");
  });
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