import { z } from "zod";

export const adminContactEmail = z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(254);

export async function grantAdminContact(email: string, grant: (email: string) => Promise<string>) {
  const normalized = adminContactEmail.parse(email);
  const result = await grant(normalized);
  if (result !== "added" && result !== "already_admin") throw new Error("Não foi possível liberar o acesso administrativo.");
  return result;
}