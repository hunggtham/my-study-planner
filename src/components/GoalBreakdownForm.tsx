import React, { useState } from "react";
import { Goal, Task } from "../types";
import { format, parseISO, addDays, isWeekend } from "date-fns";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Trash2, Plus } from "lucide-react";

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

  // Basic settings
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul",
  );
  const [breakdownMode, setBreakdownMode] = useState<"manual" | "split">(
    "manual",
  );

  // Manual mode state
  const [manualTasks, setManualTasks] = useState([
    {
      id: Date.now().toString(),
      title: "",
      date: format(new Date(), "yyyy-MM-dd"),
    },
  ]);

  // Split mode state
  const [splitCount, setSplitCount] = useState<number>(5);
  const [splitTemplate, setSplitTemplate] = useState<string>(
    `${goal.title} - Phần #{number}`,
  );
  const [scheduleTarget, setScheduleTarget] = useState<
    "selected" | "range_every" | "range_weekday" | "range_weekend"
  >("range_every");
  const [startDate, setStartDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState<string>(
    format(addDays(new Date(), 4), "yyyy-MM-dd"),
  );
  const [selectedDates] = useState<string[]>([
    format(new Date(), "yyyy-MM-dd"),
  ]);

  // Preview
  const [previewTasks, setPreviewTasks] = useState<Partial<Task>[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePreview = () => {
    let generated: Partial<Task>[] = [];

    if (breakdownMode === "manual") {
      generated = manualTasks
        .filter((t) => t.title.trim() !== "")
        .map((t) => ({
          title: t.title.trim(),
          date: t.date,
          category: goal.category,
          task_type: "main",
          priority: "medium",
          note: `Generated from goal: ${goal.title}`,
        }));
    } else if (breakdownMode === "split") {
      let datesToUse: string[] = [];

      if (scheduleTarget === "selected") {
        datesToUse = [...selectedDates].sort();
      } else {
        // Range generation
        let current = parseISO(startDate);
        const end = parseISO(endDate);

        while (current <= end) {
          const isWknd = isWeekend(current);
          if (
            scheduleTarget === "range_every" ||
            (scheduleTarget === "range_weekday" && !isWknd) ||
            (scheduleTarget === "range_weekend" && isWknd)
          ) {
            datesToUse.push(format(current, "yyyy-MM-dd"));
          }
          current = addDays(current, 1);
        }
      }

      if (datesToUse.length === 0) {
        alert("Không có ngày nào phù hợp với cài đặt!");
        return;
      }

      // Distribute tasks across dates
      for (let i = 1; i <= splitCount; i++) {
        const title = splitTemplate.replace("#{number}", i.toString());
        const dateIndex = (i - 1) % datesToUse.length;
        generated.push({
          title,
          date: datesToUse[dateIndex],
          category: goal.category,
          task_type: "main",
          priority: "medium",
          note: `Generated from goal: ${goal.title}`,
        });
      }
    }

    setPreviewTasks(generated);
  };

  const handleSave = async () => {
    if (!user || previewTasks.length === 0) return;
    setIsGenerating(true);

    try {
      // Very basic duplicate check can be done via fetching existing tasks first
      // But for simplicity in UX, we'll just insert them.
      const tasksToInsert = previewTasks.map((t) => ({
        ...t,
        user_id: user.id,
        status: "todo",
        moved_count: 0,
      }));

      const { error } = await supabase.from("tasks").insert(tasksToInsert);
      if (error) throw error;

      alert(`Đã tạo thành công ${tasksToInsert.length} task!`);
      onSuccess();
    } catch (err: any) {
      alert("Lỗi khi tạo task: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="task-form-overlay"
      style={{ zIndex: 1000, overflowY: "auto", padding: "2rem 1rem" }}
    >
      <div
        className="task-form-container card"
        style={{
          maxWidth: "600px",
          width: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
            Tách mục tiêu: {goal.title}
          </h2>
          <button
            className="secondary-btn icon-btn"
            onClick={onClose}
            style={{ width: "auto" }}
          >
            Đóng
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gap: "1rem",
            background: "var(--bg-panel)",
            padding: "1rem",
            borderRadius: "8px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontSize: "0.85rem",
                color: "var(--text-muted)",
              }}
            >
              Múi giờ (Timezone)
            </label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-input)",
                color: "var(--text-main)",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontSize: "0.85rem",
                color: "var(--text-muted)",
              }}
            >
              Chế độ tách (Breakdown Mode)
            </label>
            <div className="segmented-control">
              <button
                type="button"
                className={`segmented-btn ${breakdownMode === "manual" ? "active" : ""}`}
                onClick={() => setBreakdownMode("manual")}
              >
                Nhập thủ công
              </button>
              <button
                type="button"
                className={`segmented-btn ${breakdownMode === "split" ? "active" : ""}`}
                onClick={() => setBreakdownMode("split")}
              >
                Tự động chia nhỏ
              </button>
            </div>
          </div>
        </div>

        {breakdownMode === "manual" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <h3 style={{ fontSize: "1rem", margin: 0 }}>Danh sách Task phụ</h3>
            {manualTasks.map((t, index) => (
              <div
                key={t.id}
                style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
              >
                <input
                  type="date"
                  value={t.date}
                  onChange={(e) => {
                    const newTasks = [...manualTasks];
                    newTasks[index].date = e.target.value;
                    setManualTasks(newTasks);
                  }}
                  style={{
                    width: "130px",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-input)",
                    color: "var(--text-main)",
                  }}
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
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-input)",
                    color: "var(--text-main)",
                  }}
                />
                <button
                  type="button"
                  className="danger-btn icon-btn"
                  onClick={() =>
                    setManualTasks(
                      manualTasks.filter((task) => task.id !== t.id),
                    )
                  }
                  style={{ padding: "0.5rem" }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="secondary-btn"
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
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <Plus size={16} /> Thêm dòng
            </button>
          </div>
        )}

        {breakdownMode === "split" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.85rem",
                  }}
                >
                  Số lượng Task
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={splitCount}
                  onChange={(e) => setSplitCount(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-input)",
                    color: "var(--text-main)",
                  }}
                />
              </div>
              <div style={{ flex: 2 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.85rem",
                  }}
                >
                  Cú pháp tên (#&#123;number&#125; sẽ tự nhảy số)
                </label>
                <input
                  type="text"
                  value={splitTemplate}
                  onChange={(e) => setSplitTemplate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-input)",
                    color: "var(--text-main)",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.85rem",
                }}
              >
                Lịch trình (Scheduling)
              </label>
              <select
                value={scheduleTarget}
                onChange={(e) => setScheduleTarget(e.target.value as any)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-input)",
                  color: "var(--text-main)",
                  marginBottom: "0.5rem",
                }}
              >
                <option value="range_every">
                  Mỗi ngày trong khoảng thời gian
                </option>
                <option value="range_weekday">
                  Chỉ ngày trong tuần (T2-T6)
                </option>
                <option value="range_weekend">Chỉ cuối tuần (T7-CN)</option>
              </select>

              <div
                style={{ display: "flex", gap: "1rem", alignItems: "center" }}
              >
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-input)",
                    color: "var(--text-main)",
                  }}
                />
                <span>đến</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-input)",
                    color: "var(--text-main)",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          className="secondary-btn"
          onClick={generatePreview}
          style={{
            border: "1px solid var(--primary)",
            color: "var(--primary)",
          }}
        >
          Xem trước (Preview)
        </button>

        {previewTasks.length > 0 && (
          <div
            style={{
              marginTop: "1rem",
              borderTop: "1px solid var(--border-color)",
              paddingTop: "1rem",
            }}
          >
            <h3 style={{ fontSize: "1rem", marginBottom: "1rem" }}>
              Preview ({previewTasks.length} task)
            </h3>
            <div
              style={{
                maxHeight: "250px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                background: "var(--bg-panel)",
                padding: "0.5rem",
                borderRadius: "8px",
              }}
            >
              {previewTasks.map((t, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "1rem",
                    alignItems: "center",
                    padding: "0.5rem",
                    background: "var(--bg-card)",
                    borderRadius: "4px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      width: "80px",
                    }}
                  >
                    {t.date}
                  </div>
                  <div style={{ flex: 1, fontWeight: 500, fontSize: "0.9rem" }}>
                    {t.title}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button
                type="button"
                className="primary-btn"
                onClick={handleSave}
                disabled={isGenerating}
              >
                {isGenerating ? "Đang tạo..." : "Tạo tất cả"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
