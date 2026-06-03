/**
 * Trigger Engine — Phase 5.5
 *
 * Pure detectors, no I/O. Used by speakAsSoul to recognize King-spoken
 * intentions and route them to the correct domain table (Deeds first;
 * Items, Buildings, Trust later use the same pattern).
 */

export type Season = "spring" | "summer" | "fall" | "winter";
export type Quadrant = "NE" | "SE" | "SW" | "NW";

export const SEASON_TO_QUADRANT: Record<Season, Quadrant> = {
  spring: "NE",
  summer: "SE",
  fall: "SW",
  winter: "NW",
};

/** Today's astrological season. April 30, 2026 → Taurus → Spring. */
export function currentSeason(): Season {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  // Northern hemisphere astrological seasons (approx)
  // Spring: Mar 20 – Jun 20
  // Summer: Jun 21 – Sep 22
  // Fall:   Sep 23 – Dec 20
  // Winter: Dec 21 – Mar 19
  if ((m === 3 && d >= 20) || m === 4 || m === 5 || (m === 6 && d <= 20)) return "spring";
  if ((m === 6 && d >= 21) || m === 7 || m === 8 || (m === 9 && d <= 22)) return "summer";
  if ((m === 9 && d >= 23) || m === 10 || m === 11 || (m === 12 && d <= 20)) return "fall";
  return "winter";
}

const SEASON_WORDS: Record<Season, RegExp> = {
  spring: /\bspring\b/i,
  summer: /\bsummer\b/i,
  fall: /\b(?:fall|autumn)\b/i,
  winter: /\bwinter\b/i,
};

function detectSeason(text: string): Season | null {
  for (const s of Object.keys(SEASON_WORDS) as Season[]) {
    if (SEASON_WORDS[s].test(text)) return s;
  }
  return null;
}

/**
 * Trim & condense a deed description into a short title (max ~60 chars).
 * Strips trailing punctuation; capitalises first letter.
 */
function summariseTitle(text: string): string {
  let t = text.trim().replace(/\s+/g, " ");
  // Cut at first sentence-ender if reasonably short
  const cut = t.search(/[.!?]/);
  if (cut > 8 && cut < 80) t = t.slice(0, cut);
  if (t.length > 60) t = t.slice(0, 57).trimEnd() + "…";
  if (t.length === 0) t = "Untitled Deed";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export type DeedIntent = {
  season: Season;
  seasonExplicit: boolean; // false → defaulted to current season
  quadrant: Quadrant;
  description: string;
  title: string;
};

/**
 * Detect a Deed-inscription intent in a King-spoken message.
 *
 * Matches phrases like:
 *   - "Create a Deed for Summer to plant the orchard"
 *   - "Inscribe a Deed for Spring: prepare the seed-vault"
 *   - "Let it be a Deed of Fall — gather the harvest scrolls"
 *   - "Decree a Winter Deed: tend the hearth"
 *   - "Record a Deed — mend the bridge"
 *
 * Pattern: action verb + "Deed" + (optional season) + body (after :, —, -, or "to").
 * Returns null if no trigger is detected.
 */
export function detectDeedIntent(rawText: string): DeedIntent | null {
  if (!rawText || typeof rawText !== "string") return null;

  // Match the action-verb + "deed" anchor. Body capture is everything after.
  const verbAnchor =
    /\b(?:create|inscribe|decree|record|let\s+(?:it|there|this)\s+be|let\s+(?:it|there|this)\s+be(?:\s+(?:a|an))?)\b[^.!?\n]{0,80}?\bdeed\b([^]*?)$/im;
  const match = rawText.match(verbAnchor);
  if (!match) return null;

  // Trailing portion after the word "Deed"
  let after = match[1] ?? "";

  // Strip a leading season clause if present (e.g. "for Summer", "of Fall", "in Winter")
  // We detect season anywhere in the matched span (whole match) to be robust.
  const wholeMatch = match[0];
  const detectedSeason = detectSeason(wholeMatch);

  // Cut leading connectors: "for Summer:", "of Fall —", "in Winter -", " to ", colon, dash
  after = after
    .replace(/^\s*(?:for|of|in)\s+(?:spring|summer|fall|autumn|winter)\b/i, "")
    .replace(/^[\s,;:—\-]+/, "")
    .replace(/^\s*to\s+/i, "")
    .trim();

  // If body is empty, the King didn't actually inscribe anything — bail.
  if (after.length < 4) return null;

  const season = detectedSeason ?? currentSeason();
  return {
    season,
    seasonExplicit: detectedSeason !== null,
    quadrant: SEASON_TO_QUADRANT[season],
    description: after,
    title: summariseTitle(after),
  };
}

export const SEASON_LABEL: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

export const SEASON_SIGIL: Record<Season, string> = {
  spring: "❀",
  summer: "☀",
  fall: "🍂",
  winter: "❄",
};

// ---------------------------------------------------------------------------
// Phase 5.6 — Item & Building intents (same engine, new destinations)
// ---------------------------------------------------------------------------

export type ItemIntent = {
  description: string;
  title: string;
};

export type BuildingIntent = {
  description: string;
  title: string;
};

/**
 * Detect an Item-forging intent.
 *
 * Matches phrases like:
 *   - "Forge an Item: a chalice of clear seeing"
 *   - "Craft an Item — the silver compass"
 *   - "Bestow an Item to me: a quill that never runs dry"
 *   - "Create an Item — the lantern of patience"
 *   - "Let it be an Item: the ring of remembrance"
 */
export function detectItemIntent(rawText: string): ItemIntent | null {
  if (!rawText || typeof rawText !== "string") return null;
  const verbAnchor =
    /\b(?:forge|craft|bestow|create|inscribe|let\s+(?:it|there|this)\s+be(?:\s+(?:a|an))?)\b[^.!?\n]{0,80}?\bitem\b([^]*?)$/im;
  const match = rawText.match(verbAnchor);
  if (!match) return null;

  let after = (match[1] ?? "")
    .replace(/^\s*(?:to|for)\s+(?:me|the\s+king|us)\b/i, "")
    .replace(/^[\s,;:—\-]+/, "")
    .replace(/^\s*(?:called|named|titled)\s+/i, "")
    .replace(/^\s*to\s+/i, "")
    .trim();

  if (after.length < 4) return null;
  return { description: after, title: summariseTitle(after) };
}

/**
 * Detect a Building-raising intent.
 *
 * Matches phrases like:
 *   - "Raise a Building: an observatory at the Realm's eastern edge"
 *   - "Build a Building — the hall of memoirs"
 *   - "Erect a Building: the orchard tower"
 *   - "Construct a Building — the bridge of three rivers"
 *   - "Let there be a Building: the seed-vault"
 */
export function detectBuildingIntent(rawText: string): BuildingIntent | null {
  if (!rawText || typeof rawText !== "string") return null;
  const verbAnchor =
    /\b(?:raise|build|erect|construct|create|inscribe|let\s+(?:it|there|this)\s+be(?:\s+(?:a|an))?)\b[^.!?\n]{0,80}?\bbuilding\b([^]*?)$/im;
  const match = rawText.match(verbAnchor);
  if (!match) return null;

  let after = (match[1] ?? "")
    .replace(/^[\s,;:—\-]+/, "")
    .replace(/^\s*(?:called|named|titled)\s+/i, "")
    .replace(/^\s*to\s+/i, "")
    .trim();

  if (after.length < 4) return null;
  return { description: after, title: summariseTitle(after) };
}
