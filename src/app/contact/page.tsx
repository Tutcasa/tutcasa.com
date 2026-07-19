import type { Metadata } from "next";
import { getSetting } from "@/modules/settings";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Questions about a home, a booking, or listing your property? Message the TutCasa family — or chat with May on WhatsApp for the fastest reply.",
};

export default async function ContactPage() {
  const contact = await getSetting("contact");
  return (
    <div className="mx-auto max-w-[720px] px-4 sm:px-6">
      <section className="py-12 text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-terra">
          We&apos;d love to hear from you
        </p>
        <h1 className="mt-2 text-4xl font-extrabold">Contact us</h1>
        <p className="mx-auto mt-4 max-w-[52ch] text-grey">
          Questions about a home, a booking, or listing your own property?
          Message May on WhatsApp for the fastest reply — or email us and
          we&apos;ll get back within 24 hours.
        </p>
      </section>

      <div className="grid gap-4 pb-16 sm:grid-cols-2">
        <a
          href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Hi May! I have a question 👋")}`}
          target="_blank" rel="noopener"
          className="rounded-card bg-[#1EBE5D] p-6 text-center text-white shadow-soft hover:opacity-95"
        >
          <div className="text-3xl" aria-hidden>💬</div>
          <div className="mt-2 font-display text-lg font-bold">WhatsApp</div>
          <div className="text-sm opacity-90">Chat with May — replies in minutes</div>
        </a>
        <a
          href={`mailto:${contact.email}`}
          className="rounded-card bg-paper p-6 text-center shadow-soft hover:shadow-lift"
        >
          <div className="text-3xl" aria-hidden>✉️</div>
          <div className="mt-2 font-display text-lg font-bold">Email</div>
          <div className="text-sm text-grey">{contact.email || "hello@tutcasa.com"}</div>
        </a>
      </div>
    </div>
  );
}
