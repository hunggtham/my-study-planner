import React from "react";
import { Task } from "../../types";
import { getStatusMeta } from "../../utils/status";
import { CategoryBadge, PriorityBadge } from "./TaskBadges";
import { ActionMenu, ActionMenuItem } from "../ui/ActionMenu";
import {
  CheckCircle,
  Clock,
  RotateCcw,
  CalendarPlus,
  Edit2,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { getAttentionReasons } from "../../lib/attentionTasks";

interface AttentionTaskRowProps {
  task: Task;
  onAction: (taskId: string, action: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  isProcessing?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const AttentionTaskRow: React.FC<AttentionTaskRowProps> = ({
  task,
  onAction,
  onEdit,
  onDelete,
  isProcessing,
  selectionMode,
  isSelected,
  onToggleSelect,
}) => {
  const meta = getStatusMeta(task.status);
  const StatusIcon = meta.icon;
  const reasons = getAttentionReasons(task);

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case "overdue":
        return {
          label: "Quá hạn",
          color: "var(--danger)",
          bg: "rgba(239, 68, 68, 0.1)",
        };
      case "late_today":
        return {
          label: "Trễ giờ",
          color: "var(--warning)",
          bg: "rgba(245, 158, 11, 0.1)",
        };
      case "moved_or_skipped":
        return {
          label: "Đã chuyển/Bỏ qua",
          color: "var(--primary)",
          bg: "rgba(59, 130, 246, 0.1)",
        };
      case "high_priority_today":
        return {
          label: "Ưu tiên cao",
          color: "var(--danger)",
          bg: "rgba(239, 68, 68, 0.1)",
        };
      default:
        return null;
    }
  };

  const actionItems: ActionMenuItem[] = [
    ...(task.status !== "done"
      ? [
          {
            label: "Hoàn thành",
            icon: <CheckCircle size={14} />,
            onClick: () => onAction(task.id, "done"),
          },
        ]
      : []),
    ...(task.status !== "in_progress" && task.status !== "done"
      ? [
          {
            label: "Đang làm",
            icon: <Clock size={14} />,
            onClick: () => onAction(task.id, "in_progress"),
          },
        ]
      : []),
    ...(task.status !== "todo"
      ? [
          {
            label: "Chuyển về To-do",
            icon: <RotateCcw size={14} />,
            onClick: () => onAction(task.id, "todo"),
          },
        ]
      : []),
    { type: "divider" },
    {
      label: "Chuyển sang Hôm nay",
      icon: <ArrowRight size={14} />,
      onClick: () => onAction(task.id, "move_today"),
    },
    {
      label: "Chuyển sang Ngày mai",
      icon: <CalendarPlus size={14} />,
      onClick: () => onAction(task.id, "move_tomorrow"),
    },
    { type: "divider" },
    {
      label: "Sửa chi tiết",
      icon: <Edit2 size={14} />,
      onClick: () => onEdit(task),
    },
    {
      label: "Xóa",
      icon: <Trash2 size={14} />,
      onClick: () => onDelete(task.id),
      danger: true,
    },
  ];

  return (
    <div
      className={`compact-task-row ${meta.className}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem",
        borderBottom: "1px solid var(--border-color)",
        background: "var(--bg-panel)",
        position: "relative",
        opacity: isProcessing ? 0.5 : task.status === "done" ? 0.7 : 1,
        pointerEvents: isProcessing ? "none" : "auto",
        cursor: selectionMode ? "pointer" : "default",
      }}
      onClick={() => {
        if (selectionMode && onToggleSelect) {
          onToggleSelect(task.id);
        }
      }}
    >
      {selectionMode ? (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect && onToggleSelect(task.id)}
          style={{
            width: "1.25rem",
            height: "1.25rem",
            cursor: "pointer",
            accentColor: "var(--primary)",
            marginRight: "0.25rem",
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          style={{
            color:
              task.status === "done" ? "var(--success)" : "var(--text-muted)",
          }}
        >
          <StatusIcon size={20} />
        </div>
      )}

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "0.95rem",
              fontWeight: 500,
              color:
                task.status === "done"
                  ? "var(--text-muted)"
                  : "var(--text-main)",
              textDecoration: task.status === "done" ? "line-through" : "none",
              wordBreak: "break-word",
            }}
          >
            {task.title}
          </span>
          {reasons.map((r) => {
            const badge = getReasonBadge(r);
            if (!badge) return null;
            return (
              <span
                key={r}
                style={{
                  fontSize: "0.75rem",
                  color: badge.color,
                  background: badge.bg,
                  padding: "0.1rem 0.4rem",
                  borderRadius: "4px",
                  fontWeight: 600,
                }}
              >
                {badge.label}
              </span>
            );
          })}
          {task.moved_count > 0 && (
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--warning)",
                background: "rgba(245, 158, 11, 0.1)",
                padding: "0.1rem 0.4rem",
                borderRadius: "4px",
              }}
            >
              Dời {task.moved_count} lần
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <CategoryBadge category={task.category} showIcon={false} />
          {task.priority !== "medium" && (
            <PriorityBadge priority={task.priority} showIcon={false} />
          )}
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Lịch: {task.date} {task.start_time ? `(${task.start_time})` : ""}
          </span>
        </div>
      </div>

      <div
        className="compact-actions"
        style={{
          opacity: isProcessing ? 0.5 : 1,
          pointerEvents: isProcessing ? "none" : "auto",
        }}
      >
        {selectionMode ? null : <ActionMenu items={actionItems} />}
      </div>
    </div>
  );
};
