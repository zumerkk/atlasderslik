import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atlas Derslik · AtlasAI",
    short_name: "Atlas",
    description: "Derslerin, gelişimin ve yapay zekâ öğrenme arkadaşın bir arada.",
    start_url: "/",
    display: "standalone",
    background_color: "#e5f7f2",
    theme_color: "#155e68",
    lang: "tr",
    icons: [
      { src: "/atlas-icon-192.png?v=atlas-book-20261120", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/atlas-icon-512.png?v=atlas-book-20261120", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
