import { listLeads } from "@/modules/leads";
import { LeadsClient } from "./leads-client";

export const dynamic = "force-dynamic";

export default async function AdminLeads() {
  const leads = await listLeads();
  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">Leads</h1>
      <p className="mb-5 max-w-2xl text-sm text-grey">
        Every form submission from the site — contact messages, owners who want
        to list their property, loyalty referrals, partnership inquiries.
        You also get each one by email the moment it arrives.
      </p>
      <LeadsClient leads={leads} />
    </div>
  );
}
