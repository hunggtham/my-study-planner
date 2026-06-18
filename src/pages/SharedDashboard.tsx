import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Task } from '../types';

export const SharedDashboard: React.FC = () => {
  const { slug } = useParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSharedData = async () => {
      setLoading(true);
      // Fetch public_shares to get user_id
      const { data: shareData, error: shareError } = await supabase
        .from('public_shares')
        .select('user_id')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (shareError || !shareData) {
        setError('Link chia sẻ không tồn tại hoặc đã bị vô hiệu hóa.');
        setLoading(false);
        return;
      }

      // We have access! Fetch tasks for this user
      // RLS allows this if 'Public can view tasks if shared' is correct.
      // Wait, RLS uses the existence of public_shares. 
      // It's easier if we just query tasks using eq('user_id', shareData.user_id) 
      // and let RLS verify it, but since we are unauthenticated, we just do it directly.
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', shareData.user_id);

      if (tasksError) {
        setError('Không thể tải dữ liệu.');
      } else if (tasksData) {
        setTasks(tasksData);
      }
      setLoading(false);
    };

    fetchSharedData();
  }, [slug]);

  if (loading) return <div className="loading-screen">Đang tải dashboard công khai...</div>;
  if (error) return <div className="app-container"><div className="error-message">{error}</div></div>;

  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const completionRate = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;

  return (
    <div className="app-container">
      <header className="page-header">
        <h1>Tiến độ học tập</h1>
        <span className="version">Read-only Public View</span>
      </header>

      <div className="stats-grid" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ flex: 1 }}>
          <p className="text-muted">Hoàn thành tổng</p>
          <strong style={{ fontSize: '2rem' }}>{completionRate}%</strong>
          <p className="text-muted">{doneTasks} / {tasks.length} task</p>
        </div>
        <div className="card" style={{ flex: 1 }}>
          <p className="text-muted">Task đã dời</p>
          <strong style={{ fontSize: '2rem' }}>{tasks.filter(t => t.status === 'moved').length}</strong>
        </div>
      </div>

      <div className="card">
        <h3>Các task gần đây (5 task)</h3>
        <ul style={{ marginTop: '1rem', listStyle: 'none', padding: 0 }}>
          {tasks.slice(0, 5).map(t => (
            <li key={t.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ display: 'inline-block', width: '24px' }}>{t.status === 'done' ? '✅' : '⏳'}</span>
              <span>[{t.category}] {t.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
