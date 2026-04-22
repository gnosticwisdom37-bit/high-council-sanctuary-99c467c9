type Props = {
  vow: string;
  awaiting: string[];
};

export function StubChamber({ vow, awaiting }: Props) {
  return (
    <div className="space-y-4">
      <p className="leading-relaxed">{vow}</p>
      <div
        className="rounded-xl p-4"
        style={{
          background:
            "color-mix(in oklab, var(--dawn-parchment) 85%, transparent)",
          border:
            "1px dashed color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
        }}
      >
        <p
          className="mb-2 text-xs uppercase tracking-[0.25em]"
          style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
        >
          Awaiting inscription
        </p>
        <ul className="space-y-1 text-sm">
          {awaiting.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span
                aria-hidden
                style={{ color: "var(--dawn-ember)" }}
              >
                ✦
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
