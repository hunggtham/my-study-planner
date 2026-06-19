import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LogOut,
  Settings,
  Calendar,
  CheckSquare,
  Target,
  BarChart2,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";

export const Layout: React.FC = () => {
  const { signOut, user } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    if (resolvedTheme === "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  };

  const navItems = [
    { to: "/", icon: <BarChart2 size={20} />, label: "Dashboard" },
    { to: "/schedule", icon: <CheckSquare size={20} />, label: "Lịch trình" },
    { to: "/calendar", icon: <Calendar size={20} />, label: "Lịch tháng" },
    { to: "/goals", icon: <Target size={20} />, label: "Mục tiêu" },
    { to: "/settings", icon: <Settings size={20} />, label: "Cài đặt" },
  ];

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <header className="mobile-header">
        <h2>Study Planner</h2>
        <button
          className="ui-btn ui-btn-ghost ui-btn-icon"
          onClick={toggleTheme}
        >
          {resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="desktop-sidebar">
        <div className="sidebar-header">
          <h2>Study Planner</h2>
          <button
            className="ui-btn ui-btn-ghost ui-btn-icon"
            onClick={toggleTheme}
          >
            {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ padding: "0 1rem", marginBottom: "0.5rem" }}>
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-secondary)",
                wordBreak: "break-all",
              }}
            >
              {user?.email}
            </span>
          </div>
          <button
            onClick={signOut}
            className="ui-btn ui-btn-ghost"
            style={{
              width: "100%",
              justifyContent: "flex-start",
              gap: "0.75rem",
            }}
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <main className="main-content">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="mobile-bottom-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "bottom-nav-item active" : "bottom-nav-item"
              }
            >
              {React.cloneElement(item.icon, { size: 22 })}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};
