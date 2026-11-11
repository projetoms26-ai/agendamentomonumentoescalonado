import { z } from "zod";

export const attendanceSchema = z.object({
  result: z.enum(["concluiu", "faltou", "repetir", "passou", "atendido", "nao_compareceu"]),
  durationSeconds: z.number().int().min(0).max(86400).nullable(),
  nextCycle: z.enum(["i1", "i2", "i3", "P1", "P2", "Aresta"]).nullable(),
});

export function durationLabel(seconds: number | null) {
  if (seconds === null) return "Não informada";
  return `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${seconds % 60} s` : ""}`;
}