import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Riftbound Shop",
    short_name: "Riftbound",
    description:
      "Manage your Riftbound card shop — buy stock, open packs, collect cards, upgrade your store.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0c14",
    theme_color: "#7c5cfc",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-512-maskable.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
