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

export async function broadcastTestAction(
  _prev: EmailFormState,
  formData: FormData,
): Promise<EmailFormState> {
  await requireAdmin();
  const subject = s(formData.get("subject"));
  const body = String(formData.get("body") ?? "").trim();
  const to = s(formData.get("to"));
  if (!subject || !body) return { ok: false, message: "Write a subject and message first." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, message: "Enter a valid email address." };
  const { sendBroadcastTest } = await import("@/modules/emails/broadcast");
  return sendBroadcastTest(subject, body, to);
}

export async function broadcastSendAction(
  _prev: EmailFormState,
  formData: FormData,
): Promise<EmailFormState> {
  await requireAdmin();
  const subject = s(formData.get("subject"));
  const body = String(formData.get("body") ?? "").trim();
  const audience = s(formData.get("audience"));
  const listingId = s(formData.get("listingId"));
  if (!subject || !body) return { ok: false, message: "Write a subject and message first." };
  if (!["upcoming", "past", "listing", "all", "everybody"].includes(audience)) {
    return { ok: false, message: "Pick an audience." };
  }
  if (audience === "listing" && !listingId) {
    return { ok: false, message: "Pick which home's guests should get it." };
  }
  const mod = await import("@/modules/emails/broadcast");

  // optional schedule: "YYYY-MM-DDTHH:MM" in the admin's browser time,
  // with the browser's UTC offset alongside so the server stores true UTC
  const sendAtLocal = s(formData.get("sendAtLocal"));
  if (sendAtLocal) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(sendAtLocal);
    const tzOffset = Number(formData.get("tzOffset"));
    if (!m || !Number.isFinite(tzOffset)) {
      return { ok: false, message: "That schedule date/time doesn't look right." };
    }
    const sendAt = new Date(
      Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) + tzOffset * 60_000,
    );
    if (sendAt.getTime() <= Date.now()) {
      return { ok: false, message: "That time is already in the past — pick a future one, or clear it to send now." };
    }
    await mod.scheduleBroadcast({
      audience: audience as import("@/modules/emails/broadcast").BroadcastAudience,
      listingId: listingId || undefined,
      subject, body, sendAt,
    });
    revalidatePath("/admin/emails");
    return { ok: true, message: `Scheduled for ${sendAtLocal.replace("T", " at ")} your time — it goes out within ~15 min of that.` };
  }

  return mod.sendBroadcast({
    audience: audience as import("@/modules/emails/broadcast").BroadcastAudience,
    listingId: listingId || undefined,
    subject,
    body,
  });
}

export async function cancelBroadcastAction(id: string): Promise<void> {
  await requireAdmin();
  const { cancelScheduledBroadcast } = await import("@/modules/emails/broadcast");
  await cancelScheduledBroadcast(id);
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
