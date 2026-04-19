const DAY_MS = 24 * 60 * 60 * 1000;

export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export const DAY_ORDER: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const DAY_LABELS: Record<DayKey, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
};

const DAY_TO_SLUG: Record<DayKey, string> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
};

const SLUG_TO_DAY: Record<string, DayKey> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
};

export function dayKeyToSlug(day: DayKey) {
  return DAY_TO_SLUG[day];
}

export function daySlugToKey(slug: string): DayKey | null {
  return SLUG_TO_DAY[slug.toLowerCase()] ?? null;
}

export function getISOWeekYear(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

function mondayFromISOWeek(year: number, week: number) {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay() || 7;
  if (dow <= 4) {
    simple.setUTCDate(simple.getUTCDate() - dow + 1);
  } else {
    simple.setUTCDate(simple.getUTCDate() + 8 - dow);
  }
  return simple;
}

export function weekRangeLabel(week: number, year: number) {
  const start = mondayFromISOWeek(year, week);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 5);

  const startFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(start);
  const endFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(end);
  return `Week of ${startFmt}-${endFmt}`;
}
