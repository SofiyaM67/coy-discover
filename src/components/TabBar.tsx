"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/",
    label: "Home",
    icon: (
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z" />
    ),
  },
  {
    href: "/discover",
    label: "Discover",
    icon: (
      <>
        <rect x="6.5" y="3.5" width="11" height="15" rx="2.5" transform="rotate(8 12 11)" />
        <path d="M12 15.2s-3-1.8-3-3.9a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 2.1-3 3.9-3 3.9Z" />
      </>
    ),
  },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-colors ${
                  active ? "text-pink" : "text-muted hover:text-ink"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {tab.icon}
                </svg>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
