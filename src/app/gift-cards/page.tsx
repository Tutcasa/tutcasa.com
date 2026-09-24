import "@/styles/demo/gift.css";
import type { Metadata } from "next";
import Link from "next/link";
import { BackBar } from "@/components/site/BackBar";
import { getSetting } from "@/modules/settings";
import { GiftShop } from "./gift-shop";
import { paypalConfigured } from "@/lib/paypal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Gift Cards" },
  description:
    "Give a stay on the Riviera Maya: TutCasa gift cards from $25, delivered by email with a unique code, redeemable on any home.",
};

export default async function GiftCardsPage({
  searchParams,
}: { searchParams: Promise<{ paid?: string }> }) {
  const { paid } = await searchParams;
  const c = await getSetting("page_giftcards");

  return (
    <div className="page-gift">
      <BackBar />
      {paid ? (
        <div className="gift-paid">
          <div className="c">🎁</div>
          <h2>{c.paidTitle}</h2>
          <p>{c.paidText}</p>
          <p style={{ marginTop: 14 }}>
            <Link className="btn-rosa" style={{ width: "auto" }} href="/stays">Browse the homes</Link>
          </p>
        </div>
      ) : (
        <>
          <section className="page-hero">
            <div className="sun"></div>
            <div className="eyebrow">{c.eyebrow}</div>
            <h1>{c.title}</h1>
            <p>{c.intro}</p>
          </section>
          <GiftShop paypal={paypalConfigured()} />
          <div className="gift-how">
            {c.steps.map((st, i) => (
              <div className="how" key={i}>
                <div className="ic">{st.icon}</div><h3>{st.title}</h3>
                <p>{st.text}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
