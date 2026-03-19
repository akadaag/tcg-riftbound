export default function ShopPage() {
  return (
    <div className="flex flex-1 flex-col px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Shop</h1>
        <p className="text-foreground-secondary mt-1 text-sm">
          Manage your products, stock, and sales.
        </p>
      </div>

      {/* Products on display */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Products on Display</h2>
        <div className="border-card-border bg-card-background rounded-xl border p-6 text-center">
          <p className="text-foreground-muted">
            Your shop is empty. Purchase stock from the supplier to get started.
          </p>
        </div>
      </section>

      {/* Customer flow */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Customer Flow</h2>
        <div className="border-card-border bg-card-background rounded-xl border p-6 text-center">
          <p className="text-foreground-muted">
            No customers yet. Stock your shelves to attract buyers.
          </p>
        </div>
      </section>

      {/* Stock inventory link */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Inventory</h2>
        <div className="border-card-border bg-card-background rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Stock Management</p>
              <p className="text-foreground-secondary text-sm">
                0 products in stock
              </p>
            </div>
            <span className="text-foreground-muted">&rarr;</span>
          </div>
        </div>
      </section>
    </div>
  );
}
