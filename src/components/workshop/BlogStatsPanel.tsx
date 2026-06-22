/**
 * BlogStatsPanel — Jetpack-style WP analytics dashboard.
 *
 * Tabs: Top Posts · Top Downloads · Visitors Map.
 * Aggregates across all uploads for this workshop.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
import { BarChart3, Download, ExternalLink, Globe2, Loader2, RefreshCw } from "lucide-react";
import {
  getTopPosts,
  getTopDownloads,
  getCountryViews,
  listWpStatsUploads,
} from "@/lib-server/wp-stats.functions";

type Tab = "posts" | "downloads" | "map";

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

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export function BlogStatsPanel({ workshopId }: { workshopId: string }) {
  const [tab, setTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [files, setFiles] = useState<FileDl[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPosts = useServerFn(getTopPosts);
  const fetchFiles = useServerFn(getTopDownloads);
  const fetchCountries = useServerFn(getCountryViews);
  const fetchUploads = useServerFn(listWpStatsUploads);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [p, f, c, u] = await Promise.all([
        fetchPosts({ data: { workshop_id: workshopId, limit: 50 } }),
        fetchFiles({ data: { workshop_id: workshopId, limit: 100 } }),
        fetchCountries({ data: { workshop_id: workshopId, limit: 500 } }),
        fetchUploads({ data: { workshop_id: workshopId } }),
      ]);
      if (p.ok) setPosts(p.posts);
      if (f.ok) setFiles(f.files);
      if (c.ok) setCountries(c.countries);
      if (u.ok) setUploads(u.uploads as Upload[]);
    } finally {
      setLoading(false);
    }
  }, [workshopId, fetchPosts, fetchFiles, fetchCountries, fetchUploads]);

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

  // map ISO-A3 → views for the choropleth
  const countryByA2 = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of countries) if (c.iso_a2) m.set(c.iso_a2, (m.get(c.iso_a2) ?? 0) + c.views);
    return m;
  }, [countries]);
  const maxCountry = Math.max(1, ...Array.from(countryByA2.values()));

  const goldBright = "var(--dawn-gold-bright)";
  const parchment = "var(--dawn-parchment)";

  return (
    <div>
      {/* Header strip */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(
            [
              { k: "posts", label: "Top Posts", icon: BarChart3 },
              { k: "downloads", label: "Downloads", icon: Download },
              { k: "map", label: "Visitors Map", icon: Globe2 },
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
        <MapView countries={countries} countryByA2={countryByA2} maxCountry={maxCountry} />
      )}

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
  countryByA2,
  maxCountry,
}: {
  countries: Country[];
  countryByA2: Map<string, number>;
  maxCountry: number;
}) {
  if (countries.length === 0) {
    return (
      <p className="rounded-md px-3 py-6 text-center text-xs italic" style={{ color: "var(--dawn-parchment)", opacity: 0.7 }}>
        Drop a country-locations CSV (e.g. …locations-country-day-…csv) to see the world map.
      </p>
    );
  }
  const colorFor = (a2: string | undefined) => {
    if (!a2) return "color-mix(in oklab, var(--dawn-ink) 60%, transparent)";
    const v = countryByA2.get(a2) ?? 0;
    if (v === 0) return "color-mix(in oklab, var(--dawn-ink) 60%, transparent)";
    const pct = Math.max(0.18, Math.min(1, v / maxCountry));
    return `color-mix(in oklab, var(--dawn-gold-bright) ${Math.round(pct * 80)}%, var(--dawn-ink))`;
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
              geographies.map((geo) => {
                // world-atlas 110m uses ISO-A2 in properties when available, else `iso_a2` from properties
                const a2 =
                  (geo.properties as { iso_a2?: string; ISO_A2?: string; "ISO_A2_EH"?: string }).iso_a2 ||
                  (geo.properties as { ISO_A2?: string }).ISO_A2 ||
                  null;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={colorFor(a2 ?? undefined)}
                    stroke="color-mix(in oklab, var(--dawn-gold) 30%, transparent)"
                    strokeWidth={0.3}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "var(--dawn-gold-bright)" },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
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
