import React, { useEffect } from "react";
import { SheetImportKind } from "../../lib/excelImport";
import { Button } from "../ui/Button";

interface ExcelMappingStepProps {
  headers: string[];
  importKind: SheetImportKind;
  mapping: Record<string, string>;
  setMapping: (m: Record<string, string>) => void;
  headerRowIndex: number;
  setHeaderRowIndex: (idx: number) => void;
  extraData: { periodStartDate?: string };
  setExtraData: (d: any) => void;
  onGeneratePreview: () => void;
  isProcessing: boolean;
}

export const ExcelMappingStep: React.FC<ExcelMappingStepProps> = ({
  headers,
  importKind,
  mapping,
  setMapping,
  headerRowIndex,
  setHeaderRowIndex,
  extraData,
  setExtraData,
  onGeneratePreview,
  isProcessing,
}) => {
  useEffect(() => {
    const newMap: Record<string, string> = {};
    const hLower = headers.map((h) => h.toLowerCase());

    if (importKind === "tasks") {
      hLower.forEach((h, i) => {
        if (h.includes("ngày") || h === "date") newMap["date"] = headers[i];
        else if (h.includes("khung giờ") || h === "time")
          newMap["time_range"] = headers[i];
        else if (h.includes("nhóm") || h === "category")
          newMap["category"] = headers[i];
        else if (h.includes("task chính") || h === "title")
          newMap["title"] = headers[i];
        else if (h.includes("ghi chú/rule") || h === "description")
          newMap["description"] = headers[i];
        else if (h.includes("output tối thiểu") || h === "note")
          newMap["note"] = headers[i];
        else if (h.includes("ưu tiên") || h === "priority")
          newMap["priority"] = headers[i];
        else if (h.includes("status") || h === "trạng thái")
          newMap["status"] = headers[i];
        else if (h.includes("điểm") || h === "score_weight")
          newMap["score_weight"] = headers[i];
        else if (h.includes("ghi chú thực tế")) newMap["note"] = headers[i];
      });
    } else if (
      importKind === "weekly_goals" ||
      importKind === "monthly_goals"
    ) {
      hLower.forEach((h, i) => {
        if (h.includes("nhóm") || h === "category")
          newMap["category"] = headers[i];
        else if (
          h.includes("mục tiêu checkbox") ||
          h.includes("tiêu chí hoàn thành") ||
          h.includes("mục tiêu tháng 6 demo")
        ) {
          if (!newMap["title"]) newMap["title"] = headers[i];
        } else if (h.includes("status") || h === "trạng thái")
          newMap["status"] = headers[i];
      });
    }

    setMapping(newMap);
  }, [headers, importKind, setMapping]);

  const updateMapping = (dbField: string, excelHeader: string) => {
    setMapping({ ...mapping, [dbField]: excelHeader });
  };

  const getFields = () => {
    if (importKind === "tasks") {
      return [
        { id: "date", label: "Ngày (date) *" },
        { id: "title", label: "Task chính (title) *" },
        { id: "category", label: "Nhóm (category)" },
        { id: "time_range", label: "Khung giờ (time)" },
        { id: "priority", label: "Ưu tiên (priority)" },
        { id: "status", label: "Trạng thái (status)" },
        { id: "description", label: "Ghi chú/Rule (description)" },
        { id: "note", label: "Output/Ghi chú (note)" },
        { id: "score_weight", label: "Điểm (score)" },
      ];
    } else {
      return [
        { id: "title", label: "Mục tiêu (title) *" },
        { id: "category", label: "Nhóm (category)" },
        { id: "status", label: "Trạng thái (status)" },
      ];
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="form-group">
        <label>Dòng chứa tiêu đề (từ 0)</label>
        <input
          type="number"
          min="0"
          className="form-input"
          value={headerRowIndex}
          onChange={(e) => setHeaderRowIndex(Number(e.target.value))}
          style={{ maxWidth: "150px" }}
        />
      </div>

      {importKind === "weekly_goals" && (
        <div className="form-group">
          <label>Chọn ngày bắt đầu tuần *</label>
          <input
            type="date"
            className="form-input"
            value={extraData.periodStartDate || ""}
            onChange={(e) =>
              setExtraData({ ...extraData, periodStartDate: e.target.value })
            }
            style={{ maxWidth: "200px" }}
          />
        </div>
      )}

      {importKind === "monthly_goals" && (
        <div className="form-group">
          <label>Chọn tháng áp dụng *</label>
          <input
            type="month"
            className="form-input"
            value={extraData.periodStartDate?.substring(0, 7) || ""}
            onChange={(e) => {
              const yyyyMM = e.target.value;
              setExtraData({
                ...extraData,
                periodStartDate: yyyyMM ? `${yyyyMM}-01` : "",
              });
            }}
            style={{ maxWidth: "200px" }}
          />
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
        }}
      >
        {getFields().map((field) => (
          <div key={field.id} className="form-group">
            <label>{field.label}</label>
            <select
              className="form-input"
              value={mapping[field.id] || ""}
              onChange={(e) => updateMapping(field.id, e.target.value)}
            >
              <option value="">-- Trống --</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="primary"
          onClick={onGeneratePreview}
          disabled={
            isProcessing ||
            ((importKind === "weekly_goals" ||
              importKind === "monthly_goals") &&
              !extraData.periodStartDate)
          }
        >
          {isProcessing ? "Đang xử lý..." : "Xem trước"}
        </Button>
      </div>
    </div>
  );
};
