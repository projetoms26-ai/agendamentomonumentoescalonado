import { describe, expect, it } from "vitest";
import { attendanceSchema, durationLabel } from "@/lib/attendance";

describe("attendance records", () => {
  it("preserves the performed cycle result and next cycle independently", () => {
    expect(attendanceSchema.parse({ result: "repetir", durationSeconds: 90, nextCycle: "P2" })).toEqual({ result: "repetir", durationSeconds: 90, nextCycle: "P2" });
  });
  it("does not invent a duration when none was recorded", () => {
    expect(attendanceSchema.parse({ result: "faltou", durationSeconds: null, nextCycle: null }).durationSeconds).toBeNull();
    expect(durationLabel(null)).toBe("Não informada");
  });
  it("retains seconds for a one minute thirty second attendance", () => {
    expect(durationLabel(90)).toBe("1 min 30 s");
  });
  it("rejects invalid results and cycles", () => {
    expect(attendanceSchema.safeParse({ result: "agendado", durationSeconds: 90, nextCycle: "admin" }).success).toBe(false);
  });
});