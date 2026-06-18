import { HttpError } from "./errors";
import type { Env } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function decodeBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

interface JwkEntry {
  kid?: string;
  kty: string;
  alg?: string;
  crv?: string;
  [key: string]: unknown;
}

async function fetchPublicKeys(teamDomain: string): Promise<JwkEntry[]> {
  const url = `${teamDomain.replace(/\/$/, "")}/cdn-cgi/access/certs`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new HttpError(500, "Failed to fetch Cloudflare Access public keys.");
  }
  const data = (await res.json()) as { keys?: JwkEntry[] };
  if (!Array.isArray(data.keys) || data.keys.length === 0) {
    throw new HttpError(500, "Cloudflare Access returned no public keys.");
  }
  return data.keys;
}

async function importRsaKey(jwk: JwkEntry): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk as JsonWebKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, [
    "verify",
  ]);
}

async function importEcKey(jwk: JwkEntry): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk as JsonWebKey,
    { name: "ECDSA", namedCurve: (jwk.crv as string) ?? "P-256" },
    false,
    ["verify"],
  );
}

// ---------------------------------------------------------------------------
// CF Access JWT verification
// ---------------------------------------------------------------------------

async function verifyCloudflareAccessJwt(assertion: string, env: Env): Promise<{ email?: string }> {
  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_POLICY_AUD) {
    throw new HttpError(500, "Cloudflare Access environment variables are not configured.");
  }

  const parts = assertion.split(".");
  if (parts.length !== 3) {
    throw new HttpError(401, "Cloudflare Access assertion is malformed.");
  }

  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  let header: { kid?: string; alg?: string };
  let payload: { iss?: string; aud?: string | string[]; exp?: number; email?: string };

  try {
    header = JSON.parse(new TextDecoder().decode(decodeBase64Url(headerB64))) as typeof header;
    payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(payloadB64))) as typeof payload;
  } catch {
    throw new HttpError(401, "Cloudflare Access assertion could not be parsed.");
  }

  // Issuer check
  const expectedIss = env.CF_ACCESS_TEAM_DOMAIN.replace(/\/$/, "");
  if (payload.iss !== expectedIss) {
    throw new HttpError(401, "Cloudflare Access assertion issuer mismatch.");
  }

  // Audience check
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud ?? ""];
  if (!aud.includes(env.CF_ACCESS_POLICY_AUD)) {
    throw new HttpError(401, "Cloudflare Access assertion audience mismatch.");
  }

  // Expiration check
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) {
    throw new HttpError(401, "Cloudflare Access assertion has expired.");
  }

  // Signature verification
  const keys = await fetchPublicKeys(env.CF_ACCESS_TEAM_DOMAIN);
  const jwk = (header.kid ? keys.find((k) => k.kid === header.kid) : undefined) ?? keys[0];
  if (!jwk) {
    throw new HttpError(401, "No matching Cloudflare Access public key found.");
  }

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = decodeBase64Url(signatureB64);

  let cryptoKey: CryptoKey;
  try {
    cryptoKey = jwk.kty === "EC" ? await importEcKey(jwk) : await importRsaKey(jwk);
  } catch {
    throw new HttpError(401, "Failed to import Cloudflare Access public key.");
  }

  const valid = await crypto.subtle.verify(
    jwk.kty === "EC" ? { name: "ECDSA", hash: "SHA-256" } : "RSASSA-PKCS1-v1_5",
    cryptoKey,
    signature,
    signingInput,
  );
  if (!valid) {
    throw new HttpError(401, "Cloudflare Access assertion signature is invalid.");
  }

  // Optional single-user email allowlist
  if (env.ALLOWED_EMAILS) {
    const allowed = env.ALLOWED_EMAILS.split(",").map((e) => e.trim().toLowerCase());
    if (!payload.email || !allowed.includes(payload.email.toLowerCase())) {
      throw new HttpError(401, "Access denied: email not in allowlist.");
    }
  }

  return { email: payload.email };
}

// ---------------------------------------------------------------------------
// Auth strategies
// ---------------------------------------------------------------------------

function checkApiKey(request: Request, env: Env): void {
  if (!env.API_KEY) {
    throw new HttpError(500, "API_KEY secret is not configured.");
  }
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const apiKey = request.headers.get("x-api-key") ?? bearerToken;
  if (apiKey !== env.API_KEY) {
    throw new HttpError(401, "Unauthorized.");
  }
}

async function checkCloudflareAccess(request: Request, env: Env): Promise<void> {
  const assertion = request.headers.get("cf-access-jwt-assertion");
  if (!assertion) {
    throw new HttpError(401, "Missing Cloudflare Access assertion.");
  }
  await verifyCloudflareAccessJwt(assertion, env);
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function assertAuthorized(request: Request, env: Env): Promise<void> {
  const mode = env.AUTH_MODE ?? "api_key";

  if (mode === "api_key") {
    checkApiKey(request, env);
    return;
  }

  if (mode === "cloudflare_access") {
    await checkCloudflareAccess(request, env);
    return;
  }

  // hybrid: CF Access assertion takes priority; fall back to API key
  const assertion = request.headers.get("cf-access-jwt-assertion");
  if (assertion) {
    await verifyCloudflareAccessJwt(assertion, env);
    return;
  }
  checkApiKey(request, env);
}
