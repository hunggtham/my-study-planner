import React, { useState } from 'react';
import { BaseTaskDisplayProps } from './TaskDisplay';
import { getStatusMeta } from '../../utils/status';
import { Clock, Settings2, Copy, Trash2, ArrowRight, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { TaskStatus } from '../../types';
import { CategoryBadge, PriorityBadge, StatusBadge } from './TaskBadges';

export const TaskCard: React.FC<BaseTaskDisplayProps> = ({ task, onUpdate, onMove, onEdit, onDelete, onDuplicate, readonlyMove, isProcessing }) => {
  const meta = getStatusMeta(task.status);
  const [expanded, setExpanded] = useState(false);

  const handleStatusClick = (status: TaskStatus) => {
    onUpdate(task.id, { status });
  };

  return (
    <article className={`task-card modern ${meta.className}`}>
      <div className="task-header" style={{ marginBottom: '0.5rem' }}>
        <div className="task-badges" style={{ gap: '0.4rem' }}>
          <CategoryBadge category={task.category} />
          <PriorityBadge priority={task.priority} />
        </div>
        <StatusBadge status={task.status} movedCount={task.moved_count} />
      </div>

      <div className="task-title-area" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <h4 className="task-title" style={{ fontSize: '1rem' }}>{task.title}</h4>
        {(task.description || task.note) && (
          <button className="icon-btn" onClick={() => setExpanded(!expanded)} style={{ color: 'var(--text-muted)' }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      <div className="task-meta-row" style={{ marginTop: '0.25rem', marginBottom: '0.75rem' }}>
        <span className="task-time" style={{ fontSize: '0.8rem' }}><Clock size={12} style={{ marginRight: 4 }}/>{task.start_time || 'No time'} {task.end_time ? `- ${task.end_time}` : ''}</span>
      </div>

      {expanded && (
        <div className="task-expanded-area" style={{ marginTop: '0.5rem', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', animation: 'slideUp 0.2s ease' }}>
          {task.description && (
            <p className="task-detail" style={{ fontSize: '0.8rem', padding: '0.5rem' }}><FileText size={12} style={{ marginRight: 4, flexShrink: 0 }}/><span>{task.description}</span></p>
          )}
          {task.note && (
            <div className="task-note" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
              <strong>Note:</strong> {task.note}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
        <div className="task-quick-actions" style={{ gap: '0.25rem' }}>
          {['todo', 'in_progress', 'done', 'skipped'].map((s) => {
            const sMeta = getStatusMeta(s as TaskStatus);
            const SIcon = sMeta.icon;
            return (
              <button 
                key={s} 
                className={`quick-status-btn ${task.status === s ? 'active' : ''} ${sMeta.className}`}
                onClick={() => handleStatusClick(s as TaskStatus)}
                title={sMeta.label}
                style={{ width: '28px', height: '28px' }}
              >
                <SIcon size={14} />
              </button>
            )
          })}
        </div>

        <div className="task-actions-row" style={{ borderTop: 'none', paddingTop: 0, gap: '0.25rem', opacity: isProcessing ? 0.5 : 1, pointerEvents: isProcessing ? 'none' : 'auto' }}>
          {!readonlyMove && task.status !== 'moved' && (
            <button className="secondary-btn icon-btn" onClick={() => onMove(task.id)} title="Dời ngày" style={{ padding: '0.3rem 0.5rem' }}>
              <ArrowRight size={14} /> <span className="hide-mobile" style={{ fontSize: '0.75rem' }}>Dời</span>
            </button>
          )}
          {onEdit && (
            <button className="secondary-btn icon-btn" onClick={() => onEdit(task)} title="Sửa" style={{ padding: '0.3rem' }}>
              <Settings2 size={14} />
            </button>
          )}
          {onDuplicate && (
            <button className="secondary-btn icon-btn" onClick={() => onDuplicate(task)} title="Nhân bản" style={{ padding: '0.3rem' }}>
              <Copy size={14} />
            </button>
          )}
          {onDelete && (
            <button className="danger-btn icon-btn" onClick={() => onDelete(task.id)} title="Xóa" style={{ padding: '0.3rem' }}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
