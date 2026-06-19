import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { read, utils, WorkBook } from "xlsx";
import { Button } from "./ui/Button";
import {
  UploadCloud,
  FileSpreadsheet,
  Columns,
  Eye,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { format, isValid, parse, parseISO } from "date-fns";
import "../styles-taskform.css";

interface ExcelImportWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

// -------------------------------------
// UTILS
// -------------------------------------

const parseExcelDate = (val: any): string | null => {
  if (!val) return null;
  if (val instanceof Date) {
    if (isValid(val)) return format(val, "yyyy-MM-dd");
    return null;
  }
  if (typeof val === "number") {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    const utcDate = new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
    if (isValid(utcDate)) return format(utcDate, "yyyy-MM-dd");
    return null;
  }
  if (typeof val === "string") {
    const parsedISO = parseISO(val);
    if (isValid(parsedISO)) return format(parsedISO, "yyyy-MM-dd");

    const parsedDDMMYYYY = parse(val, "dd/MM/yyyy", new Date());
    if (isValid(parsedDDMMYYYY)) return format(parsedDDMMYYYY, "yyyy-MM-dd");
  }
  return null;
};

const normalizePriority = (val: string) => {
  const v = String(val).toLowerCase().trim();
  if (v.includes("cao")) return "high";
  if (v.includes("thấp")) return "low";
  return "medium";
};

const normalizeStatus = (val: string) => {
  const v = String(val).toLowerCase().trim();
  if (v.includes("hoàn thành") || v.includes("done") || v.includes("xong"))
    return "done";
  if (v.includes("đang làm") || v.includes("in_progress")) return "in_progress";
  if (v.includes("bỏ qua") || v.includes("skipped")) return "skipped";
  if (v.includes("dời") || v.includes("moved")) return "moved";
  return "todo";
};

const extractTime = (
  val: string,
): { start_time?: string; end_time?: string } => {
  if (!val || typeof val !== "string") return {};
  const v = val.trim();
  const match = v.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (match) {
    return { start_time: match[1], end_time: match[2] };
  }
  return {};
};

// -------------------------------------
// WIZARD COMPONENT
// -------------------------------------

export const ExcelImportWizard: React.FC<ExcelImportWizardProps> = ({
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // File State
  const [workbook, setWorkbook] = useState<WorkBook | null>(null);

  // Sheet State
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [importMode, setImportMode] = useState<
    "tasks" | "weekly_goals" | "monthly_goals"
  >("tasks");
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [sheetPreviewData, setSheetPreviewData] = useState<any[][]>([]);

  // Mapping State
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<string[]>([]);

  // Preview & Action State
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [existingData, setExistingData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Stats
  const [summary, setSummary] = useState({
    added: 0,
    updated: 0,
    skipped: 0,
    invalid: 0,
    errors: 0,
  });

  // -------------------------------------
  // Handlers
  // -------------------------------------

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = read(bstr, { type: "binary", cellDates: true });
        setWorkbook(wb);
        setSheets(wb.SheetNames);

        let initialSheet = wb.SheetNames[0];
        if (wb.SheetNames.includes("Lịch tháng 6"))
          initialSheet = "Lịch tháng 6";
        else if (wb.SheetNames.includes("Mục tiêu tuần"))
          initialSheet = "Mục tiêu tuần";
        else if (wb.SheetNames.includes("Mục tiêu tháng"))
          initialSheet = "Mục tiêu tháng";

        setSelectedSheet(initialSheet);
        updateSheetPreview(wb, initialSheet, 0);
        setStep(2);
      } catch (err) {
        alert("Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const updateSheetPreview = (
    wb: WorkBook,
    sheetName: string,
    hIndex: number,
  ) => {
    if (!wb || !sheetName) return;
    const ws = wb.Sheets[sheetName];
    const rawData = utils.sheet_to_json(ws, {
      header: 1,
      raw: true,
    }) as any[][];
    setSheetPreviewData(rawData.slice(0, 20));

    if (rawData[hIndex]) {
      setHeaders(rawData[hIndex].map((h) => String(h || "").trim()));
    }

    if (
      sheetName.toLowerCase().includes("tháng") &&
      sheetName.toLowerCase().includes("mục tiêu")
    ) {
      setImportMode("monthly_goals");
    } else if (
      sheetName.toLowerCase().includes("tuần") &&
      sheetName.toLowerCase().includes("mục tiêu")
    ) {
      setImportMode("weekly_goals");
    } else {
      setImportMode("tasks");
    }
  };

  const handleSheetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = e.target.value;
    setSelectedSheet(s);
    if (workbook) updateSheetPreview(workbook, s, headerRowIndex);
  };

  const handleHeaderRowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = Number(e.target.value);
    setHeaderRowIndex(idx);
    if (workbook) updateSheetPreview(workbook, selectedSheet, idx);
  };

  const autoMapColumns = () => {
    const newMap: Record<string, string> = {};
    const hLower = headers.map((h) => h.toLowerCase());

    if (importMode === "tasks") {
      hLower.forEach((h, i) => {
        if (h.includes("ngày dời") || h.includes("action")) return;
        if (h.includes("ngày") || h === "date") newMap["date"] = headers[i];
        else if (h.includes("task chính") || h === "title")
          newMap["title"] = headers[i];
        else if (h.includes("nhóm") || h === "category")
          newMap["category"] = headers[i];
        else if (h.includes("khung giờ") || h.includes("time"))
          newMap["time_range"] = headers[i];
        else if (h.includes("ưu tiên") || h === "priority")
          newMap["priority"] = headers[i];
        else if (h.includes("status") || h.includes("trạng thái"))
          newMap["status"] = headers[i];
        else if (h.includes("ghi chú/rule") || h.includes("description"))
          newMap["description"] = headers[i];
        else if (h.includes("output") || h.includes("thực tế"))
          newMap["note"] = headers[i];
        else if (h.includes("điểm") || h === "score")
          newMap["score_weight"] = headers[i];
      });
    } else if (importMode === "weekly_goals") {
      hLower.forEach((h, i) => {
        if (h.includes("tuần")) newMap["period_start_date"] = headers[i];
        else if (h.includes("tiêu chí") || h.includes("mục tiêu"))
          newMap["title"] = headers[i];
        else if (h.includes("nhóm")) newMap["category"] = headers[i];
        else if (h.includes("status")) newMap["status"] = headers[i];
      });
    } else if (importMode === "monthly_goals") {
      hLower.forEach((h, i) => {
        if (h.includes("tháng")) newMap["period_start_date"] = headers[i];
        else if (h.includes("mục tiêu") && !h.includes("checkbox"))
          newMap["title"] = headers[i];
        else if (h.includes("nhóm")) newMap["category"] = headers[i];
        else if (h.includes("status")) newMap["status"] = headers[i];
      });
    }
    setMapping(newMap);
  };

  useEffect(() => {
    if (step === 3) autoMapColumns();
  }, [step, headers, importMode]);

  const updateMapping = (dbField: string, excelHeader: string) => {
    setMapping((prev) => ({ ...prev, [dbField]: excelHeader }));
  };

  const generatePreview = async () => {
    if (!workbook || !selectedSheet || !user) return;
    setIsProcessing(true);

    try {
      if (importMode === "tasks") {
        const { data } = await supabase
          .from("tasks")
          .select("id, date, start_time, title, category")
          .eq("user_id", user.id);
        if (data) setExistingData(data);
      } else {
        const { data } = await supabase
          .from("goals")
          .select("id, period_type, period_start_date, title, category")
          .eq("user_id", user.id);
        if (data) setExistingData(data);
      }

      const ws = workbook.Sheets[selectedSheet];
      const rawJson = utils.sheet_to_json(ws, {
        range: headerRowIndex,
        defval: "",
      }) as any[];

      const rows = rawJson.map((row, idx) => {
        const parsed: any = {
          _originalRow: idx + headerRowIndex + 2,
          action: "skip",
          invalidReasons: [],
        };

        if (importMode === "tasks") {
          parsed.date = parseExcelDate(row[mapping["date"]]);
          parsed.title = String(row[mapping["title"]] || "").trim();
          parsed.category = String(row[mapping["category"]] || "").trim();
          parsed.status = normalizeStatus(row[mapping["status"]]);
          parsed.priority = normalizePriority(row[mapping["priority"]]);
          parsed.description = String(row[mapping["description"]] || "");
          parsed.note = String(row[mapping["note"]] || "");
          parsed.score_weight = Number(row[mapping["score_weight"]]) || 1;

          const timeData = extractTime(row[mapping["time_range"]]);
          parsed.start_time = timeData.start_time || "";
          parsed.end_time = timeData.end_time || "";

          if (!parsed.date) parsed.invalidReasons.push("Thiếu ngày");
          if (!parsed.title) parsed.invalidReasons.push("Thiếu tiêu đề");

          if (parsed.invalidReasons.length === 0) {
            const existing = existingData.find(
              (e) =>
                e.date === parsed.date &&
                e.start_time === parsed.start_time &&
                e.title === parsed.title &&
                e.category === parsed.category,
            );
            if (existing) {
              parsed.action = "update";
              parsed._dbId = existing.id;
            } else {
              parsed.action = "add";
            }
          }
        } else {
          const rawPeriod = row[mapping["period_start_date"]];
          parsed.period_start_date =
            parseExcelDate(rawPeriod) || String(rawPeriod || "").trim();
          parsed.title = String(row[mapping["title"]] || "").trim();
          parsed.category = String(row[mapping["category"]] || "").trim();
          parsed.status =
            normalizeStatus(row[mapping["status"]]) === "done"
              ? "done"
              : "active";
          parsed.period_type = importMode === "weekly_goals" ? "week" : "month";

          if (!parsed.title) parsed.invalidReasons.push("Thiếu mục tiêu");

          if (parsed.invalidReasons.length === 0) {
            const existing = existingData.find(
              (e) =>
                e.period_type === parsed.period_type &&
                e.period_start_date === parsed.period_start_date &&
                e.title === parsed.title,
            );
            if (existing) {
              parsed.action = "update";
              parsed._dbId = existing.id;
            } else {
              parsed.action = "add";
            }
          }
        }
        return parsed;
      });

      setPreviewRows(rows);
      setStep(4);
    } catch (err) {
      alert("Lỗi khi xử lý dữ liệu: " + err);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateRowAction = (index: number, action: string) => {
    const newRows = [...previewRows];
    newRows[index].action = action;
    setPreviewRows(newRows);
  };

  const bulkAction = (action: string) => {
    const newRows = previewRows.map((r) => {
      if (r.invalidReasons.length > 0) return r;
      if (action === "add_all" && r.action === "add") r.action = "add";
      else if (action === "update_all" && r._dbId) r.action = "update";
      else if (action === "skip_all") r.action = "skip";
      return r;
    });
    if (action === "reset") {
      newRows.forEach((r) => {
        if (r.invalidReasons.length > 0) r.action = "skip";
        else r.action = r._dbId ? "update" : "add";
      });
    } else if (["add_all", "update_all", "skip_all"].includes(action)) {
      const act = action.split("_")[0];
      newRows.forEach((r) => {
        if (r.invalidReasons.length === 0) r.action = act;
      });
    }
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
        const payload = { ...r };
        delete payload.action;
        delete payload.invalidReasons;
        delete payload._originalRow;
        delete payload._dbId;
        payload.user_id = user.id;

        if (r.action === "add") toAdd.push(payload);
        else if (r.action === "update")
          toUpdate.push({ id: r._dbId, ...payload });
      }
    });

    try {
      const table = importMode === "tasks" ? "tasks" : "goals";
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
      alert("Lỗi khi ghi dữ liệu vào Database: " + err.message);
    }

    setSummary({ added, updated, skipped, invalid, errors });
    setIsProcessing(false);
    setStep(5);
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1) as any);

  // -------------------------------------
  // Render
  // -------------------------------------

  return (
    <div className="task-form-overlay">
      <div className="task-form-container" style={{ maxWidth: "900px" }}>
        <div className="task-form-header">
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
              Import Excel
            </h2>
            <p
              className="text-muted"
              style={{ margin: 0, fontSize: "0.875rem", marginTop: "0.25rem" }}
            >
              Đưa dữ liệu vào Database an toàn
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            X
          </Button>
        </div>

        <div className="task-form-body" style={{ padding: "1.5rem" }}>
          <div
            className="stepper-container"
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
              {
                num: 2,
                icon: <FileSpreadsheet size={16} />,
                label: "Chọn sheet",
              },
              { num: 3, icon: <Columns size={16} />, label: "Map cột" },
              { num: 4, icon: <Eye size={16} />, label: "Xem trước" },
              { num: 5, icon: <CheckCircle2 size={16} />, label: "Xác nhận" },
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
                    border: `2px solid ${step >= s.num ? "var(--primary)" : "var(--border-color)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s",
                  }}
                >
                  {s.icon}
                </div>
                <span
                  className="sm-block"
                  style={{
                    display: "none",
                    fontSize: "0.7rem",
                    fontWeight: step >= s.num ? 600 : 400,
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

          {step === 1 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "3rem",
                border: "2px dashed var(--border-color)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-panel)",
              }}
            >
              <UploadCloud
                size={48}
                style={{ color: "var(--text-muted)", marginBottom: "1rem" }}
              />
              <h3 style={{ margin: "0 0 1rem 0" }}>Tải file Excel (.xlsx)</h3>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                style={{ display: "none" }}
                id="excel-upload"
              />
              <label
                htmlFor="excel-upload"
                className="ui-btn ui-btn-primary"
                style={{ cursor: "pointer" }}
              >
                Chọn file từ máy
              </label>
            </div>
          )}

          {step === 2 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div
                className="form-group"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label>Chọn Sheet</label>
                  <select
                    className="form-input"
                    value={selectedSheet}
                    onChange={handleSheetChange}
                  >
                    {sheets.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Chế độ Import</label>
                  <select
                    className="form-input"
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as any)}
                  >
                    <option value="tasks">Task (Lịch trình)</option>
                    <option value="weekly_goals">Mục tiêu Tuần</option>
                    <option value="monthly_goals">Mục tiêu Tháng</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Dòng chứa tiêu đề (từ 0)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  style={{ width: "100px" }}
                  value={headerRowIndex}
                  onChange={handleHeaderRowChange}
                />
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
                    borderCollapse: "collapse",
                    fontSize: "0.85rem",
                  }}
                >
                  <thead>
                    <tr style={{ background: "var(--bg-panel)" }}>
                      {headers.map((h, i) => (
                        <th
                          key={i}
                          style={{
                            padding: "0.5rem",
                            borderBottom: "1px solid var(--border-color)",
                            textAlign: "left",
                          }}
                        >
                          {h || `Col ${i}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheetPreviewData
                      .slice(headerRowIndex + 1, headerRowIndex + 6)
                      .map((row, rIdx) => (
                        <tr key={rIdx}>
                          {headers.map((_, cIdx) => (
                            <td
                              key={cIdx}
                              style={{
                                padding: "0.5rem",
                                borderBottom: "1px solid var(--border-color)",
                              }}
                            >
                              {row[cIdx] !== undefined ? String(row[cIdx]) : ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 3 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <p style={{ margin: 0, color: "var(--text-secondary)" }}>
                Ghép cột trong Database với cột trong Excel. Hãy để trống nếu
                cột không có.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "1rem",
                }}
              >
                {(importMode === "tasks"
                  ? [
                      { id: "date", label: "Ngày (date) *" },
                      { id: "title", label: "Task chính (title) *" },
                      { id: "category", label: "Nhóm (category)" },
                      {
                        id: "time_range",
                        label: "Khung giờ (start_time/end_time)",
                      },
                      { id: "priority", label: "Ưu tiên (priority)" },
                      { id: "status", label: "Trạng thái (status)" },
                      {
                        id: "description",
                        label: "Ghi chú/Rule (description)",
                      },
                      { id: "note", label: "Thực tế/Output (note)" },
                      { id: "score_weight", label: "Điểm (score)" },
                    ]
                  : [
                      {
                        id: "period_start_date",
                        label: "Ngày bắt đầu kỳ (period_start_date) *",
                      },
                      { id: "title", label: "Tên mục tiêu (title) *" },
                      { id: "category", label: "Nhóm (category)" },
                      { id: "status", label: "Trạng thái (status)" },
                    ]
                ).map((field) => (
                  <div key={field.id} className="form-group">
                    <label>{field.label}</label>
                    <select
                      className="form-input"
                      value={mapping[field.id] || ""}
                      onChange={(e) => updateMapping(field.id, e.target.value)}
                    >
                      <option value="">-- Không có --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => bulkAction("add_all")}
                >
                  Add All
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => bulkAction("update_all")}
                >
                  Update All
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => bulkAction("skip_all")}
                >
                  Skip All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => bulkAction("reset")}
                >
                  Reset Default
                </Button>
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
                    borderCollapse: "collapse",
                    fontSize: "0.85rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  <thead>
                    <tr style={{ background: "var(--bg-panel)" }}>
                      <th
                        style={{
                          padding: "0.5rem",
                          borderBottom: "1px solid var(--border-color)",
                          textAlign: "left",
                        }}
                      >
                        Dòng
                      </th>
                      <th
                        style={{
                          padding: "0.5rem",
                          borderBottom: "1px solid var(--border-color)",
                          textAlign: "left",
                        }}
                      >
                        {importMode === "tasks" ? "Ngày" : "Kỳ"}
                      </th>
                      <th
                        style={{
                          padding: "0.5rem",
                          borderBottom: "1px solid var(--border-color)",
                          textAlign: "left",
                        }}
                      >
                        Tên
                      </th>
                      <th
                        style={{
                          padding: "0.5rem",
                          borderBottom: "1px solid var(--border-color)",
                          textAlign: "left",
                        }}
                      >
                        Trạng thái
                      </th>
                      <th
                        style={{
                          padding: "0.5rem",
                          borderBottom: "1px solid var(--border-color)",
                          textAlign: "left",
                        }}
                      >
                        Lỗi
                      </th>
                      <th
                        style={{
                          padding: "0.5rem",
                          borderBottom: "1px solid var(--border-color)",
                          textAlign: "left",
                        }}
                      >
                        Hành động
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, idx) => (
                      <tr
                        key={idx}
                        style={{
                          background:
                            r.invalidReasons.length > 0
                              ? "rgba(239, 68, 68, 0.1)"
                              : "transparent",
                        }}
                      >
                        <td
                          style={{
                            padding: "0.5rem",
                            borderBottom: "1px solid var(--border-color)",
                          }}
                        >
                          {r._originalRow}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem",
                            borderBottom: "1px solid var(--border-color)",
                          }}
                        >
                          {importMode === "tasks"
                            ? r.date
                            : r.period_start_date}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem",
                            borderBottom: "1px solid var(--border-color)",
                          }}
                        >
                          {r.title}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem",
                            borderBottom: "1px solid var(--border-color)",
                          }}
                        >
                          {r.status}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem",
                            borderBottom: "1px solid var(--border-color)",
                            color: "var(--danger)",
                          }}
                        >
                          {r.invalidReasons.join(", ")}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem",
                            borderBottom: "1px solid var(--border-color)",
                          }}
                        >
                          <select
                            className="form-input"
                            style={{ padding: "0.25rem", width: "auto" }}
                            value={r.action}
                            onChange={(e) =>
                              updateRowAction(idx, e.target.value)
                            }
                            disabled={r.invalidReasons.length > 0}
                          >
                            <option value="add">Add New</option>
                            <option value="update">Update</option>
                            <option value="skip">Skip</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 5 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem",
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
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Đã thêm mới
                  </div>
                </div>
                <div
                  style={{
                    background: "var(--bg-panel)",
                    padding: "1rem",
                    borderRadius: "var(--radius-md)",
                    textAlign: "center",
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
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Đã cập nhật
                  </div>
                </div>
                <div
                  style={{
                    background: "var(--bg-panel)",
                    padding: "1rem",
                    borderRadius: "var(--radius-md)",
                    textAlign: "center",
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
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Bỏ qua
                  </div>
                </div>
                <div
                  style={{
                    background: "var(--bg-panel)",
                    padding: "1rem",
                    borderRadius: "var(--radius-md)",
                    textAlign: "center",
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
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
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
            </div>
          )}
        </div>

        <div className="task-form-actions">
          {step === 1 ? (
            <Button variant="ghost" onClick={onClose}>
              Đóng
            </Button>
          ) : step === 5 ? (
            <Button variant="primary" onClick={onSuccess}>
              Hoàn thành
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={isProcessing}
              style={{ gap: "0.5rem" }}
            >
              <ArrowLeft size={16} /> Quay lại
            </Button>
          )}

          {step === 2 && (
            <Button
              variant="primary"
              onClick={() => setStep(3)}
              style={{ gap: "0.5rem" }}
            >
              Tiếp tục <ArrowRight size={16} />
            </Button>
          )}
          {step === 3 && (
            <Button
              variant="primary"
              onClick={generatePreview}
              disabled={isProcessing}
              style={{ gap: "0.5rem" }}
            >
              {isProcessing ? "Đang xử lý..." : "Xem trước"}{" "}
              <ArrowRight size={16} />
            </Button>
          )}
          {step === 4 && (
            <Button
              variant="primary"
              onClick={executeImport}
              disabled={isProcessing}
            >
              {isProcessing ? "Đang ghi DB..." : "Xác nhận Import DB"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
