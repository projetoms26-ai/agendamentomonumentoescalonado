import { describe, expect, it } from "vitest";
import { canAddScheduleChoice, scheduleKey } from "@/lib/schedule-selection";

describe("Separate whole-day and afternoon choices", () => {
  const integral = { day: "2026-11-02", period: "integral" };
  const tarde = { day: "2026-11-02", period: "tarde" };
  it("identifies each period separately on the same date", () => {
    expect(scheduleKey(integral)).not.toBe(scheduleKey(tarde));
  });
  it("allows a single-cycle booking to switch periods on the same day", () => {
    expect(canAddScheduleChoice([integral], tarde, null, 1)).toBe(true);
  });
  it("requires different dates for the two-date Iniciar package", () => {
    expect(canAddScheduleChoice([integral], tarde, "tarde_integral", 2)).toBe(false);
    expect(canAddScheduleChoice([integral], { ...tarde, day: "2026-11-03" }, "tarde_integral", 2)).toBe(true);
  });
});