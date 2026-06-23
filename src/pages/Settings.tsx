import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { ExcelImportWizard } from "../components/excel/ExcelImportWizard";
import { format } from "date-fns";

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [shareSlug, setShareSlug] = useState("");
  const [hasShare, setHasShare] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [dbCheckResult, setDbCheckResult] = useState<any>(null);
  const [expandedDups, setExpandedDups] = useState(false);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [autoLogin, setAutoLogin] = useState(() => {
    return localStorage.getItem("study-planner-auto-login") !== "false";
  });

  const toggleAutoLogin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAutoLogin(checked);
    localStorage.setItem(
      "study-planner-auto-login",
      checked ? "true" : "false",
    );
  };

  const appOrigin =
    import.meta.env.VITE_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    window.location.origin;

  const checkDb = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: tasks, error: taskErr } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id);
      if (taskErr) throw taskErr;

      const { count: goalsCount } = await supabase
        .from("goals")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const total = tasks?.length || 0;
      const done = tasks?.filter((t) => t.status === "done").length || 0;
      const todo = tasks?.filter((t) => t.status === "todo").length || 0;
      const inProgress =
        tasks?.filter((t) => t.status === "in_progress").length || 0;

      const missingCategory =
        tasks?.filter((t) => !t.category || t.category.trim() === "").length ||
        0;
      const missingTitle =
        tasks?.filter((t) => !t.title || t.title.trim() === "").length || 0;
      const invalidDate =
        tasks?.filter((t) => !t.date || t.date.trim() === "").length || 0;
      const optionalTasks =
        tasks?.filter((t) => t.task_type === "optional").length || 0;

      // check duplicates
      const sigs = new Map<string, number>();
      let duplicates = 0;
      tasks?.forEach((t) => {
        const sig = `${t.date} | ${t.start_time || "Cả ngày"} | ${t.title} | ${t.category || "Chung"}`;
        if (sigs.has(sig)) {
          sigs.set(sig, sigs.get(sig)! + 1);
          duplicates++;
        } else {
          sigs.set(sig, 1);
        }
      });

      const duplicateGroups = Array.from(sigs.entries())
        .filter(([, count]) => count > 1)
        .map(([sig, count]) => ({ sig, count }));

      setDbCheckResult({
        total,
        goals: goalsCount || 0,
        done,
        todo,
        inProgress,
        missingCategory,
        missingTitle,
        invalidDate,
        optionalTasks,
        duplicates,
        duplicateGroups,
      });
    } catch (err: any) {
      showToast("Lỗi khi kiểm tra DB: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const cleanupOptionalTasks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { count, error: countErr } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("task_type", "optional");

      if (countErr) throw countErr;

      if (!count || count === 0) {
        showToast("Không tìm thấy task tự chọn nào cần chuẩn hóa.", "info");
        setLoading(false);
        return;
      }

      const { error: updateErr } = await supabase
        .from("tasks")
        .update({ task_type: "main" })
        .eq("user_id", user.id)
        .eq("task_type", "optional");

      if (updateErr) throw updateErr;

      showToast(`Đã chuẩn hóa thành công ${count} task tự chọn.`, "success");
      checkDb();
    } catch (err: any) {
      showToast("Lỗi khi chuẩn hóa: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const fillMissingCategory = async () => {
    if (!user) return;
    if (!window.confirm("Gán nhóm 'General' cho tất cả task chưa có danh mục?"))
      return;

    setLoading(true);
    try {
      const { data, error: selectErr } = await supabase
        .from("tasks")
        .select("id")
        .eq("user_id", user.id)
        .or("category.is.null,category.eq.");

      if (selectErr) throw selectErr;

      if (!data || data.length === 0) {
        showToast("Không có task nào thiếu danh mục.", "info");
        setLoading(false);
        return;
      }

      const { error: updateErr } = await supabase
        .from("tasks")
        .update({ category: "General" })
        .in(
          "id",
          data.map((d) => d.id),
        )
        .eq("user_id", user.id);

      if (updateErr) throw updateErr;

      showToast(`Đã gán nhóm mặc định cho ${data.length} task.`, "success");
      checkDb();
    } catch (err: any) {
      showToast("Lỗi khi gán nhóm mặc định: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchShare = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("public_shares")
        .select("slug, is_active")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setShareSlug(data.slug);
        setHasShare(true);
        setIsActive(data.is_active);
      }
    };
    fetchShare();
  }, [user]);

  const importLocalData = async () => {
    if (!user) return;
    const ok = window.confirm(
      "Quá trình này sẽ lấy dữ liệu từ bản demo cũ (localStorage) và đẩy lên mây. Bạn chắc chắn chứ?",
    );
    if (!ok) return;

    setLoading(true);
    try {
      const raw = localStorage.getItem("study-planner-demo-v1");
      if (!raw) {
        showToast("Không tìm thấy dữ liệu cũ trong localStorage.", "info");
        setLoading(false);
        return;
      }

      const data = JSON.parse(raw);
      if (!data.tasks || !Array.isArray(data.tasks)) {
        showToast("Dữ liệu không hợp lệ.", "error");
        setLoading(false);
        return;
      }

      const { data: existingTasks } = await supabase
        .from("tasks")
        .select("date, start_time, title")
        .eq("user_id", user.id);

      let skippedCount = 0;
      let invalidCount = 0;

      const tasksToInsert = data.tasks
        .filter((t: any) => {
          if (!t.date || !t.title || !t.category) {
            invalidCount++;
            return false;
          }
          const timeText = t.time || "";
          const [startTime = ""] = timeText.split(" - ");

          // duplicate prevention based on date + start_time + title
          const isDup = existingTasks?.some(
            (et) =>
              et.date === t.date &&
              et.start_time === startTime &&
              et.title === t.title,
          );
          if (isDup) skippedCount++;
          return !isDup;
        })
        .map((t: any) => {
          let mappedStatus = t.status;
          if (
            !["todo", "in_progress", "done", "skipped", "moved"].includes(
              mappedStatus,
            )
          ) {
            mappedStatus = "todo";
            if (t.status === "doing") mappedStatus = "in_progress";
          }

          let mappedPriority = "medium";
          if (t.priority === "Cao") mappedPriority = "high";
          else if (t.priority === "Thấp") mappedPriority = "low";

          let mappedType = t.type || "main";
          if (
            ![
              "main",
              "secondary",
              "exercise",
              "review",
              "class",
              "optional",
            ].includes(mappedType)
          ) {
            mappedType = "main";
            if (t.type === "health") mappedType = "exercise";
          }

          const timeText = t.time || "";
          const [startTime = "", endTime = ""] = timeText.split(" - ");

          return {
            user_id: user.id,
            date: t.date,
            start_time: startTime,
            end_time: endTime,
            category: t.category,
            title: t.title,
            description: t.detail || "",
            task_type: mappedType,
            status: mappedStatus,
            priority: mappedPriority,
            score_weight: t.score || 1,
            note: t.note || "",
          };
        });

      if (tasksToInsert.length === 0) {
        showToast(
          `Không có dữ liệu mới nào để đồng bộ. Đã bỏ qua ${skippedCount} trùng lặp, ${invalidCount} lỗi.`,
          "info",
        );
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("tasks").insert(tasksToInsert);
      if (error) throw error;

      showToast(
        `Đã đồng bộ ${tasksToInsert.length} task lên đám mây.`,
        "success",
      );
    } catch (err: any) {
      console.error(err);
      showToast("Có lỗi xảy ra: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      if (error) throw error;

      if (!data || data.length === 0) {
        showToast("Không có dữ liệu để xuất.", "info");
        return;
      }

      const { utils, writeFile } = await import("xlsx");

      const exportData = data.map((t) => ({
        Ngày: t.date,
        Thứ: format(new Date(t.date), "EEEE"),
        "Khung giờ": `${t.start_time || ""} - ${t.end_time || ""}`,
        Nhóm: t.category,
        "Task chính": t.title,
        "Ghi chú/Rule": t.description,
        "Output tối thiểu": t.note,
        "Ưu tiên": t.priority,
        Status: t.status,
        Điểm: t.score_weight,
        Loại: t.task_type,
      }));

      const ws = utils.json_to_sheet(exportData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Tasks");
      writeFile(
        wb,
        `study_planner_tasks_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
    } catch (err: any) {
      showToast("Lỗi xuất Excel: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { read, utils } = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = utils.sheet_to_json(ws);

      if (!data || data.length === 0) {
        showToast("File không có dữ liệu", "error");
        return;
      }

      setImportPreview(data);
    } catch (err: any) {
      showToast("Lỗi đọc file: " + err.message, "error");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmImport = async () => {
    if (!user || !importPreview) return;
    setLoading(true);
    try {
      const tasksToInsert = importPreview.map((row) => ({
        user_id: user.id,
        date: row["Ngày"] || new Date().toISOString().split("T")[0],
        start_time: row["Bắt đầu"] || "",
        end_time: row["Kết thúc"] || "",
        title: row["Tiêu đề"] || "Không có tiêu đề",
        category: row["Danh mục"] || "Chung",
        status: row["Trạng thái"] || "todo",
        priority: row["Độ ưu tiên"] || "medium",
        task_type: row["Loại"] || "main",
        description: row["Chi tiết"] || "",
        note: row["Ghi chú"] || "",
      }));

      const { error } = await supabase.from("tasks").insert(tasksToInsert);
      if (error) throw error;

      showToast(`Nhập thành công ${tasksToInsert.length} task!`, "success");
      setImportPreview(null);
    } catch (err: any) {
      showToast("Lỗi nhập dữ liệu: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const generateShareLink = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const slug = Math.random().toString(36).substring(2, 10);
      const { error } = await supabase
        .from("public_shares")
        .insert([{ user_id: user.id, slug, is_active: true }]);
      if (error) {
        if (error.code === "23505") {
          // Already exists, just make active if it wasn't
          const { data } = await supabase
            .from("public_shares")
            .select("slug")
            .eq("user_id", user.id)
            .single();
          if (data) {
            await supabase
              .from("public_shares")
              .update({ is_active: true })
              .eq("user_id", user.id);
            setShareSlug(data.slug);
            setHasShare(true);
            setIsActive(true);
          }
        } else {
          throw error;
        }
      } else {
        setShareSlug(slug);
        setHasShare(true);
        setIsActive(true);
      }
    } catch (err: any) {
      console.error(err);
      showToast("Lỗi tạo link: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleShare = async () => {
    if (!user) return;
    setLoading(true);
    await supabase
      .from("public_shares")
      .update({ is_active: !isActive })
      .eq("user_id", user.id);
    setIsActive(!isActive);
    setLoading(false);
  };

  const regenerateShare = async () => {
    if (!user) return;
    if (
      !window.confirm(
        "Tạo lại link sẽ làm link cũ không thể truy cập được nữa. Bạn chắc chứ?",
      )
    )
      return;
    setLoading(true);
    const newSlug = Math.random().toString(36).substring(2, 10);
    await supabase
      .from("public_shares")
      .update({ slug: newSlug, is_active: true })
      .eq("user_id", user.id);
    setShareSlug(newSlug);
    setIsActive(true);
    setLoading(false);
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Cài đặt</h1>
      </header>

      <Card className="settings-section">
        <CardContent style={{ paddingTop: "1.5rem" }}>
          <h3>Tài khoản</h3>
          <p>
            Đăng nhập bằng: <strong>{user?.email}</strong>
          </p>
          <div
            style={{
              marginTop: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <input
              type="checkbox"
              id="autoLogin"
              checked={autoLogin}
              onChange={toggleAutoLogin}
              style={{ width: "auto", cursor: "pointer" }}
            />
            <label htmlFor="autoLogin" style={{ cursor: "pointer" }}>
              Ghi nhớ đăng nhập (30 ngày)
            </label>
          </div>
          <p
            className="text-muted"
            style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}
          >
            Nếu tắt, phiên đăng nhập sẽ tự động kết thúc khi bạn đóng trình
            duyệt.
          </p>
          <button
            className="danger-btn"
            style={{ marginTop: "1rem", width: "auto" }}
            onClick={() => supabase.auth.signOut()}
          >
            Đăng xuất
          </button>
        </CardContent>
      </Card>

      <Card className="settings-section">
        <CardContent style={{ paddingTop: "1.5rem" }}>
          <h3>Kiểm tra sức khỏe dữ liệu (Data Health)</h3>
          <p className="text-muted">
            Theo dõi trạng thái dữ liệu và chuẩn hóa các trường thông tin không
            hợp lệ.
          </p>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              marginTop: "1rem",
            }}
          >
            <Button
              variant="secondary"
              onClick={checkDb}
              disabled={loading}
              style={{ width: "auto" }}
            >
              Phân tích dữ liệu
            </Button>
            {dbCheckResult?.optionalTasks > 0 && (
              <Button
                variant="primary"
                onClick={cleanupOptionalTasks}
                disabled={loading}
                style={{ width: "auto" }}
              >
                Chuẩn hóa task tự chọn
              </Button>
            )}
            {dbCheckResult?.missingCategory > 0 && (
              <Button
                variant="primary"
                onClick={fillMissingCategory}
                disabled={loading}
                style={{ width: "auto" }}
              >
                Gán nhóm mặc định
              </Button>
            )}
            {dbCheckResult && (
              <Button
                variant="secondary"
                disabled={loading}
                style={{ width: "auto" }}
                onClick={() => {
                  const exportPayload = {
                    timestamp: new Date().toISOString(),
                    user: user?.email,
                    healthSummary: dbCheckResult,
                  };
                  const dataStr =
                    "data:text/json;charset=utf-8," +
                    encodeURIComponent(JSON.stringify(exportPayload, null, 2));
                  const downloadAnchorNode = document.createElement("a");
                  downloadAnchorNode.setAttribute("href", dataStr);
                  downloadAnchorNode.setAttribute(
                    "download",
                    "data_health_diagnostic.json",
                  );
                  document.body.appendChild(downloadAnchorNode);
                  downloadAnchorNode.click();
                  downloadAnchorNode.remove();
                }}
              >
                Xuất Diagnostic JSON
              </Button>
            )}
          </div>

          {dbCheckResult && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem",
                background: "var(--bg-panel)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
              }}
            >
              <div>
                <strong>Tổng quan</strong>
                <ul style={{ marginLeft: "1.5rem", marginTop: "0.5rem" }}>
                  <li>Tổng Tasks: {dbCheckResult.total}</li>
                  <li>Tổng Goals: {dbCheckResult.goals}</li>
                  <li>Hoàn thành: {dbCheckResult.done}</li>
                  <li>Đang làm: {dbCheckResult.inProgress}</li>
                  <li>Chưa làm: {dbCheckResult.todo}</li>
                </ul>
              </div>
              <div>
                <strong>Cảnh báo dữ liệu</strong>
                <ul
                  style={{
                    marginLeft: "1.5rem",
                    marginTop: "0.5rem",
                    color:
                      dbCheckResult.missingCategory > 0 ||
                      dbCheckResult.missingTitle > 0 ||
                      dbCheckResult.invalidDate > 0 ||
                      dbCheckResult.duplicates > 0
                        ? "var(--warning)"
                        : "var(--text-secondary)",
                  }}
                >
                  <li>Thiếu danh mục: {dbCheckResult.missingCategory}</li>
                  <li>Thiếu tiêu đề: {dbCheckResult.missingTitle}</li>
                  <li>Ngày không hợp lệ: {dbCheckResult.invalidDate}</li>
                  <li>
                    Task loại 'optional' cũ: {dbCheckResult.optionalTasks}
                  </li>
                </ul>
              </div>
              <div>
                <strong>
                  Task nghi ngờ trùng lặp ({dbCheckResult.duplicates})
                </strong>
                {dbCheckResult.duplicateGroups &&
                  dbCheckResult.duplicateGroups.length > 0 && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <ul
                        style={{
                          marginLeft: "1.5rem",
                          color: "var(--warning)",
                          fontSize: "0.875rem",
                        }}
                      >
                        {dbCheckResult.duplicateGroups
                          .slice(0, expandedDups ? undefined : 5)
                          .map((dup: any, i: number) => (
                            <li key={i} style={{ marginBottom: "0.25rem" }}>
                              {dup.count}x: {dup.sig}
                            </li>
                          ))}
                      </ul>
                      {dbCheckResult.duplicateGroups.length > 5 && (
                        <button
                          className="secondary-btn"
                          style={{
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.75rem",
                            width: "auto",
                            marginTop: "0.5rem",
                          }}
                          onClick={() => setExpandedDups(!expandedDups)}
                        >
                          {expandedDups
                            ? "Thu gọn"
                            : `Xem thêm ${dbCheckResult.duplicateGroups.length - 5} nhóm`}
                        </button>
                      )}
                    </div>
                  )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="settings-section">
        <CardContent style={{ paddingTop: "1.5rem" }}>
          <h3>Nhập / Xuất Excel</h3>
          <p className="text-muted">
            Lưu trữ dữ liệu học tập ra file Excel hoặc import từ file Excel vào
            hệ thống.
          </p>
          <div
            style={{
              marginTop: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              <button
                className="primary-btn"
                style={{ width: "auto", margin: 0 }}
                onClick={exportToExcel}
                disabled={loading}
              >
                {loading ? "Đang tải..." : "Xuất dữ liệu (.xlsx)"}
              </button>

              <input
                type="file"
                accept=".xlsx"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <button
                className="secondary-btn"
                style={{ width: "auto", margin: 0 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                Nhập dữ liệu (Cơ bản)
              </button>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <Button
                variant="secondary"
                onClick={() => setShowExcelImport(true)}
                style={{ flex: 1 }}
              >
                Import từ Excel (Nâng cao)
              </Button>
            </div>
            <p
              className="text-muted"
              style={{ fontSize: "0.875rem", margin: 0 }}
            >
              * Lưu ý: Import Excel nâng cao hỗ trợ map cột tuỳ biến, tự động
              lọc trùng và thêm mới thay vì ghi đè.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="settings-section">
        <CardContent style={{ paddingTop: "1.5rem" }}>
          <h3>Đồng bộ dữ liệu cũ</h3>
          <p className="text-muted">
            Lấy dữ liệu từ phiên bản dùng thử (chỉ lưu trên máy này) và đẩy lên
            tài khoản của bạn.
          </p>
          <button
            className="primary-btn"
            onClick={importLocalData}
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Đồng bộ từ LocalStorage"}
          </button>
        </CardContent>
      </Card>

      <Card className="settings-section">
        <CardContent style={{ paddingTop: "1.5rem" }}>
          <h3>Quản lý dữ liệu cục bộ</h3>
          <p className="text-muted">
            Tính năng này giúp giải phóng dung lượng hoặc xóa các cài đặt cũ
            (như chế độ xem, form task tạm thời). Dữ liệu trên mây sẽ không bị
            ảnh hưởng.
          </p>
          <button
            className="danger-btn"
            style={{ width: "auto", marginTop: "1rem" }}
            onClick={() => {
              if (
                window.confirm(
                  "Bạn có chắc chắn muốn xóa toàn bộ bộ nhớ đệm (LocalStorage)? Phiên đăng nhập hiện tại có thể bị thoát và các thiết lập hiển thị sẽ bị reset.",
                )
              ) {
                localStorage.clear();
                window.location.reload();
              }
            }}
          >
            Xóa bộ nhớ đệm (LocalStorage)
          </button>
        </CardContent>
      </Card>

      <Card className="settings-section">
        <CardContent style={{ paddingTop: "1.5rem" }}>
          <h3>Chia sẻ (Public Link)</h3>
          <p className="text-muted">
            Tạo link chia sẻ tiến độ học tập (chỉ đọc) cho bạn bè.
          </p>

          {hasShare ? (
            <div>
              <div className="share-link-box">
                <input
                  type="text"
                  readOnly
                  value={
                    isActive
                      ? `${appOrigin}/${shareSlug}/shared`
                      : "Đã vô hiệu hóa"
                  }
                />
                <button
                  className="secondary-btn"
                  disabled={!isActive}
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${appOrigin}/${shareSlug}/shared`,
                    );
                    showToast("Đã copy link vào clipboard!", "success");
                  }}
                >
                  Copy Link
                </button>
              </div>
              <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
                <button
                  className={isActive ? "danger-btn" : "primary-btn"}
                  style={{ width: "auto" }}
                  onClick={toggleShare}
                  disabled={loading}
                >
                  {isActive ? "Vô hiệu hóa link" : "Mở lại link"}
                </button>
                <button
                  className="secondary-btn"
                  style={{ width: "auto" }}
                  onClick={regenerateShare}
                  disabled={loading}
                >
                  Tạo link mới
                </button>
              </div>
            </div>
          ) : (
            <Button
              variant="primary"
              onClick={generateShareLink}
              disabled={loading}
            >
              Tạo link chia sẻ
            </Button>
          )}
        </CardContent>
      </Card>

      {importPreview && (
        <div className="task-form-overlay" style={{ zIndex: 1000 }}>
          <Card
            className="task-form-container"
            style={{
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CardContent>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <h3 style={{ margin: 0 }}>Xác nhận Nhập Dữ Liệu</h3>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Đóng"
                  onClick={() => setImportPreview(null)}
                  style={{ width: "auto" }}
                >
                  Đóng
                </Button>
              </div>

              <p style={{ marginBottom: "1rem" }}>
                Tìm thấy <strong>{importPreview.length}</strong> dòng hợp lệ.
                Dưới đây là 3 dòng đầu tiên:
              </p>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  background: "var(--bg-dark)",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  padding: "0.5rem",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    fontSize: "0.875rem",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid var(--border-color)",
                        textAlign: "left",
                      }}
                    >
                      <th style={{ padding: "0.5rem" }}>Ngày</th>
                      <th style={{ padding: "0.5rem" }}>Tiêu đề</th>
                      <th style={{ padding: "0.5rem" }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.slice(0, 3).map((row, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: "1px solid var(--border-color)",
                        }}
                      >
                        <td style={{ padding: "0.5rem" }}>
                          {row["Ngày"] || "-"}
                        </td>
                        <td style={{ padding: "0.5rem" }}>
                          {row["Tiêu đề"] || "-"}
                        </td>
                        <td style={{ padding: "0.5rem" }}>
                          {row["Trạng thái"] || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <Button
                  variant="secondary"
                  onClick={() => setImportPreview(null)}
                  disabled={loading}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  onClick={confirmImport}
                  disabled={loading}
                >
                  {loading ? "Đang xử lý..." : "Xác nhận Nhập"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showExcelImport && (
        <ExcelImportWizard
          onClose={() => setShowExcelImport(false)}
          onSuccess={() => {
            setShowExcelImport(false);
            checkDb();
          }}
        />
      )}
    </div>
  );
};
// trigger new commit
