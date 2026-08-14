"use client";

/**
 * Wishlist store — same localStorage contract as the demo's tc-fe-js
 * pass (key `tc_wish`, one object per saved card), so hearts and the
 * wishlist page stay compatible as pages are ported one by one.
 */

import { useCallback, useSyncExternalStore } from "react";

export interface WishItem {
  id: string;
  name: string;
  meta: string;
  price: string;
  rate: string;
  tag: string;
  g: string;
}

const KEY = "tc_wish";
const EVT = "tc-wish-change";

function read(): Record<string, WishItem> {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function write(o: Record<string, WishItem>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(o));
  } catch {}
  window.dispatchEvent(new Event(EVT));
}

let cache: Record<string, WishItem> = {};
let cacheJson = "{}";

function getSnapshot(): Record<string, WishItem> {
  const raw = window.localStorage.getItem(KEY) || "{}";
  if (raw !== cacheJson) {
    cacheJson = raw;
    cache = read();
  }
  return cache;
}

const EMPTY: Record<string, WishItem> = {};
function getServerSnapshot() {
  return EMPTY;
}

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useWishlist() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const has = useCallback((id: string) => !!items[id], [items]);

  const toggle = useCallback((item: WishItem) => {
    const o = read();
    if (o[item.id]) delete o[item.id];
    else o[item.id] = item;
    write(o);
  }, []);

  const count = Object.keys(items).length;
  const all = Object.values(items);

  return { has, toggle, count, all };
}
