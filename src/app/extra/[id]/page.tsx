import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getExtra, EXTRA_LABEL, type ExtraKind } from "@/modules/extras";
import { PayExtra } from "./pay-extra";
import { paypalConfigured } from "@/lib/paypal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Your booking extra" },
  robots: { index: false, follow: false },
};

/** Guest page for a confirmed early check-in / late check-out: what it is,
    what it costs, and the Pay button. The unguessable id is the auth. */
export default async function ExtraPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string }> }) {
  const { id } = await params;
  const { paid } = await searchParams;
  const e = await getExtra(id);
  if (!e) notFound();

  const label = EXTRA_LABEL[e.kind as ExtraKind];
  const fee = `$${Math.round(e.fee_cents / 100).toLocaleString("en-US")} ${e.currency}`;
  const when = e.kind === "early_checkin"
    ? `arrival day, ${e.check_in}`
    : `departure day, ${e.check_out}`;
  const isPaid = e.status === "paid" || paid === "1";

  return (
    <div className="mx-auto max-w-[560px] px-4 py-12">
      <div className="rounded-card bg-paper p-8 text-center shadow-soft">
        <div className="text-4xl">{e.kind === "early_checkin" ? "🌅" : "🌇"}</div>
        <h1 className="mt-2 font-display text-2xl font-extrabold">{label}</h1>
        <p className="mt-1 text-sm text-grey">{e.title}</p>

        {isPaid ? (
          <>
            <div className="mt-5 rounded-xl bg-cactus/10 p-4 text-sm font-bold text-cactus">
              ✓ Confirmed and paid — your {label.toLowerCase()} is locked in for {when}.
            </div>
            <p className="mt-3 text-sm text-grey">
              We&rsquo;ve reserved the time for you, so the home is yours
              {e.kind === "early_checkin" ? " earlier than usual" : " for longer on your last day"}.
              See you soon! 🌴
            </p>
          </>
        ) : e.status === "confirmed" ? (
          <>
            <div className="mt-5 grid gap-1 rounded-xl bg-crema p-4 text-left text-sm">
              <div className="flex justify-between"><span>When</span><b>{when}</b></div>
              <div className="flex justify-between"><span>{label}</span><b>{fee}</b></div>
            </div>
            <p className="mt-3 text-sm text-grey">
              Good news — this is available for your dates. Pay to lock it in;
              we then hold the time so it can&rsquo;t be given away.
            </p>
            <PayExtra id={id} label={label} paypal={paypalConfigured()} />
          </>
        ) : e.status === "requested" ? (
          <div className="mt-5 rounded-xl bg-sol/15 p-4 text-sm font-semibold text-terra">
            Your request is noted. We check the calendar 48 hours before,
            then email you to confirm — nothing is charged until then.
          </div>
        ) : e.status === "declined" ? (
          <div className="mt-5 rounded-xl bg-grey/10 p-4 text-sm font-semibold text-grey">
            Unfortunately this wasn&rsquo;t available for your dates, so it
            wasn&rsquo;t charged. Message us on WhatsApp and we&rsquo;ll do our
            best to be flexible on the day.
          </div>
        ) : (
          <div className="mt-5 rounded-xl bg-grey/10 p-4 text-sm font-semibold text-grey">
            This option is no longer available.
          </div>
        )}

        <p className="mt-6 text-xs text-grey">
          Questions? Contact us at admin@tutcasa.com — we answer in minutes.
        </p>
        <Link href="/stays" className="mt-4 inline-block text-sm font-bold text-rosa hover:underline">
          ← Browse our homes
        </Link>
      </div>
    </div>
  );
}
