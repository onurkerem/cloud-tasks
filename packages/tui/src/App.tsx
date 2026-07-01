import { Box, Text, useApp, useInput, useStdout } from "ink";
import { useMemo, useState } from "react";
import type { Config } from "./config.js";
import { TASK_STATUSES, type Task, type TaskStatus } from "./types.js";
import { useTasks } from "./useTasks.js";

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "todo",
  in_progress: "in_progress",
  done: "done",
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: "yellow",
  in_progress: "cyan",
  done: "green",
};

const STATUS_GLYPH: Record<TaskStatus, string> = {
  todo: "○",
  in_progress: "◐",
  done: "●",
};

function secondsAgo(date: Date | undefined): string {
  if (!date) return "never";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  return `${seconds}s ago`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

interface Props {
  config: Config;
}

export function App({ config }: Props) {
  const { tasks, loading, error, lastUpdated, auto, intervalMs, refresh, toggleAuto } =
    useTasks(config);
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>(undefined);

  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
      return;
    }
    if (input === "r") {
      refresh();
      return;
    }
    if (input === "a") {
      toggleAuto();
      return;
    }
    if (input === "1") setStatusFilter((prev) => (prev === "todo" ? undefined : "todo"));
    if (input === "2")
      setStatusFilter((prev) => (prev === "in_progress" ? undefined : "in_progress"));
    if (input === "3") setStatusFilter((prev) => (prev === "done" ? undefined : "done"));
    if (input === "f") setStatusFilter(undefined);
  });

  const counts = useMemo(() => {
    const result: Record<TaskStatus, number> = { todo: 0, in_progress: 0, done: 0 };
    for (const task of tasks) {
      result[task.status] = (result[task.status] ?? 0) + 1;
    }
    return result;
  }, [tasks]);

  const grouped = useMemo(() => {
    const statuses = statusFilter ? [statusFilter] : TASK_STATUSES;
    return statuses.map((status) => ({
      status,
      items: tasks.filter((task) => task.status === status),
    }));
  }, [tasks, statusFilter]);

  const columns = stdout?.columns ?? 80;
  const descriptionWidth = Math.max(20, columns - 40);

  return (
    <Box flexDirection="column">
      <Box
        borderStyle="round"
        borderColor="gray"
        paddingX={1}
        flexDirection="column"
      >
        <Box justifyContent="space-between">
          <Text bold>Cloud Tasks</Text>
          <Text dimColor>
            {auto ? `auto:on (${Math.round(intervalMs / 1000)}s)` : "auto:off"} · updated{" "}
            {secondsAgo(lastUpdated)}
            {loading ? " · refreshing…" : ""}
          </Text>
        </Box>
        <Text>
          {TASK_STATUSES.map((status) => (
            <Text key={status} color={STATUS_COLOR[status]}>
              {STATUS_LABEL[status]}({counts[status]})
              {"  "}
            </Text>
          ))}
        </Text>
      </Box>

      {error && (
        <Box paddingX={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      <Box flexDirection="column" paddingX={1}>
        {tasks.length === 0 && !loading && !error && <Text dimColor>No tasks found.</Text>}
        {grouped.map(({ status, items }) =>
          items.length === 0 ? null : (
            <Box key={status} flexDirection="column" marginTop={1}>
              <Text bold color={STATUS_COLOR[status]}>
                {STATUS_LABEL[status]} ({items.length})
              </Text>
              {items.map((task: Task) => (
                <Text key={task.id}>
                  {"  "}
                  <Text color={STATUS_COLOR[status]}>{STATUS_GLYPH[status]}</Text>{" "}
                  {truncate(task.description, descriptionWidth).padEnd(descriptionWidth)}{" "}
                  <Text dimColor>{task.assignee || "unassigned"}</Text>
                  {task.tags.length > 0 && <Text dimColor> [{task.tags.join(", ")}]</Text>}
                </Text>
              ))}
            </Box>
          ),
        )}
      </Box>

      <Box paddingX={1} marginTop={1}>
        <Text dimColor>
          [r] refresh  [a] toggle auto-refresh  [1/2/3] filter status  [f] clear filter  [q]
          quit
        </Text>
      </Box>
    </Box>
  );
}
