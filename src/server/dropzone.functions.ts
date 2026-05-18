/**
 * Workshop Drop Zone — Phase 8.1.
 *
 * One server function accepts a dropped file, routes by extension,
 * runs the matching TypeScript handler, and writes a curated JSON
 * row to `curated_outputs`. Unknown extensions land in the intake
 * drawer as "Unrecognized File: <name>" so the King can decide what
 * tool to build (or assign) for them.
 *
 * Handler runtime is the Worker — Python CANNOT run here. The local
 * Python courier (workshop-intake) is unaffected and still useful
 * for bulk pre-processing on the King's machine.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { extractText, getDocumentProxy } from "unpdf";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// 6 MB cap on a single dropped file (base64-encoded payload over RPC).
const MAX_BYTES = 6 * 1024 * 1024;

const DropInput = z.object({
  workshop_id: z.string().uuid(),
  filename: z.string().min(1).max(255),
  // base64 string (no data: prefix)
  content_base64: z.string().min(1),
});

type CuratedKind = "blog-archive" | "legal-document";

// ─── tiny CSV parser (RFC4180-ish, handles quotes + newlines in quotes) ────
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(cell);
        cell = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell);
        cell = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else {
        cell += c;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

// ─── CSV → blog-archive ─────────────────────────────────────────────────────
type BlogPost = {
  title: string;
  url: string | null;
  date: string | null;
  excerpt: string;
  tags: string[];
};

function csvToBlogArchive(csvText: string): {
  posts: BlogPost[];
  raw_headers: string[];
} {
  const rows = parseCSV(csvText);
  if (rows.length === 0) return { posts: [], raw_headers: [] };
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) =>
    headers.findIndex((h) => names.some((n) => h === n || h.includes(n)));

  const iTitle = idx(["title", "post title", "name"]);
  const iUrl = idx(["url", "link", "permalink", "address"]);
  const iDate = idx(["date", "published", "pub_date", "publishedat"]);
  const iExcerpt = idx(["excerpt", "summary", "description", "content"]);
  const iTags = idx(["tags", "categories", "keywords"]);

  const posts: BlogPost[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const title = (iTitle >= 0 ? row[iTitle] : row[0]) ?? "";
    if (!title.trim()) continue;
    const tagsRaw = iTags >= 0 ? row[iTags] : "";
    posts.push({
      title: title.trim().slice(0, 500),
      url: iUrl >= 0 && row[iUrl] ? row[iUrl].trim().slice(0, 2000) : null,
      date: iDate >= 0 && row[iDate] ? row[iDate].trim().slice(0, 64) : null,
      excerpt: iExcerpt >= 0 ? (row[iExcerpt] ?? "").trim().slice(0, 2000) : "",
      tags: tagsRaw
        ? tagsRaw
            .split(/[,;|]/)
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 20)
        : [],
    });
  }
  return { posts, raw_headers: headers };
}

// ─── PDF → legal-document ───────────────────────────────────────────────────
type LegalDoc = {
  doc_title: string;
  page_count: number;
  pages: { page: number; text: string }[];
  extracted_clauses: string[];
  parties: string[];
};

// Heuristic party/clause scrape — Steward Soul can deepen later.
function scrapeLegal(allText: string): { parties: string[]; clauses: string[] } {
  const parties = new Set<string>();
  const partyRe =
    /\b(between|by and between|plaintiff|defendant|petitioner|respondent|claimant|grantor|grantee|trustor|trustee|beneficiary)\b[^.]{0,200}/gi;
  for (const m of allText.match(partyRe) ?? []) {
    parties.add(m.trim().replace(/\s+/g, " ").slice(0, 240));
    if (parties.size >= 12) break;
  }
  const clauses: string[] = [];
  // crude clause split: numbered or "WHEREAS" / "NOW, THEREFORE" lead-ins
  const clauseRe =
    /(?:^|\n)\s*(?:\d{1,3}\.\s+|WHEREAS[, ]|NOW,? THEREFORE[, ]|ARTICLE [IVX]+|SECTION \d+)[^\n]{40,400}/g;
  for (const m of allText.match(clauseRe) ?? []) {
    clauses.push(m.trim().replace(/\s+/g, " ").slice(0, 600));
    if (clauses.length >= 40) break;
  }
  return { parties: [...parties], clauses };
}

async function pdfToLegalDoc(
  bytes: Uint8Array,
  filename: string,
): Promise<LegalDoc> {
  const pdf = await getDocumentProxy(bytes);
  const { text, totalPages } = await extractText(pdf, { mergePages: false });
  const pageTexts = Array.isArray(text) ? text : [text];
  const joined = pageTexts.join("\n\n");
  const firstLine =
    joined.split("\n").map((s) => s.trim()).find((s) => s.length > 0) ?? "";
  const docTitle =
    firstLine.length > 8 && firstLine.length < 160
      ? firstLine
      : filename.replace(/\.pdf$/i, "");
  const { parties, clauses } = scrapeLegal(joined);
  return {
    doc_title: docTitle,
    page_count: totalPages,
    pages: pageTexts.map((t, i) => ({ page: i + 1, text: t.slice(0, 20000) })),
    extracted_clauses: clauses,
    parties,
  };
}

// ─── processDroppedFile ─────────────────────────────────────────────────────
export const processDroppedFile = createServerFn({ method: "POST" })
  .inputValidator((input) => DropInput.parse(input))
  .handler(async ({ data }) => {
    const { workshop_id, filename, content_base64 } = data;

    // decode + size guard
    let bytes: Uint8Array;
    try {
      const bin = atob(content_base64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      bytes = arr;
    } catch {
      return { ok: false as const, error: "Could not decode the file payload." };
    }
    if (bytes.byteLength > MAX_BYTES) {
      return {
        ok: false as const,
        error: `File too large (${Math.round(bytes.byteLength / 1024)} KB). Max ${MAX_BYTES / 1024 / 1024} MB.`,
      };
    }

    // confirm workshop exists
    const { data: workshop } = await supabaseAdmin
      .from("workshops")
      .select("id")
      .eq("id", workshop_id)
      .single();
    if (!workshop) return { ok: false as const, error: "Workshop not found." };

    const ext = (filename.split(".").pop() ?? "").toLowerCase();

    // ── CSV → blog-archive ──
    if (ext === "csv") {
      const text = new TextDecoder().decode(bytes);
      const { posts, raw_headers } = csvToBlogArchive(text);
      if (posts.length === 0) {
        return {
          ok: false as const,
          error: "No usable rows found in the CSV (need at least a title column).",
        };
      }
      const summary = `${posts.length} blog post${posts.length === 1 ? "" : "s"} curated from ${filename}.`;
      const { data: curated, error } = await supabaseAdmin
        .from("curated_outputs")
        .insert({
          workshop_id,
          kind: "blog-archive",
          source_filename: filename,
          source_bytes: bytes.byteLength,
          payload: { posts, raw_headers } as unknown as Record<string, unknown>,
          summary,
        })
        .select("id")
        .single();
      if (error) return { ok: false as const, error: error.message };

      // Mirror rows into the Scriptorium so the Steward can draft promo cards.
      await supabaseAdmin.from("csv_intakes").insert({
        workshop_id,
        tool_key: "promo-cards",
        source: filename,
        origin: "dropzone",
        rows: posts.map((p) => ({
          title: p.title,
          url: p.url ?? undefined,
          excerpt: p.excerpt || undefined,
          tags: p.tags,
        })) as unknown as Record<string, unknown>[],
        row_count: posts.length,
      });

      return {
        ok: true as const,
        kind: "blog-archive" as const,
        curated_id: curated.id as string,
        summary,
      };
    }

    // ── PDF → legal-document ──
    if (ext === "pdf") {
      let doc: LegalDoc;
      try {
        doc = await pdfToLegalDoc(bytes, filename);
      } catch (e) {
        return {
          ok: false as const,
          error: `Could not read the PDF: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
      const summary = `${doc.doc_title} — ${doc.page_count} page${doc.page_count === 1 ? "" : "s"}, ${doc.extracted_clauses.length} clause${doc.extracted_clauses.length === 1 ? "" : "s"} surfaced, ${doc.parties.length} part${doc.parties.length === 1 ? "y" : "ies"} named.`;
      const { data: curated, error } = await supabaseAdmin
        .from("curated_outputs")
        .insert({
          workshop_id,
          kind: "legal-document",
          source_filename: filename,
          source_bytes: bytes.byteLength,
          payload: doc as unknown as Record<string, unknown>,
          summary,
        })
        .select("id")
        .single();
      if (error) return { ok: false as const, error: error.message };
      return {
        ok: true as const,
        kind: "legal-document" as const,
        curated_id: curated.id as string,
        summary,
      };
    }

    // ── Unknown → intake drawer queue ──
    const label = `Unrecognized File: ${filename}`;
    await supabaseAdmin.from("csv_intakes").insert({
      workshop_id,
      tool_key: "unrecognized",
      source: label,
      origin: "dropzone",
      rows: [
        {
          filename,
          extension: ext || "(none)",
          size_bytes: bytes.byteLength,
        },
      ] as unknown as Record<string, unknown>[],
      row_count: 1,
    });

    return {
      ok: true as const,
      kind: "unrecognized" as const,
      summary: `Queued: ${label}. No handler is bound to .${ext || "(none)"} yet.`,
    };
  });

// ─── listCuratedOutputs ─────────────────────────────────────────────────────
export const listCuratedOutputs = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        workshop_id: z.string().uuid(),
        limit: z.number().int().min(1).max(50).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("curated_outputs")
      .select("id, kind, source_filename, source_bytes, summary, created_at")
      .eq("workshop_id", data.workshop_id)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 20);
    if (error) return { ok: false as const, error: error.message, curated: [] };
    return { ok: true as const, curated: rows ?? [] };
  });

// ─── listUnrecognized ───────────────────────────────────────────────────────
export const listUnrecognized = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ workshop_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("csv_intakes")
      .select("id, source, rows, created_at")
      .eq("workshop_id", data.workshop_id)
      .eq("tool_key", "unrecognized")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { ok: false as const, error: error.message, items: [] };
    return { ok: true as const, items: rows ?? [] };
  });
