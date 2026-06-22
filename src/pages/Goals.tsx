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

  const now = new Date();
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const yearStart = format(startOfYear(now), "yyyy-MM-dd");
  const currentYear = now.getFullYear();

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id);
      if (data) setAllGoals(data);
    };
    fetchStats();
  }, [user]);

  // Stats: weekly and monthly use exact date match; yearly uses range
  const weeklyGoals = allGoals.filter(
    (g) => g.period_type === "week" && g.period_start_date === weekStart,
  );
  const monthlyGoals = allGoals.filter(
    (g) => g.period_type === "month" && g.period_start_date === monthStart,
  );
  const yearlyGoals = allGoals.filter(
    (g) =>
      g.period_type === "year" &&
      g.period_start_date >= `${currentYear}-01-01` &&
      g.period_start_date <= `${currentYear}-12-31`,
  );

  const completedWeekly = weeklyGoals.filter((g) => g.status === "done").length;
  const completedMonthly = monthlyGoals.filter(
    (g) => g.status === "done",
  ).length;
  const completedYearly = yearlyGoals.filter((g) => g.status === "done").length;
  const totalPending = allGoals.filter((g) => g.status !== "done").length;

  const statCards = [
    {
      label: "Tuần này",
      tab: "week" as const,
      done: completedWeekly,
      total: weeklyGoals.length,
      color: "var(--primary)",
    },
    {
      label: "Tháng này",
      tab: "month" as const,
      done: completedMonthly,
      total: monthlyGoals.length,
      color: "var(--accent)",
    },
    {
      label: "Năm nay",
      tab: "year" as const,
      done: completedYearly,
      total: yearlyGoals.length,
      color: "var(--success)",
    },
    {
      label: "Chưa xong",
      tab: null,
      done: null,
      total: totalPending,
      color: "var(--warning)",
    },
  ];

  return (
    <div className="page-container">
      <header
        className="page-header"
        style={{
          flexDirection: "column",
          alignItems: "stretch",
          gap: "1.25rem",
        }}
      >
        <div>
          <h1>Mục tiêu</h1>
          <p className="text-muted">Quản lý mục tiêu theo tuần, tháng và năm</p>
        </div>

        {/* Stats row */}
        <div className="goals-stats-grid">
          {statCards.map((s) => (
            <Card
              key={s.label}
              style={{
                padding: "0.875rem 1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                cursor: s.tab ? "pointer" : "default",
                outline:
                  s.tab && activeTab === s.tab
                    ? `2px solid ${s.color}`
                    : "none",
                outlineOffset: "2px",
                transition: "outline 0.15s, box-shadow 0.15s",
                boxShadow:
                  s.tab && activeTab === s.tab
                    ? `0 0 0 3px ${s.color}18`
                    : undefined,
              }}
              onClick={() => s.tab && setActiveTab(s.tab)}
            >
              <span
                style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}
              >
                {s.label}
              </span>
              <div
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 700,
                  color: s.color,
                  lineHeight: 1.2,
                }}
              >
                {s.done !== null ? `${s.done} / ${s.total}` : s.total}
              </div>
              {s.done !== null && s.total > 0 && (
                <div
                  style={{
                    height: "4px",
                    background: "var(--border-color)",
                    borderRadius: "2px",
                    overflow: "hidden",
                    marginTop: "0.25rem",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round((s.done / s.total) * 100)}%`,
                      height: "100%",
                      background: s.color,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="segmented-control goals-tabs">
          {(["week", "month", "year"] as const).map((tab) => (
            <button
              key={tab}
              className={`segmented-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "week"
                ? "Tuần này"
                : tab === "month"
                  ? "Tháng này"
                  : "Năm nay"}
            </button>
          ))}
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
