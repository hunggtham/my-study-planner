import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { read, utils, WorkBook } from "xlsx";
import { Button } from "./ui/Button";
import { UploadCloud, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { format, isValid, parse, parseISO } from "date-fns";
import "../styles-taskform.css";

interface ExcelImportWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export type ImportAction = "add" | "update" | "skip";

export type TaskImportRow = {
  rowNumber: number;
  date: string;
  start_time: string;
  end_time: string;
  category: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done" | "skipped" | "moved";
  priority: "high" | "medium" | "low";
  score_weight: number;
  note: string;
  action: ImportAction;
  existingId?: string;
  invalidReasons: string[];
};

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

const normalizeStatus = (
  val: string,
): "todo" | "in_progress" | "done" | "skipped" | "moved" => {
  const v = String(val).toLowerCase().trim();
  if (v.includes("hoàn thành") || v.includes("done") || v.includes("☑"))
    return "done";
  if (v.includes("đang làm") || v.includes("in_progress")) return "in_progress";
  if (v.includes("bỏ qua") || v.includes("skipped")) return "skipped";
  if (v.includes("dời") || v.includes("moved")) return "moved";
  return "todo";
};

const normalizePriority = (val: string): "high" | "medium" | "low" => {
  const v = String(val).toLowerCase().trim();
  if (v.includes("cao") || v.includes("high")) return "high";
  if (v.includes("thấp") || v.includes("low")) return "low";
  return "medium";
};

const extractTime = (val: string): { start_time: string; end_time: string } => {
  if (!val || typeof val !== "string") return { start_time: "", end_time: "" };
  const v = val.trim();
  const match = v.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (match) {
    return { start_time: match[1], end_time: match[2] };
  }
  return { start_time: "", end_time: "" };
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

  const [workbook, setWorkbook] = useState<WorkBook | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);

  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<TaskImportRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [summary, setSummary] = useState({
    added: 0,
    updated: 0,
    skipped: 0,
    invalid: 0,
    errors: 0,
  });

  // Step 1
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = read(bstr, { type: "binary", cellDates: true });
        setWorkbook(wb);
        setSheets(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          setSelectedSheet(wb.SheetNames[0]);
          updateSheetPreview(wb, wb.SheetNames[0], 0);
        }
        setStep(2);
      } catch (err) {
        alert("Lỗi đọc file Excel.");
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

    if (rawData[hIndex]) {
      setHeaders(rawData[hIndex].map((h) => String(h || "").trim()));
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

  // Step 3
  useEffect(() => {
    if (step === 3) {
      const newMap: Record<string, string> = {};
      const hLower = headers.map((h) => h.toLowerCase());

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
      setMapping(newMap);
    }
  }, [step, headers]);

  const updateMapping = (dbField: string, excelHeader: string) => {
    setMapping((prev) => ({ ...prev, [dbField]: excelHeader }));
  };

  // Step 4
  const generatePreview = async () => {
    if (!workbook || !selectedSheet || !user) return;
    setIsProcessing(true);

    try {
      const { data: existingData } = await supabase
        .from("tasks")
        .select("id, date, start_time, title, category")
        .eq("user_id", user.id);

      const ws = workbook.Sheets[selectedSheet];
      const rawJson = utils.sheet_to_json(ws, {
        range: headerRowIndex,
        defval: "",
      }) as any[];

      const rows: TaskImportRow[] = rawJson.map((row, idx) => {
        const dateRaw = row[mapping["date"]];
        const titleRaw = row[mapping["title"]];
        const parsedDate = parseExcelDate(dateRaw);
        const parsedTitle = String(titleRaw || "").trim();
        const parsedCategory = String(row[mapping["category"]] || "").trim();
        const timeData = extractTime(row[mapping["time_range"]] || "");

        const parsed: TaskImportRow = {
          rowNumber: idx + headerRowIndex + 2,
          date: parsedDate || "",
          title: parsedTitle,
          category: parsedCategory,
          start_time: timeData.start_time,
          end_time: timeData.end_time,
          status: normalizeStatus(row[mapping["status"]] || ""),
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
      setStep(4);
    } catch (err: any) {
      alert("Lỗi xem trước: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateRowAction = (index: number, action: ImportAction) => {
    const newRows = [...previewRows];
    newRows[index].action = action;
    setPreviewRows(newRows);
  };

  // Step 5
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
        const payload = {
          user_id: user.id,
          date: r.date,
          start_time: r.start_time,
          end_time: r.end_time,
          category: r.category,
          title: r.title,
          description: r.description,
          status: r.status,
          priority: r.priority,
          score_weight: r.score_weight,
          note: r.note,
        };

        if (r.action === "add") toAdd.push(payload);
        else if (r.action === "update" && r.existingId)
          toUpdate.push({ id: r.existingId, ...payload });
      }
    });

    try {
      if (toAdd.length > 0) {
        const { error } = await supabase.from("tasks").insert(toAdd);
        if (error) throw error;
        added = toAdd.length;
      }
      if (toUpdate.length > 0) {
        const { error } = await supabase.from("tasks").upsert(toUpdate);
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

  return (
    <div className="task-form-overlay">
      <div className="task-form-container" style={{ maxWidth: "900px" }}>
        <div className="task-form-header">
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Import Excel MVP</h2>
            <p className="text-muted" style={{ margin: 0 }}>
              Nhập lịch trình an toàn
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            X
          </Button>
        </div>

        <div className="task-form-body" style={{ padding: "1.5rem" }}>
          {step === 1 && (
            <div className="form-group">
              <UploadCloud size={48} />
              <h3>Tải file Excel (.xlsx)</h3>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {step === 2 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div className="form-group">
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
              <div className="form-group">
                <label>Dòng chứa tiêu đề (từ 0)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={headerRowIndex}
                  onChange={handleHeaderRowChange}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              {[
                { id: "date", label: "Ngày (date) *" },
                { id: "title", label: "Task chính (title) *" },
                { id: "category", label: "Nhóm (category)" },
                { id: "time_range", label: "Khung giờ (time)" },
                { id: "priority", label: "Ưu tiên (priority)" },
                { id: "status", label: "Trạng thái (status)" },
                { id: "description", label: "Ghi chú/Rule (description)" },
                { id: "note", label: "Output (note)" },
                { id: "score_weight", label: "Điểm (score)" },
              ].map((field) => (
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
          )}

          {step === 4 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", textAlign: "left" }}>
                <thead>
                  <tr>
                    <th>Dòng</th>
                    <th>Ngày</th>
                    <th>Tên</th>
                    <th>Trạng thái</th>
                    <th>Lỗi</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr
                      key={i}
                      style={{
                        background:
                          r.invalidReasons.length > 0
                            ? "#fee2e2"
                            : "transparent",
                      }}
                    >
                      <td>{r.rowNumber}</td>
                      <td>{r.date}</td>
                      <td>{r.title}</td>
                      <td>{r.status}</td>
                      <td style={{ color: "red" }}>
                        {r.invalidReasons.join(", ")}
                      </td>
                      <td>
                        <select
                          value={r.action}
                          onChange={(e) =>
                            updateRowAction(i, e.target.value as ImportAction)
                          }
                          disabled={r.invalidReasons.length > 0}
                        >
                          <option value="add">Add</option>
                          <option value="update">Update</option>
                          <option value="skip">Skip</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {step === 5 && (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <CheckCircle2 size={48} color="green" />
              <h3>Hoàn tất Import</h3>
              <p>Thêm mới: {summary.added}</p>
              <p>Cập nhật: {summary.updated}</p>
              <p>Bỏ qua: {summary.skipped}</p>
              <p>Lỗi/Không hợp lệ: {summary.invalid + summary.errors}</p>
            </div>
          )}
        </div>

        <div className="task-form-actions">
          {step > 1 && step < 5 && (
            <Button
              variant="secondary"
              onClick={() => setStep((s) => (s - 1) as any)}
              disabled={isProcessing}
            >
              <ArrowLeft size={16} /> Quay lại
            </Button>
          )}
          {step === 2 && (
            <Button variant="primary" onClick={() => setStep(3)}>
              Tiếp tục <ArrowRight size={16} />
            </Button>
          )}
          {step === 3 && (
            <Button
              variant="primary"
              onClick={generatePreview}
              disabled={isProcessing}
            >
              Xem trước <ArrowRight size={16} />
            </Button>
          )}
          {step === 4 && (
            <Button
              variant="primary"
              onClick={executeImport}
              disabled={isProcessing}
            >
              Xác nhận Import DB
            </Button>
          )}
          {step === 5 && (
            <Button variant="primary" onClick={onSuccess}>
              Xong
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
