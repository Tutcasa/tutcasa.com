import type { Metadata } from "next";
import "./globals.css";
import "@/styles/demo/base.css";
import "@/styles/demo/chrome-fallback.css";
import { LangProvider } from "@/lib/i18n";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChatMay } from "@/components/site/ChatMay";
import { getSetting } from "@/modules/settings";

export const metadata: Metadata = {
  metadataBase: new URL("https://tutcasa.com"),
  title: {
    default: "TutCasa — Vacation Rentals in Riviera Maya, Egypt & Florida",
    template: "%s · TutCasa",
  },
  description:
    "Book beachfront villas & condos in Playa del Carmen, Tulum, Cancún, Egypt & Florida. All-in prices, no hidden fees, WhatsApp concierge. Book direct & save.",
  openGraph: {
    siteName: "TutCasa",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const contact = await getSetting("contact");
  return (
    <html lang="en">
      <body>
        {/* same font pipeline as the approved demo — literal family names
            ('Outfit', 'Baloo 2') that the verbatim design-reference CSS uses */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- root layout covers every route; React 19 hoists this to <head> */}
        <link
          rel="stylesheet"
          precedence="default"
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap"
        />
        <LangProvider>
          <SiteHeader whatsapp={contact.whatsapp} />
          <main>{children}</main>
          <SiteFooter whatsapp={contact.whatsapp} />
          <ChatMay whatsapp={contact.whatsapp} />
        </LangProvider>
      </body>
    </html>
  );
}
