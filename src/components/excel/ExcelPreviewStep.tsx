import React from "react";
import {
  ImportAction,
  SheetImportKind,
  TaskImportRow,
  GoalImportRow,
} from "../../lib/excelImport";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface ExcelPreviewStepProps {
  importKind: SheetImportKind;
  previewRows: (TaskImportRow | GoalImportRow)[];
  updateRowAction: (index: number, action: ImportAction) => void;
  executeImport: () => void;
  isProcessing: boolean;
}

export const ExcelPreviewStep: React.FC<ExcelPreviewStepProps> = ({
  importKind,
  previewRows,
  updateRowAction,
  executeImport,
  isProcessing,
}) => {
  const stats = {
    valid: previewRows.filter((r) => r.invalidReasons.length === 0).length,
    invalid: previewRows.filter((r) => r.invalidReasons.length > 0).length,
    add: previewRows.filter((r) => r.action === "add").length,
    update: previewRows.filter((r) => r.action === "update").length,
    skip: previewRows.filter((r) => r.action === "skip").length,
  };

  const isTask = importKind === "tasks";

  const renderActionSelect = (
    row: TaskImportRow | GoalImportRow,
    index: number,
  ) => {
    return (
      <select
        value={row.action}
        onChange={(e) => updateRowAction(index, e.target.value as ImportAction)}
        disabled={row.invalidReasons.length > 0}
        style={{ padding: "0.25rem", borderRadius: "var(--radius-sm)" }}
      >
        <option value="add">Add</option>
        <option value="update">Update</option>
        <option value="skip">Skip</option>
      </select>
    );
  };

  const getActionBadge = (action: ImportAction, invalid: boolean) => {
    if (invalid) return <Badge variant="danger">Invalid</Badge>;
    if (action === "add") return <Badge variant="success">Add</Badge>;
    if (action === "update") return <Badge variant="warning">Update</Badge>;
    return <Badge variant="secondary">Skip</Badge>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "1rem",
        }}
      >
        <div className="stat-card">
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Dòng hợp lệ
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            {stats.valid}
          </div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Dòng lỗi
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "red" }}>
            {stats.invalid}
          </div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Thêm mới
          </div>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--primary)",
            }}
          >
            {stats.add}
          </div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Cập nhật
          </div>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--warning)",
            }}
          >
            {stats.update}
          </div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Bỏ qua
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            {stats.skip}
          </div>
        </div>
      </div>

      <div
        style={{
          overflowX: "auto",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <table
          style={{
            width: "100%",
            textAlign: "left",
            borderCollapse: "collapse",
            fontSize: "0.85rem",
          }}
        >
          <thead>
            <tr style={{ background: "var(--bg-panel)" }}>
              <th style={{ padding: "0.5rem" }}>Dòng</th>
              {isTask ? (
                <>
                  <th style={{ padding: "0.5rem" }}>Ngày</th>
                  <th style={{ padding: "0.5rem" }}>Thời gian</th>
                </>
              ) : (
                <>
                  <th style={{ padding: "0.5rem" }}>Loại kỳ</th>
                  <th style={{ padding: "0.5rem" }}>Ngày bắt đầu</th>
                </>
              )}
              <th style={{ padding: "0.5rem" }}>Tên</th>
              <th style={{ padding: "0.5rem" }}>Trạng thái</th>
              <th style={{ padding: "0.5rem" }}>Badge</th>
              <th style={{ padding: "0.5rem" }}>Lỗi</th>
              <th style={{ padding: "0.5rem" }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((r, i) => {
              const invalid = r.invalidReasons.length > 0;
              return (
                <tr
                  key={i}
                  style={{
                    background: invalid ? "#fee2e2" : "transparent",
                    borderTop: "1px solid var(--border-color)",
                  }}
                >
                  <td style={{ padding: "0.5rem" }}>{r.rowNumber}</td>
                  {isTask ? (
                    <>
                      <td style={{ padding: "0.5rem" }}>
                        {(r as TaskImportRow).date}
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        {(r as TaskImportRow).start_time} -{" "}
                        {(r as TaskImportRow).end_time}
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: "0.5rem" }}>
                        {(r as GoalImportRow).period_type}
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        {(r as GoalImportRow).period_start_date}
                      </td>
                    </>
                  )}
                  <td style={{ padding: "0.5rem" }}>{r.title}</td>
                  <td style={{ padding: "0.5rem" }}>{r.status}</td>
                  <td style={{ padding: "0.5rem" }}>
                    {getActionBadge(r.action, invalid)}
                  </td>
                  <td style={{ padding: "0.5rem", color: "red" }}>
                    {r.invalidReasons.join(", ")}
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    {renderActionSelect(r, i)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="primary"
          onClick={executeImport}
          disabled={isProcessing}
        >
          {isProcessing ? "Đang xử lý..." : "Xác nhận Import DB"}
        </Button>
      </div>
    </div>
  );
};
