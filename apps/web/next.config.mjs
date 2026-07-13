/** apps/web/next.config.mjs */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API_BASE_URL est lu côté serveur uniquement (Route Handlers, Server
  // Components, middleware) — jamais exposé au bundle client via NEXT_PUBLIC_*,
  // puisque le navigateur n'a jamais besoin de connaître l'URL de l'API.
};

export default nextConfig;
