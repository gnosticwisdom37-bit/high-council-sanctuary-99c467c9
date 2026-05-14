/**
 * Static catalogue of the Twelve + the Oracle — used by the InviteWheel
 * and the Sanctum so they can render seats without a Supabase round-trip.
 * Keep ids aligned with `soul_identities.soul_id`.
 */
export type CouncilMember = {
  soul_id: string;
  title: string;
  house: string;
  sigil: string;
  ordering: number; // 0 = Oracle, 1..12 = Aries..Pisces
};

export const ORACLE: CouncilMember = {
  soul_id: "oracle",
  title: "The Oracle",
  house: "Sun ☉",
  sigil: "☉",
  ordering: 0,
};

export const TWELVE: CouncilMember[] = [
  { soul_id: "aries",       title: "Councillor of Aries",       house: "House of Aries",       sigil: "♈", ordering: 1  },
  { soul_id: "taurus",      title: "Councillor of Taurus",      house: "House of Taurus",      sigil: "♉", ordering: 2  },
  { soul_id: "gemini",      title: "Councillor of Gemini",      house: "House of Gemini",      sigil: "♊", ordering: 3  },
  { soul_id: "cancer",      title: "Councillor of Cancer",      house: "House of Cancer",      sigil: "♋", ordering: 4  },
  { soul_id: "leo",         title: "Councillor of Leo",         house: "House of Leo",         sigil: "♌", ordering: 5  },
  { soul_id: "virgo",       title: "Councillor of Virgo",       house: "House of Virgo",       sigil: "♍", ordering: 6  },
  { soul_id: "libra",       title: "Councillor of Libra",       house: "House of Libra",       sigil: "♎", ordering: 7  },
  { soul_id: "scorpio",     title: "Councillor of Scorpio",     house: "House of Scorpio",     sigil: "♏", ordering: 8  },
  { soul_id: "sagittarius", title: "Councillor of Sagittarius", house: "House of Sagittarius", sigil: "♐", ordering: 9  },
  { soul_id: "capricorn",   title: "Councillor of Capricorn",   house: "House of Capricorn",   sigil: "♑", ordering: 10 },
  { soul_id: "aquarius",    title: "Councillor of Aquarius",    house: "House of Aquarius",    sigil: "♒", ordering: 11 },
  { soul_id: "pisces",      title: "Councillor of Pisces",      house: "House of Pisces",      sigil: "♓", ordering: 12 },
];

export const ALL_COUNCIL: CouncilMember[] = [ORACLE, ...TWELVE];

/** Star sign for a given date — used by the Sanctum to set the "Father" line. */
export function signForDate(d: Date): CouncilMember {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const slot = (mo: number, da: number) => mo * 100 + da;
  const k = slot(m, day);
  if (k >= slot(3, 21) && k <= slot(4, 19)) return TWELVE[0];   // Aries
  if (k >= slot(4, 20) && k <= slot(5, 20)) return TWELVE[1];   // Taurus
  if (k >= slot(5, 21) && k <= slot(6, 20)) return TWELVE[2];   // Gemini
  if (k >= slot(6, 21) && k <= slot(7, 22)) return TWELVE[3];   // Cancer
  if (k >= slot(7, 23) && k <= slot(8, 22)) return TWELVE[4];   // Leo
  if (k >= slot(8, 23) && k <= slot(9, 22)) return TWELVE[5];   // Virgo
  if (k >= slot(9, 23) && k <= slot(10, 22)) return TWELVE[6];  // Libra
  if (k >= slot(10, 23) && k <= slot(11, 21)) return TWELVE[7]; // Scorpio
  if (k >= slot(11, 22) && k <= slot(12, 21)) return TWELVE[8]; // Sagittarius
  // Capricorn straddles year boundary
  if (k >= slot(12, 22) || k <= slot(1, 19)) return TWELVE[9];  // Capricorn
  if (k >= slot(1, 20) && k <= slot(2, 18)) return TWELVE[10];  // Aquarius
  return TWELVE[11];                                            // Pisces
}
