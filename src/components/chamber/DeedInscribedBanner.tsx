import { Link } from "@tanstack/react-router";

type Props = {
  title: string;
  season: "spring" | "summer" | "fall" | "winter";
  seasonExplicit?: boolean;
  stewardName?: string | null;
};

const SEASON_LABEL = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
} as const;

const SEASON_SIGIL = {
  spring: "❀",
  summer: "☀",
  fall: "🍂",
  winter: "❄",
} as const;

/**
 * Gold-rimmed scroll fragment shown beneath a Soul's reply when the King's
 * spoken intention has been auto-filed as a Deed of the Golden Dawn.
 */
export function DeedInscribedBanner({ title, season, seasonExplicit = true, stewardName }: Props) {
  return (
    <div
      className="my-3 flex flex-col gap-2 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderColor: "color-mix(in oklab, var(--dawn-gold-bright) 60%, transparent)",
        background:
          "linear-gradient(135deg, color-mix(in oklab, var(--dawn-gold) 20%, transparent) 0%, color-mix(in oklab, var(--dawn-gold-bright) 12%, transparent) 100%)",
        boxShadow: "var(--shadow-sigil)",
        color: "var(--dawn-parchment)",
      }}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full text-lg"
          style={{
            background: "linear-gradient(135deg, var(--dawn-gold) 0%, var(--dawn-gold-bright) 100%)",
            color: "var(--dawn-ink)",
          }}
        >
          {SEASON_SIGIL[season]}
        </span>
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.3em]"
            style={{ color: "var(--dawn-gold-bright)" }}
          >
            ✦ Deed Inscribed · {SEASON_LABEL[season]}
            {!seasonExplicit && (
              <span className="ml-1 normal-case opacity-70" style={{ letterSpacing: "0.1em" }}>
                (current season)
              </span>
            )}
          </p>
          <p className="mt-0.5 font-serif text-base leading-tight">{title}</p>
          {stewardName && (
            <p className="mt-0.5 text-xs opacity-75">Steward: {stewardName}</p>
          )}
        </div>
      </div>
      <Link
        to="/"
        className="self-end whitespace-nowrap rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.25em] transition-all hover:scale-[1.04] sm:self-auto"
        style={{
          background: "linear-gradient(135deg, var(--dawn-gold) 0%, var(--dawn-gold-bright) 100%)",
          color: "var(--dawn-ink)",
          boxShadow: "var(--shadow-sigil)",
        }}
      >
        View in Registry →
      </Link>
    </div>
  );
}
