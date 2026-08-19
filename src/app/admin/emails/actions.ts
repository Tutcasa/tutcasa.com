"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { sendTestEmail } from "@/modules/emails";
import { requireAdmin } from "@/lib/admin-auth";

export interface EmailFormState { ok: boolean; message: string }

const s = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export async function saveAutomationAction(
  _prev: EmailFormState,
  formData: FormData,
): Promise<EmailFormState> {
  await requireAdmin();
  const id = s(formData.get("id"));
  const subject = s(formData.get("subject"));
  const body = String(formData.get("body") ?? "").trim();
  if (!id || !subject || !body) return { ok: false, message: "Subject and body are required." };
  await getDb().query(
    `update email_automations
        set subject=$2, body=$3, offset_days=$4, updated_at=now()
      where id=$1`,
    [id, subject, body, Math.max(0, Number(formData.get("offsetDays")) || 0)],
  );
  revalidatePath("/admin/emails");
  return { ok: true, message: "Saved." };
}

export async function toggleAutomationAction(id: string): Promise<void> {
  await requireAdmin();
  await getDb().query(
    "update email_automations set enabled = not enabled, updated_at=now() where id=$1", [id]);
  revalidatePath("/admin/emails");
}

export async function addAutomationAction(
  _prev: EmailFormState,
  formData: FormData,
): Promise<EmailFormState> {
  await requireAdmin();
  const name = s(formData.get("name"));
  const subject = s(formData.get("subject"));
  if (!name || !subject) return { ok: false, message: "A name and subject are required." };
  const key = "custom_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "")
    + "_" + Math.random().toString(36).slice(2, 6);
  const trigger = s(formData.get("trigger")) || "custom";
  await getDb().query(
    `insert into email_automations
       (key, name, audience, trigger_event, offset_days, builtin, subject, body, sort)
     values ($1,$2,$3,$4,$5,false,$6,$7,500)`,
    [key, name,
     s(formData.get("audience")) === "admin" ? "admin" : "guest",
     trigger,
     Math.max(0, Number(formData.get("offsetDays")) || 0),
     subject,
     String(formData.get("body") ?? "").trim() || "Hola {{guest_name}},\n\n…"],
  );
  revalidatePath("/admin/emails");
  return { ok: true, message: `Automation "${name}" created.` };
}

export async function deleteAutomationAction(id: string): Promise<void> {
  await requireAdmin();
  // built-ins can only be disabled, never deleted
  await getDb().query(
    "delete from email_automations where id=$1 and builtin=false", [id]);
  revalidatePath("/admin/emails");
}

export async function sendTestAction(
  _prev: EmailFormState,
  formData: FormData,
): Promise<EmailFormState> {
  await requireAdmin();
  const key = s(formData.get("key"));
  const to = s(formData.get("to"));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, message: "Enter a valid email address." };
  return sendTestEmail(key, to);
}
