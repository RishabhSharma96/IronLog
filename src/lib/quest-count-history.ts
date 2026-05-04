import type { DayKey } from "@/lib/week";
import { DAY_ORDER } from "@/lib/week";

export type QuestCountSnapshot = {
  date: string;
  counts: Record<DayKey, number>;
};

export function formatLocalYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyCounts(): Record<DayKey, number> {
  return DAY_ORDER.reduce(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    {} as Record<DayKey, number>,
  );
}

export function countsFromExercises(exercises: { dayOfWeek: DayKey }[]): Record<DayKey, number> {
  const counts = emptyCounts();
  for (const ex of exercises) {
    if (DAY_ORDER.includes(ex.dayOfWeek)) {
      counts[ex.dayOfWeek] += 1;
    }
  }
  return counts;
}
