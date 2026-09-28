import { listTrash } from "@/modules/trash";
import { RestoreButton } from "./restore-button";

export const dynamic = "force-dynamic";

const KIND = { stay: "Stay booking", tour: "Tour booking", gift_card: "Gift card" } as const;

export default async function AdminTrash() {
  const items = await listTrash();
  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">Trash</h1>
      <p className="mb-5 max-w-2xl text-sm text-grey">
        Deleted bookings, invoices and gift cards wait here for <b>30 days</b>.
        Restore puts them back exactly as they were — same invoice number,
        payments, emails history and calendar dates. After 30 days they are
        gone for good.
      </p>
      <div className="overflow-x-auto rounded-card bg-paper shadow-soft">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase text-grey">
            <tr><th className="p-3">What</th><th className="p-3">Details</th><th className="p-3">Deleted</th>
                <th className="p-3">Gone forever in</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="border-b border-line/60">
                <td className="p-3 font-bold">{KIND[t.kind]}</td>
                <td className="p-3">{t.label}</td>
                <td className="p-3 text-xs text-grey">{new Date(t.deletedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className={`p-3 text-xs font-bold ${t.daysLeft <= 3 ? "text-rosa-deep" : "text-grey"}`}>
                  {t.daysLeft} day{t.daysLeft === 1 ? "" : "s"}
                </td>
                <td className="p-3"><RestoreButton id={t.id} /></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-grey">The trash is empty.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
