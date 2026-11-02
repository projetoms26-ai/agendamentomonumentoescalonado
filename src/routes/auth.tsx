import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/Brand";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Área administrativa" },
      { name: "description", content: "Acesso restrito à equipe administrativa." },
      { property: "og:title", content: "Área administrativa" },
      { property: "og:description", content: "Acesso restrito à equipe administrativa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) { toast.error("E-mail ou senha incorretos"); return; }
      nav({ to: "/admin" });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/admin" } });
      setLoading(false);
      if (error) { toast.error(error.message); return; }
      if (data.session) nav({ to: "/admin" });
      else toast.success("Conta criada. Confirme pelo link enviado ao seu e-mail.");
    }
  }

  return (
    <div className="hero-band grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Brand light /></div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-card p-6 text-card-foreground shadow-2xl">
          <h1 className="text-xl font-semibold">{mode === "in" ? "Entrar na área administrativa" : "Criar conta"}</h1>
          <div className="space-y-1.5"><Label>E-mail</Label><Input className="h-11" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Senha</Label><Input className="h-11" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}{mode === "in" ? "Entrar" : "Criar conta"}</Button>
          <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm text-muted-foreground hover:text-foreground">
            {mode === "in" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
          </button>
          {mode === "up" && <p className="text-xs text-muted-foreground">A primeira conta criada vira administradora. As demais precisam ser liberadas.</p>}
        </form>
      </div>
    </div>
  );
}
