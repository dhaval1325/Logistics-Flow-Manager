import { Link } from "wouter";

export function Header() {
  return (
    <header className="sticky top-0 z-30 -mx-6 lg:-mx-8 mb-6">
      <div className="bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-semibold text-foreground">Operations</span>
            <span>/</span>
            <span>Logistics Suite</span>
          </div>
          <Link
            href="/dockets"
            className="rounded-full bg-[#0b74b8] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
          >
            New Docket
          </Link>
        </div>
      </div>
    </header>
  );
}
