import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/invoice/", "/extra/", "/management", "/booking", "/tour-booking/", "/review/", "/invite"],
    },
    sitemap: "https://tutcasa.com/sitemap.xml",
  };
}
