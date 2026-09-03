import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WorkTime — Task Scheduling",
    short_name: "WorkTime",
    description: "Time-aware task planning and workload scheduling.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F7F4",
    theme_color: "#2D5A8C",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
