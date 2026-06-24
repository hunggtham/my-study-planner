import React from "react";
import { Task } from "../../types";
import { TaskCard } from "./TaskCard";
import { CompactTaskRow } from "./CompactTaskRow";
import { TimelineTaskItem } from "./TimelineTaskItem";

export interface BaseTaskDisplayProps {
  task: Task;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onMove: (id: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (task: Task) => void;
  readonlyMove?: boolean;
  isProcessing?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  showDate?: boolean;
}

export interface TaskDisplayProps extends BaseTaskDisplayProps {
  variant: "card" | "compact" | "timeline";
}

export const TaskDisplay: React.FC<TaskDisplayProps> = (props) => {
  const { variant, ...rest } = props;

  if (variant === "compact") {
    return <CompactTaskRow {...rest} />;
  }

  if (variant === "timeline") {
    return <TimelineTaskItem {...rest} />;
  }

  return <TaskCard {...rest} />;
};
