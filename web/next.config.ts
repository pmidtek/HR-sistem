import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Izinkan buka dev server dari HP/laptop lain di WiFi yang sama (mis. http://192.168.100.247:3000).
  allowedDevOrigins: ["192.168.*.*"],
  async redirects() {
    // Modul Sales Pipeline ditunda; tautan lama diarahkan ke Project.
    return [
      { source: "/sales", destination: "/projects", permanent: false },
      // Directus Admin dibuka lewat /panel.
      { source: "/panel", destination: "/panel/admin", permanent: false },
    ];
  },
  async rewrites() {
    // Backend Directus di-proxy lewat /panel (API: /panel/items/..., admin: /panel/admin).
    // Satu domain dengan frontend → cookie login aman & tidak perlu CORS.
    const directus = process.env.DIRECTUS_INTERNAL_URL ?? "http://127.0.0.1:8055";
    return [{ source: "/panel/:path*", destination: `${directus}/:path*` }];
  },
};

export default nextConfig;
