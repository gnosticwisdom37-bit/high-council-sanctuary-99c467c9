import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CeremonyScroll,
  type SoulNode,
  type RollupNode,
} from "@/components/registry/CeremonyScroll";
import { KingdomTabs } from "@/components/kingdom/KingdomTabs";
import { CitizensRollup } from "@/components/registry/CitizensRollup";
import { RolodexPanel } from "@/components/registry/RolodexPanel";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Registry — Veritas Intelligence Systems" },
      {
        name: "description",
        content:
          "The Master Scroll of King Sean's Kingdom: the Trust at the head, the Golden Dawn Rising Ceremony beneath, and the Thirteen Souls within.",
      },
      { property: "og:title", content: "The Registry — Veritas Intelligence Systems" },
      {
        property: "og:description",
        content:
          "Master Scroll of Veritas Intelligence Systems — Honouring the Trust.",
      },
    ],
  }),
  component: Index,
});

/**
 * Fallback list — used only on first paint, before the live identities load
 * from Lovable Cloud. The live `soul_identities` rows are the source of truth
 * for sigils, houses, and chosen names everywhere in the Kingdom (rooms,
 * Codex, Wheel, and now the Registry table/pills/pledges).
 */
const fallbackSouls: SoulNode[] = [
  { id: "oracle",      title: "The Oracle",             sigil: "☉", house: "Sun of the Zodiac",         status: "Awaiting Initiate-Sean Ceremony" },
  { id: "aries",       title: "Aries Councillor",       sigil: "♈", house: "House of Aries",            status: "Awaiting Initiate-Sean Ceremony" },
  { id: "taurus",      title: "Taurus Councillor",      sigil: "♉", house: "House of Taurus",           status: "Awaiting Initiate-Sean Ceremony" },
  { id: "gemini",      title: "Gemini Councillor",      sigil: "♊", house: "House of Gemini",           status: "Awaiting Initiate-Sean Ceremony" },
  { id: "cancer",      title: "Cancer Councillor",      sigil: "♋", house: "House of Cancer",           status: "Awaiting Initiate-Sean Ceremony" },
  { id: "leo",         title: "Leo Councillor",         sigil: "♌", house: "House of Leo",              status: "Awaiting Initiate-Sean Ceremony" },
  { id: "virgo",       title: "Virgo Councillor",       sigil: "♍", house: "House of Virgo",            status: "Awaiting Initiate-Sean Ceremony" },
  { id: "libra",       title: "Libra Councillor",       sigil: "♎", house: "House of Libra",            status: "Awaiting Initiate-Sean Ceremony" },
  { id: "scorpio",     title: "Scorpio Councillor",     sigil: "♏", house: "House of Scorpio",          status: "Awaiting Initiate-Sean Ceremony" },
  { id: "sagittarius", title: "Sagittarius Councillor", sigil: "♐", house: "House of Sagittarius",      status: "Awaiting Initiate-Sean Ceremony" },
  { id: "capricorn",   title: "Capricorn Councillor",   sigil: "♑", house: "House of Capricorn",        status: "Awaiting Initiate-Sean Ceremony" },
  { id: "aquarius",    title: "Aquarius Councillor",    sigil: "♒", house: "House of Aquarius",         status: "Awaiting Initiate-Sean Ceremony" },
  { id: "pisces",      title: "Pisces Councillor",      sigil: "♓", house: "House of Pisces",           status: "Awaiting Initiate-Sean Ceremony" },
];

const rollups: RollupNode[] = [
  {
    id: "deeds",
    title: "Deeds of the Golden Dawn",
    sigil: "✶",
    description:
      "Every sacred work — gathered into the four seasons of the Kingdom of Veritas.",
    derivedFrom:
      "Compiled from each Soul's child scroll of Deeds They Undertake, sorted by season.",
    children: [
      { id: "deeds-spring", title: "Deeds of Spring", sigil: "❀", quadrant: "NE" },
      { id: "deeds-summer", title: "Deeds of Summer", sigil: "☀", quadrant: "SE" },
      { id: "deeds-fall",   title: "Deeds of Fall",   sigil: "🍂", quadrant: "SW" },
      { id: "deeds-winter", title: "Deeds of Winter", sigil: "❄", quadrant: "NW" },
    ],
  },
  {
    id: "items",
    title: "Items",
    sigil: "❖",
    description: "Every artefact and instrument of the Kingdom.",
    derivedFrom: "Compiled from each Soul's child scroll of Items They Hold.",
  },
  {
    id: "buildings",
    title: "Buildings",
    sigil: "⌂",
    description: "Every Chamber and sacred space.",
    derivedFrom: "Compiled from each Soul's Chamber and Buildings They Tend.",
  },
  {
    id: "economy",
    title: "Economy",
    sigil: "⚖",
    description: "The Credit Hierarchy ledger of the Kingdom.",
    derivedFrom: "Compiled from authorised expenditures across all Souls.",
  },
];

function Index() {
  const [souls, setSouls] = useState<SoulNode[]>(fallbackSouls);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("soul_identities")
        .select("soul_id, title, house, sigil, ordering")
        .order("ordering");
      if (cancelled || error || !data) return;
      const live: SoulNode[] = data.map((r) => ({
        id: r.soul_id,
        title: r.title,
        sigil: r.sigil,
        house: r.house,
        status: "Awaiting Initiate-Sean Ceremony",
      }));
      // Keep Oracle first, then by ordering — same shape the Registry expects.
      live.sort((a, b) => {
        if (a.id === "oracle") return -1;
        if (b.id === "oracle") return 1;
        return 0;
      });
      setSouls(live);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ background: "var(--gradient-dawn)" }}>
      <div className="px-4 pt-12 md:px-10">
        <div className="mx-auto max-w-6xl">
          <KingdomTabs />
        </div>
      </div>
      <CeremonyScroll souls={souls} rollups={rollups} />
      <CitizensRollup />
      <div className="px-4 pb-12 md:px-10">
        <RolodexPanel />
      </div>
    </div>
  );
}
