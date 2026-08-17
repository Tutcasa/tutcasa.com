"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Overview", icon: "\u{1F4CA}" },
  { href: "/admin/bookings", label: "Stay bookings", icon: "\u{1F4C5}" },
  { href: "/admin/tour-bookings", label: "Tour bookings", icon: "\u{1F3DD}\u{FE0F}" },
  { href: "/admin/transfers", label: "Airport transfers", icon: "\u{1F690}" },
  { href: "/admin/invoices", label: "Invoices", icon: "\u{1F9FE}" },
  { href: "/admin/orders", label: "Payments & orders", icon: "\u{1F4B3}" },
  { href: "/admin/coupons", label: "Coupons", icon: "\u{1F3F7}\u{FE0F}" },
  { href: "/admin/analytics", label: "Analytics", icon: "\u{1F4C8}" },
  { href: "/admin/listings", label: "Stays & homes", icon: "\u{1F3E0}" },
  { href: "/admin/tours", label: "Tours & parks", icon: "\u{1F3A1}" },
  { href: "/admin/content", label: "Content & info", icon: "\u{1F4DD}" },
  { href: "/admin/emails", label: "Email automations", icon: "\u{1F4E8}" },
  { href: "/admin/notifications", label: "Notifications log", icon: "\u{2709}\u{FE0F}" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminNav() {
  const pathname = usePathname() || "/admin";
  return (
    <nav aria-label="Admin sections" className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors " +
              (active
                ? "bg-rosa text-white"
                : "text-white/80 hover:bg-white/10 hover:text-white")
            }
          >
            <span aria-hidden className="text-base leading-none">{n.icon}</span>
            <span>{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
