import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface PublicTask {
  id: string;
  date: string;
  category: string;
  title: string;
  status: string;
  task_type: string;
  priority: string;
}

export const SharedDashboard: React.FC = () => {
  const { slug } = useParams();
  const [tasks, setTasks] = useState<PublicTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSharedData = async () => {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_public_dashboard_by_slug', { p_slug: slug });

      if (error) {
        setError('Không thể tải dữ liệu: ' + error.message);
      } else if (!data || data.length === 0) {
        // RPC returns empty if slug invalid or no tasks
        setError('Link chia sẻ không tồn tại, đã bị vô hiệu hóa, hoặc người dùng chưa có task nào.');
      } else {
        setTasks(data);
      }
      setLoading(false);
    };

    if (slug) {
      fetchSharedData();
    }
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
        <h3>Các task gần đây (20 task)</h3>
        <ul style={{ marginTop: '1rem', listStyle: 'none', padding: 0 }}>
          {tasks.slice(0, 20).map(t => (
            <li key={t.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
              <span style={{ display: 'inline-block', width: '24px' }}>
                {t.status === 'done' ? '✅' : t.status === 'skipped' ? '⏭️' : t.status === 'moved' ? '➡️' : '⏳'}
              </span>
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{t.title}</strong>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                  {t.date} | {t.category} | {t.priority}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
