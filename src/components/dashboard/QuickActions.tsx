import React from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Calendar, Target } from 'lucide-react';

export const QuickActions: React.FC = () => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
      <Link to="/schedule" className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--text-main)', padding: '1rem' }}>
        <CheckSquare size={24} color="var(--primary)" />
        <span style={{ fontSize: '0.9rem', fontWeight: 500, textAlign: 'center' }}>Lịch trình hôm nay</span>
      </Link>
      <Link to="/calendar" className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--text-main)', padding: '1rem' }}>
        <Calendar size={24} color="var(--success)" />
        <span style={{ fontSize: '0.9rem', fontWeight: 500, textAlign: 'center' }}>Lịch tháng</span>
      </Link>
      <Link to="/goals" className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--text-main)', padding: '1rem' }}>
        <Target size={24} color="var(--primary)" />
        <span style={{ fontSize: '0.9rem', fontWeight: 500, textAlign: 'center' }}>Mục tiêu</span>
      </Link>
    </div>
  );
};
