import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Goal } from "../types";
import { Trash2, GitMerge, Plus } from "lucide-react";
import { GoalBreakdownForm } from "./GoalBreakdownForm";
import { Button } from "./ui/Button";
import { Card, CardContent } from "./ui/Card";

interface GoalsPanelProps {
  periodType: "week" | "month" | "year";
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
      alert("Không thể cập nhật mục tiêu. Vui lòng thử lại.");
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
      alert("Lỗi thêm mục tiêu: " + err.message);
    }
  };

  const completedCount = goals.filter((g) => g.is_done).length;
  const progress = goals.length ? (completedCount / goals.length) * 100 : 0;

  const periodLabel =
    periodType === "week" ? "Tuần" : periodType === "month" ? "Tháng" : "Năm";
  const periodLabelLower =
    periodType === "week" ? "tuần" : periodType === "month" ? "tháng" : "năm";
  const inputPlaceholder =
    periodType === "year"
      ? "Thêm mục tiêu năm..."
      : periodType === "month"
        ? "Thêm mục tiêu tháng..."
        : "Thêm mục tiêu tuần...";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {isModal && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
            Mục tiêu {periodLabel} ({periodStartDate})
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
            <div>
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
                  {completedCount} / {goals.length}
                </span>
              </div>
              <div
                style={{
                  height: "8px",
                  background: "var(--border-color)",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: "var(--success)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}

          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {goals.length === 0 ? (
              <Card>
                <CardContent
                  style={{
                    padding: "3rem 1rem",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <p style={{ margin: 0 }}>
                    Chưa có mục tiêu nào cho {periodLabelLower} này.
                  </p>
                </CardContent>
              </Card>
            ) : (
              goals.map((goal) => (
                <Card
                  key={goal.id}
                  style={{
                    opacity: goal.is_done ? 0.7 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  <CardContent
                    style={{
                      padding: "0.875rem 1rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={goal.is_done}
                      onChange={(e) => toggleGoal(goal.id, e.target.checked)}
                      style={{
                        width: "1.125rem",
                        height: "1.125rem",
                        cursor: "pointer",
                        margin: "0.2rem 0 0 0",
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem",
                        minWidth: 0,
                      }}
                    >
                      <span
                        className="goal-card-title"
                        title={goal.title}
                        style={{
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          textDecoration: goal.is_done
                            ? "line-through"
                            : "none",
                          opacity: goal.is_done ? 0.7 : 1,
                        }}
                      >
                        {goal.title}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.4rem",
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        {goal.category && (
                          <span
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--text-secondary)",
                              background: "var(--bg-muted)",
                              padding: "0.1rem 0.45rem",
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--border-color)",
                            }}
                          >
                            {goal.category}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--primary)",
                            background: "var(--primary-bg)",
                            padding: "0.1rem 0.45rem",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--primary-border)",
                          }}
                        >
                          {periodLabel}
                        </span>
                        {goal.is_done && (
                          <span
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--success)",
                            }}
                          >
                            ✓ Hoàn thành
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.4rem",
                        flexShrink: 0,
                        alignSelf: "flex-start",
                      }}
                    >
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => setBreakdownGoal(goal)}
                        title="Tách nhỏ mục tiêu"
                      >
                        <GitMerge size={15} />
                      </Button>
                      <Button
                        variant="danger"
                        size="icon"
                        onClick={() => deleteGoal(goal.id)}
                        title="Xóa"
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <form
            onSubmit={addGoal}
            style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
          >
            <input
              type="text"
              placeholder={inputPlaceholder}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{
                flex: 1,
                minWidth: "200px",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
              }}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!newTitle.trim()}
              style={{ whiteSpace: "nowrap" }}
            >
              <Plus size={18} style={{ marginRight: "0.25rem" }} /> Thêm
            </Button>
          </form>
        </>
      )}

      {breakdownGoal && (
        <GoalBreakdownForm
          goal={breakdownGoal}
          onClose={() => setBreakdownGoal(null)}
          onSuccess={() => {
            setBreakdownGoal(null);
            fetchGoals();
          }}
        />
      )}
    </div>
  );
};
