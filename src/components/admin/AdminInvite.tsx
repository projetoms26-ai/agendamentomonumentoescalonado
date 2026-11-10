import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminInvite() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      toast.error("Informe o e-mail do novo administrador");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("invite-admin", {
      body: { email: normalized },
    });
    setBusy(false);
    if (error || data?.error) {
      toast.error(
        data?.error ??
          "Não foi possível enviar o convite. Verifique se a função invite-admin está implantada.",
      );
      return;
    }
    toast.success(
      "Convite enviado. O acesso administrativo será liberado após a aceitação e confirmação do e-mail.",
    );
    setEmail("");
  }
  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Administradores</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Convide por e-mail. O papel administrativo só é concedido quando a pessoa aceita e confirma
        o convite.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          aria-label="E-mail do administrador"
          className="h-11"
          type="email"
          autoComplete="email"
          placeholder="nome@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button className="h-11 shrink-0" disabled={busy} onClick={send}>
          {busy ? "Enviando…" : "Convidar administrador"}
        </Button>
      </div>
    </section>
  );
}
