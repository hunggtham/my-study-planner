import React, { useState } from "react";
import { format, startOfWeek, startOfMonth } from "date-fns";
import { GoalsPanel } from "../components/GoalsPanel";

export const Goals: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"week" | "month">("week");

  const weekStart = format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  return (
    <div className="page-container">
      <header
        className="page-header"
        style={{ flexDirection: "column", alignItems: "stretch", gap: "1rem" }}
      >
        <div>
          <h1>Mục tiêu</h1>
          <p className="text-muted">Quản lý mục tiêu theo Tuần và Tháng</p>
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
      <div className="card" style={{ padding: "1.5rem" }}>
        {activeTab === "week" ? (
          <GoalsPanel periodType="week" periodStartDate={weekStart} />
        ) : (
          <GoalsPanel periodType="month" periodStartDate={monthStart} />
        )}
      </div>
    </div>
  );
};
