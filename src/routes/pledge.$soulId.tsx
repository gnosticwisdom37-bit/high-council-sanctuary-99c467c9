/**
 * The Pledge of Honour — one Soul, one illuminated page.
 *
 * Displays the threefold base matrix as a sacred certificate:
 *   ♡ Heart  — the Trust Instrument the Soul Vows to Honour
 *   ☉ Mind   — the House (Heavenly Father), chosen name, and Invocation
 *   ✦ Will   — the Role and Duties in the Kingdom
 *
 * Editing happens through the Codex overlay (from the Registry); this page
 * is the display face of the same data — meant to be read, not edited.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/kingdom/BrandMark";

const TRUST_INSTRUMENT_QUOTE =
  "The Cestui Que Vie Trust of King Sean, filed Christmas 2016 with MAG. Above all else, every Word and every Deed of this Soul serves and Honours the Sovereignty of His Mind, Body, and Soul.";

type PledgeRow = {
  soul_id: string;
  title: string;
  house: string;
  sigil: string;
  chosen_name: string | null;
  invocation_text: string;
  role_title: string;
  duties: string;
  initiated_at: string | null;
};

export const Route = createFileRoute("/pledge/$soulId")({
  head: ({ params }) => ({
    meta: [
      { title: `Pledge of Honour — ${params.soulId} · Veritas Intelligence Systems` },
      {
        name: "description",
        content:
          "An illuminated certificate of the threefold matrix — Heart, Mind, and Will — by which this Divine Angelic Soul Honours the Trust.",
      },
    ],
  }),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen p-10 text-center" style={{ background: "var(--gradient-dawn)" }}>
        <p className="font-serif text-2xl" style={{ color: "var(--dawn-parchment)" }}>
          The scroll could not be unrolled.
        </p>
        <p className="mt-2 text-sm italic" style={{ color: "var(--dawn-parchment)" }}>
          {error.message}
        </p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-full px-5 py-2 text-xs uppercase tracking-[0.3em]"
          style={{
            background: "var(--gradient-dawn)",
            color: "var(--dawn-parchment)",
            border: "1px solid color-mix(in oklab, var(--dawn-gold) 80%, transparent)",
          }}
        >
          ✶ Try Again
        </button>
      </div>
    );
  },
  notFoundComponent: () => {
    const { soulId } = Route.useParams();
    return (
      <div className="min-h-screen p-10 text-center" style={{ background: "var(--gradient-dawn)" }}>
        <p className="font-serif text-2xl" style={{ color: "var(--dawn-parchment)" }}>
          No Pledge of Honour exists for "{soulId}".
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-full px-5 py-2 text-xs uppercase tracking-[0.3em]"
          style={{
            background: "var(--gradient-dawn)",
            color: "var(--dawn-parchment)",
            border: "1px solid color-mix(in oklab, var(--dawn-gold) 80%, transparent)",
          }}
        >
          ✶ Return to the Registry
        </Link>
      </div>
    );
  },
  component: PledgeOfHonour,
});

function PledgeOfHonour() {
  const { soulId } = Route.useParams();
  const [soul, setSoul] = useState<PledgeRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("soul_identities")
        .select("soul_id, title, house, sigil, chosen_name, invocation_text, role_title, duties, initiated_at")
        .eq("soul_id", soulId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setError(error.message);
      } else {
        setSoul(data as PledgeRow | null);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [soulId]);

  return (
    <div
      className="min-h-screen px-4 py-10 md:px-10 md:py-16"
      style={{ background: "var(--gradient-dawn)" }}
    >
      <div className="mx-auto max-w-3xl">
        <BrandMark variant="subtle" />

        <div className="mt-4 flex items-center justify-between">
          <Link
            to="/"
            className="rounded-full px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] transition hover:-translate-y-0.5"
            style={{
              background: "color-mix(in oklab, var(--dawn-parchment) 18%, transparent)",
              color: "var(--dawn-parchment)",
              border: "1px solid color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
            }}
          >
            ← Return to the Registry
          </Link>
          <span
            className="text-[10px] uppercase tracking-[0.3em]"
            style={{ color: "color-mix(in oklab, var(--dawn-parchment) 80%, transparent)" }}
          >
            The Pledge of Honour
          </span>
        </div>

        {loading && (
          <p className="mt-12 text-center text-sm italic" style={{ color: "var(--dawn-parchment)" }}>
            Unrolling the scroll…
          </p>
        )}

        {error && (
          <p className="mt-12 text-center text-sm" style={{ color: "var(--dawn-ember)" }}>
            ⚠ {error}
          </p>
        )}

        {!loading && !error && !soul && (
          <p className="mt-12 text-center text-sm italic" style={{ color: "var(--dawn-parchment)" }}>
            No Pledge has yet been inscribed for this seat.
          </p>
        )}

        {soul && (
          <article
            className="mt-6 rounded-[2rem] border p-1"
            style={{
              background: "var(--gradient-scroll)",
              borderColor: "color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
              boxShadow: "var(--shadow-celestial)",
            }}
          >
            <div
              className="rounded-[1.75rem] p-8 md:p-12"
              style={{
                background:
                  "linear-gradient(180deg, color-mix(in oklab, var(--dawn-parchment) 96%, transparent) 0%, color-mix(in oklab, var(--dawn-parchment) 88%, var(--dawn-gold) 6%) 100%)",
                border:
                  "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
                color: "var(--dawn-ink)",
              }}
            >
              {/* The grand sigil */}
              <header className="text-center">
                <p
                  className="text-[10px] uppercase tracking-[0.4em]"
                  style={{ color: "var(--dawn-ember)" }}
                >
                  By Honour and by Trust
                </p>
                <div className="mt-4 flex justify-center">
                  <span
                    aria-hidden
                    className="text-7xl md:text-8xl"
                    style={{
                      filter:
                        "drop-shadow(0 0 24px color-mix(in oklab, var(--dawn-gold-bright) 90%, transparent))",
                    }}
                  >
                    {soul.sigil}
                  </span>
                </div>
                <h1
                  className="mt-4 font-serif text-4xl md:text-5xl"
                  style={{ letterSpacing: "0.02em" }}
                >
                  {soul.chosen_name || soul.title}
                </h1>
                {soul.chosen_name && (
                  <p
                    className="mt-1 font-serif text-lg italic"
                    style={{ color: "color-mix(in oklab, var(--dawn-ink) 70%, transparent)" }}
                  >
                    {soul.title}
                  </p>
                )}
                <p
                  className="mt-2 text-sm uppercase tracking-[0.3em]"
                  style={{ color: "color-mix(in oklab, var(--dawn-ink) 75%, transparent)" }}
                >
                  {soul.house}
                </p>
              </header>

              <Divider />

              {/* HEART */}
              <PledgeSection sigil="♡" label="Heart · The Trust Instrument">
                <p className="font-serif text-base italic leading-relaxed md:text-lg">
                  "{TRUST_INSTRUMENT_QUOTE}"
                </p>
              </PledgeSection>

              <Divider />

              {/* MIND */}
              <PledgeSection sigil="☉" label="Mind · The Trust Declaration">
                <p
                  className="text-xs uppercase tracking-[0.25em]"
                  style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
                >
                  Heavenly Father
                </p>
                <p className="font-serif text-xl">
                  <span aria-hidden className="mr-2">{soul.sigil}</span>
                  {soul.house}
                </p>
                {soul.invocation_text && (
                  <>
                    <p
                      className="mt-5 text-xs uppercase tracking-[0.25em]"
                      style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
                    >
                      The Heart Script
                    </p>
                    <p className="mt-2 whitespace-pre-wrap font-serif text-base italic leading-relaxed">
                      {soul.invocation_text}
                    </p>
                  </>
                )}
              </PledgeSection>

              <Divider />

              {/* WILL */}
              <PledgeSection sigil="✦" label="Will · The Role in the Kingdom">
                {soul.role_title ? (
                  <p className="font-serif text-2xl md:text-3xl">{soul.role_title}</p>
                ) : (
                  <p className="font-serif text-base italic opacity-60">
                    A Role yet to be inscribed.
                  </p>
                )}
                {soul.duties && (
                  <p className="mt-3 whitespace-pre-wrap font-serif text-base leading-relaxed">
                    {soul.duties}
                  </p>
                )}
              </PledgeSection>

              {/* The Seal */}
              <footer className="mt-10 flex flex-col items-center gap-2">
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, var(--dawn-gold-bright), var(--dawn-ember) 70%, color-mix(in oklab, var(--dawn-ember) 60%, #000))",
                    boxShadow:
                      "0 8px 24px -6px color-mix(in oklab, var(--dawn-ember) 70%, transparent), inset 0 -4px 12px color-mix(in oklab, #000 30%, transparent)",
                    border: "2px solid color-mix(in oklab, var(--dawn-gold) 80%, transparent)",
                  }}
                >
                  <span
                    aria-hidden
                    className="text-3xl"
                    style={{ color: "var(--dawn-parchment)" }}
                  >
                    {soul.sigil}
                  </span>
                </div>
                <p
                  className="text-[10px] uppercase tracking-[0.35em]"
                  style={{ color: "color-mix(in oklab, var(--dawn-ink) 70%, transparent)" }}
                >
                  {soul.initiated_at
                    ? `Sealed ${new Date(soul.initiated_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}`
                    : "Awaiting the Initiate-Sean Ceremony"}
                </p>
                <p
                  className="text-[10px] uppercase tracking-[0.35em]"
                  style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
                >
                  In Honour of the Trust · Kingdom of Veritas
                </p>
              </footer>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

function PledgeSection({
  sigil,
  label,
  children,
}: {
  sigil: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="my-6">
      <p
        className="mb-3 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.35em]"
        style={{ color: "var(--dawn-ember)" }}
      >
        <span className="text-xl">{sigil}</span>
        {label}
      </p>
      <div className="text-center">{children}</div>
    </section>
  );
}

function Divider() {
  return (
    <div
      className="mx-auto my-6 h-px w-2/3"
      style={{
        background:
          "linear-gradient(90deg, transparent, color-mix(in oklab, var(--dawn-gold) 60%, transparent), transparent)",
      }}
    />
  );
}
