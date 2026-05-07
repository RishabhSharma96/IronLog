import { DAY_ORDER, type DayKey } from "@/lib/week";

export type DayLabelsMap = Record<DayKey, string>;

export function emptyDayLabels(): DayLabelsMap {
  return DAY_ORDER.reduce((acc, d) => {
    acc[d] = "";
    return acc;
  }, {} as DayLabelsMap);
}

export function sanitizeDayLabel(input: unknown): string {
  return String(input ?? "")
    .trim()
    .slice(0, 48)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f<>]/g, "");
}

/** Normalize API / DB payload to a full Mon–Sun map. */
export function mergeDayLabels(raw: unknown): DayLabelsMap {
  const out = emptyDayLabels();
  if (!raw || typeof raw !== "object") return out;
  const o = raw as Record<string, unknown>;
  for (const d of DAY_ORDER) {
    out[d] = sanitizeDayLabel(o[d]);
  }
  return out;
}

export function daySplitSubtitle(day: DayKey, labels: DayLabelsMap): string | null {
  const t = labels[day]?.trim();
  return t ? t : null;
}
