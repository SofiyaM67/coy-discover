import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev badge sits on top of the bottom tab bar.
  devIndicators: false,
  // libSQL ships a native driver for local files; keep it out of the bundle.
  serverExternalPackages: ["@libsql/client", "libsql"],
  // The assignment names the endpoints /feed, /swipe and /matches.
  // They live under /api and are also served at the bare paths.
  async rewrites() {
    return [
      { source: "/feed", destination: "/api/feed" },
      { source: "/swipe", destination: "/api/swipe" },
      { source: "/matches", destination: "/api/matches" },
    ];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "randomuser.me", pathname: "/api/portraits/**" }],
  },
};

export default nextConfig;
