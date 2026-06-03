/**
 * Legal Document Extractors — pure functions, no I/O.
 *
 * Heuristic regex/keyword passes over the raw extracted text of a PDF.
 * Everything returned is "best-effort"; the Steward Soul can correct at
 * draft time. The `raw` jsonb column on legal_documents preserves the
 * full text so nothing is ever truly lost.
 */

export type LegalDocType =
  | "affidavit"
  | "notice"
  | "summons"
  | "motion"
  | "order"
  | "other";

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const uniq = <T>(arr: T[]) => Array.from(new Set(arr));

// ─── emails ─────────────────────────────────────────────────────────────────
export function extractEmails(text: string): string[] {
  const re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return uniq((text.match(re) ?? []).map((s) => s.toLowerCase())).slice(0, 50);
}

// ─── phone numbers (NANP + international common) ────────────────────────────
export function extractPhones(text: string): string[] {
  const re =
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}\b/g;
  const out: string[] = [];
  for (const m of text.match(re) ?? []) {
    const digits = m.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15) out.push(norm(m));
  }
  return uniq(out).slice(0, 30);
}

// ─── addresses (street-line heuristic) ──────────────────────────────────────
export function extractAddresses(text: string): string[] {
  const re =
    /\b\d{1,6}\s+[A-Z0-9][\w. '-]{0,60}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Parkway|Pkwy|Highway|Hwy|Place|Pl|Terrace|Ter|Square|Sq)\b[^,\n]{0,80}(?:,\s*[A-Z][\w .'-]{1,40}){0,3}(?:,?\s*[A-Z]{2}\s*\d{4,5})?/g;
  return uniq((text.match(re) ?? []).map((s) => norm(s))).slice(0, 20);
}

// ─── dates ─────────────────────────────────────────────────────────────────
// Match labeled dates anywhere in the doc. Returns ISO strings (best-effort).
const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
  sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10,
  dec: 11, december: 11,
};

