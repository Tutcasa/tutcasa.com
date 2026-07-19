import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/bookings", label: "Stay bookings" },
  { href: "/admin/tour-bookings", label: "Tour bookings" },
  { href: "/admin/tours", label: "Tours & parks" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-2 rounded-pill bg-ink px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white">
          Admin
        </span>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="rounded-pill border-[1.5px] border-line bg-paper px-4 py-2 text-sm font-bold hover:border-rosa hover:text-rosa"
          >
            {n.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
