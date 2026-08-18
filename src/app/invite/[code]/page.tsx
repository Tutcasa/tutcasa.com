import "@/styles/demo/loyalty.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getReferralByCode } from "@/modules/growth";
import { RememberCoupon } from "./RememberCoupon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — You've been invited!" },
  description: "A friend invited you to TutCasa — enjoy $100 off your first stay in the Riviera Maya.",
  robots: { index: false },
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const referral = await getReferralByCode(code);
  const firstName = referral ? String(referral.referrer_name).split(" ")[0] : null;

  return (
    <div className="pg-loyalty">
      <div className="page-hero">
        <div className="sun"></div>
        {referral ? (
          <>
            <div className="eyebrow">&#127873; A gift from {firstName}</div>
            <h1>You&rsquo;ve been invited to TutCasa!</h1>
            <p>
              {`${firstName} loves staying with us and wants you to try it too — so here's `}
              <b>$100 off your first stay</b> in the Riviera Maya.
            </p>
          </>
        ) : (
          <>
            <div className="eyebrow">Hmm&hellip;</div>
            <h1>This invite link doesn&rsquo;t look right</h1>
            <p>
              Double-check the link your friend sent you &mdash; or browse our homes
              anyway, they&rsquo;re worth it.
            </p>
          </>
        )}
      </div>

      {referral && (
        <div className="loy-form" style={{ textAlign: "center" }}>
          <RememberCoupon code={referral.code} />
          <h2>Your $100 coupon</h2>
          <div className="lead">
            Use this code at checkout on any home &mdash; we&rsquo;ve also saved it
            for you, so it fills in automatically when you book.
          </div>
          <div
            style={{
              display: "inline-block", background: "#FFF3E9", borderRadius: 14,
              padding: "14px 28px", fontSize: 24, fontWeight: 800,
              letterSpacing: 1, margin: "6px 0 18px",
            }}
          >
            {referral.code}
          </div>
          <div>
            <Link className="btn-rosa" href="/stays">Find your casa &rarr;</Link>
          </div>
        </div>
      )}
      {!referral && (
        <div style={{ textAlign: "center", padding: "10px 18px 50px" }}>
          <Link className="btn-rosa" href="/stays">Browse our homes &rarr;</Link>
        </div>
      )}
    </div>
  );
}
