import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atlas Derslik · AtlasAI",
    short_name: "Atlas",
    description: "Derslerin, gelişimin ve yapay zekâ öğrenme arkadaşın bir arada.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7faf9",
    theme_color: "#102d35",
    lang: "tr",
    icons: [
      { src: "/atlas-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/atlas-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
