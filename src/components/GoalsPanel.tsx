import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Goal } from "../types";
import { Trash2, GitMerge, Plus } from "lucide-react";
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
                  }}
                />
              </div>
            </div>
          )}

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
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
                    Chưa có mục tiêu nào cho{" "}
                    {periodType === "week" ? "tuần" : "tháng"} này.
                  </p>
                </CardContent>
              </Card>
            ) : (
              goals.map((goal) => (
                <Card
                  key={goal.id}
                  style={{
                    opacity: goal.is_done ? 0.6 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  <CardContent
                    style={{
                      padding: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
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
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textDecoration: goal.is_done
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {goal.title}
                      </span>
                      {goal.category && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {goal.category}
                        </span>
                      )}
                    </div>
                    <div
                      style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}
                    >
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => setBreakdownGoal(goal)}
                        title="Tách nhỏ mục tiêu"
                      >
                        <GitMerge size={16} />
                      </Button>
                      <Button
                        variant="danger"
                        size="icon"
                        onClick={() => deleteGoal(goal.id)}
                        title="Xóa"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <form onSubmit={addGoal} style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="Thêm mục tiêu mới..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{
                flex: 1,
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
