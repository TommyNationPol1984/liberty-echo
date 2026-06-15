import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Voices from "@/pages/voices";
import ConsentPage from "@/pages/consent";
import Synthesis from "@/pages/synthesis";
import HistoryPage from "@/pages/history";
import SettingsPage from "@/pages/settings";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import PricingPage from "@/pages/pricing";
import MusicStudio from "@/pages/music-studio";
import { useAuth } from "@/hooks/use-auth";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1C1C2E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F5A623]" />
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;

  const sidebarStyle = { "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/dashboard"><AuthGuard><Dashboard /></AuthGuard></Route>
      <Route path="/voices"><AuthGuard><Voices /></AuthGuard></Route>
      <Route path="/consent"><AuthGuard><ConsentPage /></AuthGuard></Route>
      <Route path="/synthesis"><AuthGuard><Synthesis /></AuthGuard></Route>
      <Route path="/history"><AuthGuard><HistoryPage /></AuthGuard></Route>
      <Route path="/settings"><AuthGuard><SettingsPage /></AuthGuard></Route>
      <Route path="/music"><AuthGuard><MusicStudio /></AuthGuard></Route>
      <Route path="/"><Redirect to="/dashboard" /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="libertyecho-theme">
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;