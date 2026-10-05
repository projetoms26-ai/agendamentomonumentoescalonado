import { CalendarCheck } from "lucide-react";

// Placeholder mark — swap for the client's logo image when available.
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
        <CalendarCheck className="size-5" />
      </span>
      <span className={`font-display text-lg font-semibold ${light ? "text-primary-foreground" : "text-foreground"}`}>
        Agendamento
      </span>
    </div>
  );
}
