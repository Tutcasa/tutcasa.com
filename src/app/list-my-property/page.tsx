import "@/styles/demo/list-my-property.css";
import type { Metadata } from "next";
import { ListPropertyClient } from "@/components/pages/ListPropertyClient";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — List your property" },
  description:
    "Earn more, worry less. TutCasa handles guests, cleaning, pricing and support while you watch the ROI. Tell us about your place.",
};

export default function ListMyPropertyPage() {
  return (
    <div className="pg-list-my-property">
      <ListPropertyClient />
    </div>
  );
}
