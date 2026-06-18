import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Task } from '../types';
import { StatCard } from '../components/StatCard';

export const Stats: React.FC = () => {
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

  const doneTasks = tasks.filter(t => t.status === 'done');
  const mainTasks = tasks.filter(t => t.task_type !== 'optional');
  const mainDone = mainTasks.filter(t => t.status === 'done');
  
  const completionRate = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;
  
  // By category
  const categories = Array.from(new Set(tasks.map(t => t.category)));
  const catStats = categories.map(cat => {
    const catTasks = tasks.filter(t => t.category === cat);
    const catDone = catTasks.filter(t => t.status === 'done');
    return {
      name: cat,
      total: catTasks.length,
      done: catDone.length,
      rate: catTasks.length ? Math.round((catDone.length / catTasks.length) * 100) : 0
    };
  }).sort((a, b) => b.total - a.total);

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Thống kê & Tiến độ</h1>
      </header>

      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : (
        <>
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard label="Tỷ lệ hoàn thành (Tổng)" value={`${completionRate}%`} detail={`${doneTasks.length}/${tasks.length} task`} />
            <StatCard label="Task chính" value={`${mainDone.length}/${mainTasks.length}`} />
            <StatCard label="Đã dời" value={tasks.filter(t => t.status === 'moved').length} />
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1.5rem' }}>Tiến độ theo môn học</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {catStats.map(cat => (
                <div key={cat.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span>{cat.name}</span>
                    <span>{cat.rate}% ({cat.done}/{cat.total})</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${cat.rate}%`, height: '100%', background: 'var(--primary)' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
