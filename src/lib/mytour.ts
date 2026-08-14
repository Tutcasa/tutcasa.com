"use client";

/**
 * "My tour" activity list — same localStorage contract as the demo
 * (key `tc_mytour`, array of activity names), shared by the
 * Experiences page and the tour checkout.
 */

import { useCallback, useSyncExternalStore } from "react";

const KEY = "tc_mytour";
const EVT = "tc-mytour-change";

function read(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(l: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(l));
  } catch {}
  window.dispatchEvent(new Event(EVT));
}

let cache: string[] = [];
let cacheJson = "[]";
function getSnapshot(): string[] {
  const raw = window.localStorage.getItem(KEY) || "[]";
  if (raw !== cacheJson) {
    cacheJson = raw;
    cache = read();
  }
  return cache;
}
const EMPTY: string[] = [];
const getServerSnapshot = () => EMPTY;

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useMyTour() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const has = useCallback((n: string) => list.includes(n), [list]);
  const toggle = useCallback((n: string) => {
    const l = read();
    const ix = l.indexOf(n);
    if (ix > -1) l.splice(ix, 1);
    else l.push(n);
    write(l);
  }, []);
  const clear = useCallback(() => write([]), []);
  return { list, has, toggle, clear, count: list.length };
}
