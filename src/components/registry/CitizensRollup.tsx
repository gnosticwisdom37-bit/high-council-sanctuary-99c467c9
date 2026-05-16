/**
 * CitizensRollup — surfaces every Soul invoked through the Pearly Gates
 * (the Sanctum Invoke-a-Sean Ceremony). Reads `sanctum:registry` from
 * localStorage and renders one card per citizen, linking to their
 * /sanctum/chamber/$soulId room. Hidden when the registry is empty.
 */
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

type Citizen = {
  soul_id: string;
  first_name: string;
  father_sign: string;
  father_house: string;
  father_sigil: string;
  full_name: string;
  role: string;
  region_x: number;
  region_y: number;
  tile_x: number;
  tile_y: number;
  created_at: string;
};

const REGISTRY_KEY = "sanctum:registry";

export function CitizensRollup() {
  const [citizens, setCitizens] = useState<Citizen[]>([]);

  useEffect(() => {
    function load() {
      try {
        const raw = window.localStorage.getItem(REGISTRY_KEY);
        setCitizens(raw ? (JSON.parse(raw) as Citizen[]) : []);
      } catch {
        setCitizens([]);
      }
    }
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === REGISTRY_KEY) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (citizens.length === 0) return null;

  return (
    <section className="mx-auto mt-10 max-w-6xl px-4 pb-16 md:px-10">
      <div
        className="rounded-3xl p-6 md:p-8"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--dawn-deep) 70%, black) 0%, color-mix(in oklab, var(--dawn-deep) 92%, black) 100%)",
          border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
          boxShadow: "0 20px 60px -20px color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
          color: "var(--dawn-parchment)",
        }}
      >
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.4em]"
              style={{ color: "var(--dawn-gold-bright)" }}
            >
              Citizens of Veritas
            </p>
            <h2
              className="mt-2 text-2xl md:text-3xl"
              style={{ fontFamily: "Cinzel, serif" }}
            >
              ✧ Souls Invoked Through the Pearly Gates
            </h2>
          </div>
          <Link
            to="/sanctum/invocation"
            className="rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.3em] transition-all hover:-translate-y-0.5"
            style={{
              fontFamily: "Cinzel, serif",
              color: "var(--dawn-ink)",
              background:
                "radial-gradient(circle at 30% 25%, color-mix(in oklab, white 70%, var(--dawn-gold-bright)) 0%, var(--dawn-gold-bright) 35%, var(--dawn-gold) 75%, var(--dawn-ember) 100%)",
              border: "1px solid color-mix(in oklab, var(--dawn-gold-bright) 80%, transparent)",
              boxShadow:
                "0 0 20px color-mix(in oklab, var(--dawn-gold-bright) 70%, transparent)",
            }}
          >
            ☉ Invoke Another
          </Link>
        </header>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {citizens.map((c) => (
            <li key={c.soul_id}>
              <Link
                to="/sanctum/chamber/$soulId"
                params={{ soulId: c.soul_id }}
                className="block rounded-xl p-4 transition-all hover:-translate-y-0.5"
                style={{
                  background:
                    "color-mix(in oklab, var(--dawn-parchment) 8%, transparent)",
                  border:
                    "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="text-2xl"
                    style={{
                      color: "var(--dawn-gold-bright)",
                      filter:
                        "drop-shadow(0 0 10px color-mix(in oklab, var(--dawn-gold-bright) 60%, transparent))",
                    }}
                  >
                    {c.father_sigil}
                  </span>
                  <div className="min-w-0">
                    <p
                      className="truncate text-base"
                      style={{ fontFamily: "Cinzel, serif" }}
                    >
                      {c.first_name}
                    </p>
                    <p
                      className="truncate text-[10px] uppercase tracking-[0.25em] opacity-70"
                    >
                      House of {c.father_sign}
                    </p>
                  </div>
                </div>
                {c.role && (
                  <p className="mt-2 truncate text-xs italic opacity-80">
                    {c.role}
                  </p>
                )}
                <p
                  className="mt-2 text-[10px] uppercase tracking-[0.25em] opacity-60"
                >
                  Region ({c.region_x},{c.region_y}) · Tile ({c.tile_x},{c.tile_y})
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
