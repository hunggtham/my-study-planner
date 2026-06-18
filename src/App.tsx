import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Login } from './pages/Login';
import './styles.css'; // Global styles (we will update this later)

import { Layout } from './components/Layout';
import { Today } from './pages/Today';
import { CalendarView } from './pages/Calendar';
import { Settings } from './pages/Settings';
import { MovedTasks } from './pages/MovedTasks';
import { Stats } from './pages/Stats';
import { Goals } from './pages/Goals';
import { SharedDashboard } from './pages/SharedDashboard';
import './styles-calendar.css';
import './styles-taskform.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();
  if (loading) return <div className="loading-screen">Đang tải...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Today />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="stats" element={<Stats />} />
          <Route path="weekly" element={<Goals periodType="week" />} />
          <Route path="monthly" element={<Goals periodType="month" />} />
          <Route path="moved" element={<MovedTasks />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        
        {/* Shared Dashboard (Public) */}
        <Route path="/:slug/shared" element={<SharedDashboard />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
