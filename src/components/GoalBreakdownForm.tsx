import React, { useState } from "react";
import { Goal, Task } from "../types";
import { format, parseISO, addDays, isWeekend } from "date-fns";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Trash2, Plus, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "./ui/Button";

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
  const [step, setStep] = useState<1 | 2>(1);

  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul",
  );
  const [breakdownMode, setBreakdownMode] = useState<"manual" | "split">(
    "manual",
  );

  const [manualTasks, setManualTasks] = useState([
    {
      id: Date.now().toString(),
      title: "",
      date: format(new Date(), "yyyy-MM-dd"),
    },
  ]);

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
    } else {
      let datesToUse: string[] = [];
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

      if (datesToUse.length === 0) {
        alert("Không có ngày nào phù hợp với cài đặt!");
        return;
      }

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
    setStep(2);
  };

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
      style={{
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        className="ui-card"
        style={{
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-surface)",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
              Tách mục tiêu
            </h2>
            <p
              className="text-muted"
              style={{ margin: 0, fontSize: "0.875rem", marginTop: "0.25rem" }}
            >
              {goal.title}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
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
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                  >
                    Chế độ tách
                  </label>
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
                      onClick={() => setBreakdownMode("manual")}
                      style={{
                        flex: 1,
                        padding: "0.5rem",
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
                      Thủ công
                    </button>
                    <button
                      type="button"
                      onClick={() => setBreakdownMode("split")}
                      style={{
                        flex: 1,
                        padding: "0.5rem",
                        background:
                          breakdownMode === "split"
                            ? "var(--primary-bg)"
                            : "var(--bg-surface)",
                        color:
                          breakdownMode === "split"
                            ? "var(--primary)"
                            : "var(--text-secondary)",
                        fontWeight: 500,
                      }}
                    >
                      Tự động
                    </button>
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                  >
                    Múi giờ
                  </label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
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
                        style={{ flex: 1 }}
                      />
                      <Button
                        variant="danger"
                        size="icon"
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

              {breakdownMode === "split" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 2fr",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                        }}
                      >
                        Số lượng
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={splitCount}
                        onChange={(e) => setSplitCount(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                        }}
                      >
                        Cú pháp tên (#&#123;number&#125;)
                      </label>
                      <input
                        type="text"
                        value={splitTemplate}
                        onChange={(e) => setSplitTemplate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                      }}
                    >
                      Quy tắc rải lịch
                    </label>
                    <select
                      value={scheduleTarget}
                      onChange={(e) => setScheduleTarget(e.target.value as any)}
                      style={{ marginBottom: "0.5rem" }}
                    >
                      <option value="range_every">Mỗi ngày trong khoảng</option>
                      <option value="range_weekday">
                        Chỉ ngày trong tuần (T2-T6)
                      </option>
                      <option value="range_weekend">
                        Chỉ cuối tuần (T7-CN)
                      </option>
                    </select>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <ArrowRight size={16} className="text-muted" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
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
                        width: "90px",
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

        {/* Sticky Footer */}
        <div
          style={{
            padding: "1.25rem",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            background: "var(--bg-surface)",
          }}
        >
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={onClose}>
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={generatePreview}
                style={{ gap: "0.5rem" }}
              >
                Tiếp tục <ArrowRight size={16} />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                style={{ gap: "0.5rem" }}
              >
                <ArrowLeft size={16} /> Quay lại
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isGenerating}
              >
                {isGenerating ? "Đang xử lý..." : "Xác nhận tạo task"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
