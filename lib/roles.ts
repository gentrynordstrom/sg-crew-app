import type { Role } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  CAPTAIN: "Captain",
  DECKHAND: "Deckhand",
  MECHANIC: "Mechanic",
  ADMIN: "Admin",
};

export const ROLE_BADGE_CLASSES: Record<Role, string> = {
  CAPTAIN: "bg-blue-100 text-blue-900 ring-blue-200",
  DECKHAND: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  MECHANIC: "bg-amber-100 text-amber-900 ring-amber-200",
  ADMIN: "bg-purple-100 text-purple-900 ring-purple-200",
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
    href: "/coming-soon",
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
