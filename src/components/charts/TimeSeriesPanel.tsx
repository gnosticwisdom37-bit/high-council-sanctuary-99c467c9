/**
 * TimeSeriesPanel — reusable time-series chart for the Kingdom.
 *
 * Used by WP Stats "Over Time" and any future healer/blog CSV rollups.
 * Two modes:
 *   - "cumulative": running sum line per series.
 *   - "period":     raw per-period value per series.
 *
 * Theming follows the Golden Dawn palette via CSS vars; series colors
 * may be overridden per series.
 */
import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TimeSeriesPoint = { date: string; value: number };
export type TimeSeries = { label: string; color?: string; data: TimeSeriesPoint[] };

export type TimeSeriesPanelProps = {
  title?: string;
  unit?: string;
  mode?: "cumulative" | "period";
  series: TimeSeries[];
  height?: number;
  emptyText?: string;
};

const DEFAULT_COLORS = [
  "var(--dawn-gold-bright)",
  "var(--dawn-rose)",
  "var(--dawn-parchment)",
  "var(--dawn-gold)",
];

export function TimeSeriesPanel({
  title,
  unit,
  mode = "cumulative",
  series,
  height = 220,
  emptyText = "No data yet.",
}: TimeSeriesPanelProps) {
  const { rows, keys, colorByKey, totals } = useMemo(() => {
    // union of all dates, sorted ascending
    const dates = new Set<string>();
    for (const s of series) for (const p of s.data) dates.add(p.date);
    const sorted = Array.from(dates).sort((a, b) => a.localeCompare(b));

    const colorByKey: Record<string, string> = {};
    const keys: string[] = [];
    const running: Record<string, number> = {};
    const totals: Record<string, number> = {};

    series.forEach((s, i) => {
      colorByKey[s.label] = s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
      keys.push(s.label);
      running[s.label] = 0;
      totals[s.label] = 0;
    });

    const byDate: Record<string, Record<string, number>> = {};
    for (const s of series) {
      const map = new Map(s.data.map((p) => [p.date, p.value]));
      for (const d of sorted) {
        byDate[d] ??= {};
        const v = map.get(d) ?? 0;
        totals[s.label] += v;
        if (mode === "cumulative") {
          running[s.label] += v;
          byDate[d][s.label] = running[s.label];
        } else {
          byDate[d][s.label] = v;
        }
      }
    }

    const rows = sorted.map((d) => ({ date: d, ...byDate[d] }));
    return { rows, keys, colorByKey, totals };
  }, [series, mode]);

  const isEmpty = rows.length === 0 || series.every((s) => s.data.length === 0);

  return (
    <div>
      {title && (
        <p
          className="mb-2 text-[10px] uppercase tracking-[0.3em]"
          style={{ color: "var(--dawn-gold-bright)" }}
        >
          {title}
          {mode === "cumulative" ? " · cumulative" : " · per period"}
        </p>
      )}

      {isEmpty ? (
        <p
          className="rounded-md px-3 py-6 text-center text-xs italic"
          style={{ color: "var(--dawn-parchment)", opacity: 0.7 }}
        >
          {emptyText}
        </p>
      ) : (
        <div
          className="rounded-md p-2"
          style={{
            background: "color-mix(in oklab, var(--dawn-ink) 30%, transparent)",
            border: "1px solid color-mix(in oklab, var(--dawn-gold) 20%, transparent)",
          }}
        >
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid
                stroke="color-mix(in oklab, var(--dawn-gold) 18%, transparent)"
                strokeDasharray="2 4"
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--dawn-parchment)", fontSize: 10 }}
                stroke="color-mix(in oklab, var(--dawn-gold) 30%, transparent)"
              />
              <YAxis
                tick={{ fill: "var(--dawn-parchment)", fontSize: 10 }}
                stroke="color-mix(in oklab, var(--dawn-gold) 30%, transparent)"
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--dawn-ink)",
                  border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
                  borderRadius: 6,
                  color: "var(--dawn-parchment)",
                  fontSize: 11,
                }}
                labelStyle={{ color: "var(--dawn-gold-bright)" }}
                formatter={(v: number, name: string) => [
                  `${v.toLocaleString()}${unit ? ` ${unit}` : ""}`,
                  name,
                ]}
              />
              <Legend
                wrapperStyle={{ color: "var(--dawn-parchment)", fontSize: 11 }}
                iconType="circle"
              />
              {keys.map((k) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={colorByKey[k]}
                  strokeWidth={2}
                  dot={{ r: 2, fill: colorByKey[k] }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[10px]" style={{ color: "var(--dawn-parchment)" }}>
            {keys.map((k) => (
              <span key={k}>
                <span style={{ color: colorByKey[k] }}>●</span>{" "}
                {k}: <span style={{ color: "var(--dawn-gold-bright)" }}>{totals[k].toLocaleString()}</span>
                {unit ? ` ${unit}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
