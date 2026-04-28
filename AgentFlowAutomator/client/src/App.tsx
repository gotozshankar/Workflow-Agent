// App.tsx
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./hooks/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider, ProtectedRoute, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import WorkflowBuilder from "@/pages/WorkflowBuilder";
import Workflows from "@/pages/Workflows";
import Agents from "@/pages/Agents";
import Tools from "@/pages/Tools";
import KnowledgeBase from "@/pages/KnowledgeBase";
import Models from "@/pages/Models";
import Security from "@/pages/Security";
import AuditLogs from "@/pages/AuditLogs";
import Settings from "@/pages/Settings";
import UsersPage from "@/pages/Users";
import Chat from "@/pages/Chat";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Protected */}
      <Route path="/dashboard">
        {() => (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/workflows">
        {() => (
          <ProtectedRoute>
            <Workflows />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/workflows/new">
        {() => (
          <ProtectedRoute>
            <WorkflowBuilder />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/agents">
        {() => (
          <ProtectedRoute>
            <Agents />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/tools">
        {() => (
          <ProtectedRoute>
            <Tools />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/knowledge">
        {() => (
          <ProtectedRoute>
            <KnowledgeBase />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/models">
        {() => (
          <ProtectedRoute>
            <Models />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/custom-models">
        {() => (
          <ProtectedRoute>
            <Models />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/security">
        {() => (
          <ProtectedRoute>
            <Security />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/audit">
        {() => (
          <ProtectedRoute>
            <AuditLogs />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/settings">
        {() => (
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/chat">
        {() => (
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        )}
      </Route>

      {/* Users (role‑based) */}
      <Route path="/users">
        {() => (
          <ProtectedRoute roles={["super_admin", "admin"]}>
            <UsersPage />
          </ProtectedRoute>
        )}
      </Route>

      {/* NotFound – always last */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  // ✅ ALL hooks are called unconditionally, at the top
  const { isLoading, user } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    // Only redirect if auth check is finished and user is not authenticated
    if (
      !isLoading &&
      !user &&
      location !== "/login" &&
      location !== "/register"
    ) {
      navigate("/login");
    }
  }, [isLoading, user, location, navigate]);

  // Now conditional rendering is safe
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <AppProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
