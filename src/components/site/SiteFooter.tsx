"use client";

/** Footer ported 1:1 from the demo's shared chrome. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { T, useLang } from "@/lib/i18n";
import { LogoWord } from "./TutCasaLogo";

export function SiteFooter({ whatsapp }: { whatsapp: string }) {
  const pathname = usePathname();
  const { setLang } = useLang();

  // the admin gets its own chrome — no guest footer there
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer>
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <LogoWord />
            <T as="p" className="foot-blurb" k="foot_blurb" />
            <div className="socials">
              <a href="https://www.facebook.com/TutCasa/" target="_blank" rel="noopener" aria-label="Facebook">
                <svg viewBox="0 0 24 24"><path d="M13 22v-8h2.6l.4-3H13V9c0-.9.2-1.5 1.5-1.5H16V4.9c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.3-3.8 3.8V11H7.5v3H10v8h3z"/></svg>
              </a>
              <a href="https://www.instagram.com/tutcasa/" target="_blank" rel="noopener" aria-label="Instagram">
                <svg viewBox="0 0 24 24"><path d="M12 2c2.7 0 3 0 4.1.1 1 .1 1.7.2 2.3.5.6.2 1.1.5 1.6 1s.8 1 1 1.6c.3.6.4 1.3.5 2.3.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c-.1 1-.2 1.7-.5 2.3-.2.6-.5 1.1-1 1.6s-1 .8-1.6 1c-.6.3-1.3.4-2.3.5-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-1-.1-1.7-.2-2.3-.5-.6-.2-1.1-.5-1.6-1s-.8-1-1-1.6c-.3-.6-.4-1.3-.5-2.3C2 15 2 14.7 2 12s0-3 .1-4.1c.1-1 .2-1.7.5-2.3.2-.6.5-1.1 1-1.6s1-.8 1.6-1c.6-.3 1.3-.4 2.3-.5C9 2 9.3 2 12 2zm0 5a5 5 0 100 10 5 5 0 000-10zm0 8.2a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4zM17.8 5.9a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z"/></svg>
              </a>
            </div>
          </div>
          <div className="foot-col">
            <T as="h5" k="foot_explore" />
            <Link href="/stays"><T k="nav_stays" /></Link>
            <Link href="/experiences"><T k="foot_experiences" /></Link>
            <Link href="/tours"><T k="nav_tours" /></Link>
            <Link href="/concierge"><T k="nav_concierge" /></Link>
          </div>
          <div className="foot-col">
            <T as="h5" k="foot_company" />
            <Link href="/our-family"><T k="nav_family" /></Link>
            <Link href="/investors"><T k="foot_investors" /></Link>
            <Link href="/loyalty"><T k="foot_loyalty" /></Link>
            <Link href="/list-my-property"><T k="foot_list" /></Link>
          </div>
          <div className="foot-col">
            <T as="h5" k="foot_support" />
            <Link href="/policies"><T k="foot_help" /></Link>
            <Link href="/contact"><T k="foot_contact" /></Link>
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener"><T k="foot_concierge" /></a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>&copy; 2026 TutCasa &middot; Hecho con &#10084;&#65039; en la Riviera Maya</span>
          <span className="foot-legal">
            <Link href="/policies"><T k="foot_terms" /></Link>
            <Link href="/policies"><T k="foot_privacy" /></Link>
            <Link href="/policies"><T k="foot_cookies" /></Link>
            <span className="foot-lang">
              &#127760; <a onClick={() => setLang("en")}>EN</a> &middot; <a onClick={() => setLang("fr")}>FR</a> &middot; <a onClick={() => setLang("es")}>ES</a>
            </span>
          </span>
        </div>
      </div>
    </footer>
  );
}
