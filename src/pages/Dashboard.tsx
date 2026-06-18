import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Task } from '../types';
import { ProgressCard } from '../components/dashboard/ProgressCard';
import { CategoryProgress } from '../components/dashboard/CategoryProgress';
import { QuickActions } from '../components/dashboard/QuickActions';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { GoalsPanel } from '../components/GoalsPanel';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase.from('tasks').select('*').eq('user_id', user.id);
      if (!error && data) {
        setTasks(data);
      }
      setLoading(false);
    };
    fetchTasks();
  }, [user]);

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const weekStartStr = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEndStr = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStartStr = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEndStr = format(endOfMonth(now), 'yyyy-MM-dd');

  // Filters
  const todayTasks = tasks.filter(t => t.date === todayStr);
  const weekTasks = tasks.filter(t => t.date >= weekStartStr && t.date <= weekEndStr);
  const monthTasks = tasks.filter(t => t.date >= monthStartStr && t.date <= monthEndStr);
  const delayedTasks = tasks.filter(t => t.status === 'moved' || t.moved_count > 0);

  const getDoneCount = (list: Task[]) => list.filter(t => t.status === 'done').length;

  return (
    <div className="page-container">
      <header className="page-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1.5rem' }}>
        <div>
          <h1>Tổng quan</h1>
          <p className="text-muted">Trạng thái học tập và làm việc của bạn</p>
        </div>
        
        <QuickActions />
      </header>

      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {delayedTasks.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid var(--warning)', background: 'rgba(245, 158, 11, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle color="var(--warning)" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--warning)' }}>Task cần chú ý</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bạn có {delayedTasks.length} task đã bị dời ngày.</p>
                </div>
              </div>
              <Link to="/moved" className="secondary-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Xử lý ngay <ArrowRight size={16} />
              </Link>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <ProgressCard 
              title="Hôm nay" 
              completed={getDoneCount(todayTasks)} 
              total={todayTasks.length} 
              intent="primary"
            />
            <ProgressCard 
              title="Tuần này" 
              completed={getDoneCount(weekTasks)} 
              total={weekTasks.length} 
              intent="success"
              subtitle={`Từ ${weekStartStr} đến ${weekEndStr}`}
            />
            <ProgressCard 
              title="Tháng này" 
              completed={getDoneCount(monthTasks)} 
              total={monthTasks.length} 
              intent="warning"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 style={{ margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Tiến độ môn học (Tháng)</h3>
              <CategoryProgress tasks={monthTasks} />
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 style={{ margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Mục tiêu tuần</h3>
              <div style={{ margin: '-1rem' }}>
                <GoalsPanel periodType="week" periodStartDate={weekStartStr} />
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
