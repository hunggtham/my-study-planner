import React from "react";
import { BaseTaskDisplayProps } from "./TaskDisplay";
import { getStatusMeta } from "../../utils/status";
import { Edit2, Trash2, ArrowRight, Copy } from "lucide-react";
import { CategoryBadge, PriorityBadge } from "./TaskBadges";
import { ActionMenu, ActionMenuItem } from "../ui/ActionMenu";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

export const CompactTaskRow: React.FC<BaseTaskDisplayProps> = ({
  task,
  onUpdate,
  onMove,
  onEdit,
  onDelete,
  onDuplicate,
  readonlyMove,
  isProcessing,
  selectionMode,
  isSelected,
  onToggleSelect,
  showDate,
}) => {
  const meta = getStatusMeta(task.status);
  const StatusIcon = meta.icon;
  const toggleStatus = () => {
    onUpdate(task.id, { status: task.status === "done" ? "todo" : "done" });
  };

  const actionItems: ActionMenuItem[] = [];
  if (onEdit) {
    actionItems.push({
      label: "Sửa",
      icon: <Edit2 size={14} />,
      onClick: () => onEdit(task),
    });
  }
  if (!readonlyMove && task.status !== "moved") {
    actionItems.push({
      label: "Dời",
      icon: <ArrowRight size={14} />,
      onClick: () => onMove(task.id),
    });
  }
  if (onDuplicate) {
    actionItems.push({
      label: "Copy",
      icon: <Copy size={14} />,
      onClick: () => onDuplicate(task),
    });
  }
  if (onDelete) {
    actionItems.push({
      label: "Xóa",
      icon: <Trash2 size={14} />,
      onClick: () => onDelete(task.id),
      danger: true,
    });
  }

  return (
    <div
      className={`compact-task-row ${meta.className}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.5rem 0.75rem",
        borderBottom: "1px solid var(--border-color)",
        background: "transparent",
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
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <button
          className="compact-done-btn"
          onClick={toggleStatus}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color:
              task.status === "done" ? "var(--success)" : "var(--text-muted)",
          }}
        >
          <StatusIcon size={18} />
        </button>
      )}

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            className="compact-time"
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            {showDate
              ? (() => {
                  if (!task.date)
                    return `Chưa có ngày${task.start_time ? ` · ${task.start_time}` : ""}`;
                  try {
                    const d = parseISO(task.date);
                    return `${format(d, "dd/MM/yyyy")} · ${format(d, "EEEE", { locale: vi })}${task.start_time ? ` · ${task.start_time}` : ""}`;
                  } catch {
                    return `Chưa có ngày${task.start_time ? ` · ${task.start_time}` : ""}`;
                  }
                })()
              : task.start_time || "-"}
          </span>
          <span
            className="compact-title"
            style={{
              fontSize: "0.9rem",
              fontWeight: 500,
              color:
                task.status === "done"
                  ? "var(--text-muted)"
                  : "var(--text-main)",
              textDecoration: task.status === "done" ? "line-through" : "none",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {task.title}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.2rem" }}>
          <CategoryBadge category={task.category} showIcon={false} />
          {task.priority !== "medium" && (
            <PriorityBadge priority={task.priority} showIcon={false} />
          )}
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
