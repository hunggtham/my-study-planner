import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Task } from "../types";
import { TaskDisplay } from "../components/tasks/TaskDisplay";
import { TaskForm } from "../components/TaskForm";
import { format, addDays, subDays } from "date-fns";
import { vi } from "date-fns/locale";
import { PartyPopper, ChevronLeft, ChevronRight } from "lucide-react";

export const Schedule: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
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

  const fetchScheduleTasks = async () => {
    if (!user) return;
    setLoading(true);
    const todayStr = format(new Date(), "yyyy-MM-dd");

    // Fetch selected date OR overdue tasks
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .or(
        `date.eq.${selectedDate},and(date.lt.${todayStr},status.in.(todo,in_progress))`,
      )
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error(error);
    } else {
      const allFetched = data || [];
      const dayTasks = allFetched.filter((t) => t.date === selectedDate);
      const overdue = allFetched.filter(
        (t) =>
          t.date !== selectedDate &&
          t.date < todayStr &&
          ["todo", "in_progress"].includes(t.status),
      );

      setTasks(dayTasks);
      setOverdueTasks(overdue);
    }
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
    } catch (err: any) {
      console.error("Update failed:", err);
      alert("Lỗi cập nhật: " + err.message);
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
    } catch (err: any) {
      alert("Lỗi: " + err.message);
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
    } catch (err: any) {
      console.error("Delete failed:", err);
      alert("Lỗi xóa task: " + err.message);
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
    } catch (err: any) {
      console.error("Move failed:", err);
      alert("Lỗi dời task: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const completedCount = tasks.filter((t) => t.status === "done").length;
  const progress = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;

  // Group by category
  const groups = tasks.reduce(
    (acc, task) => {
      if (!acc[task.category]) acc[task.category] = [];
      acc[task.category].push(task);
      return acc;
    },
    {} as Record<string, Task[]>,
  );

  return (
    <div className="page-container">
      <header
        className="page-header today-header"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h1>Lịch trình</h1>
            <p className="text-muted">Quản lý task theo ngày</p>
          </div>

          <div
            className="header-stats-row"
            style={{ display: "flex", gap: "1rem" }}
          >
            <div
              className="stat-box"
              style={{
                background: "rgba(255,255,255,0.05)",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                {tasks.length}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Tổng
              </div>
            </div>
            <div
              className="stat-box"
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "var(--success)",
                }}
              >
                {completedCount}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--success)" }}>
                Xong ({progress}%)
              </div>
            </div>
            <div
              className="stat-box"
              style={{
                background: "rgba(245, 158, 11, 0.1)",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "var(--warning)",
                }}
              >
                {tasks.filter((t) => t.status === "moved").length}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--warning)" }}>
                Dời
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.5rem",
            background: "rgba(0,0,0,0.2)",
            padding: "0.5rem",
            borderRadius: "8px",
          }}
        >
          <button
            className="secondary-btn icon-btn"
            onClick={() =>
              setSelectedDate(
                format(subDays(new Date(selectedDate), 1), "yyyy-MM-dd"),
              )
            }
            title="Ngày trước"
          >
            <ChevronLeft size={18} />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            style={{
              background: "transparent",
              color: "var(--text-main)",
              border: "none",
              outline: "none",
              padding: "0.5rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          />
          <button
            className="secondary-btn"
            onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
          >
            Hôm nay
          </button>
          <button
            className="secondary-btn icon-btn"
            onClick={() =>
              setSelectedDate(
                format(addDays(new Date(selectedDate), 1), "yyyy-MM-dd"),
              )
            }
            title="Ngày sau"
          >
            <ChevronRight size={18} />
          </button>
          <span style={{ marginLeft: "0.5rem", color: "var(--text-muted)" }}>
            {format(new Date(selectedDate), "EEEE", { locale: vi })}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div className="segmented-control">
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
            <button
              className={`segmented-btn ${viewMode === "compact" ? "active" : ""}`}
              onClick={() => setViewMode("compact")}
            >
              Compact
            </button>
          </div>
          <button
            className="primary-btn"
            style={{ width: "auto", margin: 0 }}
            onClick={() => {
              setEditingTask({ date: selectedDate });
              setIsFormOpen(true);
            }}
          >
            + Thêm Task
          </button>
        </div>
      </header>

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
              <button
                className="primary-btn"
                style={{ width: "auto" }}
                onClick={() => {
                  setEditingTask({ date: selectedDate });
                  setIsFormOpen(true);
                }}
              >
                + Thêm Task
              </button>
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
