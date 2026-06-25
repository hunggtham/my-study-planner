import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Task } from "../types";
import { AttentionTaskRow } from "../components/tasks/AttentionTaskRow";
import { TaskForm } from "../components/TaskForm";
import { useToast } from "../context/ToastContext";
import { format, addDays } from "date-fns";
import { isAttentionTask, getAttentionReasons } from "../lib/attentionTasks";

export const AttentionTasks: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filter, setFilter] = useState<
    | "all"
    | "overdue"
    | "late_today"
    | "moved_or_skipped"
    | "high_priority_today"
  >("all");

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | undefined>(
    undefined,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchAttentionTasks = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "done")
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;

      if (data) {
        const now = new Date();
        const attentionTasks = data.filter((t) => isAttentionTask(t, now));
        setTasks(attentionTasks);
      }
    } catch (err: any) {
      console.error("Fetch attention tasks error:", err);
      setError("Không thể tải danh sách công việc. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttentionTasks();
  }, [user]);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    if (filter === "all") return tasks;
    return tasks.filter((t) => getAttentionReasons(t, now).includes(filter));
  }, [tasks, filter]);

  const counts = useMemo(() => {
    const now = new Date();
    return {
      all: tasks.length,
      overdue: tasks.filter((t) =>
        getAttentionReasons(t, now).includes("overdue"),
      ).length,
      late_today: tasks.filter((t) =>
        getAttentionReasons(t, now).includes("late_today"),
      ).length,
      moved_or_skipped: tasks.filter((t) =>
        getAttentionReasons(t, now).includes("moved_or_skipped"),
      ).length,
      high_priority_today: tasks.filter((t) =>
        getAttentionReasons(t, now).includes("high_priority_today"),
      ).length,
    };
  }, [tasks]);

  const handleAction = async (taskId: string, action: string) => {
    if (processingId) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

    let patch: Partial<Task> = {};
    if (action === "done") patch = { status: "done" };
    else if (action === "in_progress") patch = { status: "in_progress" };
    else if (action === "todo") patch = { status: "todo" };
    else if (action === "move_today") patch = { date: today, status: "todo" };
    else if (action === "move_tomorrow")
      patch = { date: tomorrow, status: "todo" };

    if (Object.keys(patch).length > 0) {
      setProcessingId(taskId);
      const backup = tasks.find((t) => t.id === taskId);

      // Optimistic update
      if (patch.status === "done") {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      } else {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
        );
      }

      try {
        const { error } = await supabase
          .from("tasks")
          .update(patch)
          .eq("id", taskId);
        if (error) throw error;
        showToast("Đã cập nhật task.", "success");
      } catch (err: any) {
        console.error("Task update failed:", err);
        showToast("Không thể cập nhật dữ liệu. Vui lòng thử lại.", "error");
        if (backup) {
          if (patch.status === "done") {
            setTasks((prev) =>
              [...prev, backup].sort((a, b) => a.date.localeCompare(b.date)),
            );
          } else {
            setTasks((prev) => prev.map((t) => (t.id === taskId ? backup : t)));
          }
        }
      } finally {
        setProcessingId(null);
      }
    }
  };

  const handleDelete = async (taskId: string) => {
    if (processingId) return;
    if (!window.confirm("Xác nhận xóa task này?")) return;

    setProcessingId(taskId);
    const backup = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
      showToast("Đã xóa task.", "success");
    } catch (err: any) {
      console.error("Task delete failed:", err);
      showToast("Không thể xóa dữ liệu. Vui lòng thử lại.", "error");
      setTasks(backup);
    } finally {
      setProcessingId(null);
    }
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
      }
      setIsFormOpen(false);
      fetchAttentionTasks();
      showToast("Đã lưu task.", "success");
    } catch (err: any) {
      showToast("Lỗi: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-container">
      <header
        className="page-header"
        style={{ flexDirection: "column", alignItems: "stretch", gap: "1rem" }}
      >
        <div>
          <h1>Cần chú ý</h1>
          <p className="text-muted">
            Các công việc quá hạn, trễ giờ hoặc cần xử lý lại.
          </p>
          <div
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              marginTop: "0.5rem",
              background: "var(--bg-surface)",
              padding: "0.75rem",
              borderRadius: "8px",
            }}
          >
            Logic: mục này hiển thị công việc chưa hoàn thành đã quá hạn, công
            việc hôm nay đã trễ giờ, công việc đã chuyển/bỏ qua cần xử lý lại và
            công việc ưu tiên cao trong hôm nay.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: "0.5rem",
          }}
        >
          <button
            onClick={() => setFilter("all")}
            className={`btn ${filter === "all" ? "btn-primary" : "btn-outline"}`}
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
          >
            Tất cả ({counts.all})
          </button>
          <button
            onClick={() => setFilter("overdue")}
            className={`btn ${filter === "overdue" ? "btn-primary" : "btn-outline"}`}
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
          >
            Quá hạn ({counts.overdue})
          </button>
          <button
            onClick={() => setFilter("late_today")}
            className={`btn ${filter === "late_today" ? "btn-primary" : "btn-outline"}`}
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
          >
            Trễ giờ hôm nay ({counts.late_today})
          </button>
          <button
            onClick={() => setFilter("moved_or_skipped")}
            className={`btn ${filter === "moved_or_skipped" ? "btn-primary" : "btn-outline"}`}
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
          >
            Đã chuyển / Bỏ qua ({counts.moved_or_skipped})
          </button>
          <button
            onClick={() => setFilter("high_priority_today")}
            className={`btn ${filter === "high_priority_today" ? "btn-primary" : "btn-outline"}`}
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
          >
            Ưu tiên cao ({counts.high_priority_today})
          </button>
        </div>
      </header>

      {error && (
        <div className="error-state card" style={{ color: "var(--danger)" }}>
          {error}
          <div style={{ marginTop: "1rem" }}>
            <button className="btn btn-outline" onClick={fetchAttentionTasks}>
              Thử lại
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : !error && filteredTasks.length === 0 ? (
        <div className="empty-state card">
          Không có công việc cần chú ý. Rất tốt!
        </div>
      ) : !error ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {filteredTasks.map((task) => (
            <AttentionTaskRow
              key={task.id}
              task={task}
              onAction={handleAction}
              onEdit={(t) => {
                setEditingTask(t);
                setIsFormOpen(true);
              }}
              onDelete={handleDelete}
              isProcessing={processingId === task.id}
            />
          ))}
        </div>
      ) : null}

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
