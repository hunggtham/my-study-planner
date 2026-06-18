import React from 'react';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onMove: (id: string) => void;
  readonlyMove?: boolean;
}

const CATEGORY_CLASS: Record<string, string> = {
  'SQLD': 'cat-sqld',
  '정보처리기사': 'cat-kisa',
  'IELTS': 'cat-ielts',
  'English': 'cat-english',
  'Korean': 'cat-korean',
  'Spring Boot': 'cat-spring',
  'React/WebSquare': 'cat-react',
  'Health': 'cat-health',
  'Optional': 'cat-optional'
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'Chưa làm',
  doing: 'Đang làm',
  done: 'Hoàn thành',
  moved: 'Đã dời',
  skipped: 'Bỏ qua'
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate, onMove, readonlyMove }) => {
  const categoryClass = CATEGORY_CLASS[task.category] || 'cat-default';
  const done = task.status === 'done';

  return (
    <article className={`task-card ${done ? 'is-done' : ''}`}>
      <div className="task-top">
        <span className="task-time">{task.start_time} - {task.end_time}</span>
        <span className={`category ${categoryClass}`}>{task.category}</span>
        <span className="priority">{task.priority}</span>
      </div>

      <div className="task-main">
        <label className="done-check">
          <input
            type="checkbox"
            checked={done}
            onChange={e => onUpdate(task.id, { status: e.target.checked ? 'done' : 'todo' })}
          />
          <span>{task.title}</span>
        </label>
        <select 
          value={task.status} 
          onChange={e => onUpdate(task.id, { status: e.target.value as any })}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <p className="task-detail">{task.description}</p>

      <label className="field">
        Note nhanh
        <textarea
          value={task.note || ''}
          placeholder="Ví dụ: làm 1 đề, sai nhiều JOIN, dời vì mệt..."
          onChange={e => onUpdate(task.id, { note: e.target.value })}
          rows={1}
        />
      </label>

      <div className="task-actions">
        {!readonlyMove && task.status !== 'moved' && (
          <button className="secondary" onClick={() => onMove(task.id)}>Dời sang ngày mai</button>
        )}
      </div>
    </article>
  );
};
