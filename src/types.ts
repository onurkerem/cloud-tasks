export type TaskStatus = "todo" | "in_progress" | "done";

export interface Env {
  DB: D1Database;
  API_KEY?: string;
}

export interface Task {
  id: string;
  description: string;
  tags: string[];
  assignee: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  id?: string;
  status?: TaskStatus;
  assignee?: string;
  tags?: string[];
  q?: string;
  limit?: number;
  offset?: number;
}
