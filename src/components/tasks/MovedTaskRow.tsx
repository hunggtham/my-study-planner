import React, { useState } from 'react';
import { Task } from '../../types';
import { getStatusMeta } from '../../utils/status';
import { CategoryBadge, PriorityBadge } from './TaskBadges';
import { MoreVertical, CheckCircle, Clock, RotateCcw, CalendarPlus, Edit2, Trash2, ArrowRight } from 'lucide-react';

interface MovedTaskRowProps {
  task: Task;
  onAction: (taskId: string, action: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export const MovedTaskRow: React.FC<MovedTaskRowProps> = ({ task, onAction, onEdit, onDelete }) => {
  const meta = getStatusMeta(task.status);
  const StatusIcon = meta.icon;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`compact-task-row ${meta.className}`} style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.75rem', 
      padding: '0.75rem', 
      borderBottom: '1px solid var(--border-color)',
      background: 'var(--bg-panel)',
      position: 'relative',
      opacity: task.status === 'done' ? 0.7 : 1
    }}>
      <div style={{ color: task.status === 'done' ? 'var(--success)' : 'var(--text-muted)' }}>
        <StatusIcon size={20} />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span 
            style={{ 
              fontSize: '0.95rem', 
              fontWeight: 500, 
              color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-main)',
              textDecoration: task.status === 'done' ? 'line-through' : 'none',
              wordBreak: 'break-word'
            }}
          >
            {task.title}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
            Dời {task.moved_count} lần
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <CategoryBadge category={task.category} showIcon={false} />
          {task.priority !== 'medium' && <PriorityBadge priority={task.priority} showIcon={false} />}
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Lịch: {task.date} {task.start_time ? `(${task.start_time})` : ''}
          </span>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <button className="icon-btn" onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '0.25rem', cursor: 'pointer' }}>
          <MoreVertical size={18} />
        </button>

        {menuOpen && (
          <div className="compact-menu" style={{ 
            position: 'absolute', 
            right: 0, 
            top: '100%', 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            minWidth: '180px',
            overflow: 'hidden'
          }}>
            {task.status !== 'done' && (
              <button className="menu-item-btn" onClick={() => { setMenuOpen(false); onAction(task.id, 'done'); }}>
                <CheckCircle size={14} /> Hoàn thành
              </button>
            )}
            {task.status !== 'in_progress' && task.status !== 'done' && (
              <button className="menu-item-btn" onClick={() => { setMenuOpen(false); onAction(task.id, 'in_progress'); }}>
                <Clock size={14} /> Đang làm
              </button>
            )}
            {task.status !== 'todo' && (
              <button className="menu-item-btn" onClick={() => { setMenuOpen(false); onAction(task.id, 'todo'); }}>
                <RotateCcw size={14} /> Chuyển về To-do
              </button>
            )}
            <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.25rem 0' }} />
            <button className="menu-item-btn" onClick={() => { setMenuOpen(false); onAction(task.id, 'move_today'); }}>
              <ArrowRight size={14} /> Chuyển sang Hôm nay
            </button>
            <button className="menu-item-btn" onClick={() => { setMenuOpen(false); onAction(task.id, 'move_tomorrow'); }}>
              <CalendarPlus size={14} /> Chuyển sang Ngày mai
            </button>
            <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.25rem 0' }} />
            <button className="menu-item-btn" onClick={() => { setMenuOpen(false); onEdit(task); }}>
              <Edit2 size={14} /> Sửa chi tiết
            </button>
            <button className="menu-item-btn danger" onClick={() => { setMenuOpen(false); onDelete(task.id); }}>
              <Trash2 size={14} /> Xóa
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
