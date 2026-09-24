import { NextResponse } from "next/server";
import { capturePayPalOrder } from "@/lib/paypal";

export const dynamic = "force-dynamic";

const SITE = process.env.SITE_URL ?? "https://tutcasa-platform.vercel.app";

/** PayPal sends the guest back here after approving — capture, fulfil,
    then land them on the right page. Revisiting is harmless: capture
    and every fulfilment step are idempotent per capture id. */
export async function GET(req: Request) {
  const orderId = new URL(req.url).searchParams.get("token") ?? "";
  const cap = await capturePayPalOrder(orderId);
  if (!cap) return NextResponse.redirect(`${SITE}/stays?paypal=failed`, 303);

  if (cap.kind === "stay" || cap.kind === "tour") {
    const { recordPayment } = await import("@/modules/payments/record");
    await recordPayment({ kind: cap.kind, id: cap.customId, paidCents: cap.paidCents,
      ref: cap.ref, provider: "paypal", feeCents: cap.feeCents });
    return NextResponse.redirect(`${SITE}/invoice/${cap.customId}?paid=1`, 303);
  }

  if (cap.kind === "extra") {
    const { fulfillExtraPayment } = await import("@/modules/extras");
    await fulfillExtraPayment(cap.customId, cap.ref);
    return NextResponse.redirect(`${SITE}/extra/${cap.customId}?paid=1`, 303);
  }

  // gift card: the value is what PayPal actually captured
  const { getDb } = await import("@/lib/db");
  const row = (await getDb().query("select data from pending_paypal where id = $1 and kind = 'gift'", [cap.customId])).rows[0];
  if (row) {
    const { fulfillGiftPurchase } = await import("@/modules/giftcards");
    await fulfillGiftPurchase({
      paymentRef: cap.ref, amountCents: cap.paidCents,
      buyerEmail: row.data.buyerEmail,
      recipientEmail: row.data.recipientEmail || undefined,
      message: row.data.message || undefined,
    });
    await getDb().query("delete from pending_paypal where id = $1", [cap.customId]);
  }
  return NextResponse.redirect(`${SITE}/gift-cards?paid=1`, 303);
}
