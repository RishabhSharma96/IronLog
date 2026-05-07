"use client";

import { useId, useMemo } from "react";
import { motion } from "framer-motion";

type ProgressChartProps = {
  values: number[];
  dates?: string[];
  suffix?: string;
  /** Smaller sparkline: no labels/footer, for overview cards */
  compact?: boolean;
  /** When compact, still show a small date strip (e.g. quest trend on day cards) */
  compactDateAxis?: boolean;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate();
  const mon = d.toLocaleString("en", { month: "short" }).toUpperCase();
  return `${day} ${mon}`;
}

export function ProgressChart({
  values,
  dates,
  suffix = "",
  compact = false,
  compactDateAxis = false,
}: ProgressChartProps) {
  const gradientId = useId();
  const glowId = useId();

  const { cleanValues, cleanDates } = useMemo(() => {
    const cv: number[] = [];
    const cd: string[] = [];
    values.forEach((v, i) => {
      if (Number.isFinite(v)) {
        cv.push(v);
        cd.push(dates?.[i] ?? "");
      }
    });
    return { cleanValues: cv, cleanDates: cd };
  }, [values, dates]);

  const hasDates = cleanDates.some((d) => d.length > 0);
  const compactAxis = compact && compactDateAxis;
  const showDateAxisLabels = hasDates && (!compact || compactAxis);

  const { width, height, points, areaPoints, dateLabels, chartInnerH, labelFontSize } = useMemo(() => {
    const w = compact ? 240 : 280;
    const chartH = compact ? (compactAxis ? 28 : 36) : 72;
    const labelH =
      showDateAxisLabels ? (compactAxis ? 12 : 16) : 0;
    const h = chartH + labelH;
    const p = compact ? 5 : 10;
    const bottomY = chartH - p;
    const labelFont = compactAxis ? 6 : 7;

    if (!cleanValues.length) {
      return {
        width: w,
        height: h,
        points: "",
        areaPoints: "",
        dateLabels: [] as { x: number; label: string }[],
        chartInnerH: chartH,
        labelFontSize: labelFont,
      };
    }

    let xPositions: number[];

    if (hasDates && cleanDates.length > 1) {
      const timestamps = cleanDates.map((d) => new Date(d).getTime());
      const minT = Math.min(...timestamps);
      const maxT = Math.max(...timestamps);
      const range = Math.max(maxT - minT, 1);
      xPositions = timestamps.map((t) => p + ((t - minT) / range) * (w - p * 2));
    } else {
      xPositions = cleanValues.map((_, i) =>
        p + (i * (w - p * 2)) / Math.max(cleanValues.length - 1, 1),
      );
    }

    const mn = Math.min(...cleanValues);
    const mx = Math.max(...cleanValues);
    const rng = Math.max(mx - mn, 1);

    const pts = cleanValues
      .map((value, i) => {
        const y = bottomY - ((value - mn) / rng) * (chartH - p * 2);
        return `${xPositions[i]},${y}`;
      })
      .join(" ");

    const area = `${xPositions[0]},${bottomY} ${pts} ${xPositions[xPositions.length - 1]},${bottomY}`;

    const labels: { x: number; label: string }[] = [];
    if (showDateAxisLabels && cleanDates.length > 1) {
      const maxLabels = compactAxis ? 4 : 5;
      const step = Math.max(1, Math.floor(cleanDates.length / maxLabels));
      for (let i = 0; i < cleanDates.length; i += step) {
        if (cleanDates[i]) labels.push({ x: xPositions[i], label: formatDate(cleanDates[i]) });
      }
      const lastIdx = cleanDates.length - 1;
      if (lastIdx % step !== 0 && cleanDates[lastIdx]) {
        labels.push({ x: xPositions[lastIdx], label: formatDate(cleanDates[lastIdx]) });
      }
    } else if (showDateAxisLabels && cleanDates.length === 1 && cleanDates[0]) {
      labels.push({ x: w / 2, label: formatDate(cleanDates[0]) });
    }

    return { width: w, height: h, points: pts, areaPoints: area, dateLabels: labels, chartInnerH: chartH, labelFontSize: labelFont };
  }, [cleanValues, cleanDates, showDateAxisLabels, compact, hasDates, compactAxis]);

  const pathKey = cleanValues.join(",");
  const innerH = chartInnerH ?? (compact ? 36 : 72);
  const chartPixelH = compact ? innerH : (showDateAxisLabels ? height - (compactAxis ? 12 : 16) : height);

  if (!cleanValues.length) {
    return <p className="font-mono text-[10px] tracking-wider text-muted">NO DATA LOGGED</p>;
  }

  return (
    <div className={compact ? "" : "space-y-1.5"}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`w-full overflow-hidden rounded-sm border border-slate-border/30 bg-abyss/60 ${compact ? (compactAxis ? "h-[3.75rem]" : "h-11") : hasDates ? "h-[88px]" : "h-[72px]"}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {cleanValues.length > 1 ? (
          <>
            <motion.polygon
              key={`area-${pathKey}`}
              fill={`url(#${gradientId})`}
              points={areaPoints}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            />
            <motion.polyline
              key={`line-${pathKey}`}
              fill="none"
              stroke="#00f0ff"
              strokeWidth={compact ? 1.5 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
              initial={{ pathLength: 0, opacity: 0.4 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ pathLength: { duration: 1.2, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.3 } }}
              filter={`url(#${glowId})`}
            />
            {/* Data point dots */}
            {!compact && cleanValues.length <= 20 && cleanValues.map((_, i) => {
              const [cx, cy] = (points.split(" ")[i] ?? "0,0").split(",").map(Number);
              return (
                <circle
                  key={`pt-${i}`}
                  cx={cx}
                  cy={cy}
                  r="2"
                  fill="#00f0ff"
                  opacity="0.6"
                />
              );
            })}
          </>
        ) : (
          <motion.circle
            key={`dot-${pathKey}`}
            cx={width / 2}
            cy={chartPixelH / 2}
            r={compact ? 3 : 4}
            fill="#00f0ff"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            style={{ filter: "drop-shadow(0 0 6px rgba(0,240,255,0.6))" }}
          />
        )}
        {/* Date labels */}
        {dateLabels.map((dl, i) => (
          <text
            key={i}
            x={dl.x}
            y={height - 3}
            textAnchor="middle"
            fill="rgba(90,95,120,0.8)"
            fontSize={labelFontSize}
            fontFamily="Orbitron, monospace"
          >
            {dl.label}
          </text>
        ))}
      </svg>
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-muted">
            <span className="text-neon neon-text">{cleanValues.at(-1)}</span>
            <span>{suffix} LATEST</span>
          </div>
          {hasDates && cleanDates.length > 1 && (
            <span className="font-mono text-[9px] tracking-wider text-steel">
              {cleanDates.length} ENTRIES
            </span>
          )}
        </div>
      )}
    </div>
  );
}
