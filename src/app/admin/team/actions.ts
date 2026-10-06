"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, currentAdmin } from "@/lib/admin-auth";
import {
  createAdminUser, setAdminUserPassword, setAdminUserActive, deleteAdminUser,
} from "@/modules/admin-users";

export interface TeamState { ok: boolean; message: string }

export async function addTeamMemberAction(_prev: TeamState, fd: FormData): Promise<TeamState> {
  await requireAdmin();
  const me = await currentAdmin();
  const res = await createAdminUser({
    name: String(fd.get("name") ?? ""),
    email: String(fd.get("email") ?? ""),
    password: String(fd.get("password") ?? ""),
    createdBy: me?.name ?? "admin",
  });
  revalidatePath("/admin/team");
  return res.ok ? { ok: true, message: "Added — they can sign in at tutcasa.com/admin-login with this email and password." } : res;
}

export async function resetPasswordAction(_prev: TeamState, fd: FormData): Promise<TeamState> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "Unknown member." };
  return setAdminUserPassword(id, String(fd.get("password") ?? ""));
}

export async function setActiveAction(id: string, active: boolean): Promise<void> {
  await requireAdmin();
  await setAdminUserActive(id, active);
  revalidatePath("/admin/team");
}

export async function removeMemberAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteAdminUser(id);
  revalidatePath("/admin/team");
}
