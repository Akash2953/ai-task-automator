/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ata/db"],
};

module.exports = nextConfig;

// Enable Cloudflare bindings during local `next dev` when using OpenNext.
try {
  const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");
  initOpenNextCloudflareForDev();
} catch {
  // Package may be unavailable in some local setups; ignore.
}
