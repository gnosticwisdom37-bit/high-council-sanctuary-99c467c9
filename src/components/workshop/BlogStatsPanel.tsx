/**
 * BlogStatsPanel — Jetpack-style WP analytics dashboard.
 *
 * Tabs: Top Posts · Top Downloads · Visitors Map · Over Time.
 * Aggregates across all uploads for this workshop.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
import { BarChart3, Download, ExternalLink, Globe2, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import {
  getTopPosts,
  getTopDownloads,
  getCountryViews,
  listWpStatsUploads,
  getStatsOverTime,
} from "@/lib-server/wp-stats.functions";
import { A2_TO_M49 } from "@/lib/country-iso";
import { TimeSeriesPanel } from "@/components/charts/TimeSeriesPanel";

type Tab = "posts" | "downloads" | "map" | "time";

type Post = { title: string; url: string | null; views: number };
type FileDl = { path: string; filename: string | null; downloads: number };
type Country = { country: string; iso_a2: string | null; views: number };
type Upload = {
  id: string;
  kind: string;
  source_filename: string;
  period_start: string | null;
  period_end: string | null;
  row_count: number;
  created_at: string;
};
type Period = {
  period_start: string | null;
  period_end: string | null;
  post_views: number;
  downloads: number;
  unique_countries: number;
  country_views: number;
};

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export function BlogStatsPanel({ workshopId }: { workshopId: string }) {
  const [tab, setTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [files, setFiles] = useState<FileDl[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPosts = useServerFn(getTopPosts);
  const fetchFiles = useServerFn(getTopDownloads);
  const fetchCountries = useServerFn(getCountryViews);
  const fetchUploads = useServerFn(listWpStatsUploads);
  const fetchPeriods = useServerFn(getStatsOverTime);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [p, f, c, u, t] = await Promise.all([
        fetchPosts({ data: { workshop_id: workshopId, limit: 50 } }),
        fetchFiles({ data: { workshop_id: workshopId, limit: 100 } }),
        fetchCountries({ data: { workshop_id: workshopId, limit: 500 } }),
        fetchUploads({ data: { workshop_id: workshopId } }),
        fetchPeriods({ data: { workshop_id: workshopId } }),
      ]);
      if (p.ok) setPosts(p.posts);
      if (f.ok) setFiles(f.files);
      if (c.ok) setCountries(c.countries);
      if (u.ok) setUploads(u.uploads as Upload[]);
      if (t.ok) setPeriods(t.periods);
    } finally {
      setLoading(false);
    }
  }, [workshopId, fetchPosts, fetchFiles, fetchCountries, fetchUploads, fetchPeriods]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totals = useMemo(() => ({
    posts: posts.reduce((s, p) => s + p.views, 0),
    downloads: files.reduce((s, f) => s + f.downloads, 0),
    visitors: countries.reduce((s, c) => s + c.views, 0),
  }), [posts, files, countries]);

  const maxPost = posts[0]?.views ?? 1;
  const maxFile = files[0]?.downloads ?? 1;

  // map M49-code → views (world-atlas uses geo.id = UN M49 numeric)
  const { countryByM49, countryByName, maxCountry } = useMemo(() => {
    const byM49 = new Map<string, number>();
    const byName = new Map<string, number>();
    for (const c of countries) {
      const m49 = c.iso_a2 ? A2_TO_M49[c.iso_a2] : undefined;
      if (m49) byM49.set(m49, (byM49.get(m49) ?? 0) + c.views);
      if (c.country) byName.set(c.country.trim().toLowerCase(), (byName.get(c.country.trim().toLowerCase()) ?? 0) + c.views);
    }
    const max = Math.max(1, ...Array.from(byM49.values()), ...Array.from(byName.values()));
    return { countryByM49: byM49, countryByName: byName, maxCountry: max };
  }, [countries]);

  const goldBright = "var(--dawn-gold-bright)";
  const parchment = "var(--dawn-parchment)";

  return (
    <div>
      {/* Header strip */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { k: "posts", label: "Top Posts", icon: BarChart3 },
              { k: "downloads", label: "Downloads", icon: Download },
              { k: "map", label: "Visitors Map", icon: Globe2 },
              { k: "time", label: "Over Time", icon: TrendingUp },
            ] as { k: Tab; label: string; icon: typeof BarChart3 }[]
          ).map((t) => {
            const active = tab === t.k;
            const Icon = t.icon;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs uppercase tracking-[0.2em] transition-colors"
                style={{
                  background: active
                    ? "color-mix(in oklab, var(--dawn-gold-bright) 22%, transparent)"
                    : "color-mix(in oklab, var(--dawn-ink) 30%, transparent)",
                  color: active ? goldBright : parchment,
                  border: `1px solid color-mix(in oklab, var(--dawn-gold) ${active ? 60 : 30}%, transparent)`,
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => void refresh()}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] uppercase tracking-[0.2em]"
          style={{ color: parchment, border: `1px solid color-mix(in oklab, var(--dawn-gold) 30%, transparent)` }}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Refresh
        </button>
      </div>

      {/* Totals */}
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Post views" value={totals.posts} />
        <Stat label="Downloads" value={totals.downloads} />
        <Stat label="Visitors" value={totals.visitors} />
      </div>

      {/* Tab content */}
      {tab === "posts" && (
        <RankedList
          rows={posts.map((p) => ({
            primary: p.title,
            secondary: p.url ?? undefined,
            value: p.views,
            max: maxPost,
            href: p.url ?? undefined,
          }))}
          emptyText="Drop a posts CSV (e.g. www.vondehnvisuals.com-posts-day-…csv) to see top posts."
        />
      )}
      {tab === "downloads" && (
        <RankedList
          rows={files.map((f) => ({
            primary: f.filename ?? f.path,
            secondary: f.path,
            value: f.downloads,
            max: maxFile,
            href: f.path.startsWith("/") ? `https://www.vondehnvisuals.com${f.path}` : f.path,
          }))}
          emptyText="Drop a file-downloads CSV (e.g. …filedownloads-day-…csv) to see top downloads."
        />
      )}
      {tab === "map" && (
        <MapView
          countries={countries}
          countryByM49={countryByM49}
          countryByName={countryByName}
          maxCountry={maxCountry}
        />
      )}
      {tab === "time" && <OverTimeView periods={periods} />}

      {/* Uploads ledger */}
      {uploads.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em]" style={{ color: goldBright }}>
            Uploads ledger
          </p>
          <ul className="space-y-1 text-xs" style={{ color: parchment }}>
            {uploads.slice(0, 6).map((u) => (
              <li key={u.id} className="flex justify-between gap-3">
                <span className="truncate">
                  <span style={{ color: goldBright }}>·</span> {u.source_filename}
                </span>
                <span className="shrink-0 opacity-70">
                  {u.kind} · {u.row_count} row{u.row_count === 1 ? "" : "s"}
                  {u.period_start ? ` · ${u.period_start}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-md px-3 py-2"
      style={{
        background: "color-mix(in oklab, var(--dawn-ink) 30%, transparent)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 25%, transparent)",
      }}
    >
      <div className="text-lg font-semibold" style={{ color: "var(--dawn-gold-bright)" }}>
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--dawn-parchment)" }}>
        {label}
      </div>
    </div>
  );
}

function RankedList({
  rows,
  emptyText,
}: {
  rows: { primary: string; secondary?: string; value: number; max: number; href?: string }[];
  emptyText: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md px-3 py-6 text-center text-xs italic" style={{ color: "var(--dawn-parchment)", opacity: 0.7 }}>
        {emptyText}
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {rows.map((r, i) => {
        const pct = Math.max(2, Math.round((r.value / r.max) * 100));
        return (
          <li
            key={i}
            className="relative overflow-hidden rounded-md px-3 py-2 text-xs"
            style={{
              background: "color-mix(in oklab, var(--dawn-ink) 30%, transparent)",
              border: "1px solid color-mix(in oklab, var(--dawn-gold) 20%, transparent)",
              color: "var(--dawn-parchment)",
            }}
          >
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${pct}%`,
                background: "color-mix(in oklab, var(--dawn-gold-bright) 16%, transparent)",
              }}
            />
            <div className="relative flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.primary}</div>
                {r.secondary && (
                  <div className="truncate text-[10px] opacity-60">{r.secondary}</div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-semibold" style={{ color: "var(--dawn-gold-bright)" }}>
                  {r.value.toLocaleString()}
                </span>
                {r.href && (
                  <a href={r.href} target="_blank" rel="noopener noreferrer" aria-label="Open">
                    <ExternalLink className="h-3.5 w-3.5 opacity-70 hover:opacity-100" />
                  </a>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MapView({
  countries,
  countryByM49,
  countryByName,
  maxCountry,
}: {
  countries: Country[];
  countryByM49: Map<string, number>;
  countryByName: Map<string, number>;
  maxCountry: number;
}) {
  if (countries.length === 0) {
    return (
      <p className="rounded-md px-3 py-6 text-center text-xs italic" style={{ color: "var(--dawn-parchment)", opacity: 0.7 }}>
        Drop a country-locations CSV (e.g. …locations-country-day-…csv) to see the world map.
      </p>
    );
  }
  const colorFor = (geo: { id?: string | number; properties?: { name?: string } }) => {
    const m49 = geo.id != null ? String(geo.id).padStart(3, "0") : undefined;
    const name = geo.properties?.name?.trim().toLowerCase();
    const v = (m49 && countryByM49.get(m49)) || (name && countryByName.get(name)) || 0;
    if (v === 0) return "color-mix(in oklab, var(--dawn-ink) 60%, transparent)";
    const pct = Math.max(0.3, Math.min(1, v / maxCountry));
    return `color-mix(in oklab, var(--dawn-gold-bright) ${Math.round(pct * 95)}%, var(--dawn-ink))`;
  };

  return (
    <div>
      <div
        className="overflow-hidden rounded-md"
        style={{
          background: "color-mix(in oklab, var(--dawn-ink) 50%, transparent)",
          border: "1px solid color-mix(in oklab, var(--dawn-gold) 25%, transparent)",
        }}
      >
        <ComposableMap projectionConfig={{ scale: 140 }} style={{ width: "100%", height: "auto" }}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={colorFor(geo as { id?: string | number; properties?: { name?: string } })}
                  stroke="color-mix(in oklab, var(--dawn-gold) 30%, transparent)"
                  strokeWidth={0.3}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "var(--dawn-gold-bright)" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>
        </ComposableMap>
      </div>
      <ul className="mt-3 space-y-1 text-xs" style={{ color: "var(--dawn-parchment)" }}>
        {countries.map((c) => (
          <li key={c.country} className="flex justify-between gap-2">
            <span>
              {c.iso_a2 ? <span className="mr-2 opacity-50">{c.iso_a2}</span> : <span className="mr-2 opacity-40">??</span>}
              {c.country}
            </span>
            <span style={{ color: "var(--dawn-gold-bright)" }}>{c.views.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OverTimeView({ periods }: { periods: Period[] }) {
  if (periods.length === 0) {
    return (
      <p className="rounded-md px-3 py-6 text-center text-xs italic" style={{ color: "var(--dawn-parchment)", opacity: 0.7 }}>
        Drop CSVs covering different date ranges to see growth over time.
      </p>
    );
  }
  const maxViews = Math.max(1, ...periods.map((p) => p.post_views));
  let cumulative = 0;
  const cumulativeRows = periods.map((p) => {
    cumulative += p.post_views;
    return { ...p, cumulative };
  });
  const maxCum = Math.max(1, cumulative);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--dawn-gold-bright)" }}>
          Per period
        </p>
        <ul className="space-y-1.5">
          {periods.map((p, i) => {
            const pct = Math.max(2, Math.round((p.post_views / maxViews) * 100));
            const label = p.period_start
              ? `${p.period_start}${p.period_end && p.period_end !== p.period_start ? ` → ${p.period_end}` : ""}`
              : "Unknown period";
            return (
              <li
                key={i}
                className="relative overflow-hidden rounded-md px-3 py-2 text-xs"
                style={{
                  background: "color-mix(in oklab, var(--dawn-ink) 30%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--dawn-gold) 20%, transparent)",
                  color: "var(--dawn-parchment)",
                }}
              >
                <div
                  className="absolute inset-y-0 left-0"
                  style={{ width: `${pct}%`, background: "color-mix(in oklab, var(--dawn-gold-bright) 16%, transparent)" }}
                />
                <div className="relative flex items-center justify-between gap-3">
                  <span className="font-medium">{label}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span><span style={{ color: "var(--dawn-gold-bright)" }}>{p.post_views.toLocaleString()}</span> views</span>
                    <span><span style={{ color: "var(--dawn-gold-bright)" }}>{p.downloads.toLocaleString()}</span> dl</span>
                    <span><span style={{ color: "var(--dawn-gold-bright)" }}>{p.unique_countries}</span> ctry</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--dawn-gold-bright)" }}>
          Cumulative views
        </p>
        <div
          className="flex h-16 items-end gap-1 rounded-md p-2"
          style={{
            background: "color-mix(in oklab, var(--dawn-ink) 30%, transparent)",
            border: "1px solid color-mix(in oklab, var(--dawn-gold) 20%, transparent)",
          }}
        >
          {cumulativeRows.map((r, i) => {
            const h = Math.max(4, Math.round((r.cumulative / maxCum) * 100));
            return (
              <div
                key={i}
                title={`${r.period_start ?? "?"} · ${r.cumulative.toLocaleString()}`}
                className="flex-1 rounded-sm"
                style={{ height: `${h}%`, background: "var(--dawn-gold-bright)", opacity: 0.4 + 0.6 * (i / Math.max(1, cumulativeRows.length - 1)) }}
              />
            );
          })}
        </div>
        <p className="mt-1 text-[10px] opacity-60" style={{ color: "var(--dawn-parchment)" }}>
          Total to date: <span style={{ color: "var(--dawn-gold-bright)" }}>{cumulative.toLocaleString()}</span> views across {periods.length} period{periods.length === 1 ? "" : "s"}.
        </p>
      </div>
    </div>
  );
}
