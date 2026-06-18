import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Task } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';

export const CalendarView: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) return;
      setLoading(true);
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end);

      if (!error && data) {
        setTasks(data);
      }
      setLoading(false);
    };
    fetchTasks();
  }, [user, currentDate]);

  const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  const startDay = getDay(startOfMonth(currentDate)); // 0 = Sunday
  const blanks = Array.from({ length: startDay === 0 ? 6 : startDay - 1 }); // Assuming Monday is first day

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Lịch tháng {format(currentDate, 'M/yyyy')}</h1>
        <div>
          <button className="secondary" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>Tháng trước</button>
          <button className="secondary" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} style={{marginLeft: '0.5rem'}}>Tháng sau</button>
        </div>
      </header>

      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : (
        <div className="calendar-grid">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
            <div key={d} className="calendar-header-cell">{d}</div>
          ))}
          
          {blanks.map((_, i) => <div key={`blank-${i}`} className="calendar-cell empty"></div>)}
          
          {days.map(day => {
            const dayTasks = tasks.filter(t => isSameDay(new Date(t.date), day));
            const doneTasks = dayTasks.filter(t => t.status === 'done');
            
            return (
              <div key={day.toString()} className={`calendar-cell ${isSameDay(day, new Date()) ? 'today' : ''}`}>
                <div className="cell-date">{format(day, 'd')}</div>
                {dayTasks.length > 0 && (
                  <div className="cell-stats">
                    <div className="cell-progress">
                      <div className="progress-fill" style={{ width: `${(doneTasks.length / dayTasks.length) * 100}%`}}></div>
                    </div>
                    <span className="cell-count">{doneTasks.length}/{dayTasks.length}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
