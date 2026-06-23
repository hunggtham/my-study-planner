import React from "react";
import { format, addDays, subDays } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/Button";

interface ScheduleDateNavigatorProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

export const ScheduleDateNavigator: React.FC<ScheduleDateNavigatorProps> = ({
  selectedDate,
  setSelectedDate,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "0.5rem",
        background: "var(--bg-surface)",
        padding: "0.5rem",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-color)",
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Quay lại"
        onClick={() =>
          setSelectedDate(
            format(subDays(new Date(selectedDate), 1), "yyyy-MM-dd"),
          )
        }
        title="Ngày trước"
      >
        <ChevronLeft size={18} />
      </Button>

      <input
        type="date"
        value={selectedDate}
        onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
        style={{
          flex: 1,
          minWidth: "130px",
          background: "transparent",
          color: "var(--text-primary)",
          border: "none",
          outline: "none",
          padding: "0.5rem",
          cursor: "pointer",
          fontWeight: 600,
        }}
      />

      <Button
        variant="secondary"
        size="sm"
        onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
      >
        Hôm nay
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Tiếp theo"
        onClick={() =>
          setSelectedDate(
            format(addDays(new Date(selectedDate), 1), "yyyy-MM-dd"),
          )
        }
        title="Ngày sau"
      >
        <ChevronRight size={18} />
      </Button>

      <span
        style={{
          marginLeft: "0.5rem",
          color: "var(--text-secondary)",
          fontSize: "0.875rem",
          minWidth: "80px",
        }}
      >
        {format(new Date(selectedDate), "EEEE", { locale: vi })}
      </span>
    </div>
  );
};
