import "@/styles/demo/policies.css";
import type { Metadata } from "next";
import { BackBar } from "@/components/site/BackBar";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Help & policies" },
  description:
    "Everything about deposits, payments and cancellations — clear and upfront. Have a question we haven't covered? May is one message away.",
};

export default function PoliciesPage() {
  return (
    <div className="pg-policies">
      <BackBar />
      <div className="page-hero" style={{ padding: "28px 0 2px" }}>
        <div className="sun"></div>
        <div className="eyebrow">Good to know</div>
        <h1>Help &amp; policies</h1>
        <p>Everything about deposits, payments and cancellations &mdash; clear and upfront. Have a question we haven&rsquo;t covered? May is one message away.</p>
      </div>
      <div className="pol-wrap">
        <nav className="pol-nav">
          <a href="#deposit">Reservation deposit</a><a href="#security">Security deposit</a><a href="#keys">Keys &amp; access</a>
          <a href="#restrictions">Restrictions</a><a href="#cancellation">Cancellation</a><a href="#payment">Payment options</a>
        </nav>
        <div>
          <div className="pol-sec" id="deposit"><h2>&#128179; Reservation deposit</h2>
            <p>To confirm your dates we ask for a deposit, with the balance due before arrival:</p>
            <ul><li><span className="pol-tag">Condos &amp; Villas</span> 50% deposit to reserve. The remaining balance is due 30 days before arrival, and finalised 15 days prior.</li>
            <li><span className="pol-tag">Hotels</span> 50% deposit to reserve, with the balance due 15 days before arrival.</li></ul></div>
          <div className="pol-sec" id="security"><h2>&#128273; Refundable security deposit</h2>
            <p>A refundable security deposit is held against accidental damage. It&rsquo;s fully returned after check-out once the home has been inspected and everything is in order.</p></div>
          <div className="pol-sec" id="keys"><h2>&#128477;&#65039; Keys &amp; access</h2>
            <ul><li>Most homes use a secure key box or digital lock &mdash; we send the code and directions before you arrive.</li>
            <li>Lost keys or remotes are charged at <b>$100</b> to cover replacement.</li></ul></div>
          <div className="pol-sec" id="restrictions"><h2>&#9888;&#65039; Restrictions</h2>
            <ul><li>No parties or events without prior written approval.</li><li>No smoking indoors.</li>
            <li>Please respect the maximum guest count on your reservation and quiet hours in the community.</li></ul></div>
          <div className="pol-sec" id="cancellation"><h2>&#128197; Cancellation policy</h2>
            <p><b>Condos &amp; Villas</b></p>
            <ul><li>30+ days before arrival &mdash; full refund.</li><li>Between 30 and 7 days &mdash; 50% refund.</li><li>7 days or less &mdash; non-refundable.</li></ul>
            <p style={{ marginTop: 12 }}><b>Hotels</b></p>
            <ul><li>15+ days before arrival &mdash; full refund.</li><li>Within 15 days &mdash; one night is charged, the rest refunded.</li></ul></div>
          <div className="pol-sec" id="payment"><h2>&#128176; Payment options</h2>
            <p>Pay whichever way is easiest for you:</p>
            <ul><li>Credit or debit card (securely via Stripe)</li><li>PayPal</li><li>Zelle</li><li>Bank wire / direct bank transfer</li></ul>
            <div className="pol-note">&#127466;&#127468; Paying from Egypt? We also accept <b>InstaPay</b>. Just ask May and we&rsquo;ll share the details.</div></div>
        </div>
      </div>
    </div>
  );
}
