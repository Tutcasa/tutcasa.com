"use client";

import { useEffect } from "react";

/** Saves the referral coupon so checkout can prefill it automatically. */
export function RememberCoupon({ code }: { code: string }) {
  useEffect(() => {
    try {
      localStorage.setItem("tc_ref_coupon", code);
    } catch {}
  }, [code]);
  return null;
}
