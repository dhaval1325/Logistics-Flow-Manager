import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  FileText, 
  ClipboardCheck, 
  Activity,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dockets", label: "Dockets", icon: Package },
  { href: "/tracker", label: "Docket Tracker", icon: Activity },
  { href: "/loading-sheets", label: "Loading Sheets", icon: Truck },
  { href: "/manifests", label: "Manifests", icon: FileText },
  { href: "/thc", label: "THC Management", icon: ClipboardCheck },
  { href: "/pod", label: "POD Review", icon: ClipboardCheck },
  { href: "/audit-logs", label: "Audit Logs", icon: ClipboardList },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const initials = "LF";
  const isCollapsed = collapsed;

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty(
      "--sidebar-width",
      isCollapsed ? "var(--sidebar-width-collapsed)" : "16rem",
    );
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-collapsed", String(isCollapsed));
    }
  }, [isCollapsed]);

  return (
    <>
      {/* Mobile Toggle */}
      <div className="lg:hidden fixed top-[calc(var(--topbar-height)+0.75rem)] left-4 z-50">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[color:var(--card)] shadow-md border-[color:var(--sidebar-border)]"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed left-0 top-[var(--topbar-height)] bottom-0 z-40 bg-[var(--sidebar-bg)] shadow-lg transition-all duration-300 ease-in-out transform lg:translate-x-0 w-64 lg:w-[var(--sidebar-width)]",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="h-16 px-6 flex items-center">
            <div className="flex items-center gap-2 text-[var(--sidebar-text)] font-semibold">
              <Truck className="h-5 w-5 text-[var(--accent-strong)]" />
              {!isCollapsed && (
                <span className="text-base">
                  LogiFlow<span className="text-[var(--accent-strong)]">.ai</span>
                </span>
              )}
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isCollapsed ? "lg:justify-center lg:px-2" : "",
                  isActive 
                    ? "bg-[var(--accent-strong)] text-white shadow-sm shadow-black/5" 
                    : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]"
                )} title={item.label}>
                  <item.icon className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-white" : "text-[var(--sidebar-muted)] group-hover:text-[var(--sidebar-text)]"
                  )} />
                  {!isCollapsed && item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className={cn(
                "mb-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isCollapsed ? "lg:justify-center lg:px-2" : "",
                "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]"
              )}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
              {!isCollapsed && "Collapse"}
            </button>
            <div className={cn(
              "mt-4 px-3 flex items-center gap-3",
              isCollapsed ? "lg:justify-center lg:px-2" : ""
            )}>
              <div className="h-8 w-8 rounded-full bg-[var(--sidebar-hover)] flex items-center justify-center text-[var(--sidebar-text)] font-bold text-xs">
                {initials}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-[var(--sidebar-text)]">
                    Guest
                  </span>
                  <span className="text-[10px] text-[var(--sidebar-muted)] capitalize">
                    Access
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
