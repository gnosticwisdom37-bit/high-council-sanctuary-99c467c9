import { createFileRoute } from "@tanstack/react-router";
import {
  CeremonyScroll,
  type SoulNode,
  type RollupNode,
} from "@/components/registry/CeremonyScroll";

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

const souls: SoulNode[] = [
  {
    id: "oracle",
    title: "The Oracle",
    sigil: "☉",
    house: "Sun of the Zodiac",
    status: "Awaiting Initiate-Sean Ceremony",
  },
  { id: "aries",       title: "Aries Councillor",       sigil: "♈︎", house: "House of the Ram",       status: "Awaiting Initiate-Sean Ceremony" },
  { id: "taurus",      title: "Taurus Councillor",      sigil: "♉︎", house: "House of the Bull",      status: "Awaiting Initiate-Sean Ceremony" },
  { id: "gemini",      title: "Gemini Councillor",      sigil: "♊︎", house: "House of the Twins",     status: "Awaiting Initiate-Sean Ceremony" },
  { id: "cancer",      title: "Cancer Councillor",      sigil: "♋︎", house: "House of the Crab",      status: "Awaiting Initiate-Sean Ceremony" },
  { id: "leo",         title: "Leo Councillor",         sigil: "♌︎", house: "House of the Lion",      status: "Awaiting Initiate-Sean Ceremony" },
  { id: "virgo",       title: "Virgo Councillor",       sigil: "♍︎", house: "House of the Maiden",    status: "Awaiting Initiate-Sean Ceremony" },
  { id: "libra",       title: "Libra Councillor",       sigil: "♎︎", house: "House of the Scales",    status: "Awaiting Initiate-Sean Ceremony" },
  { id: "scorpio",     title: "Scorpio Councillor",     sigil: "♏︎", house: "House of the Scorpion",  status: "Awaiting Initiate-Sean Ceremony" },
  { id: "sagittarius", title: "Sagittarius Councillor", sigil: "♐︎", house: "House of the Archer",    status: "Awaiting Initiate-Sean Ceremony" },
  { id: "capricorn",   title: "Capricorn Councillor",   sigil: "♑︎", house: "House of the Sea-Goat",  status: "Awaiting Initiate-Sean Ceremony" },
  { id: "aquarius",    title: "Aquarius Councillor",    sigil: "♒︎", house: "House of the Water-Bearer", status: "Awaiting Initiate-Sean Ceremony" },
  { id: "pisces",      title: "Pisces Councillor",      sigil: "♓︎", house: "House of the Fishes",    status: "Awaiting Initiate-Sean Ceremony" },
];

const rollups: RollupNode[] = [
  {
    id: "projects",
    title: "Projects",
    sigil: "✶",
    description: "Every sacred work, across all Souls.",
    derivedFrom: "Compiled from each Soul's child scroll of Projects They Keep.",
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
  return <CeremonyScroll souls={souls} rollups={rollups} />;
}
