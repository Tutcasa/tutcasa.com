import "@/styles/demo/contact.css";
import type { Metadata } from "next";
import { getSetting } from "@/modules/settings";
import { ContactClient } from "@/components/pages/ContactClient";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Contact us" },
  description:
    "Questions about a home, a booking, or listing your property? Message the TutCasa family — or contact us on WhatsApp for the fastest reply.",
};

export default async function ContactPage() {
  const contact = await getSetting("contact");
  return (
    <div className="pg-contact">
      <ContactClient whatsapp={contact.whatsapp} email={contact.email} />
    </div>
  );
}
