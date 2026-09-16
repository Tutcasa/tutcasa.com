import type { Metadata } from "next";
import { CalendarGrid } from "@/components/admin/CalendarGrid";
import { isManager, managerLogoutAction } from "./actions";
import { ManagerLogin } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Management" },
  robots: { index: false, follow: false },
};

/**
 * Property-manager view: the all-in-one calendar behind its own password
 * (MANAGER_PASSWORD) — reservations, guest contacts, blocked dates and
 * nightly prices, with none of the admin's tools or links.
 */
export default async function ManagementPage({
  searchParams,
}: { searchParams: Promise<{ m?: string; q?: string; city?: string; status?: string }> }) {
  const sp = await searchParams;

  if (!(await isManager())) {
    return (
      <div className="px-4 py-16">
        <ManagerLogin />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">🗓️ All-in-one calendar</h1>
        <form action={managerLogoutAction}>
          <button className="rounded-pill border-[1.5px] border-line bg-paper px-4 py-1.5 text-xs font-bold text-grey hover:border-rosa hover:text-rosa">
            Log out
          </button>
        </form>
      </div>
      <p className="mb-4 max-w-3xl text-sm text-grey">
        Every home&rsquo;s month at a glance — hover a reservation for the
        guest&rsquo;s contact details. Blocked dates show as ×, open days show
        the nightly price.
      </p>
      <CalendarGrid {...sp} basePath="/management" linkHomes={false} />
    </div>
  );
}
