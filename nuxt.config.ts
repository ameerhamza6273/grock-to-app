// https://nuxt.com/docs/api/configuration/nuxt-config

// FastAPI backend (see backend/). Nuxt proxies these paths to it so the browser only
// ever talks to one origin — no CORS, and Nginx only needs to forward to Nuxt.
const backendUrl = (process.env.BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '')

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  future: { compatibilityVersion: 4 },
  ssr: false,
  runtimeConfig: {
    // Empty = use the proxy below. Set NUXT_PUBLIC_API_BASE for static hosting.
    public: { apiBase: '' }
  },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Product Template Generator',
      meta: [{ name: 'robots', content: 'noindex, nofollow' }]
    }
  },
  routeRules: {
    '/api/**': { proxy: `${backendUrl}/api/**` },
    '/uploads/**': { proxy: `${backendUrl}/uploads/**` },
    '/download/**': { proxy: `${backendUrl}/download/**` }
  }
})
