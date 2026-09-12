import { listLeads } from "@/modules/leads";
import { LeadsClient } from "./leads-client";

export const dynamic = "force-dynamic";

export default async function AdminLeads() {
  const leads = await listLeads();
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Leads</h1>
        <a href="/admin/leads/export"
          className="rounded-pill border-[1.5px] border-cactus px-4 py-2 text-sm font-bold text-cactus hover:bg-cactus hover:text-white">
          ⬇ Download Excel
        </a>
      </div>
      <p className="mb-5 max-w-2xl text-sm text-grey">
        Every form submission from the site — contact messages, owners who want
        to list their property, loyalty referrals, partnership inquiries.
        You also get each one by email the moment it arrives.
      </p>
      <LeadsClient leads={leads} />
    </div>
  );
}
