import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { NotificationBanner } from "@/components/NotificationBanner";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ChangePassword from "@/pages/ChangePassword";
import Profile from "@/pages/Profile";
import Dashboard from "@/pages/Dashboard";
import PTDetail from "@/pages/PTDetail";
import Activity from "@/pages/Activity";
import Activities from "@/pages/Activities";
import Findings from "@/pages/Findings";
import FindingDetail from "@/pages/FindingDetail";
import Reports from "@/pages/Reports";
import DKReview from "@/pages/DKReview";
import DUSignOff from "@/pages/DUSignOff";
import KPI from "@/pages/KPI";
import { BottomNav } from "@/components/BottomNav";
import AuditLog from "@/pages/AuditLog";
import UserManagement from "@/pages/UserManagement";
import { InstallBanner } from "@/components/InstallBanner";
import NotificationSettings from "@/pages/NotificationSettings";
import MonthlyRecap from "@/pages/MonthlyRecap";

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
    <div className="min-h-screen bg-[#040914] text-white">
      {user && <Navbar />}
      <main className={`min-h-screen pb-16 md:pb-0 ${user ? "app-shell-main md:pl-72 md:pt-16" : ""}`}>
        {user && <NotificationBanner />}
        {children}
      </main>
      {user && <BottomNav />}
      {user && <InstallBanner />}
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
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/profile">
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        </Route>
        <Route path="/change-password">
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        </Route>
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
        <Route path="/activities">
          <ProtectedRoute allowedRoles={["dk", "superadmin"]}>
            <Activities />
          </ProtectedRoute>
        </Route>
        <Route path="/findings/:id">
          <ProtectedRoute allowedRoles={["apuppt", "dk", "owner", "superadmin"]}>
            <FindingDetail />
          </ProtectedRoute>
        </Route>
        <Route path="/findings">
          <ProtectedRoute allowedRoles={["apuppt", "dk", "du", "owner", "superadmin"]}>
            <Findings />
          </ProtectedRoute>
        </Route>
        <Route path="/reports">
          <ProtectedRoute allowedRoles={["dk", "du", "owner", "superadmin"]}>
            <Reports />
          </ProtectedRoute>
        </Route>
        <Route path="/review">
          <ProtectedRoute allowedRoles={["dk", "superadmin"]}>
            <DKReview />
          </ProtectedRoute>
        </Route>
        <Route path="/signoff">
          <ProtectedRoute allowedRoles={["du", "superadmin"]}>
            <DUSignOff />
          </ProtectedRoute>
        </Route>
        <Route path="/kpi">
          <ProtectedRoute allowedRoles={["dk", "du", "owner", "superadmin"]}>
            <KPI />
          </ProtectedRoute>
        </Route>
        <Route path="/monthly-recap">
          <ProtectedRoute allowedRoles={["dk", "du", "owner", "superadmin"]}>
            <MonthlyRecap />
          </ProtectedRoute>
        </Route>
        <Route path="/audit-log">
          <ProtectedRoute allowedRoles={["superadmin"]}>
            <AuditLog />
          </ProtectedRoute>
        </Route>
        <Route path="/users">
          <ProtectedRoute allowedRoles={["superadmin"]}>
            <UserManagement />
          </ProtectedRoute>
        </Route>
        <Route path="/notification-settings">
          <ProtectedRoute>
            <NotificationSettings />
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
