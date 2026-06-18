import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Task } from '../types';
import { TaskDisplay } from '../components/tasks/TaskDisplay';
import { TaskForm } from '../components/TaskForm';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PartyPopper } from 'lucide-react';

export const Today: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTaskCount, setTotalTaskCount] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'timeline' | 'compact'>(() => {
    return (localStorage.getItem('study-planner-today-view-mode') as any) || 'list';
  });

  useEffect(() => {
    localStorage.setItem('study-planner-today-view-mode', viewMode);
  }, [viewMode]);
  
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
      if (!data || data.length === 0) {
        const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        setTotalTaskCount(count || 0);
      }
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
      <header className="page-header today-header" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Hôm nay</h1>
            <p className="text-muted">{format(new Date(), 'EEEE, dd MMMM, yyyy', { locale: vi })}</p>
          </div>
          
          <div className="header-stats-row" style={{ display: 'flex', gap: '1rem' }}>
            <div className="stat-box" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{tasks.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tổng</div>
            </div>
            <div className="stat-box" style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>{completedCount}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Xong ({progress}%)</div>
            </div>
            <div className="stat-box" style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning)' }}>{tasks.filter(t => t.status === 'moved').length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>Dời</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="segmented-control">
            <button className={`segmented-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>List</button>
            <button className={`segmented-btn ${viewMode === 'timeline' ? 'active' : ''}`} onClick={() => setViewMode('timeline')}>Timeline</button>
            <button className={`segmented-btn ${viewMode === 'compact' ? 'active' : ''}`} onClick={() => setViewMode('compact')}>Compact</button>
          </div>
          <button className="primary-btn" style={{ width: 'auto', margin: 0 }} onClick={() => { setEditingTask(undefined); setIsFormOpen(true); }}>
            + Thêm Task
          </button>
        </div>
      </header>

      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state card" style={{ textAlign: 'center', padding: '4rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <PartyPopper size={48} color="var(--primary)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
          {totalTaskCount > 0 ? (
            <>
              <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Tuyệt vời! Không có task nào cần làm ngay.</p>
              <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>Bạn có task trong database, nhưng không có task nào thuộc hôm nay hoặc quá hạn. Hãy mở tab Lịch tháng để xem toàn bộ lịch.</p>
            </>
          ) : (
            <>
              <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Chưa có task nào.</p>
              <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>Hãy thêm task mới để bắt đầu học tập!</p>
            </>
          )}
          <button className="primary-btn" style={{ width: 'auto' }} onClick={() => { setEditingTask(undefined); setIsFormOpen(true); }}>
            + Thêm Task Mới
          </button>
        </div>
      ) : (
        <div className="task-views-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {viewMode === 'list' && (
            <div className="task-groups" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {Object.entries(groups).map(([category, catTasks]) => {
                const catDone = catTasks.filter(t => t.status === 'done').length;
                return (
                  <div key={category} className="task-group">
                    <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                        {category} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>({catDone}/{catTasks.length})</span>
                      </h3>
                      <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${(catDone/catTasks.length)*100}%`, height: '100%', background: 'var(--success)' }}></div>
                      </div>
                    </div>
                    <div className="task-list" style={{ gap: '0.75rem' }}>
                      {catTasks.map(task => (
                        <TaskDisplay 
                          key={task.id} 
                          variant="card"
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
                );
              })}
            </div>
          )}

          {viewMode === 'timeline' && (() => {
            const timedTasks = tasks.filter(t => t.start_time).sort((a, b) => a.start_time.localeCompare(b.start_time));
            const noTimeTasks = tasks.filter(t => !t.start_time);

            return (
              <div className="timeline-view-container" style={{ paddingLeft: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {timedTasks.map(task => (
                    <TaskDisplay 
                      key={task.id} 
                      variant="timeline"
                      task={task} 
                      onUpdate={updateTask} 
                      onMove={moveToTomorrow}
                      onEdit={(t) => { setEditingTask(t); setIsFormOpen(true); }}
                      onDelete={handleDelete}
                      onDuplicate={handleDuplicate}
                    />
                  ))}
                </div>

                {noTimeTasks.length > 0 && (
                  <div style={{ marginTop: '2rem' }}>
                    <h4 style={{ color: 'var(--text-muted)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Chưa đặt giờ</h4>
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                      {noTimeTasks.map(task => (
                        <TaskDisplay 
                          key={task.id} 
                          variant="compact"
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
                )}
              </div>
            );
          })()}

          {viewMode === 'compact' && (
            <div className="compact-view card" style={{ padding: 0 }}>
              {tasks.map(task => (
                <TaskDisplay 
                  key={task.id} 
                  variant="compact"
                  task={task} 
                  onUpdate={updateTask} 
                  onMove={moveToTomorrow}
                  onEdit={(t) => { setEditingTask(t); setIsFormOpen(true); }}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </div>
          )}
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
