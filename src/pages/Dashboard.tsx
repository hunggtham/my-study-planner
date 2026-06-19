import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { Task } from "../types";
import { ProgressCard } from "../components/dashboard/ProgressCard";
import { CategoryProgress } from "../components/dashboard/CategoryProgress";
import { QuickActions } from "../components/dashboard/QuickActions";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { vi } from "date-fns/locale";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Target,
  Clock,
  CalendarDays,
  BarChart2,
} from "lucide-react";
import { GoalsPanel } from "../components/GoalsPanel";
import { Card, CardContent } from "../components/ui/Card";

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id);
      if (!error && data) {
        setTasks(data);
      }
      setLoading(false);
    };
    fetchTasks();
  }, [user]);

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const weekStartStr = format(
    startOfWeek(now, { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );
  const weekEndStr = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const monthStartStr = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEndStr = format(endOfMonth(now), "yyyy-MM-dd");

  const todayTasks = tasks.filter((t) => t.date === todayStr);
  const weekTasks = tasks.filter(
    (t) => t.date >= weekStartStr && t.date <= weekEndStr,
  );
  const monthTasks = tasks.filter(
    (t) => t.date >= monthStartStr && t.date <= monthEndStr,
  );
  const delayedTasks = tasks.filter(
    (t) => t.status === "moved" || t.moved_count > 0,
  );

  const getDoneCount = (list: Task[]) =>
    list.filter((t) => t.status === "done").length;

  return (
    <div className="page-container" style={{ padding: "1.5rem" }}>
      <header
        className="page-header"
        style={{
          flexDirection: "column",
          alignItems: "stretch",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.75rem",
                margin: "0 0 0.5rem 0",
                fontWeight: 700,
              }}
            >
              Dashboard
            </h1>
            <p
              className="text-muted"
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <CalendarDays size={16} />
              {format(now, "EEEE, dd 'tháng' MM, yyyy", { locale: vi })}
            </p>
          </div>
          <QuickActions />
        </div>
      </header>

      {loading ? (
        <div
          className="loading-state"
          style={{ padding: "3rem", textAlign: "center" }}
        >
          Đang tải dữ liệu...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Top Summary Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1.25rem",
            }}
          >
            <ProgressCard
              title="Hôm nay"
              completed={getDoneCount(todayTasks)}
              total={todayTasks.length}
              intent="primary"
            />
            <ProgressCard
              title="Tuần này"
              completed={getDoneCount(weekTasks)}
              total={weekTasks.length}
              intent="success"
              subtitle={`${format(new Date(weekStartStr), "dd/MM")} - ${format(new Date(weekEndStr), "dd/MM")}`}
            />
            <ProgressCard
              title="Tháng này"
              completed={getDoneCount(monthTasks)}
              total={monthTasks.length}
              intent="warning"
            />

            <Card
              style={{
                background:
                  delayedTasks.length > 0
                    ? "var(--warning-bg)"
                    : "var(--bg-surface)",
                border:
                  delayedTasks.length > 0
                    ? "1px solid var(--warning)"
                    : "1px solid var(--border-color)",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                  color:
                    delayedTasks.length > 0
                      ? "var(--warning)"
                      : "var(--text-secondary)",
                }}
              >
                <AlertTriangle size={18} />
                <span style={{ fontWeight: 600 }}>Cần chú ý</span>
              </div>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  color:
                    delayedTasks.length > 0
                      ? "var(--warning)"
                      : "var(--text-primary)",
                  marginBottom: "0.5rem",
                }}
              >
                {delayedTasks.length}
              </div>
              {delayedTasks.length > 0 ? (
                <Link
                  to="/attention"
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--warning)",
                    textDecoration: "underline",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  Xử lý task bị dời <ArrowRight size={14} />
                </Link>
              ) : (
                <span
                  style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}
                >
                  Không có task tồn đọng
                </span>
              )}
            </Card>
          </div>

          {/* Main Grid Area */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {/* Left Column: Goals */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <Card>
                <div
                  style={{
                    padding: "1.25rem 1.5rem",
                    borderBottom: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Target size={18} className="text-primary" />
                  <h3
                    style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}
                  >
                    Mục tiêu tuần này
                  </h3>
                </div>
                <CardContent style={{ padding: "1.5rem" }}>
                  <GoalsPanel
                    periodType="week"
                    periodStartDate={weekStartStr}
                  />
                </CardContent>
              </Card>

              <Card>
                <div
                  style={{
                    padding: "1.25rem 1.5rem",
                    borderBottom: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Target size={18} className="text-warning" />
                  <h3
                    style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}
                  >
                    Mục tiêu tháng này
                  </h3>
                </div>
                <CardContent style={{ padding: "1.5rem" }}>
                  <GoalsPanel
                    periodType="month"
                    periodStartDate={monthStartStr}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Progress & Overviews */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <Card>
                <div
                  style={{
                    padding: "1.25rem 1.5rem",
                    borderBottom: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <BarChart2 size={18} className="text-success" />
                  <h3
                    style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}
                  >
                    Tiến độ theo môn học (Tháng)
                  </h3>
                </div>
                <CardContent style={{ padding: "1.5rem" }}>
                  <CategoryProgress tasks={monthTasks} />
                </CardContent>
              </Card>

              <Card>
                <div
                  style={{
                    padding: "1.25rem 1.5rem",
                    borderBottom: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Clock size={18} className="text-primary" />
                    <h3
                      style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}
                    >
                      Task hôm nay
                    </h3>
                  </div>
                  <Link
                    to="/schedule"
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--primary)",
                      textDecoration: "none",
                    }}
                  >
                    Xem chi tiết
                  </Link>
                </div>
                <CardContent style={{ padding: "0" }}>
                  {todayTasks.length === 0 ? (
                    <div
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "var(--text-muted)",
                      }}
                    >
                      Trống. Hãy thêm task cho hôm nay!
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {todayTasks.slice(0, 5).map((t, idx) => (
                        <div
                          key={t.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            padding: "1rem 1.5rem",
                            borderBottom:
                              idx < Math.min(todayTasks.length, 5) - 1
                                ? "1px solid var(--border-color)"
                                : "none",
                          }}
                        >
                          <div
                            style={{
                              width: "12px",
                              height: "12px",
                              borderRadius: "50%",
                              background:
                                t.status === "done"
                                  ? "var(--success)"
                                  : "var(--warning)",
                            }}
                          />
                          <div
                            style={{
                              flex: 1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              textDecoration:
                                t.status === "done" ? "line-through" : "none",
                              color:
                                t.status === "done"
                                  ? "var(--text-muted)"
                                  : "var(--text-primary)",
                            }}
                          >
                            {t.title}
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-secondary)",
                              background: "var(--bg-surface)",
                              padding: "0.25rem 0.5rem",
                              borderRadius: "var(--radius-sm)",
                            }}
                          >
                            {t.category || "Chung"}
                          </div>
                        </div>
                      ))}
                      {todayTasks.length > 5 && (
                        <div
                          style={{
                            padding: "1rem",
                            textAlign: "center",
                            borderTop: "1px solid var(--border-color)",
                          }}
                        >
                          <Link
                            to="/schedule"
                            style={{
                              fontSize: "0.875rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            + {todayTasks.length - 5} task nữa
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
