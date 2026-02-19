import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  FileText, 
  ClipboardCheck, 
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dockets", label: "Dockets", icon: Package },
  { href: "/tracker", label: "Docket Tracker", icon: Activity },
  { href: "/loading-sheets", label: "Loading Sheets", icon: Truck },
  { href: "/manifests", label: "Manifests", icon: FileText },
  { href: "/thc", label: "THC Management", icon: ClipboardCheck },
  { href: "/pod", label: "POD Review", icon: ClipboardCheck },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const initials = user?.username
    ? user.username
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";
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
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setIsOpen(!isOpen)}
          className="bg-background shadow-md border-primary/20"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 bg-card border-r border-border shadow-2xl transition-all duration-300 ease-in-out transform lg:translate-x-0 w-64 lg:w-[var(--sidebar-width)]",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={cn(
            "h-16 flex items-center border-b border-border bg-primary/5",
            isCollapsed ? "px-3 justify-center lg:justify-between" : "px-6"
          )}>
            <div className="flex items-center gap-2 text-primary">
              <Truck className="h-6 w-6 fill-current" />
              {!isCollapsed && (
                <span className="text-xl font-bold font-display tracking-tight text-foreground">
                  LogiFlow<span className="text-primary">.ai</span>
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex"
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isCollapsed ? "lg:justify-center lg:px-2" : "",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )} title={item.label}>
                  <item.icon className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                  )} />
                  {!isCollapsed && item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 px-3 py-2.5 text-muted-foreground",
                isCollapsed ? "lg:justify-center lg:px-2" : ""
              )}
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <LogOut className="h-5 w-5" />
              {!isCollapsed && (logout.isPending ? "Signing out..." : "Sign out")}
            </Button>
            <div className={cn(
              "mt-4 px-3 flex items-center gap-3",
              isCollapsed ? "lg:justify-center lg:px-2" : ""
            )}>
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-xs">
                {initials}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">
                    {user?.username ?? "User"}
                  </span>
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {user?.role ?? "staff"}
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
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
