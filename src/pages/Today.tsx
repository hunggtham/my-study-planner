import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Task } from '../types';
import { TaskCard } from '../components/TaskCard';
import { TaskForm } from '../components/TaskForm';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export const Today: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTodayTasks = async () => {
    if (!user) return;
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // We want: today's tasks OR (date < today AND status in 'todo', 'in_progress')
    // Supabase allows OR filters.
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .or(`date.eq.${today},and(date.lt.${today},status.in.(todo,in_progress))`)
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

  const handleSaveForm = async (taskData: Partial<Task>) => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (taskData.id) {
        // Update
        const { error } = await supabase.from('tasks').update(taskData).eq('id', taskData.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase.from('tasks').insert({ ...taskData, user_id: user.id });
        if (error) throw error;
      }
      setIsFormOpen(false);
      fetchTodayTasks();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa task này?')) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
  };

  const handleDuplicate = (task: Task) => {
    const { id, created_at, updated_at, ...rest } = task;
    setEditingTask({ ...rest, title: rest.title + ' (Copy)' });
    setIsFormOpen(true);
  };

  const moveToTomorrow = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
    
    await updateTask(id, { status: 'moved' });
    
    const newTask = {
      user_id: user?.id,
      date: tomorrow,
      start_time: task.start_time,
      end_time: task.end_time,
      category: task.category,
      title: task.title,
      description: task.description,
      task_type: task.task_type,
      status: 'todo',
      priority: task.priority,
      score_weight: task.score_weight,
      moved_from_task_id: task.id,
      moved_count: task.moved_count + 1,
      note: `${task.note ? task.note + ' | ' : ''}Dời từ ${task.date}`,
    };
    
    await supabase.from('tasks').insert([newTask]);
    fetchTodayTasks();
  };

  const completedCount = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Group by category
  const groups = tasks.reduce((acc, task) => {
    if (!acc[task.category]) acc[task.category] = [];
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="page-container">
      <header className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1>Hôm nay</h1>
          <p className="text-muted">{format(new Date(), 'EEEE, dd MMMM, yyyy', { locale: vi })}</p>
          <button className="primary-btn" style={{ marginTop: '1rem', width: 'auto' }} onClick={() => { setEditingTask(undefined); setIsFormOpen(true); }}>
            + Thêm Task
          </button>
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
          <p>Không có task nào. Hãy thêm task mới!</p>
        </div>
      ) : (
        <div className="task-groups" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {Object.entries(groups).map(([category, catTasks]) => (
            <div key={category} className="task-group">
              <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                {category} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>({catTasks.length})</span>
              </h3>
              <div className="task-list">
                {catTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onUpdate={updateTask} 
                    onMove={moveToTomorrow}
                    onEdit={(t) => { setEditingTask(t); setIsFormOpen(true); }}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isFormOpen && (
        <TaskForm 
          initialData={editingTask} 
          onSubmit={handleSaveForm} 
          onCancel={() => setIsFormOpen(false)} 
          isLoading={isSaving}
        />
      )}
    </div>
  );
};
