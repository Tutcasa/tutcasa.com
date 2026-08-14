import "@/styles/demo/concierge.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/modules/settings";
import { BackBar } from "@/components/site/BackBar";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Luxury Concierge Services" },
  description:
    "Airport transfers, private chefs, grocery pre-stocking, excursions, spa, celebrations and more — TutCasa's concierge team personalizes every part of your stay.",
};

const SVC: { bg: string; ic: string; h: string; tag: string; items: string[]; note?: string }[] = [
  { bg: "#E4F3FA", ic: "\u{1F6B4}", h: "Airport Transfers", tag: "Your vacation begins the moment you land.",
    items: ["Private airport transfers", "Luxury SUVs", "Executive transportation", "Group transportation", "Child seats on request", "VIP meet & greet"] },
  { bg: "#FFE1EC", ic: "\u{1F373}", h: "Private Chef Experience", tag: "Restaurant-quality dining in your villa.",
    items: ["Daily breakfast", "Family dinners", "Romantic dinners", "Birthday celebrations", "Wedding events", "Vegetarian & vegan", "Halal-friendly on request"] },
  { bg: "#DFF3E8", ic: "\u{1F6D2}", h: "Grocery Pre-Stocking", tag: "Arrive to a fully stocked villa.",
    items: ["Fresh fruits & veg", "Snacks", "Water & soft drinks", "Wine & spirits", "Baby supplies", "Household essentials"],
    note: "Send us your list before arrival and it’s waiting for you." },
  { bg: "#FDE9D6", ic: "\u{1F334}", h: "Excursions & Experiences", tag: "Discover the very best of the Riviera Maya.",
    items: ["Catamaran cruises", "Isla Mujeres", "Cozumel", "Chichén Itzá", "Tulum & cenotes", "Snorkeling & diving", "Fishing charters", "Yacht rentals", "ATV & ziplining", "Bacalar Lagoon", "Eco parks"],
    note: "Curated with our trusted travel partner, Amanah Vacations." },
  { bg: "#E4F3FA", ic: "\u{1F9D8}", h: "Wellness & Spa", tag: "Relaxation, brought to your villa.",
    items: ["Massage therapy", "Couples massage", "Facials", "Yoga sessions", "Personal trainers", "Meditation", "Beauty services"] },
  { bg: "#FFE1EC", ic: "\u{1F389}", h: "Special Celebrations", tag: "Celebrate life’s biggest moments.",
    items: ["Decorations", "Cakes & flowers", "Live musicians", "Photographers", "Videographers", "Fireworks (where permitted)", "Event coordination"],
    note: "Birthdays, honeymoons, proposals, anniversaries, bachelor & bachelorette parties." },
  { bg: "#DFF3E8", ic: "⛵", h: "Yacht & Luxury Experiences", tag: "Experience the Caribbean in style.",
    items: ["Half-day charters", "Full-day charters", "Sunset cruises", "Private islands", "Snorkeling trips", "Fishing excursions"] },
  { bg: "#FDE9D6", ic: "\u{1F476}", h: "Family Services", tag: "Traveling with children, made easy.",
    items: ["Babysitting", "Cribs & high chairs", "Baby equipment", "Children’s activities", "Family excursions"] },
  { bg: "#E4F3FA", ic: "\u{1F4BB}", h: "Business & Remote Work", tag: "Stay productive while you travel.",
    items: ["High-speed Wi-Fi help", "Private workspaces", "Office equipment", "Printing", "Transport for meetings", "Executive transportation"] },
  { bg: "#FFE1EC", ic: "\u{1F514}", h: "Personal Concierge", tag: "Anything else? Just ask.",
    items: ["Restaurant reservations", "Beach clubs", "Nightlife tips", "Local experiences", "Last-minute requests", "Shopping assistance", "Medical coordination", "Emergency support"],
    note: "One dedicated point of contact throughout your stay." },
];

const WHY = ["Personalized service", "Local experts", "Trusted partners", "Curated experiences", "Fast response times", "Seamless planning", "Luxury-focused service", "One point of contact"];

const STEPS: [string, string][] = [
  ["Book Your Villa", "Reserve your perfect TutCasa property."],
  ["Tell Us Your Preferences", "Share your interests, dietary needs, arrival details and special requests."],
  ["We Plan Everything", "Our concierge team organizes every service before you arrive."],
  ["Relax & Enjoy", "Arrive to a fully prepared vacation, with support whenever you need it."],
];

export default async function ConciergePage() {
  const contact = await getSetting("contact");
  const wa = (msg: string) =>
    `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Hi May! " + msg + " \u{1F44B}")}`;

  return (
    <div className="pg-concierge">
      <BackBar />

      <section className="page-hero">
        <div className="sun"></div>
        <div className="wrap">
          <div className="eyebrow">Luxury Concierge Services</div>
          <h1>More than a stay. <span className="rosa">A complete experience.</span></h1>
          <p className="svc-intro">At TutCasa, exceptional travel goes beyond beautiful accommodations. Our dedicated concierge team personalizes every part of your stay &mdash; a romantic escape, a family vacation, a corporate retreat or a special celebration &mdash; so you can simply relax and enjoy.</p>
          <div style={{ marginTop: 22, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a className="btn btn-rosa" href={wa("I’d like to plan concierge services for my stay")} target="_blank" rel="noopener">&#9990; Plan with May</a>
            <Link className="btn btn-soft" href="/tours">Browse tours &amp; experiences</Link>
          </div>
        </div>
      </section>

      <section className="wrap">
        <div className="sec-head-c"><div className="eyebrow">What we arrange</div><h2>Every detail, handled</h2></div>
        <div className="svc-grid">
          {SVC.map((s) => (
            <div className="svc" key={s.h}>
              <div className="ic" style={{ background: s.bg }}>{s.ic}</div>
              <h3>{s.h}</h3><div className="tag">{s.tag}</div>
              <div className="svc-list">{s.items.map((i) => <span key={i}>{i}</span>)}</div>
              {s.note && <div className="svc-note">{s.note}</div>}
            </div>
          ))}
        </div>

        <div className="why-band">
          <h2>Why choose TutCasa Concierge?</h2>
          <div className="why-grid">
            {WHY.map((w) => <div className="why-item" key={w}><span className="ck">&#10003;</span>{w}</div>)}
          </div>
        </div>

        <div className="sec-head-c"><div className="eyebrow">Simple by design</div><h2>How it works</h2></div>
        <div className="steps">
          {STEPS.map(([h, p], i) => (
            <div className="step" key={h}><div className="num">{i + 1}</div><h4>{h}</h4><p>{p}</p></div>
          ))}
        </div>

        <div className="unique">
          <span className="deco">&#10024;</span>
          <h2>Need something unique?</h2>
          <p>No request is too small &mdash; or too extraordinary. From surprise proposals and private celebrations to luxury transportation and tailor-made experiences, our concierge team is here to make it happen. Tell us what you have in mind, and we&rsquo;ll take care of the rest.</p>
          <div className="cta">
            <a className="btn btn-ghost" href={wa("I have a special concierge request")} target="_blank" rel="noopener">&#9990; Message May on WhatsApp</a>
            <Link className="btn btn-soft" href="/contact" style={{ background: "#fff", color: "var(--rosa)" }}>Contact the team</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
