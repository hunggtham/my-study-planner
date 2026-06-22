import React, { useState, useEffect } from "react";
import { format, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { GoalsPanel } from "../components/GoalsPanel";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Goal } from "../types";
import { Card } from "../components/ui/Card";

export const Goals: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"week" | "month" | "year">("week");
  const [allGoals, setAllGoals] = useState<Goal[]>([]);

  const weekStart = format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const yearStart = format(startOfYear(new Date()), "yyyy-MM-dd");

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
  const yearlyGoals = allGoals.filter(
    (g) => g.period_type === "year" && g.period_start_date === yearStart,
  );

  const completedWeekly = weeklyGoals.filter((g) => g.status === "done").length;
  const completedMonthly = monthlyGoals.filter(
    (g) => g.status === "done",
  ).length;
  const completedYearly = yearlyGoals.filter((g) => g.status === "done").length;
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
          <p className="text-muted">Quản lý mục tiêu theo Tuần, Tháng và Năm</p>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.75rem",
          }}
        >
          <Card
            style={{
              padding: "0.875rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              cursor: "pointer",
              outline:
                activeTab === "week" ? "2px solid var(--primary)" : "none",
              outlineOffset: "2px",
              transition: "outline 0.15s",
            }}
            onClick={() => setActiveTab("week")}
          >
            <span
              style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
            >
              Tuần này
            </span>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {completedWeekly} / {weeklyGoals.length}
            </div>
          </Card>
          <Card
            style={{
              padding: "0.875rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              cursor: "pointer",
              outline:
                activeTab === "month" ? "2px solid var(--primary)" : "none",
              outlineOffset: "2px",
              transition: "outline 0.15s",
            }}
            onClick={() => setActiveTab("month")}
          >
            <span
              style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
            >
              Tháng này
            </span>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {completedMonthly} / {monthlyGoals.length}
            </div>
          </Card>
          <Card
            style={{
              padding: "0.875rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              cursor: "pointer",
              outline:
                activeTab === "year" ? "2px solid var(--primary)" : "none",
              outlineOffset: "2px",
              transition: "outline 0.15s",
            }}
            onClick={() => setActiveTab("year")}
          >
            <span
              style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
            >
              Năm nay
            </span>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {completedYearly} / {yearlyGoals.length}
            </div>
          </Card>
          <Card
            style={{
              padding: "0.875rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}
          >
            <span
              style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
            >
              Chưa hoàn thành
            </span>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 700,
                color: "var(--warning)",
              }}
            >
              {totalPending}
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="segmented-control" style={{ maxWidth: "380px" }}>
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
          <button
            className={`segmented-btn ${activeTab === "year" ? "active" : ""}`}
            onClick={() => setActiveTab("year")}
          >
            Năm nay
          </button>
        </div>
      </header>

      <div style={{ paddingTop: "1rem" }}>
        {activeTab === "week" ? (
          <GoalsPanel periodType="week" periodStartDate={weekStart} />
        ) : activeTab === "month" ? (
          <GoalsPanel periodType="month" periodStartDate={monthStart} />
        ) : (
          <GoalsPanel periodType="year" periodStartDate={yearStart} />
        )}
      </div>
    </div>
  );
};
