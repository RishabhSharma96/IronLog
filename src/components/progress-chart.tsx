"use client";

type ProgressChartProps = {
  values: number[];
  suffix?: string;
};

export function ProgressChart({ values, suffix = "" }: ProgressChartProps) {
  const cleanValues = values.filter((value) => Number.isFinite(value));

  if (!cleanValues.length) {
    return <p className="text-xs text-zinc-500">No data yet</p>;
  }

  const width = 240;
  const height = 72;
  const pad = 8;
  const min = Math.min(...cleanValues);
  const max = Math.max(...cleanValues);
  const range = Math.max(max - min, 1);

  const points = cleanValues
    .map((value, index) => {
      const x = pad + (index * (width - pad * 2)) / Math.max(cleanValues.length - 1, 1);
      const y = height - pad - ((value - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="space-y-1">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[72px] w-full rounded-md bg-zinc-900">
        {cleanValues.length > 1 ? (
          <polyline fill="none" stroke="#b9ff66" strokeWidth="2.5" points={points} />
        ) : (
          <circle cx={width / 2} cy={height / 2} r="4" fill="#b9ff66" />
        )}
      </svg>
      <p className="text-xs text-zinc-500">
        {cleanValues.at(-1)}
        {suffix} latest
      </p>
    </div>
  );
}
