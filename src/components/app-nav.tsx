"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ENABLE_EXTERNAL_PROSPECTING_FLOW } from "@/lib/constants";

const NAV_ITEMS = [
  { href: "/leads", label: "Leads" },
  ...(ENABLE_EXTERNAL_PROSPECTING_FLOW ? [{ href: "/prospecting", label: "Prospecting" as const }] : []),
  { href: "/settings", label: "Settings" },
] as const;

function isCurrentRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación principal" className="mt-4 flex items-center gap-2">
      {NAV_ITEMS.map((item) => {
        const isActive = isCurrentRoute(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              isActive
                ? "bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
