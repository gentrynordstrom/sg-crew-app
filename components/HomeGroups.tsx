"use client";

import { useState } from "react";
import Link from "next/link";
import type { TileGroupDef } from "@/lib/roles";

interface HomeGroupsProps {
  groups: TileGroupDef[];
}

export function HomeGroups({ groups }: HomeGroupsProps) {
  // All groups start collapsed
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(groups.map((g) => g.group))
  );

  function toggle(group: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {groups.map(({ group, label, tiles }) => {
        const isOpen = !collapsed.has(group);

        return (
          <div
            key={group}
            className="overflow-hidden rounded-xl border border-brand-moss-500/40 bg-brand-moss-800/40"
          >
            {/* Group header — tap to collapse */}
            <button
              type="button"
              onClick={() => toggle(group)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-brand-moss-700/30"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-brand-cream-100">{label}</span>
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
              <div className="grid grid-cols-1 gap-2 border-t border-white/5 p-3 sm:grid-cols-2 lg:grid-cols-3">
                {tiles.map((t) => (
                  <Link
                    key={t.feature}
                    href={t.href}
                    className="flex flex-col gap-1 rounded-lg border border-brand-moss-500/35 bg-brand-moss-800/35 px-4 py-3 transition hover:border-brand-brass-400/40 hover:bg-brand-moss-700/30"
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
