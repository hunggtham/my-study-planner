import React, { useState } from "react";
import { detectSheetKind, SheetImportKind } from "../../lib/excelImport";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface ExcelSheetSelectStepProps {
  sheets: string[];
  onSelect: (sheetName: string, kind: SheetImportKind) => void;
}

export const ExcelSheetSelectStep: React.FC<ExcelSheetSelectStepProps> = ({
  sheets,
  onSelect,
}) => {
  const [selectedSheet, setSelectedSheet] = useState<string>("");

  const getSheetKindLabel = (kind: SheetImportKind) => {
    switch (kind) {
      case "tasks":
        return "Task import";
      case "weekly_goals":
        return "Mục tiêu tuần";
      case "monthly_goals":
        return "Mục tiêu tháng";
      case "unsupported":
        return "Chưa hỗ trợ";
    }
  };

  const getSheetKindBadge = (kind: SheetImportKind) => {
    switch (kind) {
      case "tasks":
        return <Badge variant="success">Task import</Badge>;
      case "weekly_goals":
      case "monthly_goals":
        return <Badge variant="warning">Goal import</Badge>;
      case "unsupported":
        return <Badge variant="danger">Chưa hỗ trợ</Badge>;
    }
  };

  const handleSelect = (sheetName: string) => {
    setSelectedSheet(sheetName);
  };

  const handleContinue = () => {
    if (!selectedSheet) return;
    const kind = detectSheetKind(selectedSheet);
    if (kind !== "unsupported") {
      onSelect(selectedSheet, kind);
    }
  };

  const selectedKind = selectedSheet
    ? detectSheetKind(selectedSheet)
    : "unsupported";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <h3 style={{ margin: 0 }}>Chọn Sheet</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {sheets.map((sheet) => {
          const kind = detectSheetKind(sheet);
          const isSelected = selectedSheet === sheet;
          const isUnsupported = kind === "unsupported";

          return (
            <div
              key={sheet}
              onClick={() => handleSelect(sheet)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem",
                border: `2px solid ${
                  isSelected ? "var(--primary)" : "var(--border-color)"
                }`,
                borderRadius: "var(--radius-md)",
                background: "var(--bg-panel)",
                cursor: "pointer",
                opacity: isUnsupported ? 0.6 : 1,
              }}
            >
              <div>
                <h4 style={{ margin: "0 0 0.25rem 0" }}>{sheet}</h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  {isUnsupported
                    ? "Chưa hỗ trợ import trực tiếp"
                    : getSheetKindLabel(kind)}
                </p>
              </div>
              {getSheetKindBadge(kind)}
            </div>
          );
        })}
      </div>

      {selectedSheet && selectedKind === "unsupported" && (
        <div
          style={{
            padding: "1rem",
            color: "var(--danger)",
            background: "rgba(239, 68, 68, 0.1)",
            borderRadius: "var(--radius-md)",
          }}
        >
          Sheet này hiện chưa hỗ trợ import trực tiếp.
        </div>
      )}

      {selectedSheet && selectedKind !== "unsupported" && (
        <div
          style={{
            padding: "1rem",
            background: "var(--bg-panel)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
          }}
        >
          <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600 }}>
            Loại Import đã chọn:
          </p>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>
            {getSheetKindLabel(selectedKind)}
          </p>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="primary"
          onClick={handleContinue}
          disabled={!selectedSheet || selectedKind === "unsupported"}
        >
          Xác nhận loại Import
        </Button>
      </div>
    </div>
  );
};
