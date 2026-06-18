import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LogOut, Settings, Calendar, CheckSquare, Target, Clock, BarChart2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const Layout: React.FC = () => {
  const { signOut, user } = useAuth();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Study Planner</h2>
          <span className="version">Cloud Sync</span>
        </div>
        
        <nav className="nav-menu">
          <NavLink to="/" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <CheckSquare size={20} />
            <span>Hôm nay</span>
          </NavLink>
          <NavLink to="/calendar" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <Calendar size={20} />
            <span>Lịch tháng</span>
          </NavLink>
          <NavLink to="/stats" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <BarChart2 size={20} />
            <span>Thống kê</span>
          </NavLink>
          <NavLink to="/weekly" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <Target size={20} />
            <span>Mục tiêu tuần</span>
          </NavLink>
          <NavLink to="/monthly" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <Target size={20} />
            <span>Mục tiêu tháng</span>
          </NavLink>
          <NavLink to="/moved" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <Clock size={20} />
            <span>Task đã dời</span>
          </NavLink>
          <NavLink to="/settings" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <Settings size={20} />
            <span>Cài đặt</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
          </div>
          <button onClick={signOut} className="logout-btn">
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
