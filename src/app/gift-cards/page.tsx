import "@/styles/demo/gift.css";
import type { Metadata } from "next";
import Link from "next/link";
import { BackBar } from "@/components/site/BackBar";
import { GiftShop } from "./gift-shop";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Gift Cards" },
  description:
    "Give a stay on the Riviera Maya: TutCasa gift cards from $25, delivered by email with a unique code, redeemable on any home.",
};

export default async function GiftCardsPage({
  searchParams,
}: { searchParams: Promise<{ paid?: string }> }) {
  const { paid } = await searchParams;

  return (
    <div className="page-gift">
      <BackBar />
      {paid ? (
        <div className="gift-paid">
          <div className="c">🎁</div>
          <h2>Your gift card is on its way!</h2>
          <p>
            Payment received — the gift card code has just been emailed
            (check spam the first time). If you sent it to someone special,
            they have it too, and you got a copy for your records.
            The card shows up at checkout the moment the code is entered.
          </p>
          <p style={{ marginTop: 14 }}>
            <Link className="btn-rosa" style={{ width: "auto" }} href="/stays">Browse the homes</Link>
          </p>
        </div>
      ) : (
        <>
          <section className="page-hero">
            <div className="sun"></div>
            <div className="eyebrow">Give a getaway</div>
            <h1>TutCasa Gift Cards</h1>
            <p>
              The Riviera Maya, wrapped up with a bow — a unique code delivered
              by email, good for any home in our collection, whenever they&rsquo;re
              ready to escape.
            </p>
          </section>
          <GiftShop />
          <div className="gift-how">
            <div className="how"><div className="ic">💳</div><h3>1 · Pay securely</h3>
              <p>Pick an amount from $25 to $5,000 and pay by card through Stripe — takes a minute.</p></div>
            <div className="how"><div className="ic">📬</div><h3>2 · The code arrives</h3>
              <p>A unique gift code lands by email — in your inbox to keep or print, or straight in your favorite person&rsquo;s inbox with your message.</p></div>
            <div className="how"><div className="ic">🏝️</div><h3>3 · They book &amp; enjoy</h3>
              <p>At checkout they enter the code and its value comes straight off the bill. Anything left stays on the card for next time.</p></div>
          </div>
        </>
      )}
    </div>
  );
}
