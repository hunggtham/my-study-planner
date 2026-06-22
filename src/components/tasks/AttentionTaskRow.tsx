import React from "react";
import { Task } from "../../types";
import { getStatusMeta } from "../../utils/status";
import { CategoryBadge, PriorityBadge } from "./TaskBadges";
import { ActionMenu, ActionMenuItem } from "../ui/ActionMenu";
import {
  MoreVertical,
  CheckCircle,
  Clock,
  RotateCcw,
  CalendarPlus,
  Edit2,
  Trash2,
  ArrowRight,
} from "lucide-react";

interface AttentionTaskRowProps {
  task: Task;
  onAction: (taskId: string, action: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  isProcessing?: boolean;
}

export const AttentionTaskRow: React.FC<AttentionTaskRowProps> = ({
  task,
  onAction,
  onEdit,
  onDelete,
  isProcessing,
}) => {
  const meta = getStatusMeta(task.status);
  const StatusIcon = meta.icon;

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
      }}
    >
      <div
        style={{
          color:
            task.status === "done" ? "var(--success)" : "var(--text-muted)",
        }}
      >
        <StatusIcon size={20} />
      </div>

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
        <ActionMenu
          trigger={
            <button
              className="icon-btn"
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                padding: "0.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
              }}
            >
              <MoreVertical size={18} />
            </button>
          }
          items={actionItems}
        />
      </div>
    </div>
  );
};
