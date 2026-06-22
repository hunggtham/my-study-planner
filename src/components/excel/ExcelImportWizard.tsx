import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { read, utils, WorkBook } from "xlsx";
import { Button } from "../ui/Button";
import { UploadCloud, List, Target, Eye } from "lucide-react";
import {
  SheetImportKind,
  ImportAction,
  TaskImportRow,
  GoalImportRow,
  parseExcelDate,
  extractTime,
  normalizeTaskStatus,
  normalizeGoalStatus,
  normalizePriority,
} from "../../lib/excelImport";

import { ExcelUploadStep } from "./ExcelUploadStep";
import { ExcelSheetSelectStep } from "./ExcelSheetSelectStep";
import { ExcelMappingStep } from "./ExcelMappingStep";
import { ExcelPreviewStep } from "./ExcelPreviewStep";
import { ExcelResultStep } from "./ExcelResultStep";

import "../../styles-taskform.css";

interface ExcelImportWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const ExcelImportWizard: React.FC<ExcelImportWizardProps> = ({
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [workbook, setWorkbook] = useState<WorkBook | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [importKind, setImportKind] = useState<SheetImportKind>("unsupported");

  const [headers, setHeaders] = useState<string[]>([]);
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [extraData, setExtraData] = useState<{ periodStartDate?: string }>({});

  const [previewRows, setPreviewRows] = useState<
    (TaskImportRow | GoalImportRow)[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [summary, setSummary] = useState({
    added: 0,
    updated: 0,
    skipped: 0,
    invalid: 0,
    errors: 0,
  });

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = read(bstr, { type: "binary", cellDates: true });
        setWorkbook(wb);
        setSheets(wb.SheetNames);
        setStep(2);
      } catch (err) {
        alert("Lỗi đọc file Excel.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSheetSelect = (sheetName: string, kind: SheetImportKind) => {
    setSelectedSheet(sheetName);
    setImportKind(kind);

    if (workbook) {
      const ws = workbook.Sheets[sheetName];
      const rawData = utils.sheet_to_json(ws, {
        header: 1,
        raw: true,
      }) as any[][];
      if (rawData[0]) {
        setHeaders(rawData[0].map((h) => String(h || "").trim()));
      }
    }
    setStep(3);
  };

  const handleGeneratePreview = async () => {
    if (!workbook || !selectedSheet || !user) return;
    setIsProcessing(true);

    try {
      const ws = workbook.Sheets[selectedSheet];
      const rawJson = utils.sheet_to_json(ws, {
        range: headerRowIndex,
        defval: "",
      }) as any[];

      if (importKind === "tasks") {
        const { data: existingData } = await supabase
          .from("tasks")
          .select("id, date, start_time, title, category")
          .eq("user_id", user.id);

        const rows: TaskImportRow[] = rawJson.map((row, idx) => {
          const parsedDate = parseExcelDate(row[mapping["date"]]);
          const timeData = extractTime(row[mapping["time_range"]] || "");

          const parsed: TaskImportRow = {
            rowNumber: idx + headerRowIndex + 2,
            date: parsedDate || "",
            title: String(row[mapping["title"]] || "").trim(),
            category: String(row[mapping["category"]] || "").trim(),
            start_time: timeData.start_time,
            end_time: timeData.end_time,
            status: normalizeTaskStatus(row[mapping["status"]] || ""),
            priority: normalizePriority(row[mapping["priority"]] || ""),
            description: String(row[mapping["description"]] || ""),
            note: String(row[mapping["note"]] || ""),
            score_weight: Number(row[mapping["score_weight"]]) || 1,
            action: "skip",
            invalidReasons: [],
          };

          if (!parsed.date) parsed.invalidReasons.push("Thiếu ngày");
          if (!parsed.title) parsed.invalidReasons.push("Thiếu tiêu đề");

          if (parsed.invalidReasons.length === 0) {
            const existing = existingData?.find(
              (e) =>
                e.date === parsed.date &&
                (e.start_time || "") === parsed.start_time &&
                e.title === parsed.title &&
                (e.category || "") === parsed.category,
            );
            if (existing) {
              parsed.action = "update";
              parsed.existingId = existing.id;
            } else {
              parsed.action = "add";
            }
          }
          return parsed;
        });
        setPreviewRows(rows);
      } else if (
        importKind === "weekly_goals" ||
        importKind === "monthly_goals"
      ) {
        const { data: existingData } = await supabase
          .from("goals")
          .select("id, period_type, period_start_date, title, category")
          .eq("user_id", user.id);

        const periodType = importKind === "weekly_goals" ? "week" : "month";
        const periodStart = extraData.periodStartDate || "";

        const rows: GoalImportRow[] = rawJson.map((row, idx) => {
          const parsed: GoalImportRow = {
            rowNumber: idx + headerRowIndex + 2,
            period_type: periodType,
            period_start_date: periodStart,
            title: String(row[mapping["title"]] || "").trim(),
            category: String(row[mapping["category"]] || "").trim(),
            status: normalizeGoalStatus(row[mapping["status"]] || ""),
            action: "skip",
            invalidReasons: [],
          };

          if (!parsed.title) parsed.invalidReasons.push("Thiếu mục tiêu");

          if (parsed.invalidReasons.length === 0) {
            const existing = existingData?.find(
              (e) =>
                e.period_type === parsed.period_type &&
                e.period_start_date === parsed.period_start_date &&
                e.title === parsed.title &&
                (e.category || "") === parsed.category,
            );
            if (existing) {
              parsed.action = "update";
              parsed.existingId = existing.id;
            } else {
              parsed.action = "add";
            }
          }
          return parsed;
        });
        setPreviewRows(rows);
      }

      setStep(4);
    } catch (err: any) {
      alert("Lỗi xem trước: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateRowAction = (index: number, action: ImportAction) => {
    const newRows = [...previewRows];
    newRows[index].action = action;
    setPreviewRows(newRows);
  };

  const executeImport = async () => {
    if (!user) return;
    setIsProcessing(true);
    let added = 0,
      updated = 0,
      skipped = 0,
      invalid = 0,
      errors = 0;

    const toAdd: any[] = [];
    const toUpdate: any[] = [];

    previewRows.forEach((r) => {
      if (r.invalidReasons.length > 0) invalid++;
      else if (r.action === "skip") skipped++;
      else {
        const payload: any = { user_id: user.id };

        if (importKind === "tasks") {
          const tr = r as TaskImportRow;
          payload.date = tr.date;
          payload.start_time = tr.start_time;
          payload.end_time = tr.end_time;
          payload.category = tr.category;
          payload.title = tr.title;
          payload.description = tr.description;
          payload.status = tr.status;
          payload.priority = tr.priority;
          payload.score_weight = tr.score_weight;
          payload.note = tr.note;
          payload.task_type = "main";
        } else {
          const gr = r as GoalImportRow;
          payload.period_type = gr.period_type;
          payload.period_start_date = gr.period_start_date;
          payload.category = gr.category;
          payload.title = gr.title;
          payload.status = gr.status;
        }

        if (r.action === "add") toAdd.push(payload);
        else if (r.action === "update" && r.existingId)
          toUpdate.push({ id: r.existingId, ...payload });
      }
    });

    try {
      const table = importKind === "tasks" ? "tasks" : "goals";
      if (toAdd.length > 0) {
        const { error } = await supabase.from(table).insert(toAdd);
        if (error) throw error;
        added = toAdd.length;
      }
      if (toUpdate.length > 0) {
        const { error } = await supabase.from(table).upsert(toUpdate);
        if (error) throw error;
        updated = toUpdate.length;
      }
    } catch (err: any) {
      errors++;
      alert("Lỗi ghi DB: " + err.message);
    }

    setSummary({ added, updated, skipped, invalid, errors });
    setIsProcessing(false);
    setStep(5);
  };

  const handleReset = () => {
    setWorkbook(null);
    setSheets([]);
    setSelectedSheet("");
    setImportKind("unsupported");
    setHeaders([]);
    setHeaderRowIndex(0);
    setMapping({});
    setExtraData({});
    setPreviewRows([]);
    setStep(1);
  };

  return (
    <div className="task-form-overlay">
      <div className="task-form-container" style={{ maxWidth: "900px" }}>
        <div className="task-form-header">
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Import Excel</h2>
            <p
              className="text-muted"
              style={{ margin: 0, fontSize: "0.875rem" }}
            >
              Nhập dữ liệu lịch trình, mục tiêu và bảng phụ một cách an toàn
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            X
          </Button>
        </div>

        <div className="task-form-body" style={{ padding: "1.5rem" }}>
          {step < 5 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "2rem",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: "var(--border-color)",
                  zIndex: 0,
                }}
              />
              {[
                { num: 1, icon: <UploadCloud size={16} />, label: "Tải file" },
                { num: 2, icon: <List size={16} />, label: "Chọn sheet" },
                { num: 3, icon: <Target size={16} />, label: "Map cột" },
                { num: 4, icon: <Eye size={16} />, label: "Xem trước" },
              ].map((s) => (
                <div
                  key={s.num}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background:
                        step >= s.num ? "var(--primary)" : "var(--bg-surface)",
                      color: step >= s.num ? "#fff" : "var(--text-muted)",
                      border: `2px solid ${
                        step >= s.num ? "var(--primary)" : "var(--border-color)"
                      }`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.3s",
                    }}
                  >
                    {s.icon}
                  </div>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: step === s.num ? 600 : 400,
                      color:
                        step >= s.num
                          ? "var(--text-primary)"
                          : "var(--text-muted)",
                    }}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {step === 1 && <ExcelUploadStep onUpload={handleUpload} />}

          {step === 2 && (
            <ExcelSheetSelectStep
              sheets={sheets}
              onSelect={handleSheetSelect}
            />
          )}

          {step === 3 && (
            <ExcelMappingStep
              headers={headers}
              importKind={importKind}
              mapping={mapping}
              setMapping={setMapping}
              headerRowIndex={headerRowIndex}
              setHeaderRowIndex={(idx) => {
                setHeaderRowIndex(idx);
                if (workbook && selectedSheet) {
                  const ws = workbook.Sheets[selectedSheet];
                  const rawData = utils.sheet_to_json(ws, {
                    header: 1,
                    raw: true,
                  }) as any[][];
                  if (rawData[idx]) {
                    setHeaders(rawData[idx].map((h) => String(h || "").trim()));
                  }
                }
              }}
              extraData={extraData}
              setExtraData={setExtraData}
              onGeneratePreview={handleGeneratePreview}
              isProcessing={isProcessing}
            />
          )}

          {step === 4 && (
            <ExcelPreviewStep
              importKind={importKind}
              previewRows={previewRows}
              updateRowAction={handleUpdateRowAction}
              executeImport={executeImport}
              isProcessing={isProcessing}
            />
          )}

          {step === 5 && (
            <ExcelResultStep
              summary={summary}
              onClose={() => {
                onClose();
                onSuccess();
              }}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </div>
  );
};
