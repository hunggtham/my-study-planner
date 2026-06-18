import React, { useState } from 'react';
import { BaseTaskDisplayProps } from './TaskDisplay';
import { getStatusMeta } from '../../utils/status';
import { MoreVertical, Edit2, Trash2, ArrowRight, Copy } from 'lucide-react';
import { CategoryBadge, PriorityBadge } from './TaskBadges';

export const CompactTaskRow: React.FC<BaseTaskDisplayProps> = ({ task, onUpdate, onMove, onEdit, onDelete, onDuplicate, readonlyMove }) => {
  const meta = getStatusMeta(task.status);
  const StatusIcon = meta.icon;
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleStatus = () => {
    onUpdate(task.id, { status: task.status === 'done' ? 'todo' : 'done' });
  };

  return (
    <div className={`compact-task-row ${meta.className}`} style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.75rem', 
      padding: '0.5rem 0.75rem', 
      borderBottom: '1px solid var(--border-color)',
      background: 'transparent',
      position: 'relative'
    }}>
      <button 
        className="compact-done-btn" 
        onClick={toggleStatus}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: task.status === 'done' ? 'var(--success)' : 'var(--text-muted)' }}
      >
        <StatusIcon size={18} />
      </button>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="compact-time" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {task.start_time || '-'}
          </span>
          <span 
            className="compact-title" 
            style={{ 
              fontSize: '0.9rem', 
              fontWeight: 500, 
              color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-main)',
              textDecoration: task.status === 'done' ? 'line-through' : 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {task.title}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
          <CategoryBadge category={task.category} showIcon={false} />
          {task.priority !== 'medium' && <PriorityBadge priority={task.priority} showIcon={false} />}
        </div>
      </div>

      <div className="compact-actions" style={{ position: 'relative' }}>
        <button className="icon-btn" onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '0.25rem' }}>
          <MoreVertical size={16} />
        </button>

        {menuOpen && (
          <div className="compact-menu" style={{ 
            position: 'absolute', 
            right: 0, 
            top: '100%', 
            background: 'var(--bg-panel)', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            minWidth: '120px',
            overflow: 'hidden'
          }}>
            {onEdit && (
              <button className="menu-item-btn" onClick={() => { setMenuOpen(false); onEdit(task); }}>
                <Edit2 size={14} /> Sửa
              </button>
            )}
            {!readonlyMove && task.status !== 'moved' && (
              <button className="menu-item-btn" onClick={() => { setMenuOpen(false); onMove(task.id); }}>
                <ArrowRight size={14} /> Dời
              </button>
            )}
            {onDuplicate && (
              <button className="menu-item-btn" onClick={() => { setMenuOpen(false); onDuplicate(task); }}>
                <Copy size={14} /> Copy
              </button>
            )}
            {onDelete && (
              <button className="menu-item-btn danger" onClick={() => { setMenuOpen(false); onDelete(task.id); }}>
                <Trash2 size={14} /> Xóa
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
