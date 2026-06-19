import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { Login } from "./pages/Login";
import "./styles.css"; // Global styles (we will update this later)

import { ThemeProvider } from "./context/ThemeContext";
import { Layout } from "./components/Layout";
import { Schedule } from "./pages/Schedule";
import { CalendarView } from "./pages/Calendar";
import { Settings } from "./pages/Settings";
import { AttentionTasks } from "./pages/AttentionTasks";
import { Dashboard } from "./pages/Dashboard";
import { Goals } from "./pages/Goals";
import { SharedDashboard } from "./pages/SharedDashboard";
import "./styles-calendar.css";
import "./styles-taskform.css";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { session, loading } = useAuth();
  if (loading) return <div className="loading-screen">Đang tải...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="goals" element={<Goals />} />
            <Route path="attention" element={<AttentionTasks />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Shared Dashboard (Public) */}
          <Route path="/:slug/shared" element={<SharedDashboard />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
