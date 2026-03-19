import { createSerwistRoute } from "@serwist/turbopack";

/**
 * Serwist Turbopack Route Handler.
 * Compiles and serves the service worker via esbuild.
 * The SW is available at /serwist/sw.js.
 */

// Use Vercel's git commit SHA (auto-set on Vercel) for stable precache revision.
// Falls back to random UUID for local dev or non-Vercel environments.
const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [{ url: "/~offline", revision }],
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
  });
