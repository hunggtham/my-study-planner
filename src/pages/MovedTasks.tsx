import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Task } from '../types';
import { TaskCard } from '../components/TaskCard';

export const MovedTasks: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovedTasks = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'moved')
        .order('date', { ascending: false });

      if (!error && data) {
        setTasks(data);
      }
      setLoading(false);
    };
    fetchMovedTasks();
  }, [user]);

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Task đã dời</h1>
        <p className="text-muted">Lịch sử các task đã bị dời sang ngày khác.</p>
      </header>

      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state card">Không có task nào bị dời.</div>
      ) : (
        <div className="task-list">
          {tasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onUpdate={() => {}} 
              onMove={() => {}} 
              readonlyMove 
            />
          ))}
        </div>
      )}
    </div>
  );
};
