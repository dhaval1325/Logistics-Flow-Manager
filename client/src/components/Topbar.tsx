import { Bell, ChevronDown, Grid2x2, Search } from "lucide-react";

export function Topbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[var(--topbar-height)] bg-[var(--topbar-bg)] text-[var(--topbar-text)] border-b border-[color:var(--topbar-border)] shadow-sm">
      <div className="mx-auto flex h-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-[var(--topbar-pill)] flex items-center justify-center text-xs font-bold">
              LF
            </div>
            <div className="text-sm font-semibold tracking-wide">LogiFlow.ai</div>
          </div>
          <div className="hidden md:flex items-center gap-1">
            <button className="h-9 w-9 rounded-full bg-[var(--topbar-pill)] text-[var(--topbar-text)] flex items-center justify-center hover:bg-[var(--topbar-pill-hover)] transition">
              <Search className="h-4 w-4" />
            </button>
            <button className="h-9 w-9 rounded-full bg-[var(--topbar-pill)] text-[var(--topbar-text)] flex items-center justify-center hover:bg-[var(--topbar-pill-hover)] transition">
              <Grid2x2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="hidden sm:flex items-center gap-2 bg-[var(--topbar-pill)] px-3 py-1 rounded-full">
            <span className="font-semibold">LogiFlow Technologies</span>
            <ChevronDown className="h-3 w-3" />
          </div>
          <button className="relative h-9 w-9 rounded-full bg-[var(--topbar-pill)] text-[var(--topbar-text)] flex items-center justify-center hover:bg-[var(--topbar-pill-hover)] transition">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] flex items-center justify-center">
              3
            </span>
          </button>
          <div className="h-9 w-9 rounded-full bg-[var(--topbar-pill)] flex items-center justify-center text-xs font-semibold">
            SA
          </div>
        </div>
      </div>
    </header>
  );
}
