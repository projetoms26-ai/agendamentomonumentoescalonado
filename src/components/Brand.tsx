import pyramidLogo from "@/assets/app-mme-pyramid-logo.png";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src={pyramidLogo} alt="Logo de pirâmide App MME" width={48} height={48} className="size-12 shrink-0 object-contain" />
      <span className={`font-display text-lg font-semibold ${light ? "text-primary-foreground" : "text-foreground"}`}>
        App MME
      </span>
    </div>
  );
}
