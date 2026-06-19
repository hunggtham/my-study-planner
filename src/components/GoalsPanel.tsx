import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Goal } from "../types";
import { Trash2, GitMerge } from "lucide-react";
import { GoalBreakdownForm } from "./GoalBreakdownForm";
import { Button } from "./ui/Button";
import { Card, CardContent } from "./ui/Card";

interface GoalsPanelProps {
  periodType: "week" | "month";
  periodStartDate: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const GoalsPanel: React.FC<GoalsPanelProps> = ({
  periodType,
  periodStartDate,
  onClose,
  isModal,
}) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [breakdownGoal, setBreakdownGoal] = useState<Goal | null>(null);

  const fetchGoals = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("period_type", periodType)
      .eq("period_start_date", periodStartDate)
      .order("created_at", { ascending: true });

    if (data) {
      // Map DB status to local is_done for backward compatibility
      const mappedGoals = data.map((g) => ({
        ...g,
        is_done: g.status === "done",
      }));
      setGoals(mappedGoals);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGoals();
  }, [user, periodType, periodStartDate]);

  const toggleGoal = async (id: string, is_done: boolean) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, is_done } : g)));
    const newStatus = is_done ? "done" : "active";
    try {
      const { error } = await supabase
        .from("goals")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    } catch (err: any) {
      console.error("Goal toggle failed:", err);
      alert("Không thể cập nhật mục tiêu. Vui lòng thử lại.");
      // Revert local state
      setGoals((prev) =>
        prev.map((g) => (g.id === id ? { ...g, is_done: !is_done } : g)),
      );
    }
  };

  const deleteGoal = async (id: string) => {
    if (!window.confirm("Xóa mục tiêu này?")) return;
    const backup = [...goals];
    setGoals((prev) => prev.filter((g) => g.id !== id));
    try {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    } catch (err: any) {
      console.error("Goal delete failed:", err);
      alert("Không thể xóa mục tiêu. Vui lòng thử lại.");
      setGoals(backup);
    }
  };

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim()) return;

    const newGoal = {
      user_id: user.id,
      period_type: periodType,
      period_start_date: periodStartDate,
      title: newTitle.trim(),
      category: "General",
      status: "active",
      // removed is_done and note as they don't exist in goals table
    };

    try {
      const { data, error } = await supabase
        .from("goals")
        .insert([newGoal])
        .select();
      if (error) throw error;

      if (data && data.length > 0) {
        const addedGoal = { ...data[0], is_done: false };
        setGoals((prev) => [...prev, addedGoal]);
        setNewTitle("");
      }
    } catch (err: any) {
      console.error("Goal insert failed:", err);
      alert("Lỗi thêm mục tiêu: " + err.message);
    }
  };

  const content = (
    <div className="goals-panel-content">
      {isModal && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
            Mục tiêu {periodType === "week" ? "Tuần" : "Tháng"} (
            {periodStartDate})
          </h3>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Đóng
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "var(--text-secondary)",
          }}
        >
          Đang tải...
        </div>
      ) : (
        <>
          {goals.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.85rem",
                  marginBottom: "0.5rem",
                }}
              >
                <span>Tiến độ</span>
                <span style={{ fontWeight: 600 }}>
                  {goals.filter((g) => g.is_done).length} / {goals.length}
                </span>
              </div>
              <div
                style={{
                  height: "8px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(goals.filter((g) => g.is_done).length / goals.length) * 100}%`,
                    height: "100%",
                    background: "var(--success)",
                  }}
                ></div>
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            {goals.length === 0 ? (
              <Card>
                <CardContent
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                  }}
                >
                  Chưa có mục tiêu nào.
                </CardContent>
              </Card>
            ) : (
              goals.map((goal) => (
                <div
                  key={goal.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    opacity: goal.is_done ? 0.6 : 1,
                    padding: "1rem",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={goal.is_done}
                      onChange={(e) => toggleGoal(goal.id, e.target.checked)}
                      style={{
                        width: "1.25rem",
                        height: "1.25rem",
                        cursor: "pointer",
                        margin: 0,
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                      }}
                    >
                      <span
                        style={{
                          textDecoration: goal.is_done
                            ? "line-through"
                            : "none",
                          fontWeight: 500,
                        }}
                      >
                        {goal.title}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {goal.category}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {!goal.is_done && (
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => setBreakdownGoal(goal)}
                          title="Tách thành task nhỏ"
                        >
                          <GitMerge size={16} />
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="icon"
                        onClick={() => deleteGoal(goal.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <form
        onSubmit={addGoal}
        style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Thêm mục tiêu mới..."
          style={{ flex: 1 }}
        />
        <Button variant="primary" type="submit">
          Thêm
        </Button>
      </form>

      {breakdownGoal && (
        <GoalBreakdownForm
          goal={breakdownGoal}
          onClose={() => setBreakdownGoal(null)}
          onSuccess={() => setBreakdownGoal(null)}
        />
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="task-form-overlay" style={{ zIndex: 1000 }}>
        <div
          className="task-form-container card"
          style={{ maxWidth: "500px", width: "100%" }}
        >
          {content}
        </div>
      </div>
    );
  }

  return content;
};
