import React, { useState, useEffect } from "react";
import { format, startOfWeek, startOfMonth } from "date-fns";
import { GoalsPanel } from "../components/GoalsPanel";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Goal } from "../types";
import { Card } from "../components/ui/Card";

export const Goals: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"week" | "month">("week");
  const [allGoals, setAllGoals] = useState<Goal[]>([]);

  const weekStart = format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id);

      if (data) {
        setAllGoals(data);
      }
    };
    fetchStats();
  }, [user]);

  // Calculate stats
  const weeklyGoals = allGoals.filter(
    (g) => g.period_type === "week" && g.period_start_date === weekStart,
  );
  const monthlyGoals = allGoals.filter(
    (g) => g.period_type === "month" && g.period_start_date === monthStart,
  );

  const completedWeekly = weeklyGoals.filter((g) => g.status === "done").length;
  const completedMonthly = monthlyGoals.filter(
    (g) => g.status === "done",
  ).length;
  const totalPending = allGoals.filter((g) => g.status !== "done").length;

  return (
    <div className="page-container">
      <header
        className="page-header"
        style={{
          flexDirection: "column",
          alignItems: "stretch",
          gap: "1.5rem",
        }}
      >
        <div>
          <h1>Mục tiêu</h1>
          <p className="text-muted">Quản lý mục tiêu theo Tuần và Tháng</p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          <Card
            style={{
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}
          >
            <span
              style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}
            >
              Tuần này
            </span>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {completedWeekly} / {weeklyGoals.length}
            </div>
          </Card>
          <Card
            style={{
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}
          >
            <span
              style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}
            >
              Tháng này
            </span>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {completedMonthly} / {monthlyGoals.length}
            </div>
          </Card>
          <Card
            style={{
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}
          >
            <span
              style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}
            >
              Chưa hoàn thành
            </span>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--warning)",
              }}
            >
              {totalPending}
            </div>
          </Card>
        </div>

        <div className="segmented-control" style={{ maxWidth: "300px" }}>
          <button
            className={`segmented-btn ${activeTab === "week" ? "active" : ""}`}
            onClick={() => setActiveTab("week")}
          >
            Tuần này
          </button>
          <button
            className={`segmented-btn ${activeTab === "month" ? "active" : ""}`}
            onClick={() => setActiveTab("month")}
          >
            Tháng này
          </button>
        </div>
      </header>
      <div style={{ paddingTop: "1rem" }}>
        {activeTab === "week" ? (
          <GoalsPanel periodType="week" periodStartDate={weekStart} />
        ) : (
          <GoalsPanel periodType="month" periodStartDate={monthStart} />
        )}
      </div>
    </div>
  );
};
