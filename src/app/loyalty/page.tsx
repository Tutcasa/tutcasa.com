import "@/styles/demo/loyalty.css";
import type { Metadata } from "next";
import { LoyaltyClient } from "@/components/pages/LoyaltyClient";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Loyalty program" },
  description:
    "Refer a friend to TutCasa: they get $100 off their first stay, you earn $200 toward your next one. No limits, fully stackable.",
};

export default function LoyaltyPage() {
  return (
    <div className="pg-loyalty">
      <LoyaltyClient />
    </div>
  );
}
