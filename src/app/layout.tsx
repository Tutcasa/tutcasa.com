import type { Metadata } from "next";
import { Baloo_2, Outfit } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatWithMay } from "@/components/ChatWithMay";
import { getSetting } from "@/modules/settings";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

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
    <html
      lang="en"
      className={`${baloo.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <ChatWithMay whatsapp={contact.whatsapp} />
      </body>
    </html>
  );
}
