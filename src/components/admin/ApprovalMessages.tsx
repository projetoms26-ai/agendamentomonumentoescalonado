import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { APPROVAL_TEMPLATE, draftWhatsAppUrl } from "@/lib/approval-messages";
import type { ApprovalDraft } from "@/lib/approval-messages";
import { generateApprovalMessages } from "@/lib/approval-messages.functions";

export function ApprovalMessages({ customers, open, onOpenChange }: {
  customers: { id: string; full_name: string; whatsapp: string; cycle: string | null; confirmed: boolean }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const generate = useServerFn(generateApprovalMessages);
  const [template, setTemplate] = useState(APPROVAL_TEMPLATE);
  const [notes, setNotes] = useState("");
  const [drafts, setDrafts] = useState<ApprovalDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run() {
    setBusy(true); setError(null);
    try {
      const result = await generate({ data: { customerIds: customers.map((c) => c.id), template, notes } });
      if (result.error) setError(result.error);
      else setDrafts(result.drafts);
    } catch { setError("Não foi possível gerar as mensagens. Confira seu acesso e tente novamente."); }
    finally { setBusy(false); }
  }
  async function copy(message: string) {
    try { await navigator.clipboard.writeText(message); toast.success("Mensagem copiada"); }
    catch { toast.error("Não foi possível copiar a mensagem"); }
  }
  return <Dialog open={open} onOpenChange={(value) => { if (!busy) onOpenChange(value); }}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg">
      <DialogHeader>
        <DialogTitle>Mensagens de aprovação</DialogTitle>
        <DialogDescription>{customers.length} cadastro(s) selecionado(s) · Rascunhos para revisão · Envio manual</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap gap-2 text-sm">{customers.map((c) => <span key={c.id} className="rounded-md border px-2 py-1 break-words">{c.full_name} · {c.cycle ?? "Iniciar"}</span>)}</div>
      <div className="space-y-2"><label htmlFor="approval-template" className="text-sm font-medium">Modelo da mensagem</label><Textarea id="approval-template" value={template} onChange={(e) => setTemplate(e.target.value)} maxLength={2000} disabled={busy} rows={3} /></div>
      <div className="space-y-2"><label htmlFor="approval-notes" className="text-sm font-medium">Informações adicionais (opcional)</label><Textarea id="approval-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} disabled={busy} rows={2} /></div>
      <p className="text-xs text-muted-foreground">Nome e ciclo dos selecionados serão usados pela IA. A geração utiliza créditos de IA.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button onClick={run} disabled={busy || !customers.length || template.trim().length < 10}>{busy ? <Loader2 className="animate-spin" /> : <Sparkles />}{busy ? "Gerando mensagens…" : drafts.length ? "Gerar novamente" : "Gerar mensagens com IA"}</Button>
      <div className="space-y-5">{drafts.map((draft) => {
        const customer = customers.find((c) => c.id === draft.customerId);
        if (!customer) return null;
        const url = draftWhatsAppUrl(customer.whatsapp, draft.message);
        return <section key={draft.customerId} className="space-y-2 border-t pt-4">
          <label htmlFor={`draft-${draft.customerId}`} className="font-medium">{customer.full_name}</label>
          <Textarea id={`draft-${draft.customerId}`} aria-label={`Mensagem para ${customer.full_name}`} rows={8} value={draft.message} maxLength={4000} onChange={(e) => setDrafts((old) => old.map((d) => d.customerId === draft.customerId ? { ...d, message: e.target.value } : d))} />
          <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={!draft.message.trim()} onClick={() => copy(draft.message)}><Copy /> Copiar</Button>{url && customer.confirmed && <Button variant="outline" size="sm" asChild><a href={url} target="_blank" rel="noreferrer"><MessageCircle /> Abrir no WhatsApp</a></Button>}</div>
        </section>;
      })}</div>
    </DialogContent>
  </Dialog>;
}