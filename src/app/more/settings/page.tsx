export default function SettingsPage() {
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
        <div className="border-card-border bg-card-background rounded-xl border p-4">
          <p className="text-foreground-muted text-sm">
            Not signed in. Authentication will be available in a future update.
          </p>
        </div>
      </section>

      {/* Sync section */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Cloud Sync</h2>
        <div className="border-card-border bg-card-background rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm">Sync Status</p>
            <span className="bg-warning/20 text-warning rounded-full px-2 py-0.5 text-xs">
              Offline
            </span>
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
              <p className="text-foreground-secondary text-sm">M0 Foundation</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
