// Mirrors packages/worker/src/types.ts. There is no shared workspace between
// packages/worker and packages/tui, so this is a deliberate copy — keep it in
// sync if the worker's Task shape changes.

export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: string;
  description: string;
  tags: string[];
  assignee: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];
