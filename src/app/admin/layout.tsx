import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminNav } from "./admin-nav";
import { currentAdmin } from "@/lib/admin-auth";
import { logoutAction } from "../admin-login/actions";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // a disabled/removed team member keeps a valid-looking cookie until it
  // expires — the database decides here, on every admin page
  const me = await currentAdmin();
  if (!me) redirect("/admin-login");
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
            <div className="mt-3 border-t border-white/10 px-3 pb-1 pt-3 text-xs text-white/60">
              Signed in as <b className="text-white/90">{me.name}</b>
              <form action={logoutAction}>
                <button className="mt-1 font-bold text-white/80 underline-offset-2 hover:text-white hover:underline">Log out</button>
              </form>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
