import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Task } from "../types";
import { TaskDisplay } from "../components/tasks/TaskDisplay";
import { TaskForm } from "../components/TaskForm";
import { format } from "date-fns";
import { PartyPopper } from "lucide-react";
import { ScheduleHeader } from "../components/schedule/ScheduleHeader";
import { Button } from "../components/ui/Button";

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
    setTasks([]); // clear stale tasks
    setOverdueTasks([]); // clear stale overdue tasks

    const todayStr = format(new Date(), "yyyy-MM-dd");

    // Fetch selected date tasks
    const { data: dayData, error: dayErr } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", selectedDate)
      .order("start_time", { ascending: true });

    // Fetch overdue tasks (only overdue relative to today, so if viewing future date, overdue is still < today)
    const { data: overdueData, error: overErr } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .lt("date", todayStr)
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
