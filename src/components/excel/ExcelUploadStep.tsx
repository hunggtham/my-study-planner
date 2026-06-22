import React from "react";
import { UploadCloud } from "lucide-react";

interface ExcelUploadStepProps {
  onUpload: (file: File) => void;
}

export const ExcelUploadStep: React.FC<ExcelUploadStepProps> = ({
  onUpload,
}) => {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
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
        textAlign: "center",
      }}
    >
      <UploadCloud
        size={48}
        style={{ color: "var(--text-muted)", marginBottom: "1rem" }}
      />
      <h3 style={{ margin: "0 0 0.5rem 0" }}>Tải file Excel (.xlsx)</h3>
      <p
        style={{
          margin: "0 0 1.5rem 0",
          color: "var(--text-secondary)",
          fontSize: "0.875rem",
        }}
      >
        Chọn file để phân tích workbook và các sheet có thể import
      </p>

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
        Chọn file Excel
      </label>
    </div>
  );
};
