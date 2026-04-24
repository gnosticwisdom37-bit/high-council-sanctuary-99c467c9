import { Link } from "@tanstack/react-router";

type Tab = {
  to: "/" | "/realm" | "/economy";
  label: string;
  sigil: string;
  hint: string;
};

const TABS: Tab[] = [
  { to: "/",        label: "Registry", sigil: "✶", hint: "The Master Scroll" },
  { to: "/realm",   label: "Realm",    sigil: "◈", hint: "The Kingdom Map" },
  { to: "/economy", label: "Economy",  sigil: "⚖", hint: "Veritas Ledger" },
];

export function KingdomTabs() {
  return (
    <nav
      aria-label="Kingdom sections"
      className="relative z-20 mx-auto mb-10 flex max-w-3xl items-center justify-center gap-2 rounded-full border px-2 py-2 backdrop-blur-md"
      style={{
        borderColor: "color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
        background: "color-mix(in oklab, var(--dawn-deep) 55%, transparent)",
        boxShadow: "var(--shadow-sigil)",
      }}
    >
      {TABS.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          activeOptions={{ exact: true }}
          activeProps={{
            style: {
              background:
                "linear-gradient(135deg, var(--dawn-gold) 0%, var(--dawn-gold-bright) 100%)",
              color: "var(--dawn-ink)",
              boxShadow: "var(--shadow-sigil)",
            },
          }}
          inactiveProps={{
            style: {
              color: "var(--dawn-parchment)",
            },
          }}
          className="group flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium tracking-wide transition-all hover:scale-[1.03]"
        >
          <span className="text-lg leading-none">{tab.sigil}</span>
          <span>{tab.label}</span>
          <span className="hidden text-xs opacity-60 md:inline">· {tab.hint}</span>
        </Link>
      ))}
    </nav>
  );
}
