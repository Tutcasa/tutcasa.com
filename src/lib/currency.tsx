"use client";

/**
 * Display-currency switcher (MXN / USD / CAD). Prices are STORED and
 * CHARGED in their native currency (stays USD, tours MXN) — this layer
 * only converts what the guest sees, like the header language switcher.
 * Fixed display rates; the invoice/charge amount never changes.
 */

import { createContext, useContext, useEffect, useState } from "react";
import { CAD_PER_USD, MXN_PER_USD } from "@/lib/rates";

export type Currency = "USD" | "MXN" | "CAD";

/** units per 1 USD (display conversion only) */
const PER_USD: Record<Currency, number> = { USD: 1, MXN: MXN_PER_USD, CAD: CAD_PER_USD };

const LABEL: Record<Currency, string> = { USD: "USD", MXN: "MXN", CAD: "CAD" };

interface CurrencyCtx {
  cur: Currency;
  setCur: (c: Currency) => void;
  /** format an amount whose native currency is USD */
  fromUSD: (usd: number) => string;
  /** format an amount whose native currency is MXN */
  fromMXN: (mxn: number) => string;
}

const Ctx = createContext<CurrencyCtx | null>(null);

const nf = (n: number) => Math.round(n).toLocaleString("en-US");

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [cur, setCurState] = useState<Currency>("USD");

  useEffect(() => {
    const saved = window.localStorage.getItem("tc_currency");
    // hydrate the persisted choice after mount — server always renders USD,
    // so reading localStorage during render would mismatch hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "USD" || saved === "MXN" || saved === "CAD") setCurState(saved);
  }, []);

  const setCur = (c: Currency) => {
    setCurState(c);
    try { window.localStorage.setItem("tc_currency", c); } catch {}
  };

  const fromUSD = (usd: number) => `$${nf(usd * PER_USD[cur])} ${LABEL[cur]}`;
  const fromMXN = (mxn: number) => `$${nf((mxn / PER_USD.MXN) * PER_USD[cur])} ${LABEL[cur]}`;

  return <Ctx.Provider value={{ cur, setCur, fromUSD, fromMXN }}>{children}</Ctx.Provider>;
}

export function useCurrency(): CurrencyCtx {
  const ctx = useContext(Ctx);
  if (ctx) return ctx;
  // safe fallback when a component renders outside the provider
  return {
    cur: "USD",
    setCur: () => {},
    fromUSD: (usd) => `$${nf(usd)} USD`,
    fromMXN: (mxn) => `$${nf(mxn)} MXN`,
  };
}
