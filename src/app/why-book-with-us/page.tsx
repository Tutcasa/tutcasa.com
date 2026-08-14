import "@/styles/demo/why-book-with-us.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/modules/settings";
import { BackBar } from "@/components/site/BackBar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Why book with us" },
  description:
    "Book direct with the family who owns and inspects every home — better prices, zero platform fees, and a real person on WhatsApp.",
};

/* demo card icon backgrounds, cycled in order */
const BGS = ["#FFE1EC", "#DFF3E8", "#E4F3FA", "#FDE9D6", "#EDE7FB", "#FFF0D6"];

export default async function WhyBookPage() {
  const c = await getSetting("page_why");
  return (
    <div className="pg-why-book-with-us">
      <BackBar />
      <div className="page-hero">
        <div className="sun"></div>
        <div className="eyebrow">{c.hero.eyebrow}</div>
        <h1>{c.hero.title}</h1>
        <p>{c.hero.intro}</p>
      </div>
      <div className="why-grid">
        {c.cards.map((w, i) => (
          <div className="why-c" key={i}>
            <div className="ic" style={{ background: BGS[i % BGS.length] }}>{w.icon}</div>
            <h3>{w.title}</h3><p>{w.text}</p>
          </div>
        ))}
      </div>
      <div className="why-cta"><Link className="btn-rosa" href="/stays">Find your casa &rarr;</Link></div>
    </div>
  );
}
