import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/Sidebar";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

import Dashboard from "@/pages/Dashboard";
import Dockets from "@/pages/Dockets";
import LoadingSheets from "@/pages/LoadingSheets";
import Manifests from "@/pages/Manifests";
import ThcManagement from "@/pages/ThcManagement";
import PodReview from "@/pages/PodReview";
import DocketTracker from "@/pages/DocketTracker";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

function Router() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const isAuthRoute = location === "/login" || location === "/register";

  useEffect(() => {
    if (!isLoading && !user && !isAuthRoute) {
      setLocation("/login");
    }
  }, [isLoading, user, isAuthRoute, setLocation]);

  useEffect(() => {
    if (!isLoading && user && isAuthRoute) {
      setLocation("/");
    }
  }, [isLoading, user, isAuthRoute, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading session...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 lg:ml-[var(--sidebar-width)] p-6 lg:p-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto pb-10">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/dockets" component={Dockets} />
            <Route path="/loading-sheets" component={LoadingSheets} />
            <Route path="/manifests" component={Manifests} />
            <Route path="/thc" component={ThcManagement} />
            <Route path="/pod" component={PodReview} />
            <Route path="/tracker" component={DocketTracker} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
