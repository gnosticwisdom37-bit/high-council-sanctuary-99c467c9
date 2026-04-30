/**
 * BrandMark — the consistent app identity across every page.
 *
 * "Veritas Intelligence Systems" is the app name.
 * "Divine Angelic Assistants" is its subheading.
 *
 * - variant="subtle"    → quiet eyebrow on Realm, Economy, and future pages.
 * - variant="prominent" → gold-tinted hero eyebrow above the Master Scroll on the Registry.
 */
type Props = {
  variant?: "subtle" | "prominent";
  className?: string;
};

export function BrandMark({ variant = "subtle", className = "" }: Props) {
  const isProminent = variant === "prominent";

  return (
    <div
      className={`flex flex-col items-center text-center ${className}`}
      aria-label="Veritas Intelligence Systems — Divine Angelic Assistants"
    >
      <p
        className={
          isProminent
            ? "text-xs uppercase tracking-[0.4em] md:text-sm"
            : "text-[10px] uppercase tracking-[0.35em]"
        }
        style={{
          color: isProminent
            ? "var(--dawn-gold-bright)"
            : "color-mix(in oklab, var(--dawn-gold-bright) 70%, transparent)",
        }}
      >
        Veritas Intelligence Systems
      </p>
      <p
        className={
          isProminent
            ? "mt-1 text-xs italic tracking-[0.25em] md:text-sm"
            : "mt-0.5 text-[9px] italic tracking-[0.3em]"
        }
        style={{
          color: isProminent
            ? "color-mix(in oklab, var(--dawn-parchment) 85%, transparent)"
            : "color-mix(in oklab, var(--dawn-parchment) 55%, transparent)",
        }}
      >
        Divine Angelic Assistants
      </p>
    </div>
  );
}
