import type { Role } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  CAPTAIN: "Captain",
  DECKHAND: "Deckhand",
  MECHANIC: "Mechanic",
  HOSPITALITY: "Hospitality",
  ADMIN: "Admin",
};

/**
 * Badge color styles tuned for the moss/cream brand palette — muted earth
 * tones that sit comfortably on a dark moss background without clashing.
 */
export const ROLE_BADGE_CLASSES: Record<Role, string> = {
  CAPTAIN:
    "bg-sky-900/50 text-sky-100 ring-sky-300/40",
  DECKHAND:
    "bg-emerald-900/50 text-emerald-100 ring-emerald-300/40",
  MECHANIC:
    "bg-amber-900/50 text-amber-100 ring-amber-300/40",
  HOSPITALITY:
    "bg-rose-900/50 text-rose-100 ring-rose-300/40",
  ADMIN:
    "bg-brand-brass-700/50 text-brand-brass-100 ring-brand-brass-300/40",
};

export type Feature =
  | "cruise-log"
  | "cleaning-log"
  | "maintenance-log"
  | "transactions"
  | "time-tracking"
  | "sops"
  | "chatbot"
  | "admin";

interface TileDef {
  feature: Feature;
  label: string;
  description: string;
  href: string;
}

const ALL_TILES: TileDef[] = [
  {
    feature: "cruise-log",
    label: "Cruise Log",
    description: "Captain's log entries for each cruise.",
    href: "/coming-soon",
  },
  {
    feature: "cleaning-log",
    label: "Cleaning Log",
    description: "Track boat cleanings and turnovers.",
    href: "/coming-soon",
  },
  {
    feature: "maintenance-log",
    label: "Maintenance Log",
    description: "Mechanical work, repairs, and service.",
    href: "/coming-soon",
  },
  {
    feature: "transactions",
    label: "Transactions",
    description: "Receipts and expense tracking.",
    href: "/coming-soon",
  },
  {
    feature: "time-tracking",
    label: "Time Tracking",
    description: "Clock in and out of shifts.",
    href: "/time",
  },
  {
    feature: "sops",
    label: "SOPs",
    description: "Standard operating procedures.",
    href: "/coming-soon",
  },
  {
    feature: "chatbot",
    label: "Chatbot",
    description: "Ask questions about SOPs and logs.",
    href: "/coming-soon",
  },
  {
    feature: "admin",
    label: "Admin",
    description: "Manage users and roles.",
    href: "/admin/users",
  },
];

const ROLE_FEATURES: Record<Role, Feature[]> = {
  CAPTAIN: [
    "cruise-log",
    "cleaning-log",
    "maintenance-log",
    "transactions",
    "time-tracking",
    "sops",
    "chatbot",
  ],
  DECKHAND: [
    "cleaning-log",
    "maintenance-log",
    "transactions",
    "time-tracking",
    "sops",
    "chatbot",
  ],
  MECHANIC: [
    "maintenance-log",
    "transactions",
    "time-tracking",
    "sops",
    "chatbot",
  ],
  HOSPITALITY: [
    "transactions",
    "time-tracking",
    "sops",
    "chatbot",
  ],
  ADMIN: [
    "cruise-log",
    "cleaning-log",
    "maintenance-log",
    "transactions",
    "time-tracking",
    "sops",
    "chatbot",
    "admin",
  ],
};

export function tilesForRole(role: Role): TileDef[] {
  const allowed = new Set(ROLE_FEATURES[role]);
  return ALL_TILES.filter((t) => allowed.has(t.feature));
}
