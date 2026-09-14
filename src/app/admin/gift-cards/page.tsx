import { listGiftCards } from "@/modules/giftcards";
import { GiftClient } from "./gift-client";

export const dynamic = "force-dynamic";

export default async function AdminGiftCards() {
  const cards = await listGiftCards();
  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">Gift cards</h1>
      <p className="mb-5 max-w-2xl text-sm text-grey">
        Stored value, unlike coupons: a card holds real dollars, covers up to
        its balance at checkout, and whatever&rsquo;s left stays on the card for
        the next booking. The code shows <b>once</b> when you create it — send
        it to the buyer yourself (only the last 4 characters are kept here).
        Guests redeem it in the &ldquo;Gift card code&rdquo; box at checkout,
        and it can be combined with a coupon.
      </p>
      <GiftClient cards={cards} />
    </div>
  );
}
