import { Switch, Route } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import Dashboard from "@/pages/Dashboard";
import Dockets from "@/pages/Dockets";
import LoadingSheets from "@/pages/LoadingSheets";
import Manifests from "@/pages/Manifests";
import ThcManagement from "@/pages/ThcManagement";
import PodReview from "@/pages/PodReview";
import DocketTracker from "@/pages/DocketTracker";
import AuditLogs from "@/pages/AuditLogs";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { getUiAuth, onUiAuthChange } from "@/lib/ui-auth";

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <Topbar />
      <div className="flex pt-[var(--topbar-height)]">
        <Sidebar />
        <main className="flex-1 lg:ml-[var(--sidebar-width)] p-6 lg:p-8 overflow-y-auto h-[calc(100vh-var(--topbar-height))]">
          <div className="max-w-7xl mx-auto pb-10">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/dockets" component={Dockets} />
            <Route path="/loading-sheets" component={LoadingSheets} />
            <Route path="/manifests" component={Manifests} />
            <Route path="/thc" component={ThcManagement} />
            <Route path="/pod" component={PodReview} />
            <Route path="/tracker" component={DocketTracker} />
            <Route path="/audit-logs" component={AuditLogs} />
            <Route component={NotFound} />
          </Switch>
        </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  const [isAuthed, setIsAuthed] = useState(() => getUiAuth());

  useEffect(() => {
    const handleAuthChange = () => setIsAuthed(getUiAuth());
    const cleanup = onUiAuthChange(handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      cleanup();
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {isAuthed ? <Router /> : <Login onLogin={() => setIsAuthed(true)} />}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
