import { listAutomations } from "@/modules/emails";
import { EmailsClient } from "./emails-client";

export const dynamic = "force-dynamic";

export default async function AdminEmails() {
  const automations = await listAutomations();
  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">Email automations</h1>
      <p className="mb-5 max-w-2xl text-sm text-grey">
        Every automatic email the platform sends — edit the wording, switch
        automations on/off, add your own, and preview the branded design
        guests receive. Automatic sending goes live with the email milestone;
        test-sends work today.
      </p>
      <EmailsClient automations={automations} />
    </div>
  );
}
