import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  detail,
  icon,
}) => {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <p className="stat-label">{label}</p>
        {icon && <div className="stat-icon">{icon}</div>}
      </div>
      <strong className="stat-value">{value}</strong>
      {detail && <span className="stat-detail">{detail}</span>}
    </div>
  );
};
