import { supabase } from "@/integrations/supabase/client";
import { registerUniqueEmail } from "@/lib/customer-access";

export function signUpUniqueEmail(input: Parameters<typeof supabase.auth.signUp>[0] & { email: string }) {
  return registerUniqueEmail(input.email, async (email) => {
    const { data, error } = await supabase.rpc("registration_email_exists", { _email: email });
    if (error) throw new Error("Não foi possível verificar seu e-mail. Tente novamente.");
    return data === true;
  }, (email) => supabase.auth.signUp({ ...input, email }));
}