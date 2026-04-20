export const METRIC_KEYS = [
  "weight", "bodyFat", "muscleMass", "bmi",
  "waist", "chest", "arms", "thighs", "calves", "neck", "shoulders",
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

export type UnitGroup = "mass" | "percent" | "length" | "none";

export type MetricConfig = {
  key: MetricKey;
  label: string;
  shortLabel: string;
  unitGroup: UnitGroup;
  baseUnit: string;
  units: string[];
  color: string;
};

export const METRICS: Record<MetricKey, MetricConfig> = {
  weight:     { key: "weight",     label: "Body Weight",  shortLabel: "WT",   unitGroup: "mass",    baseUnit: "kg", units: ["kg", "lbs"], color: "text-neon" },
  bodyFat:    { key: "bodyFat",    label: "Body Fat",     shortLabel: "BF%",  unitGroup: "percent", baseUnit: "%",  units: ["%"],         color: "text-hp" },
  muscleMass: { key: "muscleMass", label: "Muscle Mass",  shortLabel: "MM",   unitGroup: "mass",    baseUnit: "kg", units: ["kg", "lbs"], color: "text-xp" },
  bmi:        { key: "bmi",       label: "BMI",          shortLabel: "BMI",  unitGroup: "none",    baseUnit: "",   units: [""],          color: "text-plasma" },
  waist:      { key: "waist",      label: "Waist",        shortLabel: "WST",  unitGroup: "length",  baseUnit: "cm", units: ["cm", "in"],  color: "text-crit" },
  chest:      { key: "chest",      label: "Chest",        shortLabel: "CHT",  unitGroup: "length",  baseUnit: "cm", units: ["cm", "in"],  color: "text-neon" },
  arms:       { key: "arms",       label: "Arms",         shortLabel: "ARM",  unitGroup: "length",  baseUnit: "cm", units: ["cm", "in"],  color: "text-xp" },
  thighs:     { key: "thighs",     label: "Thighs",       shortLabel: "THG",  unitGroup: "length",  baseUnit: "cm", units: ["cm", "in"],  color: "text-plasma" },
  calves:     { key: "calves",     label: "Calves",       shortLabel: "CLV",  unitGroup: "length",  baseUnit: "cm", units: ["cm", "in"],  color: "text-hp" },
  neck:       { key: "neck",       label: "Neck",         shortLabel: "NCK",  unitGroup: "length",  baseUnit: "cm", units: ["cm", "in"],  color: "text-crit" },
  shoulders:  { key: "shoulders",  label: "Shoulders",    shortLabel: "SHD",  unitGroup: "length",  baseUnit: "cm", units: ["cm", "in"],  color: "text-neon" },
};

export const METRICS_LIST = METRIC_KEYS.map((k) => METRICS[k]);

const LB_TO_KG = 0.453592;
const IN_TO_CM = 2.54;

export function toBaseUnit(value: number, inputUnit: string): number {
  if (inputUnit === "lbs") return Number((value * LB_TO_KG).toFixed(3));
  if (inputUnit === "in") return Number((value * IN_TO_CM).toFixed(3));
  return value;
}

export function fromBaseUnit(value: number, targetUnit: string): number {
  if (targetUnit === "lbs") return Number((value / LB_TO_KG).toFixed(2));
  if (targetUnit === "in") return Number((value / IN_TO_CM).toFixed(2));
  return value;
}

export function unitSuffix(metric: MetricConfig, unit: string): string {
  if (metric.unitGroup === "percent") return "%";
  if (metric.unitGroup === "none") return "";
  return ` ${unit.toUpperCase()}`;
}
