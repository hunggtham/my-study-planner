import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Goal } from '../types';
import { Trash2, GitMerge } from 'lucide-react';
import { GoalBreakdownForm } from './GoalBreakdownForm';

interface GoalsPanelProps {
  periodType: 'week' | 'month';
  periodStartDate: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const GoalsPanel: React.FC<GoalsPanelProps> = ({ periodType, periodStartDate, onClose, isModal }) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [breakdownGoal, setBreakdownGoal] = useState<Goal | null>(null);

  const fetchGoals = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('period_type', periodType)
      .eq('period_start_date', periodStartDate)
      .order('created_at', { ascending: true });
    if (data) setGoals(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchGoals();
  }, [user, periodType, periodStartDate]);

  const toggleGoal = async (id: string, is_done: boolean) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, is_done } : g));
    await supabase.from('goals').update({ is_done }).eq('id', id);
  };

  const deleteGoal = async (id: string) => {
    if (!window.confirm('Xóa mục tiêu này?')) return;
    setGoals(prev => prev.filter(g => g.id !== id));
    await supabase.from('goals').delete().eq('id', id);
  };

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim()) return;
    
    const newGoal = {
      user_id: user.id,
      period_type: periodType,
      period_start_date: periodStartDate,
      title: newTitle.trim(),
      category: 'General',
      is_done: false,
      note: ''
    };

    const { data, error } = await supabase.from('goals').insert([newGoal]).select();
    if (!error && data) {
      setGoals(prev => [...prev, data[0]]);
      setNewTitle('');
    } else {
      alert('Lỗi thêm mục tiêu');
    }
  };

  const content = (
    <div className="goals-panel-content">
      {isModal && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Mục tiêu {periodType === 'week' ? 'Tuần' : 'Tháng'} ({periodStartDate})</h3>
          {onClose && <button className="secondary-btn icon-btn" onClick={onClose} style={{ width: 'auto' }}>Đóng</button>}
        </div>
      )}

      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : (
        <>
          {goals.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <span>Tiến độ</span>
                <span style={{ fontWeight: 600 }}>{goals.filter(g => g.is_done).length} / {goals.length}</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(goals.filter(g => g.is_done).length / goals.length) * 100}%`, height: '100%', background: 'var(--success)' }}></div>
              </div>
            </div>
          )}

          <div className="goals-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {goals.length === 0 ? (
              <p className="text-muted">Chưa có mục tiêu nào.</p>
            ) : (
              goals.map(goal => (
                <div key={goal.id} className={`goal-item ${goal.is_done ? 'is-done' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: goal.is_done ? 0.6 : 1, padding: '1rem', background: 'var(--bg-panel)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={goal.is_done} 
                      onChange={e => toggleGoal(goal.id, e.target.checked)}
                      style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer', margin: 0 }}
                    />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ textDecoration: goal.is_done ? 'line-through' : 'none', fontWeight: 500 }}>{goal.title}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{goal.category}</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {!goal.is_done && (
                        <button className="secondary-btn icon-btn" onClick={() => setBreakdownGoal(goal)} title="Tách thành task nhỏ" style={{ padding: '0.4rem', border: '1px solid var(--primary)', color: 'var(--primary)', background: 'transparent' }}>
                          <GitMerge size={14} />
                        </button>
                      )}
                      <button className="danger-btn icon-btn" onClick={() => deleteGoal(goal.id)} style={{ padding: '0.4rem' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <form onSubmit={addGoal} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          value={newTitle} 
          onChange={e => setNewTitle(e.target.value)} 
          placeholder="Thêm mục tiêu mới..." 
          style={{ flex: 1, minWidth: '200px' }}
        />
        <button type="submit" className="primary-btn" style={{ width: 'auto', margin: 0, padding: '0.5rem 1rem' }}>Thêm</button>
      </form>

      {breakdownGoal && (
        <GoalBreakdownForm 
          goal={breakdownGoal} 
          onClose={() => setBreakdownGoal(null)} 
          onSuccess={() => setBreakdownGoal(null)} 
        />
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="task-form-overlay" style={{ zIndex: 1000 }}>
        <div className="task-form-container card" style={{ maxWidth: '500px', width: '100%' }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
};
