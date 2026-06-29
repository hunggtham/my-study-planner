import React, { useState, useEffect } from "react";
import { Task, TaskStatus, TaskPriority, TaskType } from "../types";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";

interface TaskFormProps {
  initialData?: Partial<Task>;
  onSubmit: (data: Partial<Task>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const cleanTaskTitle = (title?: string | null) => {
  const raw = title?.trim() || "";
  if (!raw) return "";

  // Pattern: "Task name · Category · dd/MM/yyyy"
  const dotParts = raw.split(" · ");
  if (
    dotParts.length >= 3 &&
    /^\d{2}\/\d{2}\/\d{4}$/.test(dotParts[dotParts.length - 1])
  ) {
    return dotParts.slice(0, -2).join(" · ").trim();
  }

  // Pattern: "Task name - Category - dd/MM/yyyy"
  const dashParts = raw.split(" - ");
  if (
    dashParts.length >= 3 &&
    /^\d{2}\/\d{2}\/\d{4}$/.test(dashParts[dashParts.length - 1])
  ) {
    return dashParts.slice(0, -2).join(" - ").trim();
  }

  return raw;
};

export const TaskForm: React.FC<TaskFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Task[]>([]);
  const [categories, setCategories] = useState<string[]>(["Other"]);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!user || initialData?.id) return;
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,category,task_type,priority,description,note,date")
        .eq("user_id", user.id)
        .neq("task_type", "optional")
        .order("date", { ascending: false })
        .limit(1000);

      if (!error && data) {
        const uniqueTemplates: Task[] = [];
        const seenKeys = new Set<string>();

        for (const task of data as Task[]) {
          // If Supabase .neq doesn't exclude null properly, double check client side
          if (task.task_type === "optional") continue;

          const key = [
            cleanTaskTitle(task.title).toLowerCase(),
            normalizeCategory(task.category).toLowerCase(),
            task.task_type || "main",
            task.priority || "medium",
            task.description?.trim() || "",
            task.note?.trim() || "",
          ].join("|");

          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueTemplates.push(task);
          }
        }

