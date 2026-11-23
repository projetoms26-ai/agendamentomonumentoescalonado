import { describe, expect, it, vi } from "vitest";
import { grantAdminContact } from "@/lib/admin-access";

describe("Adicionar contato como administrador", () => {
  it("normaliza o e-mail antes de solicitar a liberação", async () => {
    const grant = vi.fn(async () => "added");
    expect(await grantAdminContact(" Contato@Example.com ", grant)).toBe("added");
    expect(grant).toHaveBeenCalledWith("contato@example.com");
  });
  it("não solicita liberação com celular em vez de e-mail", async () => {
    const grant = vi.fn(async () => "added");
    await expect(grantAdminContact("11999999999", grant)).rejects.toThrow();
    expect(grant).not.toHaveBeenCalled();
  });
  it("preserva a recusa de acesso para quem não é administrador", async () => {
    await expect(grantAdminContact("contato@example.com", async () => { throw new Error("Somente administradores podem liberar este acesso."); })).rejects.toThrow("Somente administradores");
  });
  it("distingue acesso já existente de uma nova liberação", async () => {
    expect(await grantAdminContact("contato@example.com", async () => "already_admin")).toBe("already_admin");
  });
  it("não aceita respostas desconhecidas como sucesso", async () => {
    await expect(grantAdminContact("contato@example.com", async () => "pending")).rejects.toThrow();
  });
  it("não libera uma conta com e-mail não verificado", async () => {
    await expect(grantAdminContact("contato@example.com", async () => {
      throw new Error("O contato precisa ter uma conta cadastrada e confirmar o e-mail antes de receber acesso administrativo.");
    })).rejects.toThrow("confirmar o e-mail");
  });
});