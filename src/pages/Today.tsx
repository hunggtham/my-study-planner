import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Task } from '../types';
import { TaskCard } from '../components/TaskCard';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export const Today: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTodayTasks = async () => {
    if (!user) return;
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .lte('date', today)
      .neq('status', 'moved')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });
      
    if (error) {
      console.error(error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTodayTasks();
  }, [user]);

  const updateTask = async (id: string, patch: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    await supabase.from('tasks').update(patch).eq('id', id);
  };

  const moveToTomorrow = async (id: string) => {
    // Basic logic for moving (MVP)
    // First, get the task
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
    
    // Update current task to 'moved'
    await updateTask(id, { status: 'moved' });
    
    // Create new task
    const newTask = {
      ...task,
      id: undefined, // let supabase generate uuid
      date: tomorrow,
      status: 'todo',
      moved_from_task_id: task.id,
      moved_count: task.moved_count + 1,
      note: `${task.note ? task.note + ' | ' : ''}Dời từ ${task.date}`,
      created_at: undefined,
      updated_at: undefined
    };
    
    await supabase.from('tasks').insert([newTask]);
    fetchTodayTasks(); // Refresh
  };

  const completedCount = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Hôm nay</h1>
          <p className="text-muted">{format(new Date(), 'EEEE, dd MMMM, yyyy', { locale: vi })}</p>
        </div>
        <div className="progress-badge">
          <span>{progress}% Hoàn thành</span>
          <span>{completedCount} / {tasks.length}</span>
        </div>
      </header>

      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state card">
          <p>Không có task nào cho hôm nay. Tuyệt vời!</p>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onUpdate={updateTask} 
              onMove={moveToTomorrow} 
            />
          ))}
        </div>
      )}
    </div>
  );
};
