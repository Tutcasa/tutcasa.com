import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 bg-ink px-4 py-12 text-white/80 sm:px-6">
      <div className="mx-auto grid max-w-[1180px] gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="font-display text-xl font-extrabold text-white">TUT CASA</div>
          <div className="mb-3 text-xs text-sol">A king in your own house</div>
          <p className="max-w-[28ch] text-sm">
            A family-run collection of homes across Mexico, Egypt &amp; Florida.
            Book direct, pay safely, stay like a king.
          </p>
        </div>
        <div>
          <div className="mb-3 font-display font-bold text-white">Explore</div>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/stays">Stays</Link></li>
            <li><Link className="hover:text-white" href="/tours">Tours &amp; Parks</Link></li>
            <li><Link className="hover:text-white" href="/concierge">Concierge</Link></li>
            <li><Link className="hover:text-white" href="/gift-cards">Gift cards</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 font-display font-bold text-white">TutCasa</div>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/our-family">Our family</Link></li>
            <li><Link className="hover:text-white" href="/why-book-with-us">Why book with us</Link></li>
            <li><Link className="hover:text-white" href="/list-my-property">List your property</Link></li>
            <li><Link className="hover:text-white" href="/policies">Help &amp; policies</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 font-display font-bold text-white">Talk to May</div>
          <p className="mb-3 text-sm">Questions? Our concierge replies in minutes.</p>
          <a
            href="https://wa.me/201069706782"
            target="_blank"
            rel="noopener"
            className="inline-block rounded-pill bg-[#1EBE5D] px-5 py-2.5 text-sm font-bold text-white"
          >
            WhatsApp concierge
          </a>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-[1180px] border-t border-white/15 pt-6 text-xs text-white/50">
        © {new Date().getFullYear()} TutCasa. All rights reserved.
      </div>
    </footer>
  );
}
