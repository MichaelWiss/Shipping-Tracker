"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Command Center", href: "/" },
  { label: "Fleet Map", href: "/map" },
  { label: "Voyages", href: "/voyages" },
  { label: "Fuel", href: "/fuel" },
  { label: "Environment", href: "/environment" },
  { label: "Scenarios", href: "/scenarios" },
  { label: "Analytics", href: "/analytics" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-3 left-3 z-50 flex h-9 w-9 items-center justify-center border border-rule-lt bg-panel md:hidden"
        aria-label="Toggle navigation"
      >
        <svg
          width="16"
          height="12"
          viewBox="0 0 16 12"
          className="text-ink"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          {open ? (
            <>
              <line x1="2" y1="1" x2="14" y2="11" />
              <line x1="14" y1="1" x2="2" y2="11" />
            </>
          ) : (
            <>
              <line x1="0" y1="1" x2="16" y2="1" />
              <line x1="0" y1="6" x2="16" y2="6" />
              <line x1="0" y1="11" x2="16" y2="11" />
            </>
          )}
        </svg>
      </button>

      {/* Overlay backdrop on mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 flex h-full w-52 flex-col border-r border-rule bg-cream
          transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Masthead */}
        <div className="border-b border-rule px-4 pt-4 pb-3">
          <div className="rule-ink mb-2" />
          <Link href="/" className="block" onClick={() => setOpen(false)}>
            <span className="text-[15px] leading-tight tracking-tight text-ink">
              Shipping Tracker
            </span>
          </Link>
          <span className="mt-1 block font-mono text-[7.5px] uppercase tracking-[0.18em] text-ink-3">
            Fleet Operations
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 pt-3">
          {NAV_ITEMS.map(({ label, href }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`
                  mb-0.5 flex items-baseline gap-2 rounded-sm px-2 py-1.5
                  font-mono text-[9px] uppercase tracking-[0.10em]
                  transition-colors duration-100
                  ${
                    active
                      ? "bg-ink text-cream"
                      : "text-ink-2 hover:bg-cream-2 hover:text-ink"
                  }
                `}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer rule */}
        <div className="border-t border-rule-lt px-4 py-3">
          <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-ink-3">
            v0.1 · prototype
          </span>
        </div>
      </aside>
    </>
  );
}
