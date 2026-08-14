import "@/styles/demo/experiences.css";
import type { Metadata } from "next";
import { ExperiencesClient } from "@/components/experiences/ExperiencesClient";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Experiences" },
  description:
    "Tours, parks and adventures across the Riviera Maya & Yucatan - all at partner prices for TutCasa guests.",
};

export default function ExperiencesPage() {
  return (
    <div className="pg-experiences">
      <ExperiencesClient />
    </div>
  );
}
