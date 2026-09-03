export default function Loading() {
  return (
    <main className="flex-1 animate-pulse">
      <div className="bg-navy">
        <div className="mx-auto max-w-5xl px-6 pt-14 pb-20">
          <div className="h-3 w-20 rounded bg-white/10" />
          <div className="mt-8 flex items-end gap-5">
            <div className="size-24 rounded-xl bg-white/10" />
            <div className="flex flex-col gap-2">
              <div className="h-9 w-64 rounded bg-white/10" />
              <div className="h-3 w-40 rounded bg-white/10" />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto -mt-12 max-w-5xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="border-border bg-card h-40 rounded-xl border"
              />
            ))}
          </div>
          <div className="flex flex-col gap-5">
            <div className="border-border bg-card h-36 rounded-xl border" />
            <div className="border-border bg-card h-28 rounded-xl border" />
          </div>
        </div>
      </div>
    </main>
  );
}
