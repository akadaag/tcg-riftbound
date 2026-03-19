export default function MissionsPage() {
  return (
    <div className="flex flex-1 flex-col px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Missions</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Complete objectives to earn rewards and progress.
        </p>
      </div>

      <div className="border-card-border bg-card-background rounded-xl border p-6 text-center">
        <p className="text-foreground-muted">
          Missions will be available once the core gameplay loop is implemented.
        </p>
      </div>
    </div>
  );
}
