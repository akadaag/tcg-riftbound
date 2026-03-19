export default function CollectionPage() {
  return (
    <div className="flex flex-1 flex-col px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Collection</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Your card binder — track your sets and collection progress.
        </p>
      </div>

      {/* Collection overview */}
      <section className="mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="border-card-border bg-card-background rounded-xl border p-3 text-center">
            <p className="text-foreground-muted text-xs">Total Cards</p>
            <p className="mt-1 text-xl font-bold">0</p>
          </div>
          <div className="border-card-border bg-card-background rounded-xl border p-3 text-center">
            <p className="text-foreground-muted text-xs">Unique</p>
            <p className="mt-1 text-xl font-bold">0</p>
          </div>
          <div className="border-card-border bg-card-background rounded-xl border p-3 text-center">
            <p className="text-foreground-muted text-xs">Sets</p>
            <p className="mt-1 text-xl font-bold">0</p>
          </div>
        </div>
      </section>

      {/* Sets list */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Sets</h2>
        <div className="border-card-border bg-card-background rounded-xl border p-6 text-center">
          <p className="text-foreground-muted">
            No sets discovered yet. Open packs to start your collection.
          </p>
        </div>
      </section>
    </div>
  );
}
