/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

/**
 * Riftbound Shop — Service Worker
 *
 * Caching strategy (designed to cover all milestones, set once):
 * - App shell: cache-first (pages load instantly after first visit)
 * - Static assets (_next/static/): cache-first with long TTL
 * - Images (card art, icons): stale-while-revalidate
 * - API/Supabase calls: network-first with offline fallback
 * - Navigation requests: network-first, fallback to /~offline
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
  runtimeCaching: defaultCache,
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
