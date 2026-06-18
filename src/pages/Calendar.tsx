import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Task } from "../types";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
} from "date-fns";
import { vi } from "date-fns/locale";
import { TaskDisplay } from "../components/tasks/TaskDisplay";
import { TaskForm } from "../components/TaskForm";
import { GoalsPanel } from "../components/GoalsPanel";
import { FolderOpen } from "lucide-react";

export const CalendarView: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [globalHasTasks, setGlobalHasTasks] = useState(false);
  const [nearestDate, setNearestDate] = useState<Date | null>(null);

  const [viewMode, setViewMode] = useState<"grid" | "list" | "timeline">(() => {
    return (
      (localStorage.getItem("study-planner-calendar-view-mode") as any) ||
      "grid"
    );
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | undefined>(
    undefined,
  );
  const [isSaving, setIsSaving] = useState(false);

  // Goals modal state
  const [goalsModal, setGoalsModal] = useState<{
    type: "week" | "month";
    date: string;
  } | null>(null);

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
      if (!user) return;
      setLoading(true);
      const start = format(startOfMonth(currentDate), "yyyy-MM-dd");
      const end = format(endOfMonth(currentDate), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", start)
        .lte("date", end);

      if (!error && data) {
        setTasks(data);
      }
      setLoading(false);
    };
    fetchTasks();
  }, [user, currentDate]);

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
    await supabase.from("tasks").insert([newTask]);
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

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });
  const startDay = getDay(startOfMonth(currentDate)); // 0 = Sunday
  const blanksCount = startDay === 0 ? 6 : startDay - 1; // Assuming Monday is first day
  const blanks = Array.from({ length: blanksCount }, () => null);

  const allCells: (Date | null)[] = [...blanks, ...days];
  while (allCells.length % 7 !== 0) {
    allCells.push(null);
  }
  const weeks = [];
  for (let i = 0; i < allCells.length; i += 7) {
    weeks.push(allCells.slice(i, i + 7));
  }

  return (
    <div className="page-container">
      <header
        className="page-header"
        style={{ alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}
      >
        <div>
          <h1>Lịch tháng {format(currentDate, "M/yyyy")}</h1>
          <p className="text-muted">
            Tổng task trong tháng này: {tasks.length}
          </p>
          <div className="segmented-control" style={{ marginTop: "1rem" }}>
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
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            alignItems: "flex-end",
          }}
        >
          <div>
            <button
              className="secondary-btn"
              onClick={() => setCurrentDate(new Date())}
              style={{ marginRight: "0.5rem" }}
            >
              Về hôm nay
            </button>
            <button
              className="secondary-btn"
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
              Tháng trước
            </button>
            <button
              className="secondary-btn"
              onClick={() =>
                setCurrentDate(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() + 1,
                    1,
                  ),
                )
              }
              style={{ marginLeft: "0.5rem" }}
            >
              Tháng sau
            </button>
          </div>
          <button
            className="primary-btn"
            style={{ width: "auto", margin: 0, padding: "0.4rem 0.8rem" }}
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
      </header>

      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {tasks.length === 0 && globalHasTasks && (
            <div className="card" style={{ marginBottom: "1rem" }}>
              <p>
                Không có task trong tháng này, nhưng tài khoản có task ở tháng
                khác.
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
                {["T2", "T3", "T4", "T5", "T6", "T7", "CN", ""].map((d, i) => (
                  <div key={i} className="calendar-header-cell">
                    {d}
                  </div>
                ))}

                {weeks.map((week, weekIdx) => (
                  <React.Fragment key={`week-${weekIdx}`}>
                    {week.map((day, dayIdx) => {
                      if (!day)
                        return (
                          <div
                            key={`empty-${weekIdx}-${dayIdx}`}
                            className="calendar-cell empty"
                          ></div>
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
                          <div className="cell-date">{format(day, "d")}</div>
                          {dayTasks.length > 0 && (
                            <div className="cell-stats">
                              <div className="cell-progress">
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${(doneTasks.length / dayTasks.length) * 100}%`,
                                  }}
                                ></div>
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
                  style={{ marginTop: "2rem", animation: "slideUp 0.3s ease" }}
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
                            <FolderOpen size={32} style={{ opacity: 0.5 }} />
                            <span>Ngày này chưa có task. Thêm task mới?</span>
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
              style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
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
                  if (a.date !== b.date) return a.date.localeCompare(b.date);
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
