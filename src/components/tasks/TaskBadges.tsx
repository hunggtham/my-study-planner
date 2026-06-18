import React from "react";
import { Tag, AlertCircle } from "lucide-react";
import { TaskStatus } from "../../types";
import { getStatusMeta } from "../../utils/status";

export const CATEGORY_CLASS: Record<string, string> = {
  SQLD: "cat-sqld",
  정보처리기사: "cat-kisa",
  IELTS: "cat-ielts",
  English: "cat-english",
  Korean: "cat-korean",
  "Spring Boot": "cat-spring",
  "React/WebSquare": "cat-react",
  Health: "cat-health",
  Optional: "cat-optional",
};

export const PRIORITY_LABELS: Record<string, string> = {
  high: "Cao",
  medium: "Vừa",
  low: "Thấp",
};

export const CategoryBadge: React.FC<{
  category: string;
  showIcon?: boolean;
}> = ({ category, showIcon = true }) => {
  const categoryClass = CATEGORY_CLASS[category] || "cat-default";
  return (
    <span className={`badge category ${categoryClass}`}>
      {showIcon && <Tag size={12} style={{ marginRight: 4 }} />}
      {category}
    </span>
  );
};

export const PriorityBadge: React.FC<{
  priority: string;
  showIcon?: boolean;
}> = ({ priority, showIcon = true }) => {
  return (
    <span className={`badge priority-${priority}`}>
      {showIcon && <AlertCircle size={12} style={{ marginRight: 4 }} />}
      {PRIORITY_LABELS[priority] || priority}
    </span>
  );
};

export const StatusBadge: React.FC<{
  status: TaskStatus;
  movedCount?: number;
}> = ({ status, movedCount }) => {
  const meta = getStatusMeta(status);
  const StatusIcon = meta.icon;
  return (
    <div className={`status-badge ${meta.className}`}>
      <StatusIcon size={14} />
      <span>{meta.label}</span>
      {status === "moved" && movedCount && movedCount > 0 ? (
        <span className="moved-count">({movedCount})</span>
      ) : null}
    </div>
  );
};
