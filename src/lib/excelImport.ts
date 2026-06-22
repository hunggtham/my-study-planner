import { format, isValid, parse, parseISO } from "date-fns";

export type SheetImportKind =
  | "tasks"
  | "weekly_goals"
  | "monthly_goals"
  | "unsupported";

export type ImportAction = "add" | "update" | "skip";

export interface TaskImportRow {
  rowNumber: number;
  date: string;
  start_time: string;
  end_time: string;
  category: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done" | "skipped" | "moved";
  priority: "high" | "medium" | "low";
  score_weight: number;
  note: string;
  action: ImportAction;
  existingId?: string;
  invalidReasons: string[];
}

export interface GoalImportRow {
  rowNumber: number;
  period_type: "week" | "month";
  period_start_date: string;
  category: string;
  title: string;
  status: "active" | "done" | "skipped";
  action: ImportAction;
  existingId?: string;
  invalidReasons: string[];
}

export const detectSheetKind = (sheetName: string): SheetImportKind => {
  const name = sheetName.toLowerCase();
  if (name.includes("dashboard")) return "unsupported";
  if (name.includes("danh mục")) return "unsupported";
  if (name.includes("lịch")) return "tasks";
  if (name.includes("task phụ")) return "tasks";
  if (name.includes("task dời")) return "tasks";
  if (name.includes("mục tiêu tuần")) return "weekly_goals";
  if (name.includes("mục tiêu tháng")) return "monthly_goals";
  return "unsupported";
};

export const parseExcelDate = (val: any): string | null => {
  if (!val) return null;
  if (val instanceof Date) {
    if (isValid(val)) return format(val, "yyyy-MM-dd");
    return null;
  }
  if (typeof val === "number") {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    const utcDate = new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
    if (isValid(utcDate)) return format(utcDate, "yyyy-MM-dd");
    return null;
  }
  if (typeof val === "string") {
    const parsedISO = parseISO(val);
    if (isValid(parsedISO)) return format(parsedISO, "yyyy-MM-dd");
    const parsedDDMMYYYY = parse(val, "dd/MM/yyyy", new Date());
    if (isValid(parsedDDMMYYYY)) return format(parsedDDMMYYYY, "yyyy-MM-dd");
  }
  return null;
};

export const normalizeTaskStatus = (
  val: string,
): "todo" | "in_progress" | "done" | "skipped" | "moved" => {
  const v = String(val).toLowerCase().trim();
  if (v.includes("hoàn thành") || v.includes("done") || v.includes("☑"))
    return "done";
  if (v.includes("đang làm") || v.includes("in_progress")) return "in_progress";
  if (v.includes("bỏ qua") || v.includes("skipped")) return "skipped";
  if (v.includes("dời") || v.includes("moved")) return "moved";
  return "todo";
};

export const normalizeGoalStatus = (
  val: string,
): "active" | "done" | "skipped" => {
  const v = String(val).toLowerCase().trim();
  if (v.includes("hoàn thành") || v.includes("done") || v.includes("☑"))
    return "done";
  return "active";
};

export const normalizePriority = (val: string): "high" | "medium" | "low" => {
  const v = String(val).toLowerCase().trim();
  if (v.includes("cao") || v.includes("high")) return "high";
  if (v.includes("thấp") || v.includes("low")) return "low";
  return "medium";
};

export const extractTime = (
  val: string,
): { start_time: string; end_time: string } => {
  if (!val || typeof val !== "string") return { start_time: "", end_time: "" };
  const v = val.trim();
  const match = v.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (match) {
    return { start_time: match[1], end_time: match[2] };
  }
  return { start_time: "", end_time: "" };
};
