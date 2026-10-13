import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Modul Sales Pipeline ditunda; tautan lama diarahkan ke Project.
    return [{ source: "/sales", destination: "/projects", permanent: false }];
  },
};

export default nextConfig;
