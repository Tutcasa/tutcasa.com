import "@/styles/demo/wishlist.css";
import type { Metadata } from "next";
import { WishlistClient } from "@/components/pages/WishlistClient";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Your wishlist" },
  description: "The casas you've hearted, saved on this device.",
};

export default function WishlistPage() {
  return (
    <div className="pg-wishlist">
      <WishlistClient />
    </div>
  );
}