        const sortedTemplates = uniqueTemplates.sort((a, b) =>
          cleanTaskTitle(a.title).localeCompare(cleanTaskTitle(b.title), "vi"),
        );
        setTemplates(sortedTemplates);
      }
    };

    const fetchCategories = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("tasks")
        .select("category")
        .eq("user_id", user.id)
        .not("category", "is", null)
        .order("category", { ascending: true });

      if (!error && data) {
        const fetchedCategories = Array.from(
          new Set(
            data
              .map((row) => row.category?.trim())
              .filter(Boolean)
              .map((c) => c || "Other"),
          ),
        ).sort((a, b) => a.localeCompare(b, "vi"));

        if (!fetchedCategories.includes("Other")) {
          fetchedCategories.unshift("Other");
        }
        setCategories(fetchedCategories);
      }
    };

    fetchTemplates();
    fetchCategories();
  }, [user, initialData?.id]);

  const handleTemplateSelect = (taskId: string) => {
    if (!taskId) return;
    const template = templates.find((t) => t.id === taskId);
    if (template) {
      setFormData((prev) => ({
        ...prev,
        title: cleanTaskTitle(template.title),
        category: template.category,
        task_type: template.task_type,
        priority: template.priority,
        description: template.description,
        note: template.note,
      }));
    }
  };

  const initialStatus = initialData?.status;
  const isSpecialStatus =
    initialStatus === "skipped" || initialStatus === "moved";

  const [formData, setFormData] = useState<Partial<Task>>({
    title: "",
    category: "Other",
    date: new Date().toISOString().split("T")[0],
    start_time: "09:00",
    end_time: "10:00",
    description: "",
    task_type: "main",
    priority: "medium",
    score_weight: 1,
    note: "",
    ...initialData,
    status: isSpecialStatus ? "todo" : initialStatus || "todo",
  });

  useEffect(() => {
    if (initialData) {
      const initStat = initialData.status;
      const fixStat =
        initStat === "skipped" || initStat === "moved"
          ? "todo"
          : initStat || "todo";
      setFormData((prev) => ({ ...prev, ...initialData, status: fixStat }));
    }
  }, [initialData]);

  const handleChange = (field: keyof Task, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const normalizeCategory = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : "Other";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      title: cleanTaskTitle(formData.title) || "Công việc chưa đặt tên",
      category: normalizeCategory(formData.category),
    });
  };

  return (
    <div className="task-form-overlay">
      <div className="task-form-container card">
        <h3>{initialData?.id ? "Chỉnh sửa Task" : "Thêm Task mới"}</h3>

        <form onSubmit={handleSubmit} className="task-form">
          {!initialData?.id && (
            <div className="form-row" style={{ marginBottom: "1rem" }}>
              <label className="field" style={{ flex: 1 }}>
                Dùng task đã có
                <select
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Chọn task mẫu để tự động điền thông tin
                  </option>
                  {templates.map((t) => {
                    const displayTitle = cleanTaskTitle(t.title);
                    const optionLabel = `${displayTitle} · ${t.category || "Other"}`;
                    return (
                      <option key={t.id} value={t.id} title={optionLabel}>
                        {optionLabel}
                      </option>
                    );
                  })}
                </select>
                <small
                  className="text-muted"
                  style={{ marginTop: "0.25rem", display: "block" }}
                >
                  Bạn có thể chọn một task đã tạo trước đó để dùng làm mẫu, sau
                  đó chỉnh sửa lại trước khi lưu.
                </small>
              </label>
            </div>
          )}
          <div className="form-row">
            <label className="field">
              Tiêu đề *
              <input
                autoFocus
                required
                type="text"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) handleSubmit(e);
                }}
              />
            </label>
            <label className="field">
              Môn học / Phân loại *
              <input
                required
                type="text"
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                list="task-category-options"
                placeholder="Chọn hoặc nhập phân loại mới"
              />
              <datalist id="task-category-options">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="form-row">
            <label className="field">
              Ngày *
              <input
                required
                type="date"
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
              />
            </label>
            <label className="field">
              Từ
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => handleChange("start_time", e.target.value)}
              />
            </label>
            <label className="field">
              Đến
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => handleChange("end_time", e.target.value)}
              />
            </label>
          </div>

          <div className="form-row">
            <label className="field">
              Loại
              <select
                value={formData.task_type}
                onChange={(e) =>
                  handleChange("task_type", e.target.value as TaskType)
                }
              >
                <option value="main">Task chính</option>
                <option value="secondary">Phụ</option>
                <option value="exercise">Thể dục</option>
                <option value="review">Ôn tập</option>
                <option value="class">Task class (học trên trường)</option>
              </select>
            </label>
            <label className="field">
              Độ ưu tiên
              <select
                value={formData.priority}
                onChange={(e) =>
                  handleChange("priority", e.target.value as TaskPriority)
                }
              >
                <option value="high">Cao</option>
                <option value="medium">Vừa</option>
                <option value="low">Thấp</option>
              </select>
            </label>
            <label className="field">
              Trạng thái
              <select
                value={formData.status}
                onChange={(e) =>
                  handleChange("status", e.target.value as TaskStatus)
                }
              >
                <option value="todo">Chưa làm</option>
                <option value="in_progress">Đang làm</option>
                <option value="done">Hoàn thành</option>
              </select>
              {isSpecialStatus && (
                <small
                  className="text-muted"
                  style={{
                    display: "block",
                    marginTop: "0.25rem",
                    color: "var(--warning)",
                  }}
                >
                  Trạng thái này chỉ được dùng khi bỏ qua hoặc dời lịch. Khi
                  chỉnh sửa, hãy chọn Chưa làm, Đang làm hoặc Hoàn thành.
                </small>
              )}
            </label>
          </div>

          <label className="field">
            Chi tiết
            <textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={2}
            />
          </label>
          <label className="field">
            Ghi chú
            <textarea
              value={formData.note}
              onChange={(e) => handleChange("note", e.target.value)}
              rows={2}
            />
          </label>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={onCancel}
              disabled={isLoading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={isLoading}
              style={{ width: "auto", marginTop: 0 }}
            >
              {isLoading ? "Đang lưu..." : "Lưu lại"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
