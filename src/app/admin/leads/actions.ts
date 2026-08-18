"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";

export async function markLeadHandledAction(id: string): Promise<void> {
  await getDb().query(
    "update leads set status = case when status='new' then 'handled' else 'new' end where id=$1",
    [id],
  );
  revalidatePath("/admin/leads");
}

export async function deleteLeadAction(id: string): Promise<void> {
  await getDb().query("delete from leads where id=$1", [id]);
  revalidatePath("/admin/leads");
}
