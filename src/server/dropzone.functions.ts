/**
 * Workshop Drop Zone — Phase 8.2.
 *
 * Routes any dropped file by extension and writes to a typed, purpose-built
 * curated store:
 *   .csv  → public.blog_archive       (WP-stats-shaped rows)
 *   .pdf  → public.legal_documents    (date_served anchor + heuristics)
 *   else  → csv_intakes (tool_key = 'unrecognized') for the King to triage
 *
 * Handlers run in TS on the Worker. The local Python courier still works
 * alongside via /api/public/workshop-intake.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { extractText, getDocumentProxy } from "unpdf";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { extractLegal } from "@/server/legal-extractors";

const MAX_BYTES = 6 * 1024 * 1024;

const DropInput = z.object({
  workshop_id: z.string().uuid(),
  filename: z.string().min(1).max(255),
  content_base64: z.string().min(1),
});

// ─── tiny CSV parser ───────────────────────────────────────────────────────
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cell += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); cell = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

// ─── CSV → blog_archive ────────────────────────────────────────────────────
type BlogRow = {
  title: string;
  url: string | null;
  published_at: string | null;
  excerpt: string;
  tags: string[];
  categories: string[];
  views: number | null;
  comments: number | null;
  wp_post_id: string | null;
  raw: Record<string, string>;
};

function toInt(s: string | undefined): number | null {
  if (!s) return null;
  const n = parseInt(s.replace(/[,\s]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function toIso(s: string | undefined): string | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function splitList(s: string | undefined): string[] {
  if (!s) return [];
  return s.split(/[,;|]/).map((t) => t.trim()).filter(Boolean).slice(0, 20);
}

function csvToBlogRows(csvText: string): { rows: BlogRow[]; raw_headers: string[] } {
  const rows = parseCSV(csvText);
  if (rows.length === 0) return { rows: [], raw_headers: [] };
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) =>
    headers.findIndex((h) => names.some((n) => h === n || h.includes(n)));

  const iTitle = idx(["title", "post title", "name"]);
  const iUrl = idx(["url", "link", "permalink", "address"]);
  const iDate = idx(["date", "published", "pub_date", "publishedat"]);
  const iExcerpt = idx(["excerpt", "summary", "description", "content"]);
  const iTags = idx(["tags", "keywords"]);
  const iCats = idx(["category", "categories", "section"]);
  const iViews = idx(["views", "hits", "visits", "pageviews"]);
  const iComments = idx(["comments"]);
  const iWpId = idx(["post_id", "postid", "id"]);

  const out: BlogRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const title = (iTitle >= 0 ? row[iTitle] : row[0]) ?? "";
    if (!title.trim()) continue;
    const raw: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const v = row[c];
      if (v && v.trim()) raw[headers[c]] = v.trim().slice(0, 2000);
    }
    out.push({
      title: title.trim().slice(0, 500),
      url: iUrl >= 0 && row[iUrl] ? row[iUrl].trim().slice(0, 2000) : null,
      published_at: iDate >= 0 ? toIso(row[iDate]) : null,
      excerpt: iExcerpt >= 0 ? (row[iExcerpt] ?? "").trim().slice(0, 2000) : "",
      tags: iTags >= 0 ? splitList(row[iTags]) : [],
      categories: iCats >= 0 ? splitList(row[iCats]) : [],
      views: iViews >= 0 ? toInt(row[iViews]) : null,
      comments: iComments >= 0 ? toInt(row[iComments]) : null,
      wp_post_id: iWpId >= 0 && row[iWpId] ? row[iWpId].trim().slice(0, 64) : null,
      raw,
    });
  }
  return { rows: out, raw_headers: headers };
}

// ─── processDroppedFile ────────────────────────────────────────────────────
export const processDroppedFile = createServerFn({ method: "POST" })
  .inputValidator((input) => DropInput.parse(input))
  .handler(async ({ data }) => {
    const { workshop_id, filename, content_base64 } = data;

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

    const { data: workshop } = await supabaseAdmin
      .from("workshops").select("id").eq("id", workshop_id).single();
    if (!workshop) return { ok: false as const, error: "Workshop not found." };

    const ext = (filename.split(".").pop() ?? "").toLowerCase();

    // ── CSV → blog_archive ──
    if (ext === "csv") {
      const text = new TextDecoder().decode(bytes);
      const { rows, raw_headers } = csvToBlogRows(text);
      if (rows.length === 0) {
        return {
          ok: false as const,
          error: "No usable rows found in the CSV (need at least a title column).",
        };
      }

      const { data: inserted, error } = await supabaseAdmin
        .from("blog_archive")
        .insert(
          rows.map((p) => ({
            workshop_id,
            source_filename: filename,
            title: p.title,
            url: p.url,
            published_at: p.published_at,
            excerpt: p.excerpt,
            tags: p.tags,
            categories: p.categories,
            views: p.views,
            comments: p.comments,
            wp_post_id: p.wp_post_id,
            raw: { ...p.raw, _raw_headers: raw_headers } as never,
          })),
        )
        .select("id");
      if (error) return { ok: false as const, error: error.message };

      // Mirror into the Scriptorium so the Steward can draft promo cards immediately.
      await supabaseAdmin.from("csv_intakes").insert({
        workshop_id,
        tool_key: "promo-cards",
        source: filename,
        origin: "dropzone",
        rows: rows.map((p) => ({
          title: p.title,
          url: p.url ?? undefined,
          excerpt: p.excerpt || undefined,
          tags: p.tags,
          views: p.views ?? undefined,
        })) as never,
        row_count: rows.length,
      });

      const summary = `${rows.length} blog post${rows.length === 1 ? "" : "s"} catalogued from ${filename}.`;
      return {
        ok: true as const,
        kind: "blog-archive" as const,
        inserted_count: inserted?.length ?? rows.length,
        summary,
      };
    }

    // ── PDF → legal_documents ──
    if (ext === "pdf") {
      let pageTexts: string[];
      let totalPages: number;
      try {
        const pdf = await getDocumentProxy(bytes);
        const res = await extractText(pdf, { mergePages: false });
        pageTexts = Array.isArray(res.text) ? res.text : [res.text];
        totalPages = res.totalPages;
      } catch (e) {
        return {
          ok: false as const,
          error: `Could not read the PDF: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
      const joined = pageTexts.join("\n\n");
      const extracted = extractLegal(joined, pageTexts[0] ?? "", filename);

      const { data: inserted, error } = await supabaseAdmin
        .from("legal_documents")
        .insert({
          workshop_id,
          source_filename: filename,
          source_bytes: bytes.byteLength,
          doc_title: extracted.doc_title,
          document_type: extracted.document_type,
          date_served: extracted.date_served,
          date_filed: extracted.date_filed,
          date_due: extracted.date_due,
          hearing_date: extracted.hearing_date,
          served_upon: extracted.served_upon,
          served_by: extracted.served_by,
          parties: extracted.parties,
          email_addresses: extracted.email_addresses,
          phone_numbers: extracted.phone_numbers,
          addresses: extracted.addresses,
          case_number: extracted.case_number,
          jurisdiction: extracted.jurisdiction,
          page_count: totalPages,
          extracted_clauses: extracted.extracted_clauses,
          raw: {
            pages: pageTexts.map((t, i) => ({
              page: i + 1,
              text: t.slice(0, 20000),
            })),
          } as never,
        })
        .select("id")
        .single();
      if (error) return { ok: false as const, error: error.message };

      const reviewNeeded = !extracted.date_served;
      const summary =
        `${extracted.doc_title} — ${extracted.document_type}, ${totalPages} page${totalPages === 1 ? "" : "s"}.` +
        (extracted.date_served
          ? ` Served ${new Date(extracted.date_served).toLocaleDateString()}.`
          : " ⚠ No service date found — needs review.");

      if (reviewNeeded) {
        await supabaseAdmin.from("csv_intakes").insert({
          workshop_id,
          tool_key: "legal-review",
          source: `Needs review: ${filename}`,
          origin: "dropzone",
          rows: [
            {
              legal_document_id: inserted.id,
              filename,
              reason: "Missing date_served",
            },
          ] as never,
          row_count: 1,
        });
      }

      return {
        ok: true as const,
        kind: "legal-document" as const,
        legal_document_id: inserted.id as string,
        needs_review: reviewNeeded,
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
        { filename, extension: ext || "(none)", size_bytes: bytes.byteLength },
      ] as never,
      row_count: 1,
    });
    return {
      ok: true as const,
      kind: "unrecognized" as const,
      summary: `Queued: ${label}. No handler is bound to .${ext || "(none)"} yet.`,
    };
  });

// ─── listBlogArchive ───────────────────────────────────────────────────────
export const listBlogArchive = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      workshop_id: z.string().uuid(),
      sort: z.enum(["recent", "top-views"]).default("recent"),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const q = supabaseAdmin
      .from("blog_archive")
      .select(
        "id, title, url, published_at, excerpt, tags, categories, views, comments, source_filename, created_at",
      )
      .eq("workshop_id", data.workshop_id)
      .limit(data.limit);
    const { data: rows, error } =
      data.sort === "top-views"
        ? await q.order("views", { ascending: false, nullsFirst: false })
        : await q.order("published_at", { ascending: false, nullsFirst: false });
    if (error) return { ok: false as const, error: error.message, posts: [] };
    return { ok: true as const, posts: rows ?? [] };
  });

// ─── listLegalDocuments ────────────────────────────────────────────────────
export const listLegalDocuments = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      workshop_id: z.string().uuid(),
      anchor: z.enum(["date_served", "hearing_date"]).default("date_served"),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("legal_documents")
      .select(
        "id, doc_title, document_type, date_served, date_filed, date_due, hearing_date, served_upon, served_by, parties, email_addresses, case_number, jurisdiction, page_count, source_filename, created_at",
      )
      .eq("workshop_id", data.workshop_id)
      .limit(data.limit);
    if (data.from) q = q.gte(data.anchor, data.from);
    if (data.to) q = q.lte(data.anchor, data.to);
    const { data: rows, error } = await q.order(data.anchor, {
      ascending: false,
      nullsFirst: false,
    });
    if (error) return { ok: false as const, error: error.message, documents: [] };
    return { ok: true as const, documents: rows ?? [] };
  });

// ─── legacy listers (Phase 8.1 — still serve old rows) ─────────────────────
export const listCuratedOutputs = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      workshop_id: z.string().uuid(),
      limit: z.number().int().min(1).max(50).optional(),
    }).parse(input),
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
