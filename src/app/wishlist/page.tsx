import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = {
  title: "Your wishlist",
  robots: { index: false },
};

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-16 text-center sm:px-6">
      <h1 className="text-4xl font-extrabold">Your <span className="text-rosa">wishlist.</span></h1>
      <p className="mx-auto mt-4 max-w-[46ch] text-grey">
        Hearted casas will live here — saved to your account so they follow you
        across devices. Arriving together with guest sign-in.
      </p>
      <Link href="/stays" className="mt-8 inline-block rounded-pill bg-rosa px-7 py-3.5 font-bold text-white shadow-soft hover:bg-rosa-deep">
        Browse all casas →
      </Link>
    </div>
  );
}
