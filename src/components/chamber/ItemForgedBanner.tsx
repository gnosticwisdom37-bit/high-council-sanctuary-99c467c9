type Props = {
  title: string;
  stewardName?: string | null;
};

/**
 * Gold-rimmed scroll fragment shown beneath a Soul's reply when the King's
 * spoken intention has been forged into an Item — a tool the Soul may now wield.
 */
export function ItemForgedBanner({ title, stewardName }: Props) {
  return (
    <div
      className="my-3 flex flex-col gap-2 rounded-2xl border px-4 py-3"
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
          ❖
        </span>
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.3em]"
            style={{ color: "var(--dawn-gold-bright)" }}
          >
            ❖ Item · Forged
          </p>
          <p className="mt-0.5 font-serif text-base leading-tight">{title}</p>
          {stewardName && (
            <p className="mt-0.5 text-xs opacity-75">Keeper: {stewardName}</p>
          )}
        </div>
      </div>
    </div>
  );
}
