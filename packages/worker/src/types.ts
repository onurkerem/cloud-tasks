export type TaskStatus = "todo" | "in_progress" | "done";

export interface Env {
  DB: D1Database;
  API_KEY?: string;
  /** e.g. https://<team>.cloudflareaccess.com */
  CF_ACCESS_TEAM_DOMAIN?: string;
  /** AUD tag from the Cloudflare Access application */
  CF_ACCESS_POLICY_AUD?: string;
  /** Comma-separated allowlist of emails checked after CF Access validation */
  ALLOWED_EMAILS?: string;
  /** Full URL (incl. path) of the n8n dispatcher webhook, reached via Cloudflare Tunnel */
  N8N_WEBHOOK_URL?: string;
  /** Shared secret sent as X-Webhook-Secret to the n8n dispatcher webhook */
  N8N_WEBHOOK_SECRET?: string;
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
