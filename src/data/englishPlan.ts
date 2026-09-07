import plan from "./english-plan.json";

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

export type WeekPlan = {
  week: number;
  range: string;
  grammarUnits: number[];
  pronunciation: string;
  speakingTopics: string[];
  writing: string;
  reading: string;
  listening: string;
  focus: string;
};

type TaskTemplate = {
  type: string;
  skill: EnglishTask["skill"];
  time: number;
  mode: EnglishTask["mode"];
  source: string;
  name: string;
  action: string;
  repeat?: "grammarUnits" | "speakingTopics";
  field?: "pronunciation" | "writing" | "reading" | "listening";
};

const slug = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const render = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values[key] ?? ""));

const buildTask = (
  week: WeekPlan,
  template: TaskTemplate,
  values: Record<string, string | number> = {},
): EnglishTask => {
  const name = render(template.name, values);
  const base: EnglishTask = {
    id: `w${week.week}-${slug(template.type)}-${slug(name)}`,
    week: week.week,
    dateRange: week.range,
    name,
    skill: template.skill,
    time: template.time,
    mode: template.mode,
    source: template.source,
    action: render(template.action, values),
  };

  const override = (plan.overrides as Record<string, Partial<EnglishTask>>)[base.id];
  return override ? { ...base, ...override } : base;
};

export const weeks = plan.weeks as WeekPlan[];

export const englishTasks: EnglishTask[] = weeks.flatMap((week) =>
  (plan.taskTemplates as TaskTemplate[]).flatMap((template) => {
    if (template.repeat) {
      return week[template.repeat].map((item) =>
        buildTask(week, template, { item }),
      );
    }

    if (template.field) {
      const value = week[template.field];
      return [buildTask(week, template, { value })];
    }

    return [buildTask(week, template)];
  }),
);

export const totalPlannedMinutes = englishTasks.reduce((sum, task) => sum + task.time, 0);
export const planMeta = plan.meta;
