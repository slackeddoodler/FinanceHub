import type { NextConfig } from "next";
import dns from "node:dns";

// Fixes Node 18+ undici fetch issues (decryption failed / bad record mac)
// Highly recommended when routing local traffic through SOCKS proxies or encrypted DNS.
dns.setDefaultResultOrder("ipv4first");

const nextConfig: NextConfig = {
  // output: 'export', 
  trailingSlash: false,
  images: {
    unoptimized: true, 
  },
};

export default nextConfig;