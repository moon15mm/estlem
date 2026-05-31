/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    domains: ['estlem-media.s3.me-south-1.amazonaws.com', 'via.placeholder.com'],
  },
};

// Only enable PWA in production with a service worker
try {
  const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV !== 'production',
  });
  module.exports = withPWA(nextConfig);
} catch {
  module.exports = nextConfig;
}
