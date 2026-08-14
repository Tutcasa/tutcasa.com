import "@/styles/demo/loyalty.css";
import type { Metadata } from "next";
import { getSetting } from "@/modules/settings";
import { LoyaltyClient } from "@/components/pages/LoyaltyClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Loyalty program" },
  description:
    "Refer a friend to TutCasa: they get $100 off their first stay, you earn $200 toward your next one. No limits, fully stackable.",
};

export default async function LoyaltyPage() {
  const content = await getSetting("page_loyalty");
  return (
    <div className="pg-loyalty">
      <LoyaltyClient content={content} />
    </div>
  );
}
