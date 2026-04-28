"use client";

import { useState } from "react";
import Link from "next/link";
import type { TileGroupDef } from "@/lib/roles";

// Group accent colors
const GROUP_COLORS: Record<string, string> = {
  "my-shift":   "text-brand-brass-300",
  "logs":       "text-sky-400",
  "financial":  "text-emerald-400",
  "resources":  "text-violet-400",
  "management": "text-amber-400",
};

const GROUP_BG: Record<string, string> = {
  "my-shift":   "bg-brand-brass-900/20 ring-brand-brass-500/20",
  "logs":       "bg-sky-900/20 ring-sky-500/20",
  "financial":  "bg-emerald-900/20 ring-emerald-500/20",
  "resources":  "bg-violet-900/20 ring-violet-500/20",
  "management": "bg-amber-900/20 ring-amber-500/20",
};

const GROUP_TILE_HOVER: Record<string, string> = {
  "my-shift":   "hover:ring-brand-brass-400/40 hover:bg-brand-brass-900/20",
  "logs":       "hover:ring-sky-400/40 hover:bg-sky-900/20",
  "financial":  "hover:ring-emerald-400/40 hover:bg-emerald-900/20",
  "resources":  "hover:ring-violet-400/40 hover:bg-violet-900/20",
  "management": "hover:ring-amber-400/40 hover:bg-amber-900/20",
};

interface HomeGroupsProps {
  groups: TileGroupDef[];
}

export function HomeGroups({ groups }: HomeGroupsProps) {
  // All groups start open
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(group: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {groups.map(({ group, label, tiles }) => {
        const isOpen = !collapsed.has(group);
        const accentText = GROUP_COLORS[group] ?? "text-brand-cream-300";
        const headerBg = GROUP_BG[group] ?? "bg-brand-moss-800/40 ring-brand-moss-600/20";
        const tileHover = GROUP_TILE_HOVER[group] ?? "hover:ring-brand-cream-700/40";

        return (
          <div key={group} className={`overflow-hidden rounded-2xl ring-1 ${headerBg}`}>
            {/* Group header — tap to collapse */}
            <button
              type="button"
              onClick={() => toggle(group)}
              className="flex w-full items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold uppercase tracking-widest ${accentText}`}>
                  {label}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-brand-cream-500">
                  {tiles.length}
                </span>
              </div>
              <svg
                className={`h-4 w-4 text-brand-cream-500 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Tiles */}
            {isOpen && (
              <div className="grid grid-cols-1 gap-px border-t border-white/5 sm:grid-cols-2 lg:grid-cols-3">
                {tiles.map((t) => (
                  <Link
                    key={t.feature}
                    href={t.href}
                    className={`flex flex-col gap-1 bg-brand-moss-800/40 px-5 py-4 ring-1 ring-transparent transition ${tileHover}`}
                  >
                    <span className="text-sm font-semibold text-brand-cream-100">
                      {t.label}
                    </span>
                    <span className="text-xs text-brand-cream-500 leading-snug">
                      {t.description}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
