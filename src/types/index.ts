export type TaskStatus = 'todo' | 'doing' | 'done' | 'skipped' | 'moved';
export type TaskPriority = 'Cao' | 'Vừa' | 'Thấp';
export type TaskType = 'main' | 'optional' | 'health' | 'review';

export interface Task {
  id: string;
  user_id?: string;
  date: string; // YYYY-MM-DD
  start_time: string;
  end_time: string;
  category: string;
  title: string;
  description: string;
  task_type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  score_weight: number;
  moved_from_task_id?: string;
  moved_count: number;
  note: string;
  created_at?: string;
  updated_at?: string;
}

export interface Goal {
  id: string;
  user_id?: string;
  period_type: 'week' | 'month';
  period_start_date: string;
  title: string;
  category: string;
  is_done: boolean;
  note: string;
  created_at?: string;
  updated_at?: string;
}

export interface Share {
  id: string;
  user_id: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}
