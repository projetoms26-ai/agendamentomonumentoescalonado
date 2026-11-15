import { z } from "zod";

export const DUPLICATE_EMAIL_MESSAGE = "Esse e-mail já foi cadastrado no sistema";

type SignupResult = {
  data: { user: { identities?: unknown[] } | null; session: unknown | null };
  error: { message: string; code?: string | undefined } | null;
};

export async function registerUniqueEmail<T extends SignupResult>(
  email: string,
  checkEmail: (normalizedEmail: string) => Promise<boolean>,
  signup: (normalizedEmail: string) => Promise<T>,
): Promise<T> {
  const normalizedEmail = email.trim().toLowerCase();
  if (await checkEmail(normalizedEmail)) throw new Error(DUPLICATE_EMAIL_MESSAGE);
  const result = await signup(normalizedEmail);
  if (result.error) {
    if (result.error.code === "user_already_exists" || result.error.code === "email_exists" || /already registered|already exists/i.test(result.error.message)) {
      throw new Error(DUPLICATE_EMAIL_MESSAGE);
    }
    throw new Error(result.error.message);
  }
  if (result.data.user?.identities?.length === 0) throw new Error(DUPLICATE_EMAIL_MESSAGE);
  return result;
}

export const customerRegistrationSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  whatsapp: z.string().refine((v) => /^\d{10,11}$/.test(v.replace(/\D/g, "")), "Celular inválido"),
  email: z.string().trim().max(255).email("E-mail inválido"),
  password: z.string().min(8, "Use uma senha com pelo menos 8 caracteres").max(128),
});

export function approvalWhatsAppUrl(phone: string, name: string, appUrl: string) {
  const digits = phone.replace(/\D/g, "");
  const number = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  if (!/^55\d{10,11}$/.test(number)) return null;
  const message = `Olá, ${name}! Seu cadastro no App MME foi aprovado. Faça login com o e-mail e a senha que você criou no cadastro para agendar seu ciclo: ${appUrl}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}