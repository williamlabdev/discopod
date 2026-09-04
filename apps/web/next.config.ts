import type { NextConfig } from 'next';

/**
 * Two build modes, both vendor-neutral:
 *
 *   next build                 → Node server build, run with `next start`
 *   STATIC_EXPORT=1 next build → fully static `out/`, hostable on any file server
 *
 * Every route currently prerenders, so the static export is complete today and
 * is the fastest way to put a public demo online. Switch back to the Node build
 * once pages start fetching from @discopod/api at request time.
 */
const nextConfig: NextConfig = {
  ...(process.env.STATIC_EXPORT === '1' ? { output: 'export' as const } : {}),
  images: { unoptimized: process.env.STATIC_EXPORT === '1' },
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  },
};

export default nextConfig;
