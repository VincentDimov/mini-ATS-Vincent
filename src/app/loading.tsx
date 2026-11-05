export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto w-full max-w-6xl space-y-4 p-6"
    >
      <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      <div className="h-28 animate-pulse rounded-2xl bg-muted" />
      <div className="h-56 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
