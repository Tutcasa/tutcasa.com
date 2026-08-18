import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // photo uploads go through a server action; the 1MB default rejects
    // real photos with an opaque "page couldn't load" error
    serverActions: { bodySizeLimit: "12mb" },
  },
  images: {
    // listing photos live in Supabase storage; tour/park photos on Amanah
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "amanahvacations.com" },
      { protocol: "https", hostname: "tutcasa.com" },
    ],
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
