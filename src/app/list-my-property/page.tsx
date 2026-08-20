import "@/styles/demo/list-my-property.css";
import type { Metadata } from "next";
import { ListPropertyClient } from "@/components/pages/ListPropertyClient";
import { getSetting } from "@/modules/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — List your property" },
  description:
    "Earn more, worry less. TutCasa handles guests, cleaning, pricing and support while you watch the ROI. Tell us about your place.",
};

export default async function ListMyPropertyPage() {
  const content = await getSetting("page_list_property");
  return (
    <div className="pg-list-my-property">
      <ListPropertyClient content={content} />
    </div>
  );
}
