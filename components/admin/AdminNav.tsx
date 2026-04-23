"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/timesheets", label: "Timesheets" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-1 rounded-full border border-brand-moss-500/40 bg-brand-moss-800/60 p-1 text-sm font-medium">
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              active
                ? "rounded-full bg-brand-brass-400 px-4 py-1.5 text-brand-moss-800"
                : "rounded-full px-4 py-1.5 text-brand-cream-300 hover:text-brand-brass-200"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
