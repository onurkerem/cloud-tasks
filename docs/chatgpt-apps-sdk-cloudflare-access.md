# ChatGPT Apps SDK + Cloudflare Access — Setup Guide

This guide explains how to connect a ChatGPT App (via the Apps SDK / remote MCP) to the
cloud-tasks Worker using Cloudflare Access Managed OAuth as the authentication layer.

```
ChatGPT App
  → Cloudflare Access (Managed OAuth, validates user identity)
  → cf-access-jwt-assertion header injected into every request
  → Cloud Tasks Worker (verifies the assertion, serves MCP tools)
```

No custom OAuth server is required. Cloudflare Access acts as the OAuth 2.0 provider.

---

## 1. Prerequisites

- A Cloudflare account with [Zero Trust](https://one.dash.cloudflare.com) enabled (free tier is fine).
- The cloud-tasks Worker deployed at your custom domain (e.g. `tasks.example.com`).

---

## 2. Cloudflare Zero Trust setup

### 2a. Create a Zero Trust organization

1. Go to [Cloudflare Zero Trust dashboard](https://one.dash.cloudflare.com).
2. Complete onboarding — choose a team name (e.g. `myteam`). This becomes your team domain:
   `https://myteam.cloudflareaccess.com`.
3. The free tier covers this use case fully.

### 2b. Configure an identity provider

For a single-user personal setup, **One-time PIN** is the simplest option:

1. In Zero Trust → **Settings → Authentication**, click **Add new**.
2. Select **One-time PIN**. Enable it. No additional config needed.

Or add Google, GitHub, or any OIDC/SAML provider if you prefer.

### 2c. Create a Self-Hosted Access Application

1. Go to **Access → Applications → Add an application**.
2. Choose **Self-hosted**.
3. Fill in:
   - **Application name**: `cloud-tasks MCP`
   - **Session duration**: `24 hours` (adjust to taste)
   - **Application domain**: `tasks.example.com/mcp` (your Worker MCP path)
4. Under **Policies**, add a policy:
   - **Policy name**: `owner only`
   - **Action**: Allow
   - **Include rule**: *Emails* → enter your own email address
5. Save.
6. Back on the application's detail page, copy the **Application Audience (AUD) Tag** — you will
   need it as `CF_ACCESS_POLICY_AUD`.

### 2d. Enable Managed OAuth

1. Open the Access Application you just created.
2. Go to **Settings → Advanced**.
3. Enable **Managed OAuth / OAuth 2.0 token issuance**.
4. Leave the redirect URI list empty for now — ChatGPT will show you the URI when you add the
   connector. Add it here once you have it.

---

## 3. Worker configuration

### 3a. Required secrets (set once per environment)

```sh
# From packages/worker
wrangler secret put API_KEY          # keep your existing static key
wrangler secret put CF_ACCESS_TEAM_DOMAIN   # e.g. https://myteam.cloudflareaccess.com
wrangler secret put CF_ACCESS_POLICY_AUD    # AUD tag from step 2c
```

Optional — restrict to a single email even after CF Access validates:

```sh
wrangler secret put ALLOWED_EMAILS   # e.g. you@example.com
```

### 3b. Set AUTH_MODE

Add to `wrangler.jsonc` under `vars` (not a secret — safe to commit):

```jsonc
{
  "vars": {
    "AUTH_MODE": "hybrid"
  }
}
```

`hybrid` lets existing static-key clients keep working while also accepting Cloudflare Access JWTs.

Use `cloudflare_access` to disable the API key path entirely in production.

### 3c. Local development

Keep your `.dev.vars` as-is:

```
API_KEY=local-dev-secret
# AUTH_MODE not set → defaults to "api_key"
```

Local dev continues to use only the static API key; no Cloudflare Access config required.

---

## 4. Auth mode reference

| `AUTH_MODE` | Accepts static API key | Accepts CF Access JWT | Notes |
|---|---|---|---|
| `api_key` (default) | Yes | No | Backward-compatible default |
| `cloudflare_access` | No | Yes | Fully locked to CF Access |
| `hybrid` | Yes (fallback) | Yes (preferred) | Recommended for production |

In `hybrid` mode the Worker checks for a `Cf-Access-Jwt-Assertion` header first. If the header is
absent it falls back to the static API key. This means existing MCP clients using `Authorization:
Bearer <API_KEY>` or `X-Api-Key: <API_KEY>` continue to work unchanged.

---

## 5. ChatGPT App connector setup

1. In ChatGPT → **Apps → Add an app → Connect via MCP**.
2. Enter your MCP endpoint URL: `https://tasks.example.com/mcp`.
3. ChatGPT will display its OAuth redirect URI. Copy it.
4. Go back to your Cloudflare Access Application → **Settings → Advanced → Managed OAuth** and add
   that URI to the **Allowed redirect URIs** list.
5. Save. ChatGPT should now complete the OAuth flow using Cloudflare Access and Managed OAuth.

---

## 6. Testing

### Test static API key still works

```sh
curl -s https://tasks.example.com/mcp \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | grep "cloud-tasks"
```

Expected: 200 response with the tools list.

### Test missing credentials are rejected

```sh
curl -s -o /dev/null -w "%{http_code}" https://tasks.example.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
# Expected: 401
```

### Expected failure cases

| Scenario | HTTP status | Error message |
|---|---|---|
| No credentials provided | 401 | Unauthorized. |
| Wrong API key | 401 | Unauthorized. |
| CF Access assertion with wrong audience | 401 | Cloudflare Access assertion audience mismatch. |
| Expired CF Access assertion | 401 | Cloudflare Access assertion has expired. |
| CF Access assertion with unknown signing key | 401 | No matching Cloudflare Access public key found. |
| Email not in `ALLOWED_EMAILS` | 401 | Access denied: email not in allowlist. |
| `CF_ACCESS_TEAM_DOMAIN` not configured in `cloudflare_access` mode | 500 | Cloudflare Access environment variables are not configured. |

---

## 7. How the Worker validates the CF Access JWT

When Cloudflare Access permits a request, it injects a `Cf-Access-Jwt-Assertion` header containing
a signed JWT. The Worker:

1. Fetches the public JWKS from `<CF_ACCESS_TEAM_DOMAIN>/cdn-cgi/access/certs`.
2. Locates the matching key by `kid`.
3. Verifies the JWT signature using the Web Crypto API (RS256 or ES256).
4. Checks that `iss` equals `CF_ACCESS_TEAM_DOMAIN`.
5. Checks that `aud` contains `CF_ACCESS_POLICY_AUD`.
6. Checks that `exp` is in the future.
7. Optionally checks that `email` is in `ALLOWED_EMAILS`.

The raw assertion and API key are never logged. Only the validated email may appear in logs.
