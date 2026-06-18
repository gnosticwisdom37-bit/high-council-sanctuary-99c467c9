/**
 * WordPress Site Binding — surfaced at the top of the Studio so the King
 * can pick (or change) the WordPress.com site this Workshop publishes to
 * without having to drill into the New Post tab first.
 *
 * Calls existing server fns in @/lib-server/wordpress.functions.
 */
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Globe, Loader2, Settings2 } from "lucide-react";
import {
  listWpSites,
  getWorkshopWpLink,
  setWorkshopWpSite,
} from "@/lib-server/wordpress.functions";

type Site = { id: string; name: string; url: string };
type Link = { wp_site_id: string; wp_site_name: string | null; wp_site_url: string | null } | null;

export function WordPressSiteBinding({
  workshopId,
  onChanged,
}: {
  workshopId: string;
  onChanged?: () => void;
}) {
  const listSitesFn = useServerFn(listWpSites);
  const getLinkFn = useServerFn(getWorkshopWpLink);
  const setSiteFn = useServerFn(setWorkshopWpSite);

  const [link, setLink] = useState<Link>(null);
  const [open, setOpen] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLink = useCallback(async () => {
    const r = await getLinkFn({ data: { workshop_id: workshopId } });
    if (r.ok) setLink(r.link as Link);
  }, [getLinkFn, workshopId]);

  useEffect(() => { void refreshLink(); }, [refreshLink]);

  const openPicker = useCallback(async () => {
    setOpen(true);
    setError(null);
    setLoadingSites(true);
    const r = await listSitesFn({});
    if (r.ok) setSites(r.sites);
    else setError(r.error ?? "Could not load WordPress.com sites.");
    setLoadingSites(false);
  }, [listSitesFn]);

  const pickSite = useCallback(async (s: Site) => {
    const r = await setSiteFn({
      data: {
        workshop_id: workshopId,
        wp_site_id: s.id,
        wp_site_name: s.name,
        wp_site_url: s.url,
        default_status: "draft",
        default_categories: [],
        default_tags: [],
      },
    });
    if (r.ok) {
      setOpen(false);
      void refreshLink();
      onChanged?.();
    } else {
      setError(r.error ?? "Could not bind site.");
    }
  }, [setSiteFn, workshopId, refreshLink, onChanged]);

  return (
    <div className="mb-3">
      <div
        className="flex flex-wrap items-center gap-2 rounded-md px-3 py-2 text-xs"
        style={{
          background: "color-mix(in oklab, var(--dawn-deep) 30%, transparent)",
          border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
          color: "var(--dawn-parchment)",
        }}
      >
        <Globe className="h-3.5 w-3.5" style={{ color: "var(--dawn-gold-bright)" }} />
        <span className="text-[10px] uppercase tracking-[0.25em] opacity-70">Website</span>
        {link ? (
          <>
            <span className="font-medium">{link.wp_site_name ?? link.wp_site_id}</span>
            {link.wp_site_url && (
              <a
                href={link.wp_site_url}
                target="_blank"
                rel="noreferrer"
                className="opacity-70 underline"
              >
                {safeHost(link.wp_site_url)}
              </a>
            )}
            <button
              onClick={() => void openPicker()}
              className="ml-auto inline-flex items-center gap-1 opacity-80 hover:opacity-100"
            >
              <Settings2 className="h-3 w-3" /> Change site
            </button>
          </>
        ) : (
          <>
            <span className="opacity-80">No website bound yet.</span>
            <button
              onClick={() => void openPicker()}
              className="ml-auto rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em]"
              style={{
                background: "linear-gradient(135deg, var(--dawn-gold-bright), var(--dawn-ember))",
                color: "var(--dawn-ink)",
                border: "1px solid color-mix(in oklab, var(--dawn-gold) 70%, transparent)",
                fontFamily: "Cinzel, serif",
              }}
            >
              Add website
            </button>
          </>
        )}
      </div>

      {open && (
        <div
          className="mt-2 rounded-md p-3"
          style={{
            background: "color-mix(in oklab, var(--dawn-parchment) 92%, transparent)",
            border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
            color: "var(--dawn-ink)",
          }}
        >
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em]">Your WordPress.com sites</p>
          {loadingSites ? (
            <div className="flex items-center gap-2 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <p className="text-xs italic" style={{ color: "var(--dawn-ember)" }}>{error}</p>
          ) : sites.length === 0 ? (
            <p className="text-xs opacity-70">No sites found on this WordPress.com account.</p>
          ) : (
            <ul className="space-y-1">
              {sites.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => void pickSite(s)}
                    className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-black/5"
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-2 text-[10px] uppercase tracking-[0.2em] opacity-60">
                      {safeHost(s.url)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => setOpen(false)}
            className="mt-2 text-xs underline opacity-70"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

function safeHost(u: string): string {
  try { return new URL(u).host; } catch { return u; }
}
