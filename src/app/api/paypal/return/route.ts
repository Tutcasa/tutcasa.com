import { NextResponse } from "next/server";
import { capturePayPalOrder } from "@/lib/paypal";
import { recordPayment } from "@/modules/payments/record";

export const dynamic = "force-dynamic";

const SITE = process.env.SITE_URL ?? "https://tutcasa-platform.vercel.app";

/** PayPal sends the guest back here after approving — capture, record,
    then land them on their invoice. Revisiting is harmless (idempotent). */
export async function GET(req: Request) {
  const orderId = new URL(req.url).searchParams.get("token") ?? "";
  const cap = await capturePayPalOrder(orderId);
  if (!cap) return NextResponse.redirect(`${SITE}/stays?paypal=failed`, 303);
  await recordPayment({
    kind: cap.kind, id: cap.invoiceId, paidCents: cap.paidCents,
    ref: cap.ref, provider: "paypal", feeCents: cap.feeCents,
  });
  return NextResponse.redirect(`${SITE}/invoice/${cap.invoiceId}?paid=1`, 303);
}
