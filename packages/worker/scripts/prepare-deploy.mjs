import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const databaseName = process.env.D1_DATABASE_NAME ?? "cloud-tasks";
const configPath = resolve("wrangler.jsonc");
const placeholderId = "00000000-0000-0000-0000-000000000000";

function runWrangler(args) {
  return execFileSync("npx", ["wrangler", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function loadConfig() {
  return JSON.parse(readFileSync(configPath, "utf8"));
}

function saveConfig(config) {
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

function extractDatabaseId(output) {
  const match = output.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (!match) {
    throw new Error(`Could not find a D1 database_id in Wrangler output:\n${output}`);
  }
  return match[0];
}

try {
  const authOutput = runWrangler(["whoami"]);
  if (/not authenticated/i.test(authOutput)) {
    throw new Error(authOutput.trim());
  }
} catch {
  console.error(
    "Wrangler is not authenticated. Run `npx wrangler login` in an interactive terminal, or set CLOUDFLARE_API_TOKEN for this non-interactive environment.",
  );
  process.exit(1);
}

const config = loadConfig();
const binding = config.d1_databases?.find((database) => database.binding === "DB");
if (!binding) {
  console.error("No D1 binding named DB found in wrangler.jsonc.");
  process.exit(1);
}

if (binding.database_id && binding.database_id !== placeholderId) {
  console.log(`D1 binding already configured for ${binding.database_name} (${binding.database_id}).`);
  process.exit(0);
}

console.log(`Creating D1 database '${databaseName}'...`);
let output;
try {
  output = runWrangler(["d1", "create", databaseName]);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to create D1 database '${databaseName}'.`);
  console.error(message);
  process.exit(1);
}
const databaseId = extractDatabaseId(output);

binding.database_name = databaseName;
binding.database_id = databaseId;
saveConfig(config);

console.log(`Updated wrangler.jsonc with D1 database_id ${databaseId}.`);
console.log("Next: `npm run db:migrate:remote`, `npx wrangler secret put API_KEY`, then `npm run deploy`.");
