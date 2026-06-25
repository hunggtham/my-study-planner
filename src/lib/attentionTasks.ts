import { Task } from "../types";
import { format } from "date-fns";

export type AttentionReason =
  | "overdue"
  | "late_today"
  | "moved_or_skipped"
  | "high_priority_today";

export function getAttentionReasons(
  task: Task,
  now = new Date(),
): AttentionReason[] {
  if (task.status === "done") return [];

  const reasons: AttentionReason[] = [];
  const todayStr = format(now, "yyyy-MM-dd");
  const nowTime = format(now, "HH:mm");

  // Group 1: Quá hạn
  if (
    task.date < todayStr &&
    ["todo", "in_progress", "moved", "skipped"].includes(task.status || "todo")
  ) {
    reasons.push("overdue");
  }

  // Group 2: Hôm nay đã trễ giờ
  if (
    task.date === todayStr &&
    task.start_time &&
    task.start_time < nowTime &&
    ["todo", "in_progress"].includes(task.status || "todo")
  ) {
    reasons.push("late_today");
  }

  // Group 3: Đã chuyển / Bỏ qua cần xử lý lại (Prefer tasks whose date is today or before today)
  if (
    ["moved", "skipped"].includes(task.status || "") &&
    task.date <= todayStr
  ) {
    reasons.push("moved_or_skipped");
  }

  // Group 4: Ưu tiên cao hôm nay
  if (
    task.date === todayStr &&
    task.priority === "high" &&
    ["todo", "in_progress"].includes(task.status || "todo")
  ) {
    reasons.push("high_priority_today");
  }

  return reasons;
}

export function isAttentionTask(task: Task, now = new Date()): boolean {
  return getAttentionReasons(task, now).length > 0;
}
