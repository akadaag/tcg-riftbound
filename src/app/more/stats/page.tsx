export default function StatsPage() {
  return (
    <div className="flex flex-1 flex-col px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Statistics</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Detailed stats for your shop and collection.
        </p>
      </div>

      <div className="border-card-border bg-card-background rounded-xl border p-6 text-center">
        <p className="text-foreground-muted">
          Statistics will be tracked once you start playing.
        </p>
      </div>
    </div>
  );
}
