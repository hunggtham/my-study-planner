import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Task } from "../types";
import { AttentionTaskRow } from "../components/tasks/AttentionTaskRow";
import { TaskForm } from "../components/TaskForm";
import { useToast } from "../context/ToastContext";
import { format, addDays } from "date-fns";

export const AttentionTasks: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters and Sorts
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [sortBy, setSortBy] = useState<
    "latest" | "date_asc" | "date_desc" | "moved_count"
  >("latest");

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
    // status = 'moved' OR moved_count > 0 OR moved_from_task_id IS NOT NULL
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .or("status.eq.moved,moved_count.gt.0,moved_from_task_id.not.is.null")
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setTasks(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAttentionTasks();
  }, [user]);

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    if (filter === "pending") {
      result = result.filter((t) => t.status !== "done");
    } else if (filter === "done") {
      result = result.filter((t) => t.status === "done");
    }

    result.sort((a, b) => {
      if (sortBy === "latest")
        return (
          new Date(b.updated_at || b.created_at || new Date()).getTime() -
          new Date(a.updated_at || a.created_at || new Date()).getTime()
        );
      if (sortBy === "date_asc") return a.date.localeCompare(b.date);
      if (sortBy === "date_desc") return b.date.localeCompare(a.date);
      if (sortBy === "moved_count") return b.moved_count - a.moved_count;
      return 0;
    });

    return result;
  }, [tasks, filter, sortBy]);

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
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      );

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
        if (backup)
          setTasks((prev) => prev.map((t) => (t.id === taskId ? backup : t)));
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
          <h1>Task cần chú ý</h1>
          <p className="text-muted">
            Quản lý những task bị trì hoãn hoặc dời ngày
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            style={{
              background: "var(--bg-panel)",
              color: "var(--text-main)",
              border: "1px solid var(--border-color)",
              padding: "0.4rem",
              borderRadius: "4px",
            }}
          >
            <option value="all">Tất cả ({tasks.length})</option>
            <option value="pending">
              Chưa hoàn thành ({tasks.filter((t) => t.status !== "done").length}
              )
            </option>
            <option value="done">
              Đã hoàn thành ({tasks.filter((t) => t.status === "done").length})
            </option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              background: "var(--bg-panel)",
              color: "var(--text-main)",
              border: "1px solid var(--border-color)",
              padding: "0.4rem",
              borderRadius: "4px",
            }}
          >
            <option value="latest">Mới cập nhật</option>
            <option value="date_asc">Ngày tăng dần</option>
            <option value="date_desc">Ngày giảm dần</option>
            <option value="moved_count">Dời nhiều nhất</option>
          </select>
        </div>
      </header>

      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : filteredAndSortedTasks.length === 0 ? (
        <div className="empty-state card">Không tìm thấy task phù hợp.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {filteredAndSortedTasks.map((task) => (
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
