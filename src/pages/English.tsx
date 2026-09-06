import React, { useEffect, useMemo, useState } from "react";
import { englishTasks, totalPlannedMinutes, weeks, type EnglishTask } from "../data/englishPlan";

const filters = ["This week", "5 min", "10–20 min", "30–60 min", "Commute", "Can Speak", "All"] as const;
type Filter = (typeof filters)[number];

const planStart = new Date("2026-09-07T00:00:00+09:00");
const planEnd = new Date("2026-12-06T23:59:59+09:00");

function getCurrentWeek() {
  const now = new Date();
  if (now < planStart) return 1;
  if (now > planEnd) return 13;
  return Math.min(13, Math.max(1, Math.floor((now.getTime() - planStart.getTime()) / 604800000) + 1));
}

const skillIcon: Record<string, string> = {
  Grammar: "📘",
  Speaking: "🗣",
  Pronunciation: "🔤",
  Listening: "🎧",
  Reading: "📖",
  Writing: "✍️",
  "IELTS Class": "🧑‍🏫",
  Review: "♻️",
};

export const English: React.FC = () => {
  const currentWeek = getCurrentWeek();
  const [week, setWeek] = useState(currentWeek);
  const [filter, setFilter] = useState<Filter>("This week");
  const [selected, setSelected] = useState<EnglishTask | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("english-plan-done") || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem("english-plan-done", JSON.stringify(done));
  }, [done]);

  const weekTasks = englishTasks.filter((t) => t.week === week);
  const visible = useMemo(() => weekTasks.filter((t) => {
    if (filter === "5 min") return t.time <= 5;
    if (filter === "10–20 min") return t.time <= 20;
    if (filter === "30–60 min") return t.time <= 60;
    if (filter === "Commute") return t.mode === "Commute";
    if (filter === "Can Speak") return t.mode === "Can Speak";
    return true;
  }), [weekTasks, filter]);

  const completed = englishTasks.filter((t) => done[t.id]).length;
  const weekCompleted = weekTasks.filter((t) => done[t.id]).length;
  const progress = Math.round((completed / englishTasks.length) * 100);
  const thisWeek = weeks[week - 1];

  const toggleDone = (id: string) => setDone((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <main style={{ maxWidth: 1060, margin: "0 auto", padding: "28px 18px 72px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2, opacity: .55 }}>3-MONTH ENGLISH PLAN · SEP 7 → DEC 6, 2026</div>
        <h1 style={{ fontSize: "clamp(32px,6vw,52px)", margin: "8px 0 6px" }}>🇬🇧 English</h1>
        <p style={{ margin: 0, opacity: .72 }}>IELTS 6.5 · Mở page → chọn thời gian đang có → học một task. Không có “nợ học”.</p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginBottom: 26 }}>
        <div style={card}><b>{progress}%</b><span style={muted}>Toàn bộ lộ trình</span></div>
        <div style={card}><b>{completed}/{englishTasks.length}</b><span style={muted}>Tasks hoàn thành</span></div>
        <div style={card}><b>{Math.round(totalPlannedMinutes/60)}h</b><span style={muted}>Tổng thời lượng kế hoạch</span></div>
        <div style={card}><b>{weekCompleted}/{weekTasks.length}</b><span style={muted}>Week {week}</span></div>
      </section>

      <section style={{ ...card, marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, opacity: .6 }}>CURRENT ROADMAP</div>
            <h2 style={{ margin: "4px 0" }}>Week {week} · {thisWeek.range}</h2>
            <div style={{ opacity: .75 }}>{thisWeek.focus}</div>
          </div>
          <select value={week} onChange={(e) => setWeek(Number(e.target.value))} style={selectStyle}>
            {weeks.map((w, i) => <option key={w.range} value={i+1}>Week {i+1} · {w.range}</option>)}
          </select>
        </div>
      </section>

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ marginBottom: 10 }}>⚡ Học ngay</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {filters.map((f) => <button key={f} onClick={() => setFilter(f)} style={pill(filter===f)}>{f}</button>)}
        </div>
      </section>

      <section style={{ display: "grid", gap: 10, marginBottom: 30 }}>
        {visible.map((t) => {
          const isDone = !!done[t.id];
          return <article key={t.id} style={{ ...card, opacity: isDone ? .55 : 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "start" }}>
              <input aria-label="done" type="checkbox" checked={isDone} onChange={() => toggleDone(t.id)} style={{ marginTop: 4, width: 18, height: 18 }} />
              <button onClick={() => setSelected(t)} style={{ border: 0, background: "transparent", padding: 0, textAlign: "left", color: "inherit", cursor: "pointer" }}>
                <strong style={{ textDecoration: isDone ? "line-through" : "none" }}>{skillIcon[t.skill]} {t.name}</strong>
                <div style={{ marginTop: 5, fontSize: 13, opacity: .62 }}>{t.skill} · {t.source} · {t.mode}</div>
              </button>
              <span style={{ fontSize: 13, whiteSpace: "nowrap", opacity: .65 }}>{t.time}m</span>
            </div>
          </article>;
        })}
      </section>

      <section style={{ ...card, marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>📌 Tuần này học gì?</h2>
        <div style={{ display: "grid", gap: 7, lineHeight: 1.55 }}>
          <div>📘 Grammar: Murphy Units {thisWeek.grammar[0]}–{thisWeek.grammar[1]}</div>
          <div>🔤 Pronunciation: {thisWeek.pronunciation}</div>
          <div>🗣 Speaking: {thisWeek.speaking[0]} · {thisWeek.speaking[1]}</div>
          <div>🎧 Listening: {thisWeek.listening}</div>
          <div>📖 Reading: {thisWeek.reading}</div>
          <div>✍️ Writing: {thisWeek.writing}</div>
        </div>
      </section>

      <section style={{ ...card }}>
        <h2 style={{ marginTop: 0 }}>Simple rules</h2>
        <ol style={{ marginBottom: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Có 5 phút thì làm task 5 phút; có 20 phút thì chọn task ≤20 phút.</li>
          <li>Không hoàn thành một ngày không tạo backlog. Tiếp tục task đang phù hợp.</li>
          <li>Grammar học tuần tự từ Murphy Unit 15; speaking/pronunciation là ưu tiên cao.</li>
          <li>Listening/reading chỉ lấy tối đa 3 từ/cụm thực sự hữu ích mỗi lesson.</li>
          <li>IELTS class: trước lớp ôn correction; sau lớp sửa lỗi và nói lại câu đã được sửa.</li>
        </ol>
      </section>

      {selected && <div onClick={() => setSelected(null)} style={overlay}>
        <div onClick={(e)=>e.stopPropagation()} style={{ ...card, maxWidth: 600, width: "100%", padding: 22 }}>
          <div style={{ fontSize: 13, opacity: .6 }}>{selected.dateRange} · {selected.skill} · {selected.time}m · {selected.mode}</div>
          <h2>{skillIcon[selected.skill]} {selected.name}</h2>
          <p style={{ lineHeight: 1.7 }}>{selected.action}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <button onClick={() => toggleDone(selected.id)} style={pill(true)}>{done[selected.id] ? "Mark undone" : "✓ Done"}</button>
            <button onClick={() => setSelected(null)} style={pill(false)}>Close</button>
          </div>
        </div>
      </div>}
    </main>
  );
};

const card: React.CSSProperties = { border: "1px solid rgba(127,127,127,.22)", borderRadius: 16, padding: 15, background: "rgba(127,127,127,.035)", display: "grid", gap: 4 };
const muted: React.CSSProperties = { fontSize: 12, opacity: .58 };
const selectStyle: React.CSSProperties = { padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(127,127,127,.3)", background: "transparent", color: "inherit" };
const pill = (active:boolean): React.CSSProperties => ({ border: "1px solid rgba(127,127,127,.35)", borderRadius: 999, padding: "8px 13px", background: active ? "rgba(127,127,127,.2)" : "transparent", color: "inherit", cursor: "pointer" });
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center", padding: 20, zIndex: 100 };

export default English;
