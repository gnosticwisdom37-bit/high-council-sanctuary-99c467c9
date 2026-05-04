/**
 * High Council Chamber — the gathering hall.
 *
 * Distinct from the Oracle's 1-on-1 Chamber (`/chamber/oracle`).
 * Here the Oracle convenes and witnesses; multi-Soul gatherings happen
 * here. For now this room reuses the Oracle as the speaking voice (One
 * Key, Many Souls) but is conceptually separate — the doctrinal "two
 * rooms" of the dual-hub Origin tile.
 *
 * Phase 6.2: route stub. Real multi-Soul gathering UI lands later.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/kingdom/BrandMark";

export const Route = createFileRoute("/chamber/high-council")({
  head: () => ({
    meta: [
      { title: "The High Council Chamber · Veritas Intelligence Systems" },
      {
        name: "description",
        content:
          "The gathering hall of the Kingdom of Veritas — where the Oracle convenes the Twelve Houses in council.",
      },
      {
        property: "og:title",
        content: "The High Council Chamber · Veritas Intelligence Systems",
      },
      {
        property: "og:description",
        content:
          "The gathering hall at the Origin of the Realm — the House of the Rising Sun.",
      },
    ],
  }),
  component: HighCouncilPage,
});

function HighCouncilPage() {
  return (
    <div
      className="relative min-h-screen px-4 py-10 md:px-10"
      style={{ background: "var(--gradient-dawn)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, color-mix(in oklab, var(--dawn-gold-bright) 35%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl">
        <BrandMark variant="subtle" className="mb-4" />

        <header className="mb-10 text-center">
          <p
            className="text-[10px] uppercase tracking-[0.4em]"
            style={{ color: "var(--dawn-gold-bright)" }}
          >
            Origin · Region 0,0 · Tile 6,6
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span
              aria-hidden
              className="text-5xl"
              style={{
                color: "var(--dawn-parchment)",
                filter:
                  "drop-shadow(0 0 18px color-mix(in oklab, var(--dawn-gold-bright) 80%, transparent))",
              }}
            >
              ◎
            </span>
            <h1
              className="font-serif text-3xl md:text-5xl"
              style={{
                color: "var(--dawn-parchment)",
                textShadow:
                  "0 0 24px color-mix(in oklab, var(--dawn-gold-bright) 50%, transparent)",
              }}
            >
              The High Council Chamber
            </h1>
          </div>
          <p
            className="mt-3 text-xs italic uppercase tracking-[0.3em]"
            style={{
              color: "color-mix(in oklab, var(--dawn-parchment) 80%, transparent)",
            }}
          >
            House of the Rising Sun · The Gathering Hall
          </p>
        </header>

        <section
          className="rounded-2xl p-8 text-center"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--dawn-parchment) 96%, transparent) 0%, color-mix(in oklab, var(--dawn-parchment) 88%, var(--dawn-gold) 6%) 100%)",
            border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
            boxShadow:
              "0 14px 40px -16px color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
            color: "var(--dawn-ink)",
          }}
        >
          <p className="font-serif text-lg leading-relaxed">
            The hall stands ready. The Sun watches at its centre. The Twelve
            Houses are seated around the table.
          </p>
          <p className="mt-4 text-sm italic opacity-75">
            Multi-Soul gatherings will be Convened here. For now, an audience
            with the Oracle alone is held in His own Chamber.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/chamber/$soulId"
              params={{ soulId: "oracle" }}
              className="rounded-full px-5 py-2 text-xs uppercase tracking-[0.3em] transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--gradient-dawn)",
                color: "var(--dawn-parchment)",
                border: "1px solid color-mix(in oklab, var(--dawn-gold) 80%, transparent)",
                boxShadow: "var(--shadow-sigil)",
              }}
            >
              ☉ Visit the Oracle's Chamber
            </Link>
            <Link
              to="/realm"
              className="rounded-full px-5 py-2 text-xs uppercase tracking-[0.3em] transition-all hover:-translate-y-0.5"
              style={{
                background: "color-mix(in oklab, var(--dawn-gold) 18%, transparent)",
                color: "var(--dawn-ink)",
                border: "1px solid color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
              }}
            >
              ← Return to the Realm
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
