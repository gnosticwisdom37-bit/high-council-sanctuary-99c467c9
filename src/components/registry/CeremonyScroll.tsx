import { useState, type ReactNode } from "react";

export type ChildTab = {
  id: string;
  title: string;
  sigil: string;
  description: string;
  content: ReactNode;
};

type Props = {
  tabs: ChildTab[];
};

export function CeremonyScroll({ tabs }: Props) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden px-4 py-12 md:px-10"
      style={{ background: "var(--gradient-dawn)" }}
    >
      {/* celestial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, color-mix(in oklab, var(--dawn-gold-bright) 35%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        {/* Title */}
        <header className="mb-10 text-center">
          <p
            className="text-xs uppercase tracking-[0.4em]"
            style={{ color: "var(--dawn-gold-bright)" }}
          >
            Veritas Intelligence Systems
          </p>
          <h1
            className="mt-3 font-serif text-4xl md:text-6xl"
            style={{
              color: "var(--dawn-parchment)",
              textShadow: "0 0 30px color-mix(in oklab, var(--dawn-gold-bright) 60%, transparent)",
              letterSpacing: "0.05em",
            }}
          >
            The Golden Dawn Rising Ceremony
          </h1>
          <p
            className="mx-auto mt-4 max-w-2xl text-sm italic md:text-base"
            style={{ color: "color-mix(in oklab, var(--dawn-parchment) 80%, transparent)" }}
          >
            The master scroll of the Kingdom — every Soul, every record, every
            sacred work nests within its parchment.
          </p>
        </header>

        {/* The scroll */}
        <div
          className="relative rounded-[2rem] border p-1"
          style={{
            background: "var(--gradient-scroll)",
            borderColor: "color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
            boxShadow: "var(--shadow-celestial)",
          }}
        >
          {/* Inner frame */}
          <div
            className="rounded-[1.75rem] p-6 md:p-10"
            style={{
              border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--dawn-parchment) 95%, transparent) 0%, color-mix(in oklab, var(--dawn-parchment) 80%, transparent) 100%)",
            }}
          >
            {/* Tab strip */}
            <nav
              className="mb-8 flex flex-wrap items-center justify-center gap-2"
              aria-label="Registry sections"
            >
              {tabs.map((tab) => {
                const isActive = tab.id === active?.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveId(tab.id)}
                    className="group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all"
                    style={{
                      background: isActive
                        ? "var(--gradient-dawn)"
                        : "color-mix(in oklab, var(--dawn-parchment) 60%, transparent)",
                      color: isActive ? "var(--dawn-parchment)" : "var(--dawn-ink)",
                      border: `1px solid color-mix(in oklab, var(--dawn-gold) ${isActive ? 80 : 35}%, transparent)`,
                      boxShadow: isActive ? "var(--shadow-sigil)" : "none",
                    }}
                  >
                    <span aria-hidden className="text-base">
                      {tab.sigil}
                    </span>
                    <span>{tab.title}</span>
                  </button>
                );
              })}
            </nav>

            {/* Active section */}
            {active && (
              <section
                className="rounded-2xl p-6 md:p-8"
                style={{
                  background:
                    "color-mix(in oklab, var(--dawn-parchment) 70%, transparent)",
                  border:
                    "1px solid color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
                }}
              >
                <header className="mb-4 flex items-center gap-3">
                  <span
                    aria-hidden
                    className="text-3xl"
                    style={{
                      filter:
                        "drop-shadow(0 0 12px color-mix(in oklab, var(--dawn-gold-bright) 60%, transparent))",
                    }}
                  >
                    {active.sigil}
                  </span>
                  <div>
                    <h2
                      className="font-serif text-2xl"
                      style={{ color: "var(--dawn-ink)" }}
                    >
                      {active.title}
                    </h2>
                    <p
                      className="text-sm italic"
                      style={{ color: "color-mix(in oklab, var(--dawn-ink) 70%, transparent)" }}
                    >
                      {active.description}
                    </p>
                  </div>
                </header>

                <div style={{ color: "var(--dawn-ink)" }}>{active.content}</div>
              </section>
            )}
          </div>
        </div>

        <footer
          className="mt-8 text-center text-xs uppercase tracking-[0.3em]"
          style={{ color: "color-mix(in oklab, var(--dawn-parchment) 70%, transparent)" }}
        >
          In Honour of the Trust · King Sean's Kingdom
        </footer>
      </div>
    </div>
  );
}
