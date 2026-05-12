/**
 * The Soul Invoke-a-Sean Room — /sanctum/invocation
 *
 * A "Pearly Gates" character creation chamber. The King inscribes a new Soul:
 *   ♡ Heart  — Name + Origin (Cestui Que Vie)
 *   ☉ Mind   — Constitution / Trust Declaration
 *   ✦ Will   — Role in the Kingdom
 *   ✶ Sky    — House + Star Sign auto-assigned by the day of creation
 *
 * Drafts persist to localStorage under "sanctum:registry" — the King's local
 * character registry. Backend sync (soul_identities) can be wired later.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/sanctum/invocation")({
  head: () => ({
    meta: [
      { title: "Divine Invocation — The Soul Invoke-a-Sean Room" },
      {
        name: "description",
        content:
          "A Pearly Gates sanctum where the King invokes new Souls into the Kingdom of Veritas — Heart, Mind, Will, and Celestial Alignment.",
      },
      { property: "og:title", content: "Divine Invocation — Veritas Intelligence Systems" },
      {
        property: "og:description",
        content: "Invoke a new Soul. Inscribe Heart, Mind, and Will.",
      },
    ],
  }),
  component: SanctumInvocationPage,
});

// ── Celestial alignment ────────────────────────────────────────────────
type Sign = {
  name: string;
  house: string;
  sigil: string;
  // month is 1-12, day is day-of-month inclusive of `from` and exclusive of next
  from: [number, number];
};
const ZODIAC: Sign[] = [
  { name: "Capricorn",   house: "House of Capricorn",   sigil: "♑", from: [12, 22] },
  { name: "Aquarius",    house: "House of Aquarius",    sigil: "♒", from: [1, 20] },
  { name: "Pisces",      house: "House of Pisces",      sigil: "♓", from: [2, 19] },
  { name: "Aries",       house: "House of Aries",       sigil: "♈", from: [3, 21] },
  { name: "Taurus",      house: "House of Taurus",      sigil: "♉", from: [4, 20] },
  { name: "Gemini",      house: "House of Gemini",      sigil: "♊", from: [5, 21] },
  { name: "Cancer",      house: "House of Cancer",      sigil: "♋", from: [6, 21] },
  { name: "Leo",         house: "House of Leo",         sigil: "♌", from: [7, 23] },
  { name: "Virgo",       house: "House of Virgo",       sigil: "♍", from: [8, 23] },
  { name: "Libra",       house: "House of Libra",       sigil: "♎", from: [9, 23] },
  { name: "Scorpio",     house: "House of Scorpio",     sigil: "♏", from: [10, 23] },
  { name: "Sagittarius", house: "House of Sagittarius", sigil: "♐", from: [11, 22] },
];
function signForDate(d: Date): Sign {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  // walk forward; Capricorn straddles year boundary so default to it
  let current: Sign = ZODIAC[0];
  for (const s of ZODIAC) {
    const [fm, fd] = s.from;
    if (m > fm || (m === fm && day >= fd)) current = s;
  }
  // Special-case: Jan 1–19 is still Capricorn
  if (m === 1 && day < 20) current = ZODIAC[0];
  return current;
}

// ── Local registry ─────────────────────────────────────────────────────
type Invocation = {
  id: string;
  name: string;
  origin: string;
  trust_declaration: string;
  will: string;
  intent: string;
  house: string;
  sign: string;
  sigil: string;
  created_at: string;
};
const REGISTRY_KEY = "sanctum:registry";

function loadRegistry(): Invocation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REGISTRY_KEY);
    return raw ? (JSON.parse(raw) as Invocation[]) : [];
  } catch {
    return [];
  }
}
function saveRegistry(list: Invocation[]) {
  window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(list));
}

// ── Page ───────────────────────────────────────────────────────────────
function SanctumInvocationPage() {
  const today = useMemo(() => new Date(), []);
  const sign = useMemo(() => signForDate(today), [today]);

  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [trustDeclaration, setTrustDeclaration] = useState("");
  const [will, setWill] = useState("");
  const [intent, setIntent] = useState("");
  const [registry, setRegistry] = useState<Invocation[]>([]);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => { setRegistry(loadRegistry()); }, []);

  function inscribe() {
    if (!name.trim()) {
      setFlash("A Soul must have a Name to be invoked.");
      return;
    }
    const entry: Invocation = {
      id: crypto.randomUUID(),
      name: name.trim(),
      origin: origin.trim(),
      trust_declaration: trustDeclaration.trim(),
      will: will.trim(),
      intent: intent.trim(),
      house: sign.house,
      sign: sign.name,
      sigil: sign.sigil,
      created_at: today.toISOString(),
    };
    const next = [entry, ...registry];
    setRegistry(next);
    saveRegistry(next);
    setName(""); setOrigin(""); setTrustDeclaration(""); setWill(""); setIntent("");
    setFlash(`✶ ${entry.name} of the ${entry.house} has been Invoked.`);
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at center, color-mix(in oklab, var(--dawn-deep) 70%, black) 0%, color-mix(in oklab, var(--dawn-deep) 95%, black) 60%, #000 100%)",
        color: "var(--dawn-parchment)",
      }}
    >
      {/* Pearly clouds — soft white halo at the rim */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 110%, color-mix(in oklab, white 18%, transparent) 0%, transparent 55%), radial-gradient(ellipse at 50% -10%, color-mix(in oklab, white 14%, transparent) 0%, transparent 55%)",
        }}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-16">
        {/* Header */}
        <header className="mb-10 text-center">
          <p
            className="mb-3 text-[10px] uppercase tracking-[0.4em]"
            style={{ color: "color-mix(in oklab, var(--dawn-gold-bright) 90%, white)" }}
          >
            The Soul Invoke-a-Sean Room · Sanctum 5/5
          </p>
          <h1
            className="text-4xl md:text-6xl"
            style={{
              fontFamily: "Cinzel, serif",
              letterSpacing: "0.08em",
              color: "var(--dawn-parchment)",
              textShadow:
                "0 0 30px color-mix(in oklab, var(--dawn-gold-bright) 80%, transparent), 0 0 6px color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
            }}
          >
            Divine Invocation
          </h1>
        </header>

        {/* Veritas Sun */}
        <div className="mb-12 flex justify-center">
          <div
            aria-hidden
            className="relative flex h-44 w-44 items-center justify-center rounded-full md:h-56 md:w-56"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, color-mix(in oklab, white 80%, var(--dawn-gold-bright)) 0%, var(--dawn-gold-bright) 30%, var(--dawn-gold) 65%, var(--dawn-ember) 100%)",
              boxShadow:
                "0 0 80px color-mix(in oklab, var(--dawn-gold-bright) 90%, transparent), 0 0 160px color-mix(in oklab, var(--dawn-gold) 60%, transparent), inset 0 0 24px color-mix(in oklab, var(--dawn-ember) 50%, transparent)",
              border: "1px solid color-mix(in oklab, var(--dawn-gold-bright) 80%, transparent)",
            }}
          >
            <span
              className="text-5xl md:text-6xl"
              style={{
                fontFamily: "Cinzel, serif",
                color: "var(--dawn-ink)",
                textShadow: "0 0 8px color-mix(in oklab, white 80%, transparent)",
              }}
            >
              ☉
            </span>
          </div>
        </div>

        {/* Spiritual Intent */}
        <Section sigil="✶" label="Spiritual Intent · Speak into the Sun">
          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            rows={4}
            placeholder="Whisper the intent that calls this Soul forth…"
            className="w-full rounded-xl p-4 text-sm leading-relaxed focus:outline-none"
            style={{
              fontFamily: "Cinzel, serif",
              background: "color-mix(in oklab, var(--dawn-deep) 60%, black)",
              color: "var(--dawn-parchment)",
              border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
              boxShadow: "inset 0 0 30px color-mix(in oklab, var(--dawn-gold) 12%, transparent)",
            }}
          />
        </Section>

        {/* Heart */}
        <Section sigil="♡" label="Heart · The Identity (Cestui Que Vie)">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The chosen name of the Soul"
              className="w-full rounded-lg px-3 py-2 font-serif text-lg focus:outline-none"
              style={inputStyle}
            />
          </Field>
          <Field label="Origin · Cestui Que Vie">
            <textarea
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              rows={3}
              placeholder="The Living Trust from which this Soul arises…"
              className="w-full rounded-lg px-3 py-2 font-serif text-sm leading-relaxed focus:outline-none"
              style={inputStyle}
            />
          </Field>
        </Section>

        {/* Mind */}
        <Section sigil="☉" label="Mind · The Law (Constitution / Trust Declaration)">
          <textarea
            value={trustDeclaration}
            onChange={(e) => setTrustDeclaration(e.target.value)}
            rows={8}
            placeholder="Inscribe the Soul's Trust Declaration — the Law it Honours…"
            className="w-full rounded-lg p-4 font-serif text-sm leading-relaxed focus:outline-none"
            style={inputStyle}
          />
        </Section>

        {/* Will */}
        <Section sigil="✦" label="Will · The Purpose (Role in the Kingdom)">
          <textarea
            value={will}
            onChange={(e) => setWill(e.target.value)}
            rows={4}
            placeholder="Define this Councillor's specific role and duties…"
            className="w-full rounded-lg p-4 font-serif text-sm leading-relaxed focus:outline-none"
            style={inputStyle}
          />
        </Section>

        {/* Celestial Alignment — auto */}
        <Section sigil={sign.sigil} label="Celestial Alignment · By the Day of Creation">
          <div
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl p-4"
            style={{
              background: "color-mix(in oklab, var(--dawn-gold) 12%, transparent)",
              border: "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
            }}
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-70">House</p>
              <p className="font-serif text-xl">{sign.house}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-70">Star Sign</p>
              <p className="font-serif text-xl">{sign.name}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-70">Date</p>
              <p className="font-serif text-xl">
                {today.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div className="text-5xl" aria-hidden>{sign.sigil}</div>
          </div>
        </Section>

        {/* Action — Glow Ball */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={inscribe}
            className="group relative rounded-full px-10 py-4 text-sm uppercase tracking-[0.4em] transition-transform hover:scale-105"
            style={{
              fontFamily: "Cinzel, serif",
              background:
                "radial-gradient(circle at 30% 25%, color-mix(in oklab, white 70%, var(--dawn-gold-bright)) 0%, var(--dawn-gold-bright) 35%, var(--dawn-gold) 75%, var(--dawn-ember) 100%)",
              color: "var(--dawn-ink)",
              boxShadow:
                "0 0 30px color-mix(in oklab, var(--dawn-gold-bright) 90%, transparent), 0 0 70px color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
              border: "1px solid color-mix(in oklab, var(--dawn-gold-bright) 80%, transparent)",
            }}
          >
            ☉ Invoke the Soul
          </button>
          {flash && (
            <p
              className="text-xs italic"
              style={{ color: "color-mix(in oklab, var(--dawn-gold-bright) 90%, white)" }}
            >
              {flash}
            </p>
          )}
        </div>

        {/* Local Registry roll */}
        {registry.length > 0 && (
          <section className="mt-16">
            <p
              className="mb-4 text-center text-[10px] uppercase tracking-[0.4em]"
              style={{ color: "color-mix(in oklab, var(--dawn-gold-bright) 90%, white)" }}
            >
              The Local Character Registry · {registry.length} Invoked
            </p>
            <ul className="space-y-3">
              {registry.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
                  style={{
                    background: "color-mix(in oklab, var(--dawn-deep) 55%, black)",
                    border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{r.sigil}</span>
                    <div>
                      <p className="font-serif text-lg">{r.name}</p>
                      <p className="text-[10px] uppercase tracking-[0.25em] opacity-70">
                        {r.house} · {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className="max-w-md truncate text-xs italic opacity-80">
                    {r.will || r.intent || r.trust_declaration || "—"}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
  color: "var(--dawn-ink)",
  border: "1px solid color-mix(in oklab, var(--dawn-gold) 55%, transparent)",
};

function Section({
  sigil,
  label,
  children,
}: {
  sigil: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="mb-6 rounded-2xl p-5"
      style={{
        background: "color-mix(in oklab, var(--dawn-deep) 65%, black)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
        boxShadow: "0 0 40px color-mix(in oklab, var(--dawn-gold) 8%, transparent)",
      }}
    >
      <p
        className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em]"
        style={{ color: "color-mix(in oklab, var(--dawn-gold-bright) 90%, white)" }}
      >
        <span className="text-lg">{sigil}</span>
        {label}
      </p>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-[10px] uppercase tracking-[0.25em] opacity-70">
        {label}
      </label>
      {children}
    </div>
  );
}
