import { z } from "zod";

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