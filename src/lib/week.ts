const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday → Sunday sequence (plans rest day on Sun or use Sun for workouts). */
export const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type DayKey = (typeof DAY_ORDER)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

/** Short uppercase labels for HUD-style headers and charts */
export const DAY_SHORT_LABELS: Record<DayKey, string> = {
  Mon: "MON",
  Tue: "TUE",
  Wed: "WED",
  Thu: "THU",
  Fri: "FRI",
  Sat: "SAT",
  Sun: "SUN",
};

const DAY_TO_SLUG: Record<DayKey, string> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

const SLUG_TO_DAY: Record<string, DayKey> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export function isValidDayKey(s: string): s is DayKey {
  return (DAY_ORDER as readonly string[]).includes(s);
}

const daySortIndex = Object.fromEntries(DAY_ORDER.map((d, i) => [d, i])) as Record<DayKey, number>;

/** Calendar order Mon → Sun */
export function compareDayKeys(a: DayKey, b: DayKey): number {
  return (daySortIndex[a] ?? 99) - (daySortIndex[b] ?? 99);
}

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
  end.setUTCDate(start.getUTCDate() + 6);

  const startFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(start);
  const endFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(end);
  return `Week of ${startFmt}–${endFmt}`;
}