function parseDateNear(snippet: string): string | null {
  // "January 5, 2024" / "Jan 5 2024" / "5 January 2024"
  const m1 = snippet.match(
    /\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/,
  );
  if (m1) {
    const mo = MONTHS[m1[1].toLowerCase()];
    if (mo !== undefined) {
      const d = new Date(Date.UTC(parseInt(m1[3]), mo, parseInt(m1[2])));
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  const m2 = snippet.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b/);
  if (m2) {
    const mo = MONTHS[m2[2].toLowerCase()];
    if (mo !== undefined) {
      const d = new Date(Date.UTC(parseInt(m2[3]), mo, parseInt(m2[1])));
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  // Numeric: 2024-01-05, 01/05/2024, 5/1/2024
  const m3 = snippet.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m3) {
    const d = new Date(Date.UTC(+m3[1], +m3[2] - 1, +m3[3]));
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  const m4 = snippet.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/);
  if (m4) {
    const y = +m4[3] < 100 ? 2000 + +m4[3] : +m4[3];
    // assume MM/DD/YYYY (US legal default); fall back if MM>12
    let mo = +m4[1] - 1;
    let day = +m4[2];
    if (mo > 11) {
      mo = +m4[2] - 1;
      day = +m4[1];
    }
    const d = new Date(Date.UTC(y, mo, day));
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

function dateForLabel(text: string, labels: RegExp): string | null {
  const m = text.match(labels);
  if (!m) return null;
  const start = (m.index ?? 0) + m[0].length;
  const window = text.slice(start, start + 120);
  return parseDateNear(window);
}

export function extractKeyDates(text: string): {
  date_served: string | null;
  date_filed: string | null;
  date_due: string | null;
  hearing_date: string | null;
} {
  return {
    date_served: dateForLabel(
      text,
      /\b(?:date\s+of\s+service|served\s+(?:on|upon)|service\s+date)\b[:\s-]{0,5}/i,
    ),
    date_filed: dateForLabel(
      text,
      /\b(?:filed(?:\s+on)?|date\s+filed|filing\s+date)\b[:\s-]{0,5}/i,
    ),
    date_due: dateForLabel(
      text,
      /\b(?:due(?:\s+(?:on|by))?|response\s+due|reply\s+by|deadline)\b[:\s-]{0,5}/i,
    ),
    hearing_date: dateForLabel(
      text,
      /\b(?:hearing(?:\s+date)?|return\s+date|appearance\s+date)\b[:\s-]{0,5}/i,
    ),
  };
}

// ─── served upon / served by ────────────────────────────────────────────────
export function extractServedUpon(text: string): string[] {
  const out: string[] = [];
  const re = /\bserved\s+upon\s+([^\n.;]{3,160})/gi;
  for (const m of text.matchAll(re)) out.push(norm(m[1]));
  // also "To:" lines (common service block)
  const re2 = /^\s*To\s*:\s*([^\n]{3,160})$/gim;
  for (const m of text.matchAll(re2)) out.push(norm(m[1]));
  return uniq(out).slice(0, 10);
}

export function extractServedBy(text: string): string | null {
  const m = text.match(/\bserved\s+by\s+([^\n.;]{3,160})/i);
  if (m) return norm(m[1]);
  const m2 = text.match(/^\s*From\s*:\s*([^\n]{3,160})$/im);
  return m2 ? norm(m2[1]) : null;
}

// ─── parties ───────────────────────────────────────────────────────────────
export function extractParties(text: string): string[] {
  const out: string[] = [];
  const re =
    /\b(plaintiff|defendant|petitioner|respondent|claimant|grantor|grantee|trustor|trustee|beneficiary|applicant)\b[:\s]+([A-Z][^\n,;]{2,120})/gi;
  for (const m of text.matchAll(re)) {
    out.push(`${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()}: ${norm(m[2])}`);
  }
  return uniq(out).slice(0, 20);
}

// ─── case number / jurisdiction ────────────────────────────────────────────
export function extractCaseNumber(text: string): string | null {
  const m = text.match(
    /\b(?:case\s*(?:no\.?|number)|docket\s*(?:no\.?|number)|file\s*no\.?)\s*[:#]?\s*([A-Z0-9][A-Z0-9\-\/.]{2,40})/i,
  );
  return m ? norm(m[1]) : null;
}

export function extractJurisdiction(text: string): string | null {
  const m = text.match(
    /\b(?:in the|before the)\s+([A-Z][A-Za-z .&,'-]{5,140}?\b(?:Court|Tribunal|Commission|Board)(?:\s+of\s+[A-Z][A-Za-z .&,'-]{2,60})?)/,
  );
  return m ? norm(m[1]) : null;
}

// ─── document type classifier ──────────────────────────────────────────────
export function classifyDocType(firstPage: string): LegalDocType {
  const head = firstPage.slice(0, 2000).toLowerCase();
  if (/\baffidavit\b|\bsworn statement\b|\bdeclaration of\b/.test(head)) return "affidavit";
  if (/\bsummons\b/.test(head)) return "summons";
  if (/\bnotice\s+(of|to)\b/.test(head)) return "notice";
  if (/\bmotion\s+(for|to)\b|\bnotice of motion\b/.test(head)) return "motion";
  if (/\border\b.*\b(granted|denied|directing|adjudged)\b|\bit is (?:hereby )?ordered\b/.test(head)) return "order";
  return "other";
}

// ─── extracted clauses (rough split) ───────────────────────────────────────
export function extractClauses(text: string): string[] {
  const re =
    /(?:^|\n)\s*(?:\d{1,3}\.\s+|WHEREAS[, ]|NOW,? THEREFORE[, ]|ARTICLE [IVX]+|SECTION \d+)[^\n]{40,400}/g;
  return (text.match(re) ?? [])
    .map((s) => norm(s).slice(0, 600))
    .slice(0, 40);
}

// ─── orchestrator ──────────────────────────────────────────────────────────
export type LegalExtraction = {
  doc_title: string;
  document_type: LegalDocType;
  date_served: string | null;
  date_filed: string | null;
  date_due: string | null;
  hearing_date: string | null;
  served_upon: string[];
  served_by: string | null;
  parties: string[];
  email_addresses: string[];
  phone_numbers: string[];
  addresses: string[];
  case_number: string | null;
  jurisdiction: string | null;
  extracted_clauses: string[];
};

export function extractLegal(
  fullText: string,
  firstPage: string,
  filename: string,
): LegalExtraction {
  const firstLine =
    fullText.split("\n").map((s) => s.trim()).find((s) => s.length > 0) ?? "";
  const doc_title =
    firstLine.length > 8 && firstLine.length < 160
      ? firstLine
      : filename.replace(/\.pdf$/i, "");
  const dates = extractKeyDates(fullText);
  return {
    doc_title,
    document_type: classifyDocType(firstPage),
    ...dates,
    served_upon: extractServedUpon(fullText),
    served_by: extractServedBy(fullText),
    parties: extractParties(fullText),
    email_addresses: extractEmails(fullText),
    phone_numbers: extractPhones(fullText),
    addresses: extractAddresses(fullText),
    case_number: extractCaseNumber(fullText),
    jurisdiction: extractJurisdiction(fullText),
    extracted_clauses: extractClauses(fullText),
  };
}
