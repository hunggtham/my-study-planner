import React from "react";
import { Task } from "../../types";

export const CategoryProgress: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const categories = Array.from(new Set(tasks.map((t) => t.category)));
  const stats = categories
    .map((cat) => {
      const catTasks = tasks.filter((t) => t.category === cat);
      const done = catTasks.filter((t) => t.status === "done").length;
      return {
        name: cat,
        total: catTasks.length,
        done,
        rate: catTasks.length ? Math.round((done / catTasks.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5); // top 5

  if (stats.length === 0) {
    return <div className="text-muted">Chưa có dữ liệu phân loại.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {stats.map((s) => (
        <div
          key={s.name}
          style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            <span>{s.name}</span>
            <span style={{ color: "var(--text-muted)" }}>
              {s.rate}% ({s.done}/{s.total})
            </span>
          </div>
          <div
            style={{
              height: "6px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${s.rate}%`,
                height: "100%",
                background: "var(--primary)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
