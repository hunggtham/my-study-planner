import React from "react";
import { ScheduleDateNavigator } from "./ScheduleDateNavigator";
import { Button } from "../ui/Button";

interface ScheduleHeaderProps {
  tasksCount: number;
  completedCount: number;
  movedCount: number;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  viewMode: "list" | "timeline" | "compact";
  setViewMode: (mode: "list" | "timeline" | "compact") => void;
  onAddTask: () => void;
}

export const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  tasksCount,
  completedCount,
  movedCount,
  selectedDate,
  setSelectedDate,
  viewMode,
  setViewMode,
  onAddTask,
}) => {
  const progress = tasksCount
    ? Math.round((completedCount / tasksCount) * 100)
    : 0;

  return (
    <header style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            Lịch trình
          </h1>
          <p className="text-muted" style={{ margin: 0, fontSize: "0.875rem" }}>
            Quản lý task theo ngày
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-sm)",
              textAlign: "center",
              flex: "1 1 auto",
            }}
          >
            <div
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {tasksCount}
            </div>
            <div
              style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}
            >
              Tổng
            </div>
          </div>
          <div
            style={{
              background: "var(--success-bg)",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-sm)",
              textAlign: "center",
              flex: "1 1 auto",
            }}
          >
            <div
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "var(--success)",
              }}
            >
              {completedCount}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--success)" }}>
              Xong ({progress}%)
            </div>
          </div>
          <div
            style={{
              background: "var(--warning-bg)",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-sm)",
              textAlign: "center",
              flex: "1 1 auto",
            }}
          >
            <div
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "var(--warning)",
              }}
            >
              {movedCount}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--warning)" }}>
              Dời
            </div>
          </div>
        </div>
      </div>

      <ScheduleDateNavigator
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div
          className="segmented-control"
          style={{
            display: "flex",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            flex: "1 1 auto",
            maxWidth: "400px",
          }}
        >
          <button
            className={`segmented-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
            style={{
              flex: 1,
              padding: "0.5rem",
              background:
                viewMode === "list" ? "var(--primary-bg)" : "transparent",
              color:
                viewMode === "list"
                  ? "var(--primary)"
                  : "var(--text-secondary)",
              fontWeight: viewMode === "list" ? 600 : 400,
            }}
          >
            List
          </button>
          <button
            className={`segmented-btn ${viewMode === "timeline" ? "active" : ""}`}
            onClick={() => setViewMode("timeline")}
            style={{
              flex: 1,
              padding: "0.5rem",
              background:
                viewMode === "timeline" ? "var(--primary-bg)" : "transparent",
              color:
                viewMode === "timeline"
                  ? "var(--primary)"
                  : "var(--text-secondary)",
              fontWeight: viewMode === "timeline" ? 600 : 400,
            }}
          >
            Timeline
          </button>
          <button
            className={`segmented-btn ${viewMode === "compact" ? "active" : ""}`}
            onClick={() => setViewMode("compact")}
            style={{
              flex: 1,
              padding: "0.5rem",
              background:
                viewMode === "compact" ? "var(--primary-bg)" : "transparent",
              color:
                viewMode === "compact"
                  ? "var(--primary)"
                  : "var(--text-secondary)",
              fontWeight: viewMode === "compact" ? 600 : 400,
            }}
          >
            Compact
          </button>
        </div>
        <Button
          variant="primary"
          onClick={onAddTask}
          style={{ flex: "1 1 auto", maxWidth: "200px" }}
        >
          + Thêm Task
        </Button>
      </div>
    </header>
  );
};
