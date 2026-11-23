import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { grantAdminContact } from "@/lib/admin-access";

export function AdminContacts() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const qc = useQueryClient();
  const contacts = useQuery({
    queryKey: ["admin-contacts"],
    enabled: open,
    queryFn: async () => {
      const result = await supabase.rpc("list_admin_contacts");
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      const result = await grantAdminContact(email, async (normalized) => {
        const response = await supabase.rpc("add_admin_contact", { _email: normalized });
        if (response.error) throw new Error(response.error.message);
        return response.data;
      });
      toast.success(result === "added" ? "Acesso administrativo liberado." : "Este contato já é administrador.");
      setEmail("");
      await qc.invalidateQueries({ queryKey: ["admin-contacts"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível liberar o acesso. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 border-t pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="size-5 text-primary" />Administradores</h2>
        <Button variant="outline" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="admin-contacts">
          <UserPlus />{open ? "Fechar" : "Adicionar contato como ADM"}
        </Button>
      </div>
      {open && <div id="admin-contacts" className="mt-5">
        <form onSubmit={submit} className="max-w-xl">
          <label htmlFor="admin-contact-email" className="text-sm font-medium">E-mail da conta cadastrada e verificada</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input id="admin-contact-email" type="email" autoComplete="email" required maxLength={254} value={email}
              disabled={saving} aria-invalid={!!error} aria-describedby={error ? "admin-contact-error" : undefined}
              onChange={(event) => { setEmail(event.target.value); setError(""); }} className="h-11 min-w-0 flex-1" />
            <Button type="submit" disabled={saving || !email.trim()} className="h-11">
              {saving ? <Loader2 className="animate-spin" /> : <UserPlus />}{saving ? "Liberando…" : "Liberar acesso ADM"}
            </Button>
          </div>
          {error && <p id="admin-contact-error" role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
        </form>
        <div className="mt-5" aria-live="polite">
          {contacts.isPending ? <p className="text-sm text-muted-foreground">Carregando administradores…</p> :
            contacts.isError ? <div className="flex flex-wrap items-center gap-2"><p className="text-sm text-destructive">Não foi possível carregar os administradores.</p><Button variant="outline" size="sm" onClick={() => contacts.refetch()}>Tentar novamente</Button></div> :
            <ul className="divide-y">{contacts.data?.map((contact) => <li key={contact.user_id} className="py-3">
              {contact.display_name && <p className="font-medium">{contact.display_name}</p>}
              <p className="break-all text-sm text-muted-foreground">{contact.email}</p>
            </li>)}</ul>}
        </div>
      </div>}
    </section>
  );
}