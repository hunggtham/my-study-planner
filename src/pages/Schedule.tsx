import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Task } from "../types";
import { TaskDisplay } from "../components/tasks/TaskDisplay";
import { TaskForm } from "../components/TaskForm";
import { format } from "date-fns";
import { useToast } from "../context/ToastContext";
import { PartyPopper } from "lucide-react";
import { ScheduleHeader } from "../components/schedule/ScheduleHeader";
import { Button } from "../components/ui/Button";
import { useSearchParams } from "react-router-dom";
import {
  CheckSquare,
  Square,
  Trash2,
  CalendarDays,
  CalendarPlus,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react";

export const Schedule: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlDate = searchParams.get("date");

  const [selectedDate, setSelectedDate] = useState<string>(
    urlDate || format(new Date(), "yyyy-MM-dd"),
  );

  // Sync state to URL
  useEffect(() => {
    if (selectedDate !== searchParams.get("date")) {
      setSearchParams({ date: selectedDate }, { replace: false });
    }
  }, [selectedDate, searchParams, setSearchParams]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "timeline" | "compact">(
    () => {
      return (
        (localStorage.getItem("study-planner-today-view-mode") as any) || "list"
      );
    },
  );

  useEffect(() => {
    localStorage.setItem("study-planner-today-view-mode", viewMode);
  }, [viewMode]);

  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | undefined>(
    undefined,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Selection mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetDateForMove, setTargetDateForMove] = useState("");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = [
      ...tasks.map((t) => t.id),
      ...overdueTasks.map((t) => t.id),
    ];
    if (selectedIds.size === visibleIds.length && visibleIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  };

  const handleBulkAction = async (action: string, payload?: any) => {
    if (!user || selectedIds.size === 0) return;

    // For delete, require confirmation
    if (action === "delete") {
      if (
        !window.confirm(
          `Bạn chắc chắn muốn xóa ${selectedIds.size} task đã chọn?`,
        )
      ) {
        return;
      }
    }

    setLoading(true);
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
        // status update
        query = supabase
          .from("tasks")
          .update({ status: action })
          .in("id", ids)
          .eq("user_id", user.id);
      }

      const { error } = await query;
      if (error) throw error;

      // Also create new tasks for move? The prompt says:
      // "update({ date: targetDate, status: 'moved' }) or use existing move logic if the app has a better convention."
      // In this app, move creates a new task and marks old as moved.
      // But for bulk action, updating date directly is much safer and simpler. The user explicitly suggested it.

      // Clear selection and refresh
      setSelectedIds(new Set());
      if (action === "delete") {
        setIsSelectionMode(false);
      }
      fetchScheduleTasks();

      const actionText =
        action === "delete"
          ? "Đã xóa"
          : action === "move"
            ? "Đã dời"
            : "Đã cập nhật";
      showToast(`${actionText} ${ids.length} task.`, "success");
    } catch (err: any) {
      showToast("Có lỗi khi lưu dữ liệu: " + err.message, "error");
      setLoading(false);
    }
  };

  const fetchScheduleTasks = async () => {
    if (!user) return;
    setLoading(true);
    setTasks([]); // clear stale tasks
    setOverdueTasks([]); // clear stale overdue tasks

    // Fetch selected date tasks
    const { data: dayData, error: dayErr } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", selectedDate)
      .order("start_time", { ascending: true });

    // Fetch overdue tasks relative to selectedDate
    const { data: overdueData, error: overErr } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .lt("date", selectedDate)
      .in("status", ["todo", "in_progress", "skipped"])
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (dayErr) console.error("Day fetch error:", dayErr);
    if (overErr) console.error("Overdue fetch error:", overErr);

    setTasks(dayData || []);
    // Filter out overdue tasks that happen to be on the selectedDate (if user selects a past date)
    // so they don't appear in both lists.
    const filteredOverdue = (overdueData || []).filter(
      (t) => t.date !== selectedDate,
    );
    setOverdueTasks(filteredOverdue);

    setLoading(false);
  };

  useEffect(() => {
    fetchScheduleTasks();
  }, [user, selectedDate]);

  const updateTask = async (id: string, patch: Partial<Task>) => {
    if (processingId) return;
    setProcessingId(id);
    const backup =
      tasks.find((t) => t.id === id) || overdueTasks.find((t) => t.id === id);

    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setOverdueTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );

    try {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
      showToast("Đã cập nhật task.", "success");
    } catch (err: any) {
      console.error("Update failed:", err);
      showToast("Có lỗi khi cập nhật: " + err.message, "error");
      if (backup) {
        setTasks((prev) => prev.map((t) => (t.id === id ? backup : t)));
        setOverdueTasks((prev) => prev.map((t) => (t.id === id ? backup : t)));
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveForm = async (taskData: Partial<Task>) => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (taskData.id) {
        // Update
        const { error } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", taskData.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from("tasks")
          .insert({ ...taskData, user_id: user.id });
        if (error) throw error;
      }
      setIsFormOpen(false);
      fetchScheduleTasks();
      showToast("Đã lưu task.", "success");
    } catch (err: any) {
      showToast("Có lỗi khi lưu dữ liệu: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (processingId) return;
    if (!window.confirm("Bạn có chắc muốn xóa task này?")) return;

    setProcessingId(id);
    const backupTasks = [...tasks];
    const backupOverdue = [...overdueTasks];

    setTasks((prev) => prev.filter((t) => t.id !== id));
    setOverdueTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      showToast("Đã xóa task.", "success", {
        label: "Hoàn tác",
        onClick: async () => {
          const taskToRestore =
            backupTasks.find((t) => t.id === id) ||
            backupOverdue.find((t) => t.id === id);
          if (taskToRestore) {
            await supabase.from("tasks").insert([taskToRestore]);
            fetchScheduleTasks();
            showToast("Đã hoàn tác xóa task.", "info");
          }
        },
      });
    } catch (err: any) {
      console.error("Delete failed:", err);
      showToast("Lỗi xóa task: " + err.message, "error");
      setTasks(backupTasks);
      setOverdueTasks(backupOverdue);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDuplicate = (task: Task) => {
    const { id, created_at, updated_at, ...rest } = task;
    setEditingTask({ ...rest, title: rest.title + " (Copy)" });
    setIsFormOpen(true);
  };

  const moveToTomorrow = async (id: string) => {
    if (processingId) return;
    const task =
      tasks.find((t) => t.id === id) || overdueTasks.find((t) => t.id === id);
    if (!task) return;

    setProcessingId(id);
    const tomorrow = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");

    try {
      const { error: err1 } = await supabase
        .from("tasks")
        .update({ status: "moved" })
        .eq("id", id);
      if (err1) throw err1;

      const newTask = {
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
      };

      const { error: err2 } = await supabase.from("tasks").insert([newTask]);
      if (err2) throw err2;

      fetchScheduleTasks();
      showToast("Đã dời task sang ngày mai.", "success");
    } catch (err: any) {
      console.error("Move failed:", err);
      showToast("Lỗi dời task: " + err.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const completedCount = tasks.filter((t) => t.status === "done").length;

  // Group by category
  const groups = tasks.reduce(
    (acc, task) => {
      if (!acc[task.category]) acc[task.category] = [];
      acc[task.category].push(task);
      return acc;
    },
    {} as Record<string, Task[]>,
  );

  const visibleIds = [
    ...tasks.map((t) => t.id),
    ...overdueTasks.map((t) => t.id),
  ];
  const allVisibleSelected =
    selectedIds.size === visibleIds.length && visibleIds.length > 0;

  return (
    <div className="page-container" style={{ padding: "1rem" }}>
      <ScheduleHeader
        tasksCount={tasks.length}
        completedCount={completedCount}
        movedCount={tasks.filter((t) => t.status === "moved").length}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onAddTask={() => {
          setEditingTask({ date: selectedDate });
          setIsFormOpen(true);
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        {isSelectionMode && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleSelectAllVisible}
            >
              {allVisibleSelected ? (
                <>
                  <CheckSquare size={14} style={{ marginRight: "0.25rem" }} />{" "}
                  Bỏ chọn tất cả
                </>
              ) : (
                <>
                  <Square size={14} style={{ marginRight: "0.25rem" }} /> Chọn
                  tất cả
                </>
              )}
            </Button>
            {selectedIds.size > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Bỏ chọn
              </Button>
            )}
          </>
        )}
        <Button
          variant={isSelectionMode ? "secondary" : "primary"}
          size="sm"
          onClick={() => {
            setIsSelectionMode(!isSelectionMode);
            setSelectedIds(new Set());
          }}
        >
          {isSelectionMode ? "Thoát chọn nhiều" : "Chọn nhiều"}
        </Button>
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
            marginBottom: "1.5rem",
            boxShadow: "var(--shadow-lg)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
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
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Button
              variant="secondary"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => handleBulkAction("done")}
            >
              <CheckSquare size={14} style={{ marginRight: "0.25rem" }} /> Hoàn
              thành
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => handleBulkAction("in_progress")}
            >
              <Play size={14} style={{ marginRight: "0.25rem" }} /> Đang làm
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => handleBulkAction("todo")}
            >
              <RotateCcw size={14} style={{ marginRight: "0.25rem" }} /> Chưa
              làm
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => handleBulkAction("skipped")}
            >
              <SkipForward size={14} style={{ marginRight: "0.25rem" }} /> Bỏ
              qua
            </Button>

            <div
              style={{
                width: "1px",
                background: "var(--border-color)",
                margin: "0 0.25rem",
              }}
            />

            <Button
              variant="secondary"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() =>
                handleBulkAction("move", format(new Date(), "yyyy-MM-dd"))
              }
            >
              <CalendarDays size={14} style={{ marginRight: "0.25rem" }} /> Dời
              hôm nay
            </Button>
            <Button
              variant="secondary"
              size="sm"
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
            </Button>

            <div
              style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <input
                type="date"
                value={targetDateForMove}
                onChange={(e) => setTargetDateForMove(e.target.value)}
                style={{
                  padding: "0.25rem 0.5rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  height: "32px",
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={selectedIds.size === 0 || !targetDateForMove}
                onClick={() => handleBulkAction("move", targetDateForMove)}
              >
                Dời ngày khác
              </Button>
            </div>

            <div
              style={{
                width: "1px",
                background: "var(--border-color)",
                margin: "0 0.25rem",
              }}
            />

            <Button
              variant="danger"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => handleBulkAction("delete")}
            >
              <Trash2 size={14} style={{ marginRight: "0.25rem" }} /> Xóa task
              đã chọn
            </Button>
          </div>
        </div>
      )}

      {selectedDate < format(new Date(), "yyyy-MM-dd") && (
        <div
          style={{
            background: "var(--bg-muted)",
            border: "1px solid var(--border-color)",
            padding: "0.75rem",
            borderRadius: "var(--radius-sm)",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Bạn đang xem lịch trình cũ (
            {format(new Date(selectedDate), "dd/MM/yyyy")})
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
          >
            Về hôm nay
          </Button>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : (
        <>
          {overdueTasks.length > 0 && (
            <div className="overdue-section" style={{ marginBottom: "2rem" }}>
              <h3
                style={{
                  color: "var(--warning)",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--warning)",
                    display: "inline-block",
                  }}
                />
                Task quá hạn chưa hoàn thành ({overdueTasks.length})
              </h3>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {overdueTasks.map((task) => (
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
                    isProcessing={processingId === task.id}
                    selectionMode={isSelectionMode}
                    isSelected={selectedIds.has(task.id)}
                    onToggleSelect={toggleSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 ? (
            <div
              className="empty-state card"
              style={{
                textAlign: "center",
                padding: "4rem 1rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <PartyPopper
                size={48}
                color="var(--primary)"
                style={{ marginBottom: "1rem", opacity: 0.8 }}
              />
              <p style={{ fontSize: "1.1rem", fontWeight: 500 }}>
                Chưa có task nào cho ngày này.
              </p>
              <p
                className="text-muted"
                style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}
              >
                Thêm task mới hoặc mở Lịch tháng để lên lịch.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditingTask({ date: selectedDate });
                    setIsFormOpen(true);
                  }}
                >
                  + Thêm task cho ngày này
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setSelectedDate(format(new Date(), "yyyy-MM-dd"))
                  }
                >
                  Về hôm nay
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="task-views-container"
              style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
            >
              {viewMode === "list" && (
                <div
                  className="task-groups"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.5rem",
                  }}
                >
                  {Object.entries(groups).map(([category, catTasks]) => {
                    const catDone = catTasks.filter(
                      (t) => t.status === "done",
                    ).length;
                    return (
                      <div key={category} className="task-group">
                        <div
                          style={{
                            marginBottom: "0.75rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottom: "1px solid var(--border-color)",
                            paddingBottom: "0.5rem",
                          }}
                        >
                          <h3 style={{ fontSize: "1.1rem", margin: 0 }}>
                            {category}{" "}
                            <span
                              style={{
                                fontSize: "0.875rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              ({catDone}/{catTasks.length})
                            </span>
                          </h3>
                          <div
                            style={{
                              width: "60px",
                              height: "4px",
                              background: "rgba(255,255,255,0.1)",
                              borderRadius: "2px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${(catDone / catTasks.length) * 100}%`,
                                height: "100%",
                                background: "var(--success)",
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="task-list" style={{ gap: "0.75rem" }}>
                          {catTasks.map((task) => (
                            <TaskDisplay
                              key={task.id}
                              variant="card"
                              task={task}
                              onUpdate={updateTask}
                              onMove={moveToTomorrow}
                              onEdit={(t) => {
                                setEditingTask(t);
                                setIsFormOpen(true);
                              }}
                              onDelete={handleDelete}
                              onDuplicate={handleDuplicate}
                              isProcessing={processingId === task.id}
                              selectionMode={isSelectionMode}
                              isSelected={selectedIds.has(task.id)}
                              onToggleSelect={toggleSelect}
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
                    .sort((a, b) => a.start_time.localeCompare(b.start_time));
                  const noTimeTasks = tasks.filter((t) => !t.start_time);

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
                            isProcessing={processingId === task.id}
                            selectionMode={isSelectionMode}
                            isSelected={selectedIds.has(task.id)}
                            onToggleSelect={toggleSelect}
                          />
                        ))}
                      </div>

                      {noTimeTasks.length > 0 && (
                        <div style={{ marginTop: "2rem" }}>
                          <h4
                            style={{
                              color: "var(--text-muted)",
                              marginBottom: "1rem",
                              borderBottom: "1px solid var(--border-color)",
                              paddingBottom: "0.5rem",
                            }}
                          >
                            Chưa đặt giờ
                          </h4>
                          <div
                            className="card"
                            style={{ padding: 0, overflow: "hidden" }}
                          >
                            {noTimeTasks.map((task) => (
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
                                isProcessing={processingId === task.id}
                                selectionMode={isSelectionMode}
                                isSelected={selectedIds.has(task.id)}
                                onToggleSelect={toggleSelect}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              {viewMode === "compact" && (
                <div className="compact-view card" style={{ padding: 0 }}>
                  {tasks.map((task) => (
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
                      isProcessing={processingId === task.id}
                      selectionMode={isSelectionMode}
                      isSelected={selectedIds.has(task.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))}
                </div>
              )}
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
    </div>
  );
};
