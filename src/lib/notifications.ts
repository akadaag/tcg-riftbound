/**
 * Local push notification helpers for Riftbound Shop.
 * All functions are no-ops if the player has not granted permission,
 * or if the browser does not support the Notification API.
 */

function canNotify(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  );
}

/** Fire a notification only when the save has notificationPreference enabled. */
function fireNotification(
  enabled: boolean,
  title: string,
  options?: NotificationOptions,
): void {
  if (!enabled || !canNotify()) return;
  new Notification(title, {
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    ...options,
  });
}

/**
 * Fired when the player returns after being away (offline progress).
 */
export function notifyOfflineReturn(
  enabled: boolean,
  revenue: number,
  hoursElapsed: number,
): void {
  fireNotification(enabled, "Your shop earned while you were away!", {
    body: `+${revenue.toLocaleString()} G over ${hoursElapsed.toFixed(1)} hours.`,
    tag: "offline-return",
  });
}

/**
 * Fired at the start of a new day (day transition).
 */
export function notifyDayStart(enabled: boolean, day: number): void {
  fireNotification(enabled, `Day ${day} has begun!`, {
    body: "Head back to your shop to serve customers.",
    tag: "day-start",
  });
}

/**
 * Fired when one or more sets are completed.
 */
export function notifySetComplete(enabled: boolean, setNames: string[]): void {
  const name = setNames.length === 1 ? setNames[0] : `${setNames.length} sets`;
  fireNotification(enabled, `Set complete: ${name}!`, {
    body: "Check your end-of-day report for your reward.",
    tag: "set-complete",
  });
}
