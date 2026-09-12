import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listLeads } from "@/modules/leads";

export const dynamic = "force-dynamic";

/** Excel-ready CSV of every lead (UTF-8 BOM so Excel reads accents). */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "not authorized" }, { status: 401 });
  }
  const leads = await listLeads();
  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const rows = [
    ["Type", "Status", "Name", "Email", "Phone", "Received", "Details"],
    ...leads.map((l) => [
      l.kind, l.status, l.name, l.email, l.phone ?? "",
      new Date(l.createdAt).toLocaleString("en-US"),
      Object.entries(l.payload).filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`).join(" | "),
    ]),
  ];
  const csv = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tutcasa-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
