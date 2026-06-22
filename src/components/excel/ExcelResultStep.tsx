import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "../ui/Button";

interface ExcelResultStepProps {
  summary: {
    added: number;
    updated: number;
    skipped: number;
    invalid: number;
    errors: number;
  };
  onClose: () => void;
  onReset: () => void;
}

export const ExcelResultStep: React.FC<ExcelResultStepProps> = ({
  summary,
  onClose,
  onReset,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        gap: "1.5rem",
      }}
    >
      <CheckCircle2 size={64} style={{ color: "var(--success)" }} />
      <h3 style={{ margin: 0 }}>Import hoàn tất!</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          width: "100%",
          maxWidth: "400px",
          marginTop: "1rem",
        }}
      >
        <div
          style={{
            background: "var(--bg-panel)",
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            textAlign: "center",
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--success)",
            }}
          >
            {summary.added}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Đã thêm mới
          </div>
        </div>
        <div
          style={{
            background: "var(--bg-panel)",
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            textAlign: "center",
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--primary)",
            }}
          >
            {summary.updated}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Đã cập nhật
          </div>
        </div>
        <div
          style={{
            background: "var(--bg-panel)",
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            textAlign: "center",
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--text-muted)",
            }}
          >
            {summary.skipped}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Đã bỏ qua
          </div>
        </div>
        <div
          style={{
            background: "var(--bg-panel)",
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            textAlign: "center",
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--warning)",
            }}
          >
            {summary.invalid}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Không hợp lệ
          </div>
        </div>
      </div>

      {summary.errors > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--danger)",
            background: "rgba(239, 68, 68, 0.1)",
            padding: "1rem",
            borderRadius: "var(--radius-md)",
          }}
        >
          <AlertTriangle size={18} />
          <span>
            Có {summary.errors} lỗi xảy ra trong quá trình ghi dữ liệu.
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <Button variant="ghost" onClick={onClose}>
          Đóng
        </Button>
        <Button variant="primary" onClick={onReset}>
          Import file khác
        </Button>
      </div>
    </div>
  );
};
