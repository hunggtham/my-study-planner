import { supabase } from "./supabase";

export type EnglishProgressRow = {
  user_id: string;
  task_id: string;
  completed: boolean;
  note: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export async function loadEnglishProgress(userId: string) {
  const { data, error } = await supabase
    .from("english_task_progress")
    .select("user_id,task_id,completed,note,started_at,completed_at,updated_at")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as EnglishProgressRow[];
}

export async function saveEnglishTaskProgress(
  userId: string,
  taskId: string,
  completed: boolean,
) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("english_task_progress").upsert(
    {
      user_id: userId,
      task_id: taskId,
      completed,
      completed_at: completed ? now : null,
      updated_at: now,
    },
    { onConflict: "user_id,task_id" },
  );
  if (error) throw error;
}
