export type EnglishTask = {
  id: string;
  week: number;
  dateRange: string;
  name: string;
  skill: "Grammar" | "Speaking" | "Pronunciation" | "Listening" | "Reading" | "Writing" | "IELTS Class" | "Review";
  time: number;
  mode: "Anywhere" | "Desk" | "Commute" | "Can Speak";
  source: string;
  action: string;
};

type WeekPlan = {
  range: string;
  grammar: [number, number];
  pronunciation: string;
  speaking: [string, string];
  writing: string;
  reading: string;
  listening: string;
  focus: string;
};

export const weeks: WeekPlan[] = [
  { range: "Sep 7–13", grammar: [15,16], pronunciation: "IPA basics + /iː/ vs /ɪ/", speaking: ["Introduce myself", "My daily routine"], writing: "Introduce myself — 80–100 words", reading: "Get Ready Reading — current lesson", listening: "Basic Tactics — current lesson", focus: "Restart gently and build a daily English habit" },
  { range: "Sep 14–20", grammar: [17,18], pronunciation: "/æ/ vs /e/ + mouth position", speaking: ["Living in Korea", "My work"], writing: "My work — 100–150 words", reading: "Reading: main idea + keyword scanning", listening: "Basic Tactics — next lesson", focus: "Personal English: life and work" },
  { range: "Sep 21–27", grammar: [19,20], pronunciation: "/ʌ/ vs /ɑː/ + /ʊ/ vs /uː/", speaking: ["My hometown", "My family"], writing: "My hometown — 100–150 words", reading: "Reading: detail questions", listening: "Basic Tactics — next lesson", focus: "Speak longer without translating sentence by sentence" },
  { range: "Sep 28–Oct 4", grammar: [21,22], pronunciation: "Schwa /ə/ + unstressed syllables", speaking: ["Learning English", "My study routine"], writing: "Why I study English — 120–150 words", reading: "Reading: vocabulary from context", listening: "Basic Tactics — next lesson", focus: "Reduce hesitation and improve rhythm" },
  { range: "Oct 5–11", grammar: [23,24], pronunciation: "Final consonants + voiced/unvoiced", speaking: ["Technology I use", "AI in my work"], writing: "Technology in my daily life", reading: "Reading: matching information", listening: "Basic Tactics — next lesson", focus: "Use work/technology vocabulary actively" },
  { range: "Oct 12–18", grammar: [25,26], pronunciation: "Word stress", speaking: ["Exercise and health", "Food and eating habits"], writing: "Healthy habits — opinion paragraph", reading: "Reading: True/False/Not Given basics", listening: "Basic Tactics — next lesson", focus: "Give reasons and examples" },
  { range: "Oct 19–25", grammar: [27,28], pronunciation: "Sentence stress", speaking: ["Travel", "Transportation"], writing: "A memorable trip", reading: "Reading: sentence completion", listening: "Basic Tactics — next lesson", focus: "Tell a coherent short story" },
  { range: "Oct 26–Nov 1", grammar: [29,30], pronunciation: "Weak forms", speaking: ["Friends and social life", "Free time and weekends"], writing: "How I spend my free time", reading: "Reading: short-answer questions", listening: "Basic Tactics — next lesson", focus: "Sound more natural in common conversation" },
  { range: "Nov 2–8", grammar: [31,32], pronunciation: "Linking", speaking: ["Career plans", "Future goals"], writing: "My career plan — 150 words", reading: "IELTS Reading Part 1 timed practice", listening: "Listening: one section under light time pressure", focus: "Future language + clear structure" },
  { range: "Nov 9–15", grammar: [33,34], pronunciation: "Connected speech", speaking: ["IELTS Part 1 — Work/Study", "IELTS Part 1 — Home/Hometown"], writing: "IELTS-style paragraph: opinion + reason + example", reading: "IELTS Reading: improve wrong-answer analysis", listening: "Listening: identify distractors", focus: "Transition from general English to IELTS output" },
  { range: "Nov 16–22", grammar: [35,36], pronunciation: "Intonation", speaking: ["IELTS Part 2 — Person", "IELTS Part 2 — Place"], writing: "IELTS Writing foundation: paragraph structure", reading: "IELTS Reading Part 1 + review", listening: "Listening: spelling/numbers/names accuracy", focus: "Build a reusable Part 2 story bank" },
  { range: "Nov 23–29", grammar: [37,38], pronunciation: "Pronunciation error review", speaking: ["IELTS Part 2 — Experience", "IELTS Part 3 — Opinion/Reason"], writing: "IELTS Writing: advantages/disadvantages paragraph", reading: "IELTS Reading: timed passage + error log", listening: "Listening: timed section + transcript analysis", focus: "Extend answers and support opinions" },
  { range: "Nov 30–Dec 6", grammar: [39,40], pronunciation: "Consolidation: stress + linking + intonation", speaking: ["IELTS mock speaking", "3-month speaking review"], writing: "IELTS Writing: mini Task 2 plan + introduction + body paragraph", reading: "IELTS Reading mini mock", listening: "IELTS Listening mini mock", focus: "Consolidate, test, and decide the next 3-month cycle" },
];

const task = (week: number, range: string, name: string, skill: EnglishTask["skill"], time: number, mode: EnglishTask["mode"], source: string, action: string): EnglishTask => ({
  id: `w${week}-${skill.toLowerCase().replace(/\s+/g, "-")}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
  week,
  dateRange: range,
  name,
  skill,
  time,
  mode,
  source,
  action,
});

export const englishTasks: EnglishTask[] = weeks.flatMap((w, i) => {
  const week = i + 1;
  const [g1, g2] = w.grammar;
  return [
    task(week,w.range,`Murphy Unit ${g1}`,"Grammar",25,"Desk","English Grammar in Use",`Study Unit ${g1}: read the explanation, do the exercises, write 3 true personal examples, then say them aloud.`),
    task(week,w.range,`Murphy Unit ${g2}`,"Grammar",25,"Desk","English Grammar in Use",`Study Unit ${g2}: read the explanation, do the exercises, write 3 true personal examples, then say them aloud.`),
    task(week,w.range,"Current grammar — 3 personal sentences","Grammar",5,"Anywhere","English Grammar in Use","Close the book and make 3 true sentences using this week's grammar."),
    task(week,w.range,w.pronunciation,"Pronunciation",10,"Anywhere","English Pronunciation in Use",`Practice ${w.pronunciation}. Listen first, repeat, then record yourself if possible.`),
    task(week,w.range,"Pronunciation quick review","Pronunciation",5,"Commute","Pronunciation review","Recall and pronounce 5 words/sounds from this week before checking your notes."),
    task(week,w.range,`${w.speaking[0]} — cold attempt`,"Speaking",5,"Can Speak","Speaking topic",`Speak about “${w.speaking[0]}” without a script. Keep going for 1 minute and note only the biggest gaps.`),
    task(week,w.range,`${w.speaking[0]} — improved answer`,"Speaking",10,"Can Speak","Speaking topic",`Speak again about “${w.speaking[0]}”. Use 5 useful chunks and give at least one reason/example.`),
    task(week,w.range,`${w.speaking[1]} — cold attempt`,"Speaking",5,"Can Speak","Speaking topic",`Speak about “${w.speaking[1]}” for 1 minute without preparing.`),
    task(week,w.range,`${w.speaking[1]} — improved answer`,"Speaking",10,"Can Speak","Speaking topic",`Speak again about “${w.speaking[1]}” for 1–2 minutes with clearer structure and useful language.`),
    task(week,w.range,w.listening,"Listening",15,"Commute","Basic Tactics / IELTS Listening","Listen once without transcript, answer/check, then identify why you missed anything. Extract at most 3 useful items."),
    task(week,w.range,"Shadow 5 useful lines","Listening",5,"Commute","Listening audio","Repeat 5 short lines after the audio and copy rhythm, stress and linking."),
    task(week,w.range,w.reading,"Reading",15,"Commute","Get Ready for IELTS Reading",`Do this week's reading focus: ${w.reading}. Do not stop for every unknown word.`),
    task(week,w.range,"Reading mistake review","Reading",10,"Desk","Reading error review","Review wrong answers and write one short reason for each error. Keep at most 3 useful language items."),
    task(week,w.range,w.writing,"Writing",20,"Desk","Topic / IELTS Writing",`Write: ${w.writing}. Prioritize clear, accurate sentences. After correction, rewrite the weakest 3 sentences.`),
    task(week,w.range,"IELTS class — pre-class review","IELTS Class",10,"Commute","IELTS class","Review the previous class's most important corrections and re-say 1–2 corrected answers."),
    task(week,w.range,"IELTS class — post-class corrections","IELTS Class",15,"Desk","IELTS class","After class, save only important grammar, pronunciation and useful-expression corrections. Then re-answer one corrected question."),
    task(week,w.range,"Weekly review — top 10 items","Review",10,"Anywhere","Review","Recall the 10 highest-value expressions/errors from this week. Say a personal example for each item you still find difficult."),
  ];
});

export const totalPlannedMinutes = englishTasks.reduce((sum, t) => sum + t.time, 0);
