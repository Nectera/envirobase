import type { MetadataRoute } from "next";
import { COMPANY_NAME, APP_NAME, BRAND_COLOR } from "@/lib/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: COMPANY_NAME,
    short_name: APP_NAME,
    description: "Project management for environmental abatement",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: BRAND_COLOR,
    orientation: "any",
    icons: [
      {
        src: process.env.NEXT_PUBLIC_ICON_192 || "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: process.env.NEXT_PUBLIC_ICON_512 || "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: process.env.NEXT_PUBLIC_ICON_512 || "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
