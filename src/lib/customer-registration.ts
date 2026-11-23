import { supabase } from "@/integrations/supabase/client";
import { registerUniqueEmail, registerUniquePhone } from "@/lib/customer-access";

export function signUpUniqueEmail(input: Parameters<typeof supabase.auth.signUp>[0] & { email: string }) {
  return registerUniqueEmail(input.email, async (email) => {
    const { data, error } = await supabase.rpc("registration_email_exists", { _email: email });
    if (error) throw new Error("Não foi possível verificar seu e-mail. Tente novamente.");
    return data === true;
  }, (email) => {
    const signup = async () => {
      const result = await supabase.auth.signUp({ ...input, email });
      if (result.error?.message.match(/Database error saving new user/i)) throw new Error(result.error.message);
      return result;
    };
    const metadata = input.options?.data;
    if (!metadata || !('registration_kind' in metadata) || metadata['registration_kind'] !== 'customer') return signup();
    if (!('whatsapp' in metadata)) throw new Error("Celular inválido");
    const phone = metadata['whatsapp'];
    if (typeof phone !== 'string') throw new Error("Celular inválido");
    return registerUniquePhone(phone, async (normalized) => {
      const { data, error } = await supabase.rpc("registration_phone_exists", { _whatsapp: normalized });
      if (error) throw new Error("Não foi possível verificar seu celular. Tente novamente.");
      return data === true;
    }, signup);
  });
}