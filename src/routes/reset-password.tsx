import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Redefinir senha — App MME" },
    { name: "description", content: "Crie uma nova senha para acessar seu cadastro no App MME." },
    { property: "og:title", content: "Redefinir senha — App MME" },
    { property: "og:description", content: "Recupere o acesso ao seu cadastro do App MME." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const recovery = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    if (recovery) supabase.auth.getUser().then(({ data }) => setValid(!!data.user));
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || password.length < 8) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setPassword(""); setDone(true);
  }
  return <main className="mx-auto max-w-sm px-4 py-12">
    <Brand />
    <h1 className="mt-8 text-2xl font-semibold">Redefinir senha</h1>
    {done ? <p className="mt-4">Senha atualizada!</p> : valid ? <form onSubmit={submit} className="mt-6 space-y-4">
      <Label htmlFor="new-password">Nova senha</Label>
      <Input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit" disabled={busy}>Salvar senha</Button>
    </form> : <p className="mt-4 text-muted-foreground">Abra o link de recuperação enviado ao seu e-mail para definir uma nova senha.</p>}
    <Link to="/" className="mt-6 inline-block text-primary underline">Voltar ao App MME</Link>
  </main>;
}