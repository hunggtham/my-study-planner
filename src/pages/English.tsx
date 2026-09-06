import React, { useMemo, useState } from "react";

type Task = {
  name: string;
  skill: string;
  time: number;
  mode: "Anywhere" | "Desk" | "Commute" | "Can Speak";
  source: string;
  action: string;
};

const tasks: Task[] = [
  { name: "Current grammar — 3 personal sentences", skill: "Grammar", time: 5, mode: "Anywhere", source: "English Grammar in Use", action: "Without opening the book, make 3 true sentences using the grammar you are currently learning." },
  { name: "Murphy Unit 15 — Continue", skill: "Grammar", time: 25, mode: "Desk", source: "English Grammar in Use", action: "Continue Unit 15. Read the explanation, do the exercises, make 3 true sentences about yourself, then say them aloud." },
  { name: "Introduce myself — 1 minute", skill: "Speaking", time: 5, mode: "Can Speak", source: "Speaking topic", action: "Speak for 1 minute without a script. Include who you are, where you live, what you do and one current goal." },
  { name: "My daily routine — 1 minute", skill: "Speaking", time: 5, mode: "Can Speak", source: "Speaking topic", action: "Describe a normal weekday. Keep speaking even if the English is simple." },
  { name: "Living in Korea", skill: "Speaking", time: 10, mode: "Can Speak", source: "Speaking topic", action: "Speak for 1–2 minutes: how long you have lived there, daily life, something you like and one difficulty." },
  { name: "My work — cold attempt", skill: "Speaking", time: 5, mode: "Can Speak", source: "Speaking topic", action: "Answer: What do you do? What are you responsible for? What are you working on? Do not prepare first." },
  { name: "My work — improved answer", skill: "Speaking", time: 10, mode: "Can Speak", source: "Speaking topic", action: "Give a better 1–2 minute answer. Reuse phrases such as be responsible for, work on and deal with." },
  { name: "IPA — basic orientation", skill: "Pronunciation", time: 10, mode: "Anywhere", source: "English Pronunciation in Use", action: "Understand vowel/consonant and voiced/unvoiced. Do not memorize the entire IPA chart." },
  { name: "/iː/ vs /ɪ/", skill: "Pronunciation", time: 10, mode: "Anywhere", source: "English Pronunciation in Use", action: "Listen to and repeat minimal pairs such as sheep/ship. Record yourself if possible." },
  { name: "Teacher pronunciation corrections — 5 words", skill: "Pronunciation", time: 5, mode: "Anywhere", source: "IELTS class", action: "Pronounce 5 corrected words from memory first, then check the teacher's correction." },
  { name: "Basic Tactics — current unit: first listen", skill: "Listening", time: 10, mode: "Commute", source: "Basic Tactics for Listening", action: "Listen once without transcript. Focus on the main idea and key details." },
  { name: "Basic Tactics — current unit: exercises", skill: "Listening", time: 15, mode: "Commute", source: "Basic Tactics for Listening", action: "Listen again and complete the exercises." },
  { name: "Basic Tactics — shadow 5 lines", skill: "Listening", time: 5, mode: "Commute", source: "Basic Tactics for Listening", action: "Repeat 5 short lines after the audio and copy rhythm/stress." },
  { name: "Current IELTS reading", skill: "Reading", time: 15, mode: "Commute", source: "Get Ready for IELTS Reading", action: "Read the current passage for meaning. Do not stop for every unknown word." },
  { name: "My Work — short paragraph", skill: "Writing", time: 20, mode: "Desk", source: "Topic writing", action: "Write 100–150 words about your job. Prefer simple accurate English and reuse language from speaking." },
  { name: "IELTS class — previous corrections", skill: "IELTS Class", time: 10, mode: "Commute", source: "IELTS class", action: "Before class, review the most important corrections from the previous lesson." },
  { name: "IELTS class — post-class review", skill: "IELTS Class", time: 15, mode: "Desk", source: "IELTS class", action: "After class, keep only important grammar, pronunciation and useful-expression corrections." },
  { name: "IELTS class — re-answer one question", skill: "IELTS Class", time: 5, mode: "Can Speak", source: "IELTS class", action: "Answer one corrected question again without reading your previous answer." },
];

const reviews = [
  ["be responsible for", "Collocation", "chịu trách nhiệm về"],
  ["work on", "Collocation", "làm / thực hiện một công việc, dự án"],
  ["deal with", "Collocation", "xử lý / đối phó với"],
  ["since vs for", "Grammar", "since + mốc thời gian; for + khoảng thời gian"],
  ["people are — not people is", "Grammar Error", "people là danh từ số nhiều"],
  ["development — pronunciation", "Pronunciation", "pronounce first, then check IPA/stress"],
];

const filters = [
  { label: "5 min", test: (t: Task) => t.time <= 5 },
  { label: "10–20 min", test: (t: Task) => t.time <= 20 },
  { label: "30–60 min", test: (t: Task) => t.time <= 60 },
  { label: "Commute", test: (t: Task) => t.mode === "Commute" },
  { label: "Can Speak", test: (t: Task) => t.mode === "Can Speak" },
];

export const English: React.FC = () => {
  const [active, setActive] = useState("10–20 min");
  const [selected, setSelected] = useState<Task | null>(null);

  const visible = useMemo(() => {
    const f = filters.find((x) => x.label === active);
    return f ? tasks.filter(f.test) : tasks;
  }, [active]);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 56px" }}>
      <section style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 700, opacity: .65, marginBottom: 8 }}>ENGLISH LEARNING</div>
        <h1 style={{ fontSize: 40, margin: 0 }}>🇬🇧 English</h1>
        <p style={{ marginTop: 10, opacity: .75 }}>🎯 IELTS 6.5 · Có bao nhiêu thời gian thì học đúng bằng đó. Không tạo nợ học.</p>
      </section>

      <section style={{ marginBottom: 30 }}>
        <h2 style={{ marginBottom: 12 }}>⚡ Học ngay</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {filters.map((f) => (
            <button key={f.label} onClick={() => setActive(f.label)} style={{ border: "1px solid currentColor", borderRadius: 999, padding: "8px 14px", background: active === f.label ? "rgba(127,127,127,.18)" : "transparent", cursor: "pointer" }}>
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: 12, marginBottom: 34 }}>
        {visible.map((task) => (
          <button key={task.name} onClick={() => setSelected(task)} style={{ textAlign: "left", border: "1px solid rgba(127,127,127,.28)", borderRadius: 16, padding: 16, background: "transparent", cursor: "pointer", color: "inherit" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
              <div>
                <strong>{task.name}</strong>
                <div style={{ marginTop: 6, fontSize: 13, opacity: .68 }}>{task.skill} · {task.source}</div>
              </div>
              <span style={{ whiteSpace: "nowrap", fontSize: 13, opacity: .75 }}>{task.time}m</span>
            </div>
          </button>
        ))}
      </section>

      <section style={{ marginBottom: 34 }}>
        <h2>▶ Current focus</h2>
        <ul style={{ lineHeight: 1.9, paddingLeft: 22 }}>
          <li>📘 Grammar: English Grammar in Use — Unit 15</li>
          <li>🗣 Speaking: Myself / Daily Routine / Living in Korea / My Work</li>
          <li>🔤 Pronunciation: IPA basics</li>
          <li>🎧 Listening: Basic Tactics — current unit</li>
          <li>✍️ Writing: My Work</li>
          <li>📖 Reading: Get Ready for IELTS — current lesson</li>
        </ul>
      </section>

      <section style={{ marginBottom: 34 }}>
        <h2>♻️ Review</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {reviews.map(([item, type, note]) => (
            <div key={item} style={{ borderBottom: "1px solid rgba(127,127,127,.2)", padding: "10px 0" }}>
              <strong>{item}</strong>
              <div style={{ fontSize: 13, opacity: .68 }}>{type} · {note}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, opacity: .68, marginTop: 12 }}>Review rhythm: 1 → 3 → 7 → 14 → 30 days.</p>
      </section>

      <section>
        <h2>🧑‍🏫 IELTS class</h2>
        <p><strong>Before class:</strong> review previous corrections for ~10 minutes.</p>
        <p><strong>After class:</strong> save only important grammar, pronunciation and useful expressions, then re-answer one corrected question.</p>
      </section>

      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", padding: 20, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, width: "100%", background: "var(--bg-primary, #fff)", color: "var(--text-primary, #111)", borderRadius: 18, padding: 22, boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
            <div style={{ fontSize: 13, opacity: .65 }}>{selected.skill} · {selected.time}m · {selected.mode}</div>
            <h3 style={{ fontSize: 24, marginBottom: 10 }}>{selected.name}</h3>
            <p style={{ lineHeight: 1.65 }}>{selected.action}</p>
            <button onClick={() => setSelected(null)} style={{ marginTop: 8, border: "1px solid currentColor", borderRadius: 10, padding: "8px 12px", background: "transparent", color: "inherit", cursor: "pointer" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default English;
