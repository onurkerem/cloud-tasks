import { conflict, notFound } from "./errors";
import type { CreateTaskInput, UpdateTaskInput } from "./schemas";
import type { Task, TaskFilters } from "./types";

interface TaskRow {
  id: string;
  description: string;
  assignee: string;
  status: Task["status"];
  created_at: string;
  updated_at: string;
}

function rowToTask(row: TaskRow, tags: string[]): Task {
  return {
    id: row.id,
    description: row.description,
    tags,
    assignee: row.assignee,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  return crypto.randomUUID();
}

async function getTags(db: D1Database, taskId: string): Promise<string[]> {
  const result = await db
    .prepare("SELECT tag FROM task_tags WHERE task_id = ? ORDER BY tag ASC")
    .bind(taskId)
    .all<{ tag: string }>();
  return result.results.map((row) => row.tag);
}

async function replaceTags(db: D1Database, taskId: string, tags: string[]) {
  const uniqueTags = [...new Set(tags)];
  await db
    .batch([
      db.prepare("DELETE FROM task_tags WHERE task_id = ?").bind(taskId),
      ...uniqueTags.map((tag) =>
        db.prepare("INSERT INTO task_tags (task_id, tag) VALUES (?, ?)").bind(taskId, tag),
      ),
    ]);
}

export async function createTask(db: D1Database, input: CreateTaskInput): Promise<Task> {
  const id = input.id ?? createId();
  const timestamp = nowIso();

  try {
    await db
      .prepare(
        `INSERT INTO tasks (id, description, assignee, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, input.description, input.assignee, input.status, timestamp, timestamp)
      .run();
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      throw conflict(`Task '${id}' already exists.`);
    }
    throw error;
  }

  await replaceTags(db, id, input.tags);
  return getTask(db, id);
}

export async function getTask(db: D1Database, id: string): Promise<Task> {
  const row = await db
    .prepare(
      `SELECT id, description, assignee, status, created_at, updated_at
       FROM tasks
       WHERE id = ?`,
    )
    .bind(id)
    .first<TaskRow>();

  if (!row) {
    throw notFound();
  }

  return rowToTask(row, await getTags(db, id));
}

export async function listTasks(db: D1Database, filters: TaskFilters): Promise<Task[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.id) {
    where.push("tasks.id = ?");
    params.push(filters.id);
  }
  if (filters.status) {
    where.push("tasks.status = ?");
    params.push(filters.status);
  }
  if (filters.assignee !== undefined) {
    where.push("tasks.assignee = ?");
    params.push(filters.assignee);
  }
  if (filters.q) {
    where.push("tasks.description LIKE ?");
    params.push(`%${filters.q}%`);
  }
  for (const tag of filters.tags ?? []) {
    where.push("EXISTS (SELECT 1 FROM task_tags tt WHERE tt.task_id = tasks.id AND tt.tag = ?)");
    params.push(tag);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  const sql = `
    SELECT id, description, assignee, status, created_at, updated_at
    FROM tasks
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY created_at ASC
    LIMIT ? OFFSET ?`;

  const rows = await db
    .prepare(sql)
    .bind(...params, limit, offset)
    .all<TaskRow>();

  const tasks = await Promise.all(rows.results.map((row) => getTask(db, row.id)));
  return tasks;
}

export async function updateTask(
  db: D1Database,
  id: string,
  input: UpdateTaskInput,
): Promise<Task> {
  await getTask(db, id);

  const updates: string[] = [];
  const params: unknown[] = [];
  if (input.description !== undefined) {
    updates.push("description = ?");
    params.push(input.description);
  }
  if (input.assignee !== undefined) {
    updates.push("assignee = ?");
    params.push(input.assignee);
  }
  if (input.status !== undefined) {
    updates.push("status = ?");
    params.push(input.status);
  }

  if (updates.length > 0) {
    updates.push("updated_at = ?");
    params.push(nowIso(), id);
    await db
      .prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...params)
      .run();
  }

  if (input.tags !== undefined) {
    await replaceTags(db, id, input.tags);
    await db.prepare("UPDATE tasks SET updated_at = ? WHERE id = ?").bind(nowIso(), id).run();
  }

  return getTask(db, id);
}

export async function deleteTask(db: D1Database, id: string): Promise<void> {
  await getTask(db, id);
  await db.prepare("DELETE FROM task_tags WHERE task_id = ?").bind(id).run();
  await db.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();
}

export async function claimNextTask(
  db: D1Database,
  assignee: string,
  tags: string[] = [],
): Promise<Task | null> {
  const tagFilters = tags
    .map(
      () => "EXISTS (SELECT 1 FROM task_tags tt WHERE tt.task_id = tasks.id AND tt.tag = ?)",
    )
    .join(" AND ");
  const tagWhere = tagFilters ? `AND ${tagFilters}` : "";
  const timestamp = nowIso();

  const row = await db
    .prepare(
      `UPDATE tasks
       SET status = 'in_progress', assignee = ?, updated_at = ?
       WHERE id = (
         SELECT id FROM tasks
         WHERE status = 'todo'
         ${tagWhere}
         ORDER BY created_at ASC
         LIMIT 1
       )
       RETURNING id, description, assignee, status, created_at, updated_at`,
    )
    .bind(assignee, timestamp, ...tags)
    .first<TaskRow>();

  if (!row) {
    return null;
  }

  return rowToTask(row, await getTags(db, row.id));
}
