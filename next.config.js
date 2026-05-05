/** @type {import('next').NextConfig} */
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  customWorkerSrc: "worker",
  runtimeCaching: [
    {
      // API calls — NetworkFirst with IDB fallback handled in the app layer
      urlPattern: /\/api\//,
      handler: "NetworkFirst",
      options: {
        cacheName: "taskflow-api-v1",
        expiration: { maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 },
        networkTimeoutSeconds: 8,
      },
    },
    {
      // Next.js page navigation — StaleWhileRevalidate so offline gets the cached shell
      urlPattern: ({ request }) => request.mode === "navigate",
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "taskflow-pages-v1",
        expiration: { maxEntries: 30, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      // Static assets (JS/CSS/fonts/images)
      urlPattern: /\.(?:js|css|woff2?|png|jpg|svg|ico)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "taskflow-static-v1",
        expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
