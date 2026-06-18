import React from "react";

interface ProgressCardProps {
  title: string;
  completed: number;
  total: number;
  subtitle?: string;
  intent?: "primary" | "success" | "warning";
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  title,
  completed,
  total,
  subtitle,
  intent = "primary",
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      <h3 style={{ fontSize: "1.1rem", margin: 0 }}>{title}</h3>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1 }}>
          {percentage}%
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          {completed} / {total}
        </div>
      </div>
      <div
        style={{
          height: "8px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "4px",
          overflow: "hidden",
          marginTop: "0.5rem",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: `var(--${intent})`,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      {subtitle && (
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            margin: 0,
            marginTop: "0.25rem",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};
