/**
 * Kingdom Stationery Panel — Phase 10.3.
 *
 * One Kingdom-wide stationery template that wraps every outbound
 * Sacred Inbox reply. King uploads logo + thumbprint, picks accent
 * color, edits sign-off line; live preview renders the result.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload, Eye, Save } from "lucide-react";
import {
  getKingdomStationery,
  saveKingdomStationery,
  uploadKingdomAsset,
  previewStationery,
} from "@/server/inbox.functions";

type Stationery = {
  header_html: string;
  footer_html: string;
  signature_block_html: string;
  accent_color: string;
  logo_url: string | null;
  thumbprint_url: string | null;
  sign_off_name: string;
  address_line_1: string;
  address_line_2: string;
  address_line_3: string;
  domain_url: string;
  social_x_url: string;
  social_fb_url: string;
  contact_email: string;
  contact_phone: string;
};

export function KingdomStationeryPanel() {
  const getFn = useServerFn(getKingdomStationery);
  const saveFn = useServerFn(saveKingdomStationery);
  const uploadFn = useServerFn(uploadKingdomAsset);
  const previewFn = useServerFn(previewStationery);

  const [stationery, setStationery] = useState<Stationery | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "thumbprint" | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const r = await getFn({});
    if (r.ok) setStationery(r.stationery);
    setLoading(false);
  }, [getFn]);

  const refreshPreview = useCallback(async () => {
    const r = await previewFn({ data: {} });
    if (r.ok) setPreviewHtml(r.html);
  }, [previewFn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (stationery) void refreshPreview();
  }, [stationery, refreshPreview]);

  const handleSave = useCallback(async () => {
    if (!stationery) return;
    setSaving(true);
    setNotice(null);
    const r = await saveFn({
      data: {
        accent_color: stationery.accent_color,
        sign_off_name: stationery.sign_off_name,
        header_html: stationery.header_html,
        footer_html: stationery.footer_html,
        signature_block_html: stationery.signature_block_html,
        address_line_1: stationery.address_line_1,
        address_line_2: stationery.address_line_2,
        address_line_3: stationery.address_line_3,
        domain_url: stationery.domain_url,
        social_x_url: stationery.social_x_url,
        social_fb_url: stationery.social_fb_url,
        contact_email: stationery.contact_email,
        contact_phone: stationery.contact_phone,
      },
    });
    setSaving(false);
    if (r.ok) {
      setNotice("Stationery sealed.");
      await refreshPreview();
    } else {
      setNotice(`Error: ${r.error}`);
    }
  }, [stationery, saveFn, refreshPreview]);

  const handleUpload = useCallback(
    async (kind: "logo" | "thumbprint", file: File) => {
      setUploading(kind);
      setNotice(null);
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (const b of bytes) bin += String.fromCharCode(b);
      const data_base64 = btoa(bin);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const r = await uploadFn({
        data: {
          kind,
          filename: safeName,
          data_base64,
          content_type: file.type || "image/png",
        },
      });
      setUploading(null);
      if (r.ok) {
        setNotice(`${kind === "logo" ? "Logo" : "Thumbprint"} sealed in the bucket.`);
        await refresh();
      } else {
        setNotice(`Upload failed: ${r.error}`);
      }
    },
    [uploadFn, refresh],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--dawn-gold-bright)" }} />
      </div>
    );
  }
  if (!stationery) {
    return <p style={{ color: "var(--dawn-ember)" }}>Could not load stationery.</p>;
  }

  return (
    <section className="space-y-6">
      <header>
        <h2
          className="text-base uppercase tracking-[0.3em]"
          style={{ color: "var(--dawn-ink)", fontFamily: "Cinzel, serif" }}
        >
          Kingdom Stationery
        </h2>
        <p
          className="mt-1 text-[11px] italic"
          style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
        >
          The visual voice every Steward speaks through. Wraps every Sacred Inbox reply.
        </p>
      </header>

      {notice && (
        <p
          className="rounded-md px-3 py-2 text-xs"
          style={{
            background: "color-mix(in oklab, var(--dawn-gold-bright) 14%, transparent)",
            color: "var(--dawn-ink)",
            border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
          }}
        >
          {notice}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── Editor column ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Logo + Thumbprint */}
          <div className="grid grid-cols-2 gap-3">
            <AssetSlot
              label="Logo"
              url={stationery.logo_url}
              uploading={uploading === "logo"}
              onClick={() => logoInputRef.current?.click()}
            />
            <AssetSlot
              label="Thumbprint Seal"
              url={stationery.thumbprint_url}
              uploading={uploading === "thumbprint"}
              onClick={() => thumbInputRef.current?.click()}
              tint
            />
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload("logo", f);
              e.target.value = "";
            }}
          />
          <input
            ref={thumbInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload("thumbprint", f);
              e.target.value = "";
            }}
          />

          <Field label="Accent color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={stationery.accent_color}
                onChange={(e) => setStationery({ ...stationery, accent_color: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border"
                style={{ borderColor: "color-mix(in oklab, var(--dawn-gold) 50%, transparent)" }}
              />
              <input
                type="text"
                value={stationery.accent_color}
                onChange={(e) => setStationery({ ...stationery, accent_color: e.target.value })}
                className="flex-1 rounded-md px-2 py-1.5 text-sm font-mono"
                style={inputStyle}
              />
            </div>
          </Field>

          <Field label="Sign-off name">
            <input
              type="text"
              value={stationery.sign_off_name}
              onChange={(e) => setStationery({ ...stationery, sign_off_name: e.target.value })}
              className="w-full rounded-md px-2 py-1.5 text-sm"
              style={inputStyle}
            />
          </Field>

          {/* Address lines (left of brand row, italic) */}
          <div className="space-y-2 rounded-md p-3" style={{ background: "color-mix(in oklab, var(--dawn-gold-bright) 8%, transparent)" }}>
            <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: "color-mix(in oklab, var(--dawn-ink) 70%, transparent)" }}>
              Address lines (beside logo)
            </p>
            {([1, 2, 3] as const).map((n) => {
              const key = `address_line_${n}` as const;
              return (
                <input
                  key={key}
                  type="text"
                  value={stationery[key]}
                  onChange={(e) => setStationery({ ...stationery, [key]: e.target.value })}
                  placeholder={`Line ${n}`}
                  className="w-full rounded-md px-2 py-1.5 text-sm italic"
                  style={inputStyle}
                />
              );
            })}
          </div>

          {/* Contact stack (top-right) */}
          <div className="space-y-2 rounded-md p-3" style={{ background: "color-mix(in oklab, var(--dawn-gold-bright) 8%, transparent)" }}>
            <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: "color-mix(in oklab, var(--dawn-ink) 70%, transparent)" }}>
              Contact stack (top right)
            </p>
            <Field label="Domain">
              <input type="text" value={stationery.domain_url} onChange={(e) => setStationery({ ...stationery, domain_url: e.target.value })} placeholder="vondehnvisuals.com" className="w-full rounded-md px-2 py-1.5 text-sm" style={inputStyle} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="X (Twitter) URL">
                <input type="text" value={stationery.social_x_url} onChange={(e) => setStationery({ ...stationery, social_x_url: e.target.value })} placeholder="https://x.com/…" className="w-full rounded-md px-2 py-1.5 text-xs" style={inputStyle} />
              </Field>
              <Field label="Facebook URL">
                <input type="text" value={stationery.social_fb_url} onChange={(e) => setStationery({ ...stationery, social_fb_url: e.target.value })} placeholder="https://facebook.com/…" className="w-full rounded-md px-2 py-1.5 text-xs" style={inputStyle} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Email">
                <input type="text" value={stationery.contact_email} onChange={(e) => setStationery({ ...stationery, contact_email: e.target.value })} placeholder="you@gmail.com" className="w-full rounded-md px-2 py-1.5 text-xs" style={inputStyle} />
              </Field>
              <Field label="Phone">
                <input type="text" value={stationery.contact_phone} onChange={(e) => setStationery({ ...stationery, contact_phone: e.target.value })} placeholder="+1 …" className="w-full rounded-md px-2 py-1.5 text-xs" style={inputStyle} />
              </Field>
            </div>
          </div>

          <Field label="Custom signature HTML (optional — overrides default)">
            <textarea
              value={stationery.signature_block_html}
              onChange={(e) =>
                setStationery({ ...stationery, signature_block_html: e.target.value })
              }
              rows={3}
              placeholder="Leave empty for the default '— King Sean [seal]' layout"
              className="w-full rounded-md px-2 py-1.5 font-mono text-xs"
              style={inputStyle}
            />
          </Field>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--dawn-gold-bright), var(--dawn-ember))",
                color: "var(--dawn-ink)",
                fontFamily: "Cinzel, serif",
              }}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Seal Stationery
            </button>
            <button
              onClick={() => void refreshPreview()}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs uppercase tracking-[0.2em]"
              style={{
                background: "color-mix(in oklab, var(--dawn-deep) 15%, transparent)",
                color: "var(--dawn-ink)",
                border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
                fontFamily: "Cinzel, serif",
              }}
            >
              <Eye className="h-3.5 w-3.5" /> Refresh preview
            </button>
          </div>
        </div>

        {/* ── Preview column ────────────────────────────────────────── */}
        <div>
          <p
            className="mb-2 text-[10px] uppercase tracking-[0.3em]"
            style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
          >
            Live Preview
          </p>
          <div
            className="overflow-hidden rounded-lg"
            style={{
              border: "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
              background: "#0c0a06",
            }}
          >
            <iframe
              srcDoc={previewHtml}
              title="Stationery preview"
              className="h-[600px] w-full"
              style={{ background: "#fbf6e7" }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  background: "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
  border: "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
  color: "var(--dawn-ink)",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="mb-1 block text-[10px] uppercase tracking-[0.25em]"
        style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function AssetSlot({
  label,
  url,
  uploading,
  onClick,
  tint,
}: {
  label: string;
  url: string | null;
  uploading: boolean;
  onClick: () => void;
  tint?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg p-2 transition-all hover:-translate-y-0.5"
      style={{
        background: tint
          ? "color-mix(in oklab, var(--dawn-ember) 8%, var(--dawn-parchment))"
          : "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
        border: "1px dashed color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
      }}
    >
      {uploading ? (
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--dawn-ink)" }} />
      ) : url ? (
        <img src={url} alt={label} className="max-h-16 max-w-full object-contain" />
      ) : (
        <Upload className="h-5 w-5" style={{ color: "var(--dawn-ink)" }} />
      )}
      <span
        className="text-[10px] uppercase tracking-[0.2em]"
        style={{ color: "var(--dawn-ink)" }}
      >
        {url ? `Replace ${label}` : `Upload ${label}`}
      </span>
    </button>
  );
}
