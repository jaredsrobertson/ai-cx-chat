// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_DIALOGFLOW_PROJECT_ID: process.env.DIALOGFLOW_PROJECT_ID || '',
  },
  // If you're using experimental features, they can go here
  experimental: {
    // Your turbopack setting is defined in package.json scripts, not here
  },
};

export default nextConfig;