/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // keep the native sqlite module external to the bundler
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
};

export default nextConfig;
