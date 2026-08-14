import "@/styles/demo/why-book-with-us.css";
import type { Metadata } from "next";
import Link from "next/link";
import { BackBar } from "@/components/site/BackBar";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Why book with us" },
  description:
    "Book direct with the family who owns and inspects every home — better prices, zero platform fees, and a real person on WhatsApp.",
};

const WHY: { bg: string; ic: string; h: React.ReactNode; p: React.ReactNode }[] = [
  { bg: "#FFE1EC", ic: "\u{1F4B0}", h: "Best price, guaranteed", p: <>Booking direct skips the platform fees. Find the same home cheaper somewhere else and we&rsquo;ll match it.</> },
  { bg: "#DFF3E8", ic: "✈️", h: "Free airport pickup", p: <>Land and relax. A private transfer from Canc&uacute;n airport is included with qualifying stays.</> },
  { bg: "#E4F3FA", ic: "\u{1F4AC}", h: "A concierge on WhatsApp", p: <>May answers in minutes &mdash; restaurant tips, tours, early check-in. No tickets, no bots, just us.</> },
  { bg: "#FDE9D6", ic: "\u{1F511}", h: "No hidden fees", p: <>The price you see is the price you pay. No surprise cleaning or service charges at the end.</> },
  { bg: "#EDE7FB", ic: "\u{1F4B3}", h: "Secure card payment", p: <>Pay safely by card through Stripe, or use PayPal, Zelle and bank transfer &mdash; whatever suits you.</> },
  { bg: "#FFF0D6", ic: "\u{1F495}", h: "A real family, not a call center", p: <>A Canadian-Egyptian couple who fell in love with the Riviera Maya. Every home is one we&rsquo;d put our own parents in.</> },
];

export default function WhyBookPage() {
  return (
    <div className="pg-why-book-with-us">
      <BackBar />
      <div className="page-hero">
        <div className="sun"></div>
        <div className="eyebrow">The TutCasa difference</div>
        <h1>Why book with us</h1>
        <p>Book direct with the family who owns and inspects every home &mdash; better prices, zero platform fees, and a real person on WhatsApp from your first message to your last night.</p>
      </div>
      <div className="why-grid">
        {WHY.map((w, i) => (
          <div className="why-c" key={i}>
            <div className="ic" style={{ background: w.bg }}>{w.ic}</div>
            <h3>{w.h}</h3><p>{w.p}</p>
          </div>
        ))}
      </div>
      <div className="why-cta"><Link className="btn-rosa" href="/stays">Find your casa &rarr;</Link></div>
    </div>
  );
}
