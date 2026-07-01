export interface Config {
  baseUrl: string;
  apiKey: string;
  intervalMs: number;
  autoRefresh: boolean;
}

const USAGE =
  "Usage: WORKER_URL=<url> API_KEY=<key> cloud-tasks-tui [--url <url>] [--key <key>] [--interval <seconds>] [--no-auto]";

function parseFlags(argv: string[]): {
  url?: string;
  key?: string;
  interval?: string;
  noAuto: boolean;
} {
  const flags: { url?: string; key?: string; interval?: string; noAuto: boolean } = {
    noAuto: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--url":
        flags.url = argv[++i];
        break;
      case "--key":
        flags.key = argv[++i];
        break;
      case "--interval":
        flags.interval = argv[++i];
        break;
      case "--no-auto":
        flags.noAuto = true;
        break;
      default:
        break;
    }
  }

  return flags;
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/$/, "");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    new URL(withScheme);
  } catch {
    console.error(USAGE);
    console.error(`Invalid WORKER_URL: "${raw}"`);
    process.exit(1);
  }

  return withScheme;
}

export function resolveConfig(argv: string[] = process.argv.slice(2)): Config {
  const flags = parseFlags(argv);

  const rawBaseUrl = flags.url ?? process.env.WORKER_URL ?? "";
  const apiKey = flags.key ?? process.env.API_KEY ?? "";

  if (!rawBaseUrl || !apiKey) {
    console.error(USAGE);
    console.error(
      "Set WORKER_URL and API_KEY (env or --url/--key). See env.example for a template.",
    );
    process.exit(1);
  }

  const baseUrl = normalizeBaseUrl(rawBaseUrl);

  const intervalSeconds = Number(flags.interval ?? process.env.REFRESH_INTERVAL ?? "5");
  const intervalMs =
    Number.isFinite(intervalSeconds) && intervalSeconds > 0 ? intervalSeconds * 1000 : 5000;

  return {
    baseUrl,
    apiKey,
    intervalMs,
    autoRefresh: !flags.noAuto,
  };
}
