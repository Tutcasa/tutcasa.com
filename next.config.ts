import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // photo uploads go through a server action; the 1MB default rejects
    // real photos with an opaque "page couldn't load" error
    serverActions: { bodySizeLimit: "12mb" },
  },
  images: {
    // Serve photos as-is: Vercel Hobby's monthly image-optimization quota ran
    // out (Nov 2026 → 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED = blank
    // photos). Uploads are already compressed (median ~275 KB, max <1 MB).
    // ponytail: re-enable optimization if the project moves to Vercel Pro.
    unoptimized: true,
    // listing photos live in Supabase storage; tour/park photos on Amanah
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "amanahvacations.com" },
      { protocol: "https", hostname: "tutcasa.com" },
    ],
  },
  // Old WordPress (WpRentals) addresses → their new pages, so Google results,
  // bookmarks and shared links keep working after the switch (301 = permanent).
  async redirects() {
    const home = (from: string, slug: string) =>
      ({ source: `/properties/${from}`, destination: `/stays/${slug}`, permanent: true });
    return [
      // one address for Google: www → tutcasa.com
      { source: "/:path*", has: [{ type: "host", value: "www.tutcasa.com" }], destination: "https://tutcasa.com/:path*", permanent: true },
      home("casa-bonita-oceanfront-walkout-pool-mareazul", "casa-bonita-oceanfront-private-pool-condo-mareazul"),
      home("condo-andalucia-oceanfront-walkout-pool-mareazul-free-private-pool-and-jacuzzi-gym-tennis-ping-pong", "andalucia-oceanfront-private-pool-condo-mareazul"),
      home("casa-lanai-spectacular-ocean-view-4-bedroom-mareazul", "casa-lanai-ocean-view-4-bedroom-mareazul"),
      home("casa-miramar-ocean-view-mareazul-2", "casa-paraiso-maya-ocean-view-private-pool-mareazul"),
      home("sinaan-balaam-luxurious-villa-rooftop-pool-bar", "luxury-20-guest-rooftop-pool-villa-in-tulum-sinaan-balaam"),
      home("sinaan-balaam-luxurious-villa-1st-floor-rooftop-pool-bar", "luxury-20-guest-rooftop-pool-villa-in-tulum-sinaan-balaam"),
      home("sinaan-balaam-luxurious-villa-2nd-floor-rooftop-pool-bar", "luxury-20-guest-rooftop-pool-villa-in-tulum-sinaan-balaam"),
      home("spiritum-marea-oceanfront-walkout-pool-mareazul", "spiritum-marea-oceanfront-private-pool-condo-mareazul"),
      home("paraiso-azul-oceanfront-mareazul", "paraiso-azul-oceanfront-mareazul"),
      home("casa-turquesa-private-pool-condo", "casa-del-mar-private-pool-condo-mareazul"),
      home("vista-al-mar-ocean-view-penthouse", "oceanview-penthouse-vista-playa-mareazul"),
      // early slugs garbled by dropped accents (renamed 2026-09-26)
      { source: "/stays/andaluc-a-oceanfront-private-pool-condo-mareazul", destination: "/stays/andalucia-oceanfront-private-pool-condo-mareazul", permanent: true },
      { source: "/stays/para-so-azul-oceanfront-mareazul", destination: "/stays/paraiso-azul-oceanfront-mareazul", permanent: true },
      // homes no longer offered (Orlando, Egypt, Esmeralda) and anything else
      { source: "/properties/:path*", destination: "/stays", permanent: true },
      { source: "/advanced-search", destination: "/stays", permanent: true },
      { source: "/contact-us", destination: "/contact", permanent: true },
      { source: "/friendship-loyalty-program", destination: "/loyalty", permanent: true },
      { source: "/vacation-rentals-tutcasa", destination: "/tours", permanent: true },
      { source: "/favorites", destination: "/wishlist", permanent: true },
      ...["/shop", "/cart", "/checkout", "/my-account/:path*", "/my-bookings", "/my-reservations",
          "/dashboard", "/my-profile", "/invoices", "/sample-page"]
        .map((source) => ({ source, destination: "/", permanent: true })),
    ];
  },
  async headers() {
    // Client-preview deployments must never be indexed — a public copy of
    // the site on vercel.app would compete with tutcasa.com in Google.
    // Set NOINDEX=1 on preview deployments; leave it unset at launch.
    if (process.env.NOINDEX === "1") {
      return [
        {
          source: "/:path*",
          headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
