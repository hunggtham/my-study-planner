import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Goal, Task } from "../types";
import { format, parseISO, addDays, isWeekend } from "date-fns";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  Trash2,
  Plus,
  ArrowRight,
  ArrowLeft,
  Calendar,
  LayoutList,
  Settings,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "./ui/Button";
import { useToast } from "../context/ToastContext";
import "../styles-taskform.css"; // Ensure standard modal styles are applied

interface GoalBreakdownFormProps {
  goal: Goal;
  onClose: () => void;
  onSuccess: () => void;
}

export const GoalBreakdownForm: React.FC<GoalBreakdownFormProps> = ({
  goal,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Goal Setup
  const [totalQuantity, setTotalQuantity] = useState<number>(100);
  const [unit, setUnit] = useState<string>("từ vựng");
  const [perSession, setPerSession] = useState<number>(20);
  const [category, setCategory] = useState<string>(goal.category || "General");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const [existingCategories, setExistingCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("tasks")
        .select("category")
        .eq("user_id", user.id)
        .neq("category", "");
      if (data) {
        const cats = Array.from(
          new Set(data.map((d) => d.category).filter(Boolean)),
        );
        setExistingCategories(cats.sort());
      }
    };
    fetchCategories();
  }, [user]);

  // Step 2: Schedule Rule
  const [startDate, setStartDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [scheduleRule, setScheduleRule] = useState<
    "every_day" | "weekdays" | "weekends"
  >("every_day");

  // Step 3: Breakdown Method
  const [breakdownMode, setBreakdownMode] = useState<"auto" | "manual">("auto");
  const [manualTasks, setManualTasks] = useState([
    {
      id: Date.now().toString(),
      title: "",
      date: format(new Date(), "yyyy-MM-dd"),
    },
  ]);

  // Step 4: Preview & Confirm
  const [previewTasks, setPreviewTasks] = useState<Partial<Task>[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-calculations
  const requiredSessions = useMemo(() => {
    if (perSession <= 0) return 0;
    return Math.ceil(totalQuantity / perSession);
  }, [totalQuantity, perSession]);

  const calculatedDates = useMemo(() => {
    if (requiredSessions <= 0) return [];
    const dates: string[] = [];
    let current = parseISO(startDate);

    // Safety break to prevent infinite loops
    let iterations = 0;
    while (dates.length < requiredSessions && iterations < 1000) {
      const isWknd = isWeekend(current);
      if (
        scheduleRule === "every_day" ||
        (scheduleRule === "weekdays" && !isWknd) ||
        (scheduleRule === "weekends" && isWknd)
      ) {
        dates.push(format(current, "yyyy-MM-dd"));
      }
      current = addDays(current, 1);
      iterations++;
    }
    return dates;
  }, [requiredSessions, startDate, scheduleRule]);

  const calculatedEndDate =
    calculatedDates.length > 0
      ? calculatedDates[calculatedDates.length - 1]
      : "";

  // Handlers
  const handleGeneratePreview = useCallback(() => {
    let generated: Partial<Task>[] = [];

    if (breakdownMode === "manual") {
      generated = manualTasks
        .filter((t) => t.title.trim() !== "")
        .map((t) => ({
          title: t.title.trim(),
          date: t.date,
          category,
          task_type: "main",
          priority,
          note: `Từ mục tiêu: ${goal.title}`,
        }));
    } else {
      if (calculatedDates.length === 0) {
        showToast(
          "Không thể tính toán ngày học. Vui lòng kiểm tra lại cấu hình!",
          "error",
        );
        return;
      }

      let currentItem = 1;
      for (let i = 0; i < calculatedDates.length; i++) {
        const endItem = Math.min(currentItem + perSession - 1, totalQuantity);
        const title = `${goal.title} - ${unit} ${currentItem}-${endItem}`;

        generated.push({
          title,
          date: calculatedDates[i],
          category,
          task_type: "main",
          priority,
          note: `Từ mục tiêu: ${goal.title}`,
        });

        currentItem = endItem + 1;
      }
    }

    setPreviewTasks(generated);
    setStep(4);
  }, [
    breakdownMode,
    manualTasks,
    calculatedDates,
    perSession,
    totalQuantity,
    unit,
    category,
    priority,
    goal.title,
  ]);

  const handleSave = async () => {
    if (!user || previewTasks.length === 0) return;
    setIsGenerating(true);
    try {
      const tasksToInsert = previewTasks.map((t) => ({
        ...t,
        user_id: user.id,
        status: "todo",
        moved_count: 0,
      }));
      const { error } = await supabase.from("tasks").insert(tasksToInsert);
      if (error) throw error;
      showToast(`Đã tạo thành công ${tasksToInsert.length} task!`, "success");
      onSuccess();
    } catch (err: any) {
      showToast("Lỗi khi tạo task: " + err.message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 4) as any);
  const prevStep = () => setStep((s) => Math.max(s - 1, 1) as any);

  return (
    <div className="task-form-overlay">
      <div
        className="task-form-container"
        style={{
          width: "100%",
          maxWidth: "700px",
          maxHeight: "90dvh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div className="task-form-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
              Tách mục tiêu
            </h2>
            <p
              className="text-muted"
              style={{
                margin: "0.2rem 0 0",
                fontSize: "0.82rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={goal.title}
            >
              {goal.title}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Đóng"
            onClick={onClose}
            style={{ flexShrink: 0 }}
          >
            <X size={18} />
          </Button>
        </div>

        {/* Scrollable Body */}
        <div
          className="task-form-body"
          style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem" }}
        >
          {/* Stepper */}
          <div
            className="stepper-container"
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "2rem",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                right: 0,
                height: "2px",
                background: "var(--border-color)",
                zIndex: 0,
              }}
            />
            {[
              { num: 1, icon: <Settings size={18} />, label: "Thiết lập" },
              { num: 2, icon: <Calendar size={18} />, label: "Lịch trình" },
              { num: 3, icon: <LayoutList size={18} />, label: "Phương pháp" },
              { num: 4, icon: <CheckCircle2 size={18} />, label: "Xác nhận" },
            ].map((s) => (
              <div
                key={s.num}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background:
                      step >= s.num ? "var(--primary)" : "var(--bg-surface)",
                    color: step >= s.num ? "#fff" : "var(--text-muted)",
                    border: `2px solid ${step >= s.num ? "var(--primary)" : "var(--border-color)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s",
                  }}
                >
                  {s.icon}
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: step >= s.num ? 600 : 400,
                    color:
                      step >= s.num
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Step 1 Content */}
          {step === 1 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div className="form-group">
                  <label>Tổng khối lượng</label>
                  <input
                    type="number"
                    min="1"
                    value={totalQuantity}
                    onChange={(e) => setTotalQuantity(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Đơn vị (VD: từ vựng, bài tập)</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div className="form-group">
                  <label>Khối lượng mỗi buổi</label>
                  <input
                    type="number"
                    min="1"
                    value={perSession}
                    onChange={(e) => setPerSession(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Số buổi dự kiến</label>
                  <div
                    style={{
                      padding: "0.75rem",
                      background: "var(--bg-muted)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-color)",
                      color: "var(--primary)",
                      fontWeight: 600,
                    }}
                  >
                    {requiredSessions} buổi
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div className="form-group">
                  <label>Phân loại (Category)</label>
                  <input
                    type="text"
                    list="category-options"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-input"
                  />
                  <datalist id="category-options">
                    {existingCategories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Độ ưu tiên</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="form-input"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 Content */}
          {step === 2 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div className="form-group">
                  <label>Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Quy tắc rải lịch</label>
                  <select
                    value={scheduleRule}
                    onChange={(e) => setScheduleRule(e.target.value as any)}
                    className="form-input"
                  >
                    <option value="every_day">Mỗi ngày</option>
                    <option value="weekdays">
                      Chỉ ngày trong tuần (T2-T6)
                    </option>
                    <option value="weekends">Chỉ cuối tuần (T7-CN)</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  background: "var(--primary-bg)",
                  border: "1px solid var(--primary)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.25rem",
                  marginTop: "1rem",
                }}
              >
                <h4 style={{ margin: "0 0 1rem 0", color: "var(--primary)" }}>
                  Dự kiến lịch trình
                </h4>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    fontSize: "0.95rem",
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Số buổi cần học:</span>{" "}
                    <strong>{requiredSessions} buổi</strong>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Khối lượng mỗi buổi:</span>{" "}
                    <strong>
                      {perSession} {unit}
                    </strong>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Ngày bắt đầu:</span> <strong>{startDate}</strong>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Ngày hoàn thành dự kiến:</span>{" "}
                    <strong style={{ color: "var(--success)" }}>
                      {calculatedEndDate || "Không tính được"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 Content */}
          {step === 3 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div className="form-group">
                <label>Chế độ tách</label>
                <div
                  className="segmented-control"
                  style={{
                    display: "flex",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setBreakdownMode("auto")}
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      background:
                        breakdownMode === "auto"
                          ? "var(--primary-bg)"
                          : "var(--bg-surface)",
                      color:
                        breakdownMode === "auto"
                          ? "var(--primary)"
                          : "var(--text-secondary)",
                      fontWeight: 500,
                    }}
                  >
                    Tự động rải đều
                  </button>
                  <button
                    type="button"
                    onClick={() => setBreakdownMode("manual")}
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      background:
                        breakdownMode === "manual"
                          ? "var(--primary-bg)"
                          : "var(--bg-surface)",
                      color:
                        breakdownMode === "manual"
                          ? "var(--primary)"
                          : "var(--text-secondary)",
                      fontWeight: 500,
                    }}
                  >
                    Thủ công (Tự sửa)
                  </button>
                </div>
              </div>

              {breakdownMode === "manual" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  {manualTasks.map((t, index) => (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="date"
                        value={t.date}
                        onChange={(e) => {
                          const newTasks = [...manualTasks];
                          newTasks[index].date = e.target.value;
                          setManualTasks(newTasks);
                        }}
                        className="form-input"
                        style={{ width: "140px" }}
                      />
                      <input
                        type="text"
                        placeholder="Tên task..."
                        value={t.title}
                        onChange={(e) => {
                          const newTasks = [...manualTasks];
                          newTasks[index].title = e.target.value;
                          setManualTasks(newTasks);
                        }}
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                      <Button
                        variant="danger"
                        size="icon"
                        aria-label="Xóa"
                        onClick={() =>
                          setManualTasks(
                            manualTasks.filter((task) => task.id !== t.id),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setManualTasks([
                        ...manualTasks,
                        {
                          id: Date.now().toString(),
                          title: "",
                          date: format(new Date(), "yyyy-MM-dd"),
                        },
                      ])
                    }
                    style={{ alignSelf: "flex-start", gap: "0.5rem" }}
                  >
                    <Plus size={16} /> Thêm dòng
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 4 Content */}
          {step === 4 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div
                style={{
                  background: "var(--primary-bg)",
                  padding: "1rem",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--primary)",
                  fontWeight: 500,
                }}
              >
                Sẽ tạo {previewTasks.length} task. Vui lòng kiểm tra kỹ trước
                khi xác nhận.
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {previewTasks.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "center",
                      padding: "0.75rem",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                        width: "100px",
                        fontWeight: 500,
                      }}
                    >
                      {t.date}
                    </div>
                    <div style={{ flex: 1, fontWeight: 500 }}>{t.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className="task-form-actions"
          style={{
            borderTop: "1px solid var(--border-color)",
            background: "var(--bg-surface)",
          }}
        >
          {step === 1 ? (
            <Button variant="ghost" onClick={onClose}>
              Hủy
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={prevStep}
              style={{ gap: "0.5rem" }}
            >
              <ArrowLeft size={16} /> Quay lại
            </Button>
          )}

          {step < 3 ? (
            <Button
              variant="primary"
              onClick={nextStep}
              style={{ gap: "0.5rem" }}
            >
              Tiếp tục <ArrowRight size={16} />
            </Button>
          ) : step === 3 ? (
            <Button
              variant="primary"
              onClick={handleGeneratePreview}
              style={{ gap: "0.5rem" }}
            >
              Xem trước <ArrowRight size={16} />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isGenerating}
            >
              {isGenerating ? "Đang xử lý..." : "Xác nhận tạo task"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
