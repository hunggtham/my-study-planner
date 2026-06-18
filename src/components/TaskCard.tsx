import React from 'react';
import { Task, TaskStatus } from '../types';
import { getStatusMeta } from '../utils/status';
import { Clock, Tag, AlertCircle, FileText, Settings2, Copy, Trash2, ArrowRight } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onMove: (id: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (task: Task) => void;
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

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Cao',
  medium: 'Vừa',
  low: 'Thấp'
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate, onMove, onEdit, onDelete, onDuplicate, readonlyMove }) => {
  const categoryClass = CATEGORY_CLASS[task.category] || 'cat-default';
  const meta = getStatusMeta(task.status);
  const StatusIcon = meta.icon;

  const handleStatusClick = (status: TaskStatus) => {
    onUpdate(task.id, { status });
  };

  return (
    <article className={`task-card modern ${meta.className}`}>
      <div className="task-header">
        <div className="task-badges">
          <span className={`badge category ${categoryClass}`}><Tag size={12} style={{ marginRight: 4 }}/>{task.category}</span>
          <span className={`badge priority-${task.priority}`}><AlertCircle size={12} style={{ marginRight: 4 }}/>{PRIORITY_LABELS[task.priority] || task.priority}</span>
        </div>
        <div className={`status-badge ${meta.className}`}>
          <StatusIcon size={14} />
          <span>{meta.label}</span>
          {task.status === 'moved' && task.moved_count > 0 && <span className="moved-count">({task.moved_count})</span>}
        </div>
      </div>

      <div className="task-title-area">
        <h4 className="task-title">{task.title}</h4>
      </div>

      <div className="task-meta-row">
        <span className="task-time"><Clock size={14} style={{ marginRight: 4 }}/>{task.start_time} - {task.end_time}</span>
      </div>

      {task.description && (
        <p className="task-detail"><FileText size={14} style={{ marginRight: 4, flexShrink: 0 }}/><span>{task.description}</span></p>
      )}

      {task.note && (
        <div className="task-note">
          <strong>Note:</strong> {task.note}
        </div>
      )}

      <div className="task-quick-actions">
        {['todo', 'in_progress', 'done', 'skipped'].map((s) => {
          const sMeta = getStatusMeta(s as TaskStatus);
          const SIcon = sMeta.icon;
          return (
            <button 
              key={s} 
              className={`quick-status-btn ${task.status === s ? 'active' : ''} ${sMeta.className}`}
              onClick={() => handleStatusClick(s as TaskStatus)}
              title={sMeta.label}
            >
              <SIcon size={16} />
            </button>
          )
        })}
      </div>

      <div className="task-actions-row">
        {!readonlyMove && task.status !== 'moved' && (
          <button className="secondary-btn icon-btn" onClick={() => onMove(task.id)} title="Dời ngày">
            <ArrowRight size={14} /> Dời
          </button>
        )}
        {onEdit && (
          <button className="secondary-btn icon-btn" onClick={() => onEdit(task)} title="Sửa">
            <Settings2 size={14} />
          </button>
        )}
        {onDuplicate && (
          <button className="secondary-btn icon-btn" onClick={() => onDuplicate(task)} title="Nhân bản">
            <Copy size={14} />
          </button>
        )}
        {onDelete && (
          <button className="danger-btn icon-btn" onClick={() => onDelete(task.id)} title="Xóa">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </article>
  );
};
