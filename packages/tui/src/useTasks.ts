import { useCallback, useEffect, useRef, useState } from "react";
import { listTasks } from "./api.js";
import type { Config } from "./config.js";
import type { Task } from "./types.js";

export interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | undefined;
  lastUpdated: Date | undefined;
  auto: boolean;
  intervalMs: number;
  refresh: () => void;
  toggleAuto: () => void;
}

export function useTasks(config: Config): TasksState {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);
  const [auto, setAuto] = useState(config.autoRefresh);

  // Tracks in-flight fetches so overlapping ticks don't race each other.
  const inFlight = useRef(false);

  const fetchTasks = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const result = await listTasks(config);
      setTasks(result);
      setError(undefined);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, [config]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!auto) return;
    const timer = setInterval(() => {
      void fetchTasks();
    }, config.intervalMs);
    return () => clearInterval(timer);
  }, [auto, config.intervalMs, fetchTasks]);

  const refresh = useCallback(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const toggleAuto = useCallback(() => {
    setAuto((prev) => !prev);
  }, []);

  return { tasks, loading, error, lastUpdated, auto, intervalMs: config.intervalMs, refresh, toggleAuto };
}
