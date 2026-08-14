"use client";

/**
 * Site header + mobile drawer, ported 1:1 from the demo's shared
 * chrome (header/.nav, lang menu, account menu, tcnav drawer).
 * Styles come from the verbatim demo CSS in design-reference/.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { T, useLang } from "@/lib/i18n";
import { useWishlist } from "@/lib/wishlist";
import { AuthModal, type AuthMode } from "./AuthModal";
import { TutCasaMark, LogoWord } from "./TutCasaLogo";

export function SiteHeader({ whatsapp }: { whatsapp: string }) {
  const pathname = usePathname();
  const { setLang, lang } = useLang();
  const { count } = useWishlist();
  const [langOpen, setLangOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [auth, setAuth] = useState<{ open: boolean; mode: AuthMode; seq: number }>({ open: false, mode: "login", seq: 0 });

  // demo: any document click closes the menus; Escape closes the drawer.
  // React delegates events at the document node, so guard by target
  // instead of relying on stopPropagation reaching this listener.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = e.target as Element | null;
      if (el?.closest?.(".lang-wrap, .acct-wrap")) return;
      setLangOpen(false);
      setAcctOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    // pages can open the auth modal (demo: wishlist's "Log in" link)
    const onAuthOpen = (e: Event) => {
      const mode = ((e as CustomEvent).detail === "signup" ? "signup" : "login") as AuthMode;
      setAuth((a) => ({ open: true, mode, seq: a.seq + 1 }));
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("tc-auth-open", onAuthOpen);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("tc-auth-open", onAuthOpen);
    };
  }, []);

  function openDrawer() {
    setDrawerOpen(true);
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    setDrawerOpen(false);
    document.body.style.overflow = "";
  }
  function auOpen(mode: AuthMode) {
    // bump seq so the modal remounts with fresh state (demo's auOpen
    // resets the tab + step on every open)
    setAuth((a) => ({ open: true, mode, seq: a.seq + 1 }));
    setAcctOpen(false);
  }

  const wishCount = count ? `(${count})` : "";
  const waHref = `https://wa.me/${whatsapp}`;

  return (
    <>
      <header>
        <div className="wrap nav">
          <Link className="logo" href="/">
            <TutCasaMark />
            <LogoWord />
          </Link>
          <nav className="nav-links">
            <Link href="/stays" className={pathname.startsWith("/stays") ? "active" : undefined}><span className="ni">&#127968;</span><T k="nav_stays" /></Link>
            <Link href="/concierge" className={pathname.startsWith("/concierge") ? "active" : undefined}><span className="ni">&#128736;&#65039;</span><T k="nav_concierge" /></Link>
            <Link href="/tours" className={pathname.startsWith("/tours") || pathname.startsWith("/experiences") ? "active" : undefined}><span className="ni">&#127905;</span><T k="nav_tours" /></Link>
            <Link href="/our-family" className={pathname.startsWith("/our-family") ? "active" : undefined}><span className="ni">&#128149;</span><T k="nav_family" /></Link>
          </nav>
          <div className="nav-right">
            <button className="tcnav-burger" aria-label="Open menu" onClick={openDrawer}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <div className="lang-wrap">
              <button
                className="lang"
                onClick={(e) => {
                  e.stopPropagation();
                  setLangOpen((o) => !o);
                  setAcctOpen(false);
                }}
              >
                <span>{lang.toUpperCase()}</span> <span style={{ fontSize: 10 }}>&#9662;</span>
              </button>
              <div className={`lang-menu${langOpen ? " open" : ""}`}>
                <a onClick={() => { setLang("en"); setLangOpen(false); }}>&#127468;&#127463; English</a>
                <a onClick={() => { setLang("fr"); setLangOpen(false); }}>&#127467;&#127479; Fran&ccedil;ais</a>
                <a onClick={() => { setLang("es"); setLangOpen(false); }}>&#127474;&#127485; Espa&ntilde;ol</a>
              </div>
            </div>
            <div className="acct-wrap">
              <button
                className="tc-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setAcctOpen((o) => !o);
                  setLangOpen(false);
                }}
              >
                TC
              </button>
              <div className={`acct-menu${acctOpen ? " open" : ""}`} onClick={(e) => e.stopPropagation()}>
                <a className="strong" href="#" onClick={(e) => { e.preventDefault(); auOpen("login"); }}>Log in</a>
                <a href="#" onClick={(e) => { e.preventDefault(); auOpen("signup"); }}>Sign up</a>
                <hr />
                <Link href="/stays" onClick={() => setAcctOpen(false)}>Stays</Link>
                <Link href="/tours" onClick={() => setAcctOpen(false)}>Tours &amp; Transfers</Link>
                <a href={waHref} target="_blank" rel="noopener">Concierge on WhatsApp</a>
                <Link href="/why-book-with-us" onClick={() => setAcctOpen(false)}>Why book with us</Link>
                <Link href="/loyalty" onClick={() => setAcctOpen(false)}>Loyalty program</Link>
                <hr />
                <Link href="/list-my-property" onClick={() => setAcctOpen(false)}>List your property</Link>
                <Link href="/policies" onClick={() => setAcctOpen(false)}>Help &amp; policies</Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* TC mobile nav drawer */}
      <div className={`tcnav-scrim${drawerOpen ? " open" : ""}`} onClick={closeDrawer}></div>
      <aside className={`tcnav-drawer${drawerOpen ? " open" : ""}`} aria-label="Menu">
        <div className="tcnav-top">
          <LogoWord />
          <button className="tcnav-close" onClick={closeDrawer} aria-label="Close menu">&times;</button>
        </div>
        <nav className="tcnav-links">
          <Link href="/stays" onClick={closeDrawer}><span className="ni">&#127968;</span><T k="nav_stays" /></Link>
          <Link href="/concierge" onClick={closeDrawer}><span className="ni">&#128736;&#65039;</span><T k="nav_concierge" /></Link>
          <Link href="/tours" onClick={closeDrawer}><span className="ni">&#127905;</span><T k="nav_tours" /></Link>
          <Link href="/our-family" onClick={closeDrawer}><span className="ni">&#128149;</span><T k="nav_family" /></Link>
          <Link href="/wishlist" onClick={closeDrawer}><span className="ni">&#10084;&#65039;</span>Wishlist <span className="wcount">{wishCount}</span></Link>
        </nav>
        <hr />
        <nav className="tcnav-links secondary">
          <Link href="/tours" onClick={closeDrawer}>Tours &amp; Transfers</Link>
          <Link href="/loyalty" onClick={closeDrawer}>Loyalty program</Link>
          <Link href="/why-book-with-us" onClick={closeDrawer}>Why book with us</Link>
          <Link href="/policies" onClick={closeDrawer}>Help &amp; policies</Link>
          <a href={waHref} target="_blank" rel="noopener">Concierge on WhatsApp</a>
        </nav>
        <div className="tcnav-auth">
          <button onClick={() => { closeDrawer(); auOpen("login"); }}>Log in</button>
          <button className="alt" onClick={() => { closeDrawer(); auOpen("signup"); }}>Sign up</button>
        </div>
        <div className="tcnav-lang">
          <a onClick={() => setLang("en")}>&#127468;&#127463; EN</a>
          <a onClick={() => setLang("fr")}>&#127467;&#127479; FR</a>
          <a onClick={() => setLang("es")}>&#127474;&#127485; ES</a>
        </div>
      </aside>

      <AuthModal key={auth.seq} open={auth.open} mode={auth.mode} onClose={() => setAuth((a) => ({ ...a, open: false }))} />
    </>
  );
}
