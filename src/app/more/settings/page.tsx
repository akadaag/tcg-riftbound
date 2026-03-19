"use client";

import { useAuth } from "@/features/auth/auth-provider";
import { useGameStore } from "@/stores/game-store";
import { signOut } from "@/app/(auth)/login/actions";
import { useState } from "react";
import { useTheme } from "@/components/ui/theme-provider";
import type { Theme } from "@/components/ui/theme-provider";

export default function SettingsPage() {
  const { user, displayName } = useAuth();
  const { syncStatus, save, setNotificationPreference } = useGameStore();
  const [notifError, setNotifError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  const themeOptions: { value: Theme; label: string }[] = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  const syncStatusConfig: Record<
    string,
    { label: string; color: string; bg: string }
  > = {
    synced: {
      label: "Synced",
      color: "text-success",
      bg: "bg-success/20",
    },
    saving_locally: {
      label: "Saving...",
      color: "text-info",
      bg: "bg-info/20",
    },
    syncing_cloud: {
      label: "Syncing...",
      color: "text-info",
      bg: "bg-info/20",
    },
    offline: {
      label: "Offline",
      color: "text-warning",
      bg: "bg-warning/20",
    },
    sync_error: {
      label: "Error",
      color: "text-error",
      bg: "bg-error/20",
    },
  };

  const status = syncStatusConfig[syncStatus] ?? syncStatusConfig.offline;

  return (
    <div className="flex flex-1 flex-col px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Account, cloud sync, and preferences.
        </p>
      </div>

      {/* Account section */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Account</h2>
        <div className="border-card-border bg-card-background space-y-3 rounded-xl border p-4">
          {user ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-foreground-secondary text-sm">Name</p>
                <p className="text-sm font-medium">
                  {displayName || "Shopkeeper"}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-foreground-secondary text-sm">Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
              <form action={signOut} className="pt-2">
                <button
                  type="submit"
                  className="text-error hover:text-error/80 min-h-[44px] text-sm font-medium transition-colors"
                >
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            <p className="text-foreground-muted text-sm">Not signed in.</p>
          )}
        </div>
      </section>

      {/* Sync section */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Cloud Sync</h2>
        <div className="border-card-border bg-card-background rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm">Sync Status</p>
            <span
              className={`${status.bg} ${status.color} rounded-full px-2 py-0.5 text-xs`}
            >
              {status.label}
            </span>
          </div>
        </div>
      </section>

      {/* Theme section */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Theme</h2>
        <div className="border-card-border bg-card-background rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Appearance</p>
            <div className="bg-background-tertiary flex gap-1 rounded-lg p-1">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`min-h-[36px] rounded-md px-3 text-xs font-medium transition-colors ${
                    theme === opt.value
                      ? "bg-accent-primary text-white"
                      : "text-foreground-secondary hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Notifications section */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Notifications</h2>
        <div className="border-card-border bg-card-background rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Push Notifications</p>
              <p className="text-foreground-muted text-xs">
                Alerts for offline earnings, events, and set completions.
              </p>
              <p className="text-foreground-muted mt-0.5 text-[10px]">
                On iOS, the app must be added to your Home Screen first.
              </p>
              {notifError && (
                <p className="text-error mt-1 text-xs">{notifError}</p>
              )}
            </div>
            <button
              onClick={async () => {
                setNotifError(null);
                if (save.notificationPreference) {
                  setNotificationPreference(false);
                } else {
                  if (!("Notification" in window)) {
                    setNotifError("Notifications not supported.");
                    return;
                  }
                  const perm = await Notification.requestPermission();
                  if (perm === "granted") {
                    setNotificationPreference(true);
                  } else {
                    setNotifError(
                      "Permission denied. Enable in browser settings.",
                    );
                  }
                }
              }}
              className={`relative min-h-[32px] w-12 rounded-full transition-colors ${
                save.notificationPreference
                  ? "bg-accent-primary"
                  : "bg-card-border"
              }`}
              aria-label={
                save.notificationPreference
                  ? "Disable notifications"
                  : "Enable notifications"
              }
            >
              <span
                className={`absolute top-1 block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  save.notificationPreference
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* About section */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">About</h2>
        <div className="space-y-2">
          <div className="border-card-border bg-card-background rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm">Version</p>
              <p className="text-foreground-secondary text-sm">0.1.0</p>
            </div>
          </div>
          <div className="border-card-border bg-card-background rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm">Build</p>
              <p className="text-foreground-secondary text-sm">
                M12 iOS + Vercel
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
