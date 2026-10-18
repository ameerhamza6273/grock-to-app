// Backend access. With apiBase empty (default) everything is same-origin and Nuxt's
// routeRules proxy forwards it. For a static build (`nuxt generate`, e.g. on shared
// hosting) set NUXT_PUBLIC_API_BASE to the backend URL at generate time.
export function useApi() {
  const base = useRuntimeConfig().public.apiBase.replace(/\/$/, '')
  return {
    base,
    api: $fetch.create({ baseURL: base || undefined }),
    // Backend-relative paths like /uploads/... → absolute when the backend is elsewhere
    asset: (path: string) => (path.startsWith('/') ? base + path : path)
  }
}
