import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Goal } from '../types';

export const Goals: React.FC<{ periodType: 'week' | 'month' }> = ({ periodType }) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('period_type', periodType);

      if (!error && data) {
        setGoals(data);
      }
      setLoading(false);
    };
    fetchGoals();
  }, [user, periodType]);

  const toggleGoal = async (id: string, is_done: boolean) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, is_done } : g));
    await supabase.from('goals').update({ is_done }).eq('id', id);
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Mục tiêu {periodType === 'week' ? 'Tuần' : 'Tháng'}</h1>
        <p className="text-muted">Checklist theo dõi tiến độ.</p>
      </header>

      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : goals.length === 0 ? (
        <div className="empty-state card">Chưa có mục tiêu nào. (Vui lòng tự thêm trong DB bằng tay cho MVP)</div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {goals.map(goal => (
              <label key={goal.id} className={`goal-item ${goal.is_done ? 'is-done' : ''}`} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', cursor: 'pointer', opacity: goal.is_done ? 0.6 : 1 }}>
                <input 
                  type="checkbox" 
                  checked={goal.is_done} 
                  onChange={e => toggleGoal(goal.id, e.target.checked)}
                  style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                />
                <span style={{ textDecoration: goal.is_done ? 'line-through' : 'none' }}>{goal.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
