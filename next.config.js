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

// Extract just the origin (scheme + host + port) so CSP path-matching works for all sub-paths
const _apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const API_ORIGIN = new URL(_apiUrl).origin          // e.g. 'http://localhost:4000'
const WS_ORIGIN = API_ORIGIN.replace(/^http/, 'ws') // e.g. 'ws://localhost:4000'

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js needs unsafe-inline for its runtime; unsafe-eval for dev HMR
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      `img-src 'self' data: blob: ${API_ORIGIN}`,
      "font-src 'self' https://fonts.gstatic.com",
      `connect-src 'self' ${API_ORIGIN} ${WS_ORIGIN} https://fonts.googleapis.com https://fonts.gstatic.com`,
      "worker-src 'self' blob:",
      "frame-src 'none'",
      "object-src 'none'",
    ].join('; '),
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
]

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

module.exports = withPWA(nextConfig);
