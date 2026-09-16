import { CalendarGrid } from "@/components/admin/CalendarGrid";

export const dynamic = "force-dynamic";

export default async function AdminCalendar({
  searchParams,
}: { searchParams: Promise<{ m?: string; q?: string; city?: string; status?: string }> }) {
  const sp = await searchParams;
  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">All-in-one calendar</h1>
      <p className="mb-4 max-w-3xl text-sm text-grey">
        Every home&rsquo;s month at a glance — reservations (with guest &amp;
        group size), blocked dates, and the nightly price on open days.
        Click a home&rsquo;s name to open its own calendar and edit it.
      </p>
      <CalendarGrid {...sp} basePath="/admin/calendar" linkHomes />
    </div>
  );
}
