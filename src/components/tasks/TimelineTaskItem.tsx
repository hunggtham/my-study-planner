import React from 'react';
import { BaseTaskDisplayProps } from './TaskDisplay';
import { getStatusMeta } from '../../utils/status';
import { CategoryBadge } from './TaskBadges';

export const TimelineTaskItem: React.FC<BaseTaskDisplayProps> = ({ task, onUpdate, onEdit }) => {
  const meta = getStatusMeta(task.status);
  const StatusIcon = meta.icon;

  const toggleStatus = () => {
    onUpdate(task.id, { status: task.status === 'done' ? 'todo' : 'done' });
  };

  return (
    <div className={`timeline-task-item ${meta.className}`} style={{
      position: 'relative',
      display: 'flex',
      gap: '1rem',
      paddingBottom: '1.5rem'
    }}>
      {/* Timeline line and dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px' }}>
        <div style={{ 
          fontSize: '0.75rem', 
          fontWeight: 600, 
          color: 'var(--text-muted)', 
          marginBottom: '0.25rem' 
        }}>
          {task.start_time || 'N/A'}
        </div>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: task.status === 'done' ? 'var(--success)' : 'var(--bg-dark)',
          border: `2px solid ${task.status === 'done' ? 'var(--success)' : 'var(--primary)'}`,
          zIndex: 2,
          cursor: 'pointer'
        }} onClick={toggleStatus} title="Đổi trạng thái" />
        <div style={{
          width: '2px',
          flex: 1,
          background: 'var(--border-color)',
          marginTop: '4px'
        }} />
      </div>

      {/* Task Content */}
      <div 
        className="timeline-task-content card" 
        style={{ 
          flex: 1, 
          padding: '0.75rem 1rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.5rem',
          cursor: onEdit ? 'pointer' : 'default',
          borderLeft: `3px solid var(--${meta.intent === 'neutral' ? 'text-muted' : meta.intent})`
        }}
        onClick={() => onEdit && onEdit(task)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h4 style={{ 
            fontSize: '0.95rem', 
            margin: 0,
            textDecoration: task.status === 'done' ? 'line-through' : 'none',
            color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-main)'
          }}>
            {task.title}
          </h4>
          <StatusIcon size={14} color={`var(--${meta.intent === 'neutral' ? 'text-muted' : meta.intent})`} />
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <CategoryBadge category={task.category} showIcon={false} />
          {task.end_time && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đến {task.end_time}</span>
          )}
        </div>
      </div>
    </div>
  );
};
