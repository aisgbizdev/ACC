import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import PTDetail from "@/pages/PTDetail";
import Activity from "@/pages/Activity";
import Findings from "@/pages/Findings";
import Reports from "@/pages/Reports";

const API_BASE = import.meta.env.VITE_API_URL ?? "";
setBaseUrl(API_BASE || null);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex flex-col">
      {user && <Navbar />}
      <main className="flex-1">{children}</main>
    </div>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect to="/login" />;
  if (user.role === "apuppt" && user.ptId) return <Redirect to={`/pt/${user.ptId}`} />;
  return <Redirect to="/dashboard" />;
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={RootRedirect} />
        <Route path="/login" component={Login} />
        <Route path="/dashboard">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/pt/:id">
          <ProtectedRoute>
            <PTDetail />
          </ProtectedRoute>
        </Route>
        <Route path="/activity">
          <ProtectedRoute allowedRoles={["apuppt"]}>
            <Activity />
          </ProtectedRoute>
        </Route>
        <Route path="/findings">
          <ProtectedRoute allowedRoles={["apuppt", "dk", "du", "owner"]}>
            <Findings />
          </ProtectedRoute>
        </Route>
        <Route path="/reports">
          <ProtectedRoute allowedRoles={["dk", "du", "owner"]}>
            <Reports />
          </ProtectedRoute>
        </Route>
        <Route>
          <Redirect to="/dashboard" />
        </Route>
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
