export type ScheduleChoice = { day: string; period: string };
export const scheduleKey = (choice: ScheduleChoice) => `${choice.day}|${choice.period}`;
export function canAddScheduleChoice(selected: ScheduleChoice[], next: ScheduleChoice, format: string | null, need: number) {
  if (need === 1) return true;
  if (selected.some((choice) => choice.day === next.day)) return false;
  if (selected.length >= need) return false;
  if (format === "tarde_integral" && selected.length === 1) return selected[0]?.period !== next.period;
  return true;
}