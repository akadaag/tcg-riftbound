export default function PacksPage() {
  return (
    <div className="flex flex-1 flex-col px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pack Opening</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Open booster packs to discover new cards for your collection.
        </p>
      </div>

      {/* Available packs */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Available Packs</h2>
        <div className="border-card-border bg-card-background rounded-xl border p-6 text-center">
          <div className="border-foreground-muted/30 mx-auto mb-4 flex h-20 w-14 items-center justify-center rounded-lg border-2 border-dashed">
            <span className="text-foreground-muted/50 text-2xl">?</span>
          </div>
          <p className="text-foreground-muted">
            No packs available. Purchase booster packs from the shop to open
            them here.
          </p>
        </div>
      </section>

      {/* Recent opens */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent Opens</h2>
        <div className="border-card-border bg-card-background rounded-xl border p-4">
          <p className="text-foreground-muted text-sm">
            Your pack opening history will appear here.
          </p>
        </div>
      </section>
    </div>
  );
}
