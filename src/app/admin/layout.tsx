import type { Metadata } from "next";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <aside className="md:sticky md:top-6 md:w-[236px] md:shrink-0">
          <div className="rounded-2xl bg-ink p-3">
            <div className="mb-3 px-3 pt-1">
              <span className="text-xs font-extrabold uppercase tracking-wide text-white/60">
                TutCasa Admin
              </span>
            </div>
            <AdminNav />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
