import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Task } from "../types";
import { normalizeTaskType } from "../types";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  getMonth,
  isWeekend,
  parseISO,
} from "date-fns";
import { vi } from "date-fns/locale";
import { TaskDisplay } from "../components/tasks/TaskDisplay";
import { TaskForm } from "../components/TaskForm";
import { GoalsPanel } from "../components/GoalsPanel";
import {
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  CheckSquare,
  Square,
  Trash2,
  CalendarDays,
  CalendarPlus,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type CalendarMode = "month" | "year";

interface YearFilters {
  category: string;
  taskType: string;
  status: string;
  priority: string;
  dayType: string; // all | weekday | weekend
  month: string; // "" | "0"..."11"
  keyword: string;
}

const MONTH_NAMES_VI = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

// ─── Year View ──────────────────────────────────────────────────────────────

interface YearViewProps {
  user: any;
  onEditTask: (task: Partial<Task>) => void;
  onRefreshNeeded: () => void;
}

const YearView: React.FC<YearViewProps> = ({ user, onEditTask }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(
    () => new Set([new Date().getMonth()]),
  );
  const [expandedAllInMonth, setExpandedAllInMonth] = useState<Set<number>>(
    new Set(),
  );

  const [filters, setFilters] = useState<YearFilters>({
    category: "",
    taskType: "",
    status: "",
    priority: "",
    dayType: "",
    month: "",
    keyword: "",
  });

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetDateForMove, setTargetDateForMove] = useState("");
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const fetchYearTasks = async () => {
    if (!user) return;
    setLoading(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", `${selectedYear}-01-01`)
      .lte("date", `${selectedYear}-12-31`)
      .order("date", { ascending: true });

    if (error) {
      setFetchError(error.message);
    } else if (data) {
      // Normalize optional → main
      setTasks(
        data.map((t) => ({ ...t, task_type: normalizeTaskType(t.task_type) })),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchYearTasks();
  }, [user, selectedYear]);

  // Unique categories for filter
  const allCategories = useMemo(
    () => [...new Set(tasks.map((t) => t.category).filter(Boolean))].sort(),
    [tasks],
  );

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filters.category && t.category !== filters.category) return false;
      if (filters.taskType && t.task_type !== filters.taskType) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      if (filters.dayType) {
        const d = parseISO(t.date);
        const isWknd = isWeekend(d);
        if (filters.dayType === "weekday" && isWknd) return false;
        if (filters.dayType === "weekend" && !isWknd) return false;
      }
      if (filters.month !== "") {
        const monthIdx = parseInt(filters.month);
        if (getMonth(parseISO(t.date)) !== monthIdx) return false;
      }
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        const haystack =
          `${t.title} ${t.note || ""} ${t.category || ""}`.toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [tasks, filters]);

  // Group filtered tasks by month
  const tasksByMonth = useMemo(() => {
    const map: Record<number, Task[]> = {};
    for (let i = 0; i < 12; i++) map[i] = [];
    filteredTasks.forEach((t) => {
      const m = getMonth(parseISO(t.date));
      map[m].push(t);
    });
    return map;
  }, [filteredTasks]);

  const totalDone = filteredTasks.filter((t) => t.status === "done").length;
  const totalPending = filteredTasks.filter(
    (t) => t.status !== "done" && t.status !== "skipped",
  ).length;
  const completionPct =
    filteredTasks.length > 0
      ? Math.round((totalDone / filteredTasks.length) * 100)
      : 0;

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  const clearFilters = () =>
    setFilters({
      category: "",
      taskType: "",
      status: "",
      priority: "",
      dayType: "",
      month: "",
      keyword: "",
    });

  const toggleMonth = (m: number) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  const toggleExpandAll = (m: number) => {
    setExpandedAllInMonth((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  const expandAllMonths = () => {
    const monthsWithTasks = Object.keys(tasksByMonth)
      .map(Number)
      .filter((m) => tasksByMonth[m].length > 0);
    setExpandedMonths(new Set(monthsWithTasks));
    setExpandedAllInMonth(new Set(monthsWithTasks));
  };

  const collapseAllMonths = () => {
    setExpandedMonths(new Set());
    setExpandedAllInMonth(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredTasks.map((t) => t.id);
    if (selectedIds.size === visibleIds.length && visibleIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  };

  const toggleSelectMonth = (m: number) => {
    const monthIds = tasksByMonth[m].map((t) => t.id);
    const allSelected = monthIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        monthIds.forEach((id) => next.delete(id));
      } else {
        monthIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBulkAction = async (action: string, payload?: any) => {
    if (!user || selectedIds.size === 0) return;

    if (action === "delete") {
      if (
        !window.confirm(
          `Bạn chắc chắn muốn xóa ${selectedIds.size} task đã chọn?`,
        )
      ) {
        return;
      }
    }

    setIsProcessingBulk(true);
    const ids = Array.from(selectedIds);

    try {
      let query;
      if (action === "delete") {
        query = supabase
          .from("tasks")
          .delete()
          .in("id", ids)
          .eq("user_id", user.id);
      } else if (action === "move") {
        query = supabase
          .from("tasks")
          .update({ date: payload, status: "moved" })
          .in("id", ids)
          .eq("user_id", user.id);
      } else {
        query = supabase
          .from("tasks")
          .update({ status: action })
          .in("id", ids)
          .eq("user_id", user.id);
      }

      const { error } = await query;
      if (error) throw error;

      setSelectedIds(new Set());
      if (action === "delete") setIsSelectionMode(false);
      fetchYearTasks();
    } catch (err: any) {
      alert("Lỗi bulk action: " + err.message);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const updateTask = async (id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    await supabase.from("tasks").update(patch).eq("id", id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa task này?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  };

  const moveToTomorrow = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const tomorrow = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");
    await updateTask(id, { status: "moved" });
    await supabase.from("tasks").insert([
      {
        user_id: user?.id,
        date: tomorrow,
        start_time: task.start_time,
        end_time: task.end_time,
        category: task.category,
        title: task.title,
        description: task.description,
        task_type: task.task_type,
        status: "todo",
        priority: task.priority,
        score_weight: task.score_weight,
        moved_from_task_id: task.id,
        moved_count: task.moved_count + 1,
        note: `${task.note ? task.note + " | " : ""}Dời từ ${task.date}`,
      },
    ]);
    fetchYearTasks();
  };

  const selectEl = {
    padding: "0.45rem 0.65rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-color)",
    background: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: "0.85rem",
    cursor: "pointer",
    minWidth: "0",
  } as React.CSSProperties;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Year selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <button
          className="ui-btn ui-btn-secondary ui-btn-sm"
          onClick={() => setSelectedYear((y) => y - 1)}
        >
          ‹ {selectedYear - 1}
        </button>
        <div
          style={{
            fontSize: "1.35rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            minWidth: "80px",
            textAlign: "center",
          }}
        >
          {selectedYear}
        </div>
        <button
          className="ui-btn ui-btn-secondary ui-btn-sm"
          onClick={() => setSelectedYear((y) => y + 1)}
        >
          {selectedYear + 1} ›
        </button>
        {selectedYear !== currentYear && (
          <button
            className="ui-btn ui-btn-ghost ui-btn-sm"
            onClick={() => setSelectedYear(currentYear)}
          >
            Năm hiện tại
          </button>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className="ui-btn ui-btn-secondary ui-btn-sm"
            onClick={expandAllMonths}
          >
            Mở rộng tất cả
          </button>
          <button
            className="ui-btn ui-btn-secondary ui-btn-sm"
            onClick={collapseAllMonths}
          >
            Thu gọn tất cả
          </button>
          <button
            className={`ui-btn ui-btn-sm ${isSelectionMode ? "ui-btn-secondary" : "ui-btn-primary"}`}
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) setSelectedIds(new Set());
            }}
          >
            {isSelectionMode ? "Thoát chọn nhiều" : "Chọn nhiều"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && !fetchError && (
        <div className="year-summary-grid">
          {[
            {
              label: "Tổng task",
              value: filteredTasks.length,
              color: "var(--text-primary)",
            },
            {
              label: "Hoàn thành",
              value: totalDone,
              color: "var(--success)",
            },
            {
              label: "Đang chờ",
              value: totalPending,
              color: "var(--warning)",
            },
            {
              label: "Hoàn thành",
              value: `${completionPct}%`,
              color: "var(--primary)",
            },
          ].map((s) => (
            <div key={s.label + s.value} className="year-stat-card">
              <span className="year-stat-label">{s.label}</span>
              <span className="year-stat-value" style={{ color: s.color }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="year-filter-bar">
        <div className="year-filter-row">
          {/* Keyword search */}
          <div className="year-search-wrap">
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "0.6rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-secondary)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={filters.keyword}
              onChange={(e) =>
                setFilters((f) => ({ ...f, keyword: e.target.value }))
              }
              style={{
                ...selectEl,
                paddingLeft: "2rem",
                flex: 1,
                minWidth: "160px",
              }}
            />
          </div>

          <select
            value={filters.category}
            onChange={(e) =>
              setFilters((f) => ({ ...f, category: e.target.value }))
            }
            style={selectEl}
          >
            <option value="">Tất cả môn</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filters.taskType}
            onChange={(e) =>
              setFilters((f) => ({ ...f, taskType: e.target.value }))
            }
            style={selectEl}
          >
            <option value="">Tất cả loại</option>
            <option value="main">Main</option>
            <option value="secondary">Secondary</option>
            <option value="exercise">Exercise</option>
            <option value="review">Review</option>
            <option value="class">Class</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value }))
            }
            style={selectEl}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="todo">Todo</option>
            <option value="in_progress">Đang làm</option>
            <option value="done">Hoàn thành</option>
            <option value="skipped">Bỏ qua</option>
            <option value="moved">Đã dời</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) =>
              setFilters((f) => ({ ...f, priority: e.target.value }))
            }
            style={selectEl}
          >
            <option value="">Tất cả ưu tiên</option>
            <option value="high">Cao</option>
            <option value="medium">Trung bình</option>
            <option value="low">Thấp</option>
          </select>

          <select
            value={filters.dayType}
            onChange={(e) =>
              setFilters((f) => ({ ...f, dayType: e.target.value }))
            }
            style={selectEl}
          >
            <option value="">Tất cả ngày</option>
            <option value="weekday">Ngày trong tuần</option>
            <option value="weekend">Cuối tuần</option>
          </select>

          <select
            value={filters.month}
            onChange={(e) =>
              setFilters((f) => ({ ...f, month: e.target.value }))
            }
            style={selectEl}
          >
            <option value="">Tất cả tháng</option>
            {MONTH_NAMES_VI.map((m, i) => (
              <option key={i} value={String(i)}>
                {m}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              className="ui-btn ui-btn-ghost ui-btn-sm"
              onClick={clearFilters}
              style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
            >
              <X size={14} />
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {isSelectionMode && (
        <div
          className="bulk-action-toolbar"
          style={{
            position: "sticky",
            top: "1rem",
            zIndex: 30,
            background: "var(--bg-panel)",
            border: "1px solid var(--primary)",
            borderRadius: "var(--radius-md)",
            padding: "1rem",
            boxShadow: "var(--shadow-lg)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            opacity: isProcessingBulk ? 0.5 : 1,
            pointerEvents: isProcessingBulk ? "none" : "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <span style={{ fontWeight: 600, color: "var(--primary)" }}>
              Đã chọn {selectedIds.size} task
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                className="ui-btn ui-btn-secondary ui-btn-sm"
                onClick={toggleSelectAllVisible}
              >
                {selectedIds.size === filteredTasks.length &&
                filteredTasks.length > 0 ? (
                  <>
                    <CheckSquare size={14} style={{ marginRight: "0.25rem" }} />{" "}
                    Bỏ chọn tất cả
                  </>
                ) : (
                  <>
                    <Square size={14} style={{ marginRight: "0.25rem" }} /> Chọn
                    tất cả đang hiển thị
                  </>
                )}
              </button>
              {selectedIds.size > 0 && (
                <button
                  className="ui-btn ui-btn-secondary ui-btn-sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Bỏ chọn
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <button
              className="ui-btn ui-btn-secondary ui-btn-sm"
              disabled={selectedIds.size === 0}
              onClick={() => handleBulkAction("done")}
            >
              <CheckSquare size={14} style={{ marginRight: "0.25rem" }} /> Hoàn
              thành
            </button>
            <button
              className="ui-btn ui-btn-secondary ui-btn-sm"
              disabled={selectedIds.size === 0}
              onClick={() => handleBulkAction("in_progress")}
            >
              <Play size={14} style={{ marginRight: "0.25rem" }} /> Đang làm
            </button>
            <button
              className="ui-btn ui-btn-secondary ui-btn-sm"
              disabled={selectedIds.size === 0}
              onClick={() => handleBulkAction("todo")}
            >
              <RotateCcw size={14} style={{ marginRight: "0.25rem" }} /> Chưa
              làm
            </button>
            <button
              className="ui-btn ui-btn-secondary ui-btn-sm"
              disabled={selectedIds.size === 0}
              onClick={() => handleBulkAction("skipped")}
            >
              <SkipForward size={14} style={{ marginRight: "0.25rem" }} /> Bỏ
              qua
            </button>
            <div
              style={{
                width: "1px",
                background: "var(--border-color)",
                margin: "0 0.25rem",
              }}
            />
            <button
              className="ui-btn ui-btn-secondary ui-btn-sm"
              disabled={selectedIds.size === 0}
              onClick={() =>
                handleBulkAction("move", format(new Date(), "yyyy-MM-dd"))
              }
            >
              <CalendarDays size={14} style={{ marginRight: "0.25rem" }} /> Dời
              hôm nay
            </button>
            <button
              className="ui-btn ui-btn-secondary ui-btn-sm"
              disabled={selectedIds.size === 0}
              onClick={() =>
                handleBulkAction(
                  "move",
                  format(new Date(Date.now() + 86400000), "yyyy-MM-dd"),
                )
              }
            >
              <CalendarPlus size={14} style={{ marginRight: "0.25rem" }} /> Dời
              ngày mai
            </button>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <input
                type="date"
                value={targetDateForMove}
                onChange={(e) => setTargetDateForMove(e.target.value)}
                style={{
                  ...selectEl,
                  padding: "0.25rem 0.5rem",
                  height: "32px",
                }}
              />
              <button
                className="ui-btn ui-btn-secondary ui-btn-sm"
                disabled={selectedIds.size === 0 || !targetDateForMove}
                onClick={() => handleBulkAction("move", targetDateForMove)}
              >
                Dời ngày khác
              </button>
            </div>
            <div
              style={{
                width: "1px",
                background: "var(--border-color)",
                margin: "0 0.25rem",
              }}
            />
            <button
              className="ui-btn ui-btn-danger ui-btn-sm"
              disabled={selectedIds.size === 0}
              onClick={() => handleBulkAction("delete")}
            >
              <Trash2 size={14} style={{ marginRight: "0.25rem" }} /> Xóa task
              đã chọn
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            color: "var(--text-secondary)",
          }}
        >
          Đang tải dữ liệu năm {selectedYear}...
        </div>
      ) : fetchError ? (
        <div
          className="card"
          style={{ padding: "1.5rem", color: "var(--danger)" }}
        >
          Lỗi tải dữ liệu: {fetchError}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "3rem",
            textAlign: "center",
            color: "var(--text-secondary)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <FolderOpen size={36} style={{ opacity: 0.4 }} />
          <p style={{ margin: 0 }}>
            {hasActiveFilters
              ? "Không có task phù hợp với bộ lọc."
              : `Không có task nào trong năm ${selectedYear}.`}
          </p>
          {hasActiveFilters && (
            <button
              className="ui-btn ui-btn-secondary ui-btn-sm"
              onClick={clearFilters}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {Array.from({ length: 12 }, (_, m) => {
            const monthTasks = tasksByMonth[m] || [];
            if (monthTasks.length === 0) return null;
            const done = monthTasks.filter((t) => t.status === "done").length;
            const pct = Math.round((done / monthTasks.length) * 100);
            const isOpen = expandedMonths.has(m);
            const showAll = expandedAllInMonth.has(m);
            const visibleTasks = showAll ? monthTasks : monthTasks.slice(0, 10);
            const hasMore = monthTasks.length > 10;

            return (
              <div key={m} className="year-month-card">
                {/* Month header */}
                <button
                  className="year-month-header"
                  onClick={() => toggleMonth(m)}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {isOpen ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                    <span className="year-month-name">{MONTH_NAMES_VI[m]}</span>
                  </div>
                  <div className="year-month-meta">
                    {isSelectionMode && (
                      <button
                        className="ui-btn ui-btn-secondary ui-btn-sm"
                        style={{
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.75rem",
                          marginRight: "0.5rem",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectMonth(m);
                        }}
                      >
                        {monthTasks.every((t) => selectedIds.has(t.id))
                          ? "Bỏ chọn tháng này"
                          : "Chọn tháng này"}
                      </button>
                    )}
                    <span className="year-month-count">
                      {done}/{monthTasks.length} task
                    </span>
                    <div className="year-month-bar">
                      <div
                        className="year-month-bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="year-month-pct">{pct}%</span>
                  </div>
                </button>

                {/* Month tasks */}
                {isOpen && (
                  <div className="year-month-tasks">
                    {visibleTasks.map((task) => (
                      <TaskDisplay
                        key={task.id}
                        variant="compact"
                        task={task}
                        onUpdate={updateTask}
                        onMove={moveToTomorrow}
                        onEdit={(t) => onEditTask(t)}
                        onDelete={handleDelete}
                        onDuplicate={(t) => {
                          const { id, created_at, updated_at, ...rest } =
                            t as any;
                          onEditTask({
                            ...rest,
                            title: rest.title + " (Copy)",
                          });
                        }}
                        selectionMode={isSelectionMode}
                        isSelected={selectedIds.has(task.id)}
                        onToggleSelect={toggleSelect}
                      />
                    ))}
                    {hasMore && !showAll && (
                      <button
                        className="year-show-more-btn"
                        onClick={() => toggleExpandAll(m)}
                      >
                        Xem thêm {monthTasks.length - 10} task ↓
                      </button>
                    )}
                    {hasMore && showAll && (
                      <button
                        className="year-show-more-btn"
                        onClick={() => toggleExpandAll(m)}
                      >
                        Thu gọn ↑
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Calendar Component ────────────────────────────────────────────────

export const CalendarView: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [globalHasTasks, setGlobalHasTasks] = useState(false);
  const [nearestDate, setNearestDate] = useState<Date | null>(null);

  // Calendar mode: month vs year
  const [calendarMode, setCalendarMode] = useState<CalendarMode>(() => {
    return (
      (localStorage.getItem("study-planner-calendar-mode") as CalendarMode) ||
      "month"
    );
  });

  const [viewMode, setViewMode] = useState<"grid" | "list" | "timeline">(() => {
    return (
      (localStorage.getItem("study-planner-calendar-view-mode") as any) ||
      "grid"
    );
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | undefined>(
    undefined,
  );
  const [isSaving, setIsSaving] = useState(false);

  const [goalsModal, setGoalsModal] = useState<{
    type: "week" | "month";
    date: string;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem("study-planner-calendar-mode", calendarMode);
  }, [calendarMode]);

  useEffect(() => {
    localStorage.setItem("study-planner-calendar-view-mode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    const fetchGlobalStatus = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("tasks")
        .select("date")
        .eq("user_id", user.id)
        .limit(1);
      if (data && data.length > 0) {
        setGlobalHasTasks(true);
        const { data: closest } = await supabase
          .from("tasks")
          .select("date")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(1);
        if (closest && closest.length > 0) {
          setNearestDate(new Date(closest[0].date));
        }
      }
    };
    fetchGlobalStatus();
  }, [user]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user || calendarMode !== "month") return;
      setLoading(true);
      const start = format(startOfMonth(currentDate), "yyyy-MM-dd");
      const end = format(endOfMonth(currentDate), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", start)
        .lte("date", end);
      if (!error && data) setTasks(data);
      setLoading(false);
    };
    fetchTasks();
  }, [user, currentDate, calendarMode]);

  const fetchTasksNoCache = async () => {
    if (!user) return;
    const start = format(startOfMonth(currentDate), "yyyy-MM-dd");
    const end = format(endOfMonth(currentDate), "yyyy-MM-dd");
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end);
    if (data) setTasks(data);
  };

  const updateTask = async (id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    await supabase.from("tasks").update(patch).eq("id", id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa task này?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  };

  const handleDuplicate = (task: Task) => {
    const { id, created_at, updated_at, ...rest } = task;
    setEditingTask({ ...rest, title: rest.title + " (Copy)" });
    setIsFormOpen(true);
  };

  const moveToTomorrow = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const tomorrow = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");
    await updateTask(id, { status: "moved" });
    await supabase.from("tasks").insert([
      {
        user_id: user?.id,
        date: tomorrow,
        start_time: task.start_time,
        end_time: task.end_time,
        category: task.category,
        title: task.title,
        description: task.description,
        task_type: task.task_type,
        status: "todo",
        priority: task.priority,
        score_weight: task.score_weight,
        moved_from_task_id: task.id,
        moved_count: task.moved_count + 1,
        note: `${task.note ? task.note + " | " : ""}Dời từ ${task.date}`,
      },
    ]);
    fetchTasksNoCache();
  };

  const handleSaveForm = async (taskData: Partial<Task>) => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (taskData.id) {
        const { error } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", taskData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tasks")
          .insert({ ...taskData, user_id: user.id });
        if (error) throw error;
      }
      setIsFormOpen(false);
      fetchTasksNoCache();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Month view calculations
  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });
  const startDay = getDay(startOfMonth(currentDate));
  const blanksCount = startDay === 0 ? 6 : startDay - 1;
  const blanks = Array.from({ length: blanksCount }, () => null);
  const allCells: (Date | null)[] = [...blanks, ...days];
  while (allCells.length % 7 !== 0) allCells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < allCells.length; i += 7)
    weeks.push(allCells.slice(i, i + 7));

  return (
    <div className="page-container">
      <header
        className="page-header"
        style={{ alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>Lịch tổng quan</h1>
          <p className="text-muted">
            {calendarMode === "month"
              ? `Tháng ${format(currentDate, "M/yyyy")}`
              : "Tổng quan theo năm"}
          </p>

          {/* Mode switcher: Tháng | Năm */}
          <div className="segmented-control" style={{ marginTop: "0.875rem" }}>
            <button
              className={`segmented-btn ${calendarMode === "month" ? "active" : ""}`}
              onClick={() => setCalendarMode("month")}
            >
              Tháng
            </button>
            <button
              className={`segmented-btn ${calendarMode === "year" ? "active" : ""}`}
              onClick={() => setCalendarMode("year")}
            >
              Năm
            </button>
          </div>

          {/* Month sub-view mode */}
          {calendarMode === "month" && (
            <div className="segmented-control" style={{ marginTop: "0.5rem" }}>
              <button
                className={`segmented-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
              >
                Grid
              </button>
              <button
                className={`segmented-btn ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
              >
                List
              </button>
              <button
                className={`segmented-btn ${viewMode === "timeline" ? "active" : ""}`}
                onClick={() => setViewMode("timeline")}
              >
                Timeline
              </button>
            </div>
          )}
        </div>

        {/* Month nav (only shown in month mode) */}
        {calendarMode === "month" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              alignItems: "flex-end",
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                className="ui-btn ui-btn-secondary ui-btn-sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Về hôm nay
              </button>
              <button
                className="ui-btn ui-btn-secondary ui-btn-sm"
                onClick={() =>
                  setCurrentDate(
                    new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth() - 1,
                      1,
                    ),
                  )
                }
              >
                ‹ Tháng trước
              </button>
              <button
                className="ui-btn ui-btn-secondary ui-btn-sm"
                onClick={() =>
                  setCurrentDate(
                    new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth() + 1,
                      1,
                    ),
                  )
                }
              >
                Tháng sau ›
              </button>
            </div>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              Tổng task tháng: {tasks.length}
            </p>
            <button
              className="ui-btn ui-btn-primary ui-btn-sm"
              onClick={() =>
                setGoalsModal({
                  type: "month",
                  date: format(startOfMonth(currentDate), "yyyy-MM-dd"),
                })
              }
            >
              Mục tiêu tháng
            </button>
          </div>
        )}
      </header>

      {/* ── YEAR VIEW ── */}
      {calendarMode === "year" && (
        <div style={{ paddingTop: "1rem" }}>
          <YearView
            user={user}
            onEditTask={(t) => {
              setEditingTask(t);
              setIsFormOpen(true);
            }}
            onRefreshNeeded={() => {}}
          />
        </div>
      )}

      {/* ── MONTH VIEW ── */}
      {calendarMode === "month" && (
        <>
          {loading ? (
            <div className="loading-state">Đang tải...</div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2rem",
                paddingTop: "1rem",
              }}
            >
              {tasks.length === 0 && globalHasTasks && (
                <div className="card" style={{ marginBottom: "1rem" }}>
                  <p>
                    Không có task trong tháng này, nhưng tài khoản có task ở
                    tháng khác.
                  </p>
                  {nearestDate && (
                    <button
                      className="primary-btn"
                      style={{ marginTop: "0.5rem", width: "auto" }}
                      onClick={() => setCurrentDate(nearestDate)}
                    >
                      Về tháng có task gần nhất
                    </button>
                  )}
                </div>
              )}

              {viewMode === "grid" && (
                <>
                  <div className="calendar-grid">
                    {["T2", "T3", "T4", "T5", "T6", "T7", "CN", ""].map(
                      (d, i) => (
                        <div key={i} className="calendar-header-cell">
                          {d}
                        </div>
                      ),
                    )}

                    {weeks.map((week, weekIdx) => (
                      <React.Fragment key={`week-${weekIdx}`}>
                        {week.map((day, dayIdx) => {
                          if (!day)
                            return (
                              <div
                                key={`empty-${weekIdx}-${dayIdx}`}
                                className="calendar-cell empty"
                              />
                            );

                          const dayTasks = tasks.filter((t) =>
                            isSameDay(new Date(t.date), day),
                          );
                          const doneTasks = dayTasks.filter(
                            (t) => t.status === "done",
                          );

                          return (
                            <div
                              key={day.toString()}
                              className={`calendar-cell ${isSameDay(day, new Date()) ? "today" : ""} ${selectedDate && isSameDay(day, selectedDate) ? "selected" : ""}`}
                              onClick={() => setSelectedDate(day)}
                              style={{
                                cursor: "pointer",
                                border:
                                  selectedDate && isSameDay(day, selectedDate)
                                    ? "2px solid var(--primary)"
                                    : undefined,
                              }}
                            >
                              <div className="cell-date">
                                {format(day, "d")}
                              </div>
                              {dayTasks.length > 0 && (
                                <div className="cell-stats">
                                  <div className="cell-progress">
                                    <div
                                      className="progress-fill"
                                      style={{
                                        width: `${(doneTasks.length / dayTasks.length) * 100}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="cell-count">
                                    {doneTasks.length}/{dayTasks.length}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <button
                          className="week-goal-btn"
                          onClick={() => {
                            const firstValidDay = week.find((d) => d);
                            if (firstValidDay)
                              setGoalsModal({
                                type: "week",
                                date: format(firstValidDay, "yyyy-MM-dd"),
                              });
                          }}
                          title="Mục tiêu tuần"
                        >
                          Mục tiêu
                        </button>
                      </React.Fragment>
                    ))}
                  </div>

                  {selectedDate && (
                    <div
                      className="card"
                      style={{
                        marginTop: "2rem",
                        animation: "slideUp 0.3s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "1rem",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                        }}
                      >
                        <h3 style={{ margin: 0 }}>
                          Chi tiết ngày {format(selectedDate, "dd/MM/yyyy")}
                        </h3>
                        <button
                          className="secondary-btn"
                          onClick={() => setSelectedDate(null)}
                          style={{ padding: "0.2rem 0.6rem", width: "auto" }}
                        >
                          Đóng
                        </button>
                      </div>

                      {(() => {
                        const dayTasks = tasks.filter((t) =>
                          isSameDay(new Date(t.date), selectedDate),
                        );
                        const doneCount = dayTasks.filter(
                          (t) => t.status === "done",
                        ).length;
                        return (
                          <>
                            <div
                              style={{
                                marginBottom: "1rem",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "1rem",
                              }}
                            >
                              <div className="text-muted">
                                {dayTasks.length} tasks ({doneCount} hoàn thành)
                              </div>
                              <button
                                className="primary-btn"
                                style={{
                                  width: "auto",
                                  margin: 0,
                                  padding: "0.4rem 0.8rem",
                                }}
                                onClick={() => {
                                  setEditingTask({
                                    date: format(selectedDate, "yyyy-MM-dd"),
                                  });
                                  setIsFormOpen(true);
                                }}
                              >
                                + Thêm task
                              </button>
                            </div>
                            {dayTasks.length === 0 ? (
                              <div
                                className="text-muted"
                                style={{
                                  padding: "3rem 0",
                                  textAlign: "center",
                                  background: "rgba(0,0,0,0.1)",
                                  borderRadius: "8px",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                }}
                              >
                                <FolderOpen
                                  size={32}
                                  style={{ opacity: 0.5 }}
                                />
                                <span>
                                  Ngày này chưa có task. Thêm task mới?
                                </span>
                              </div>
                            ) : (
                              <div
                                className="task-list card"
                                style={{ padding: 0, overflow: "hidden" }}
                              >
                                {dayTasks.map((task) => (
                                  <TaskDisplay
                                    key={task.id}
                                    variant="compact"
                                    task={task}
                                    onUpdate={updateTask}
                                    onMove={moveToTomorrow}
                                    onEdit={(t) => {
                                      setEditingTask(t);
                                      setIsFormOpen(true);
                                    }}
                                    onDelete={handleDelete}
                                    onDuplicate={handleDuplicate}
                                  />
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}

              {viewMode === "list" && (
                <div
                  className="task-groups"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2rem",
                  }}
                >
                  {days
                    .filter((day) =>
                      tasks.some((t) => isSameDay(new Date(t.date), day)),
                    )
                    .map((day) => {
                      const dayTasks = tasks.filter((t) =>
                        isSameDay(new Date(t.date), day),
                      );
                      const doneCount = dayTasks.filter(
                        (t) => t.status === "done",
                      ).length;
                      return (
                        <div key={day.toString()} className="task-group">
                          <h3
                            style={{
                              marginBottom: "1rem",
                              borderBottom: "1px solid var(--border-color)",
                              paddingBottom: "0.5rem",
                            }}
                          >
                            {format(day, "EEEE, dd/MM/yyyy", { locale: vi })}{" "}
                            <span
                              style={{
                                fontSize: "0.875rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              ({doneCount}/{dayTasks.length})
                            </span>
                          </h3>
                          <div
                            className="task-list card"
                            style={{ padding: 0, overflow: "hidden" }}
                          >
                            {dayTasks.map((task) => (
                              <TaskDisplay
                                key={task.id}
                                variant="compact"
                                task={task}
                                onUpdate={updateTask}
                                onMove={moveToTomorrow}
                                onEdit={(t) => {
                                  setEditingTask(t);
                                  setIsFormOpen(true);
                                }}
                                onDelete={handleDelete}
                                onDuplicate={handleDuplicate}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {viewMode === "timeline" &&
                (() => {
                  const timedTasks = tasks
                    .filter((t) => t.start_time)
                    .sort((a, b) => {
                      if (a.date !== b.date)
                        return a.date.localeCompare(b.date);
                      return a.start_time.localeCompare(b.start_time);
                    });
                  return (
                    <div
                      className="timeline-view-container"
                      style={{ paddingLeft: "1rem" }}
                    >
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {timedTasks.map((task) => (
                          <TaskDisplay
                            key={task.id}
                            variant="timeline"
                            task={task}
                            onUpdate={updateTask}
                            onMove={moveToTomorrow}
                            onEdit={(t) => {
                              setEditingTask(t);
                              setIsFormOpen(true);
                            }}
                            onDelete={handleDelete}
                            onDuplicate={handleDuplicate}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}
            </div>
          )}
        </>
      )}

      {isFormOpen && (
        <TaskForm
          initialData={editingTask}
          onSubmit={handleSaveForm}
          onCancel={() => setIsFormOpen(false)}
          isLoading={isSaving}
        />
      )}

      {goalsModal && (
        <GoalsPanel
          periodType={goalsModal.type}
          periodStartDate={goalsModal.date}
          isModal
          onClose={() => setGoalsModal(null)}
        />
      )}
    </div>
  );
};
