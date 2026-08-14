import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
