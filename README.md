# CoreAudit

CoreAudit includes two main workflows:

- **Code Auditor** — code and repository analysis.
- **Business Evaluator** — structured business idea and plan evaluation.

Both AI-powered workflows use the Meta Model API from the server. No Google Gemini SDK or Gemini API fallback is included.

## Requirements

- Node.js 20.19+ or 22.12+
- A Meta Model API key from https://dev.meta.ai/

## Configure the Meta API key

Create a server-side environment variable named `MODEL_API_KEY` with your Meta Model API key. For backward compatibility, `META_API_KEY` is also accepted, but `MODEL_API_KEY` is the official variable name.

**Never put the key in frontend code, commit it to Git, or share it in chat.** If a key has been exposed, revoke it and create a replacement.

For local development, copy `.env.example` to `.env`, put the key in `.env`, and keep `.env` private. The repository `.gitignore` excludes `.env*` files while allowing `.env.example`.

## Install and run

```bash
npm install
npm run dev
```

## Build and checks

```bash
npm run lint
npm run build
```

The server exposes `/api/health` for configuration status and `/api/llm/test` for a live Meta API readiness request. These endpoints require a correctly configured server-side key to return a successful live result.

## Deployment notes

Deploy the project to a Node.js-capable host. Configure `MODEL_API_KEY` in the host's server-side environment settings. Do not add the secret to GitHub or any `VITE_` variable, because Vite variables can be exposed to browser code.

The JSON files in `data/` are local file-based storage and may not persist on ephemeral/serverless hosting. Use persistent storage before relying on account or history data in production.
