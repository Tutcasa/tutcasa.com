"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";

const NAV = [
  { href: "/stays", label: "Stays", icon: "🏠" },
  { href: "/tours", label: "Tours & Parks", icon: "🎡" },
  { href: "/concierge", label: "Concierge", icon: "🛠️" },
  { href: "/our-family", label: "Our Family", icon: "💕" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="mx-auto flex h-[72px] max-w-[1180px] items-center gap-4 px-4 sm:px-6">
        <Logo />

        {/* desktop nav */}
        <nav className="mx-auto hidden gap-1 text-[15px] font-semibold md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="inline-flex items-center gap-1.5 rounded-pill px-3.5 py-2 hover:bg-crema hover:text-rosa"
            >
              <span aria-hidden>{n.icon}</span> {n.label}
            </Link>
          ))}
        </nav>

        {/* right cluster — burger pinned to the far right on mobile */}
        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href="/stays"
            className="hidden rounded-pill bg-rosa px-5 py-2.5 text-sm font-bold text-white shadow-soft hover:bg-rosa-deep md:inline-block"
          >
            Find a casa
          </Link>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-2xl border-[1.5px] border-line bg-paper text-ink hover:border-rosa hover:text-rosa md:hidden"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-6 w-6">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </div>
      </div>

      {/* mobile drawer */}
      <div
        className={`fixed inset-0 z-50 bg-ink/45 transition-opacity md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        className={`fixed bottom-0 right-0 top-0 z-50 flex w-[86%] max-w-[360px] flex-col gap-1 overflow-y-auto bg-paper p-4 shadow-lift transition-transform md:hidden ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-label="Menu"
      >
        <div className="mb-2 flex items-center justify-between">
          <Logo />
          <button
            className="h-10 w-10 rounded-xl border-[1.5px] border-line bg-white text-xl leading-none text-ink hover:border-rosa hover:text-rosa"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold hover:bg-crema hover:text-rosa"
          >
            <span aria-hidden>{n.icon}</span> {n.label}
          </Link>
        ))}
        <hr className="my-2 border-line" />
        <Link
          href="/stays"
          onClick={() => setOpen(false)}
          className="rounded-pill bg-rosa px-5 py-3 text-center font-bold text-white"
        >
          Find a casa
        </Link>
      </div>
    </header>
  );
}
