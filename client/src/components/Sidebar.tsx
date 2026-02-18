import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  FileText, 
  ClipboardCheck, 
  Settings,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dockets", label: "Dockets", icon: Package },
  { href: "/loading-sheets", label: "Loading Sheets", icon: Truck },
  { href: "/manifests", label: "Manifests", icon: FileText },
  { href: "/thc", label: "THC Management", icon: ClipboardCheck },
  { href: "/pod", label: "POD Review", icon: ClipboardCheck },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

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
        "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border shadow-2xl transition-transform duration-300 ease-in-out transform lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="h-16 flex items-center px-6 border-b border-border bg-primary/5">
            <div className="flex items-center gap-2 text-primary">
              <Truck className="h-6 w-6 fill-current" />
              <span className="text-xl font-bold font-display tracking-tight text-foreground">
                LogiFlow<span className="text-primary">.ai</span>
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  <item.icon className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                  )} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Settings className="h-5 w-5" />
              Settings
            </button>
            <div className="mt-4 px-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-xs">
                JD
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">John Doe</span>
                <span className="text-[10px] text-muted-foreground">Logistics Manager</span>
              </div>
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
