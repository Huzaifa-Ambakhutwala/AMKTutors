import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AMK Tutors - Personalized Tutoring",
    short_name: "AMK Tutors",
    description:
      "Personalized Tutoring. Trusted Results. Expert tutors for Math, English, Science, and more.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F9FAFB",
    theme_color: "#800000",
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

