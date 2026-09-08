import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or thin surfaces: nothing to index, and crawling them just
      // burns budget that the catalogue could be using.
      disallow: ["/api/", "/account/", "/studio/", "/cart", "/checkout", "/search"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
