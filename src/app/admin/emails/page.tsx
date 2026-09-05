import { getDb } from "@/lib/db";
import { listAutomations } from "@/modules/emails";
import { EmailsClient } from "./emails-client";

export const dynamic = "force-dynamic";
// a broadcast sends one email per guest with rate-limit pacing — give the
// server action room to finish for larger audiences
export const maxDuration = 300;

export default async function AdminEmails() {
  const automations = await listAutomations();
  const listings = (
    await getDb().query("select id, title from listings order by title")
  ).rows as { id: string; title: string }[];
  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">Email automations</h1>
      <p className="mb-5 max-w-2xl text-sm text-grey">
        Every automatic email the platform sends — edit the wording, switch
        automations on/off, add your own, and preview the branded design
        guests receive. These emails send automatically on live bookings; you
        can also fire a test-send to yourself any time.
      </p>
      <EmailsClient automations={automations} listings={listings} />
    </div>
  );
}
