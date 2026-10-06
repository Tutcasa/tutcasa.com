import { listAdminUsers } from "@/modules/admin-users";
import { TeamClient } from "./team-client";

export const dynamic = "force-dynamic";

export default async function AdminTeam() {
  const users = await listAdminUsers();
  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">Team</h1>
      <p className="mb-5 max-w-2xl text-sm text-grey">
        Give each person their own admin login — unlimited. Everyone here has full admin access.
        Disabling or removing someone signs them out of admin immediately, without affecting anyone else.
      </p>
      <TeamClient users={users} />
    </div>
  );
}
