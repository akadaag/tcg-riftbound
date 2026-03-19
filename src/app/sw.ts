/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, CacheFirst, ExpirationPlugin } from "serwist";

/**
 * Riftbound Shop — Service Worker
 *
 * Caching strategy (designed to cover all milestones, set once):
 * - App shell: cache-first (pages load instantly after first visit)
 * - Static assets (_next/static/): cache-first with long TTL
 * - Images (card art, icons): stale-while-revalidate
 * - API/Supabase calls: network-first with offline fallback
 * - Navigation requests: network-first, fallback to /~offline
 * - Card art (cmsassets.rgpub.io): cache-first, 30-day TTL, 500 entries
 *
 * The `defaultCache` from @serwist/turbopack already covers most
 * of these patterns. We add an offline fallback for navigation.
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // CacheFirst for card art images from Riot's CDN
    {
      matcher: ({ url }) => url.hostname === "cmsassets.rgpub.io",
      handler: new CacheFirst({
        cacheName: "card-art-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 500,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
