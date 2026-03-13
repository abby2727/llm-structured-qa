# Deploying an Express + TypeScript Backend to Vercel

A reference guide based on real deployment experience. Covers all the gotchas.

---

## Prerequisites

- Express backend written in TypeScript
- Code pushed to a GitHub repository
- A [Vercel](https://vercel.com) account connected to that GitHub account

---

## 1. Required Code Changes

Vercel is **serverless** — it does not run a persistent server. You must adapt your Express app before deploying.

### 1a. Split the app from the listener

Separate your Express setup from `app.listen()` so Vercel can import the app without starting a server.

**`src/app.ts`** — Express app only (no `listen`):
```ts
import express from 'express';
import cors from 'cors';

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:3000'];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/', (_req, res) => {
    res.json({ status: 'online' });
});

// ... your routes here ...

export default app;
```

**`src/server.ts`** — local dev only:
```ts
import app from './app.js';

const PORT = process.env.PORT ?? 3002;

app.listen(PORT, () => {
    console.log(`api is listening to port ${PORT}`);
});
```

### 1b. Create the Vercel entry point

Create an `api/` folder at the project root (or backend root) with an `index.ts` that re-exports the app:

**`api/index.ts`**:
```ts
import app from '../src/app.js';

export default app;
```

### 1c. Create `vercel.json`

At the backend root, create `vercel.json` to route all requests to the serverless function:

```json
{
    "version": 2,
    "builds": [
        { "src": "api/index.ts", "use": "@vercel/node" }
    ],
    "routes": [
        { "src": "/(.*)", "dest": "api/index.ts" }
    ]
}
```

---

## 2. Required `package.json` Changes

```json
{
    "type": "module",
    "scripts": {
        "dev:server": "tsx src/server.ts",
        "start": "tsx src/server.ts"
    },
    "dependencies": {
        "tsx": "^4.x.x"
    }
}
```

**Why each change:**

| Change | Reason |
|---|---|
| `"type": "module"` | Tells Node.js to treat `.js` files as ESM — required because TypeScript compiles to ESM `import`/`export` syntax |
| `"start"` script | Vercel runs `npm start` in production |
| `tsx` in `dependencies` (not `devDependencies`) | Vercel only installs `dependencies` in production — `tsx` must be available at runtime |

> Do **not** add `PORT` as an env var — Vercel injects it automatically.

---

## 3. Required `tsconfig.json` Changes

```json
{
    "compilerOptions": {
        "target": "es2022",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "strict": true,
        "esModuleInterop": true,
        "resolveJsonModule": true,
        "skipLibCheck": true,
        "noEmit": true,
        "types": ["node"]
    },
    "include": ["src", "api"]
}
```

**Key changes from a typical tsconfig:**

| Setting | Value | Reason |
|---|---|---|
| `module` | `NodeNext` | Matches Node.js native ESM behavior |
| `moduleResolution` | `NodeNext` | Required when `module` is `NodeNext` |
| `include` | `["src", "api"]` | TypeScript must know about the `api/` folder too |

---

## 4. ESM Import Rule — CRITICAL

In Node.js ESM mode, all relative imports **must include the `.js` extension**. Node.js will not auto-resolve bare paths.

```ts
// WRONG — will crash at runtime
import app from './app';
import { helper } from '../utils/helper';

// CORRECT
import app from './app.js';
import { helper } from '../utils/helper.js';
```

This applies to **every** `.ts` file that imports from a local relative path. Third-party packages (`express`, `cors`, etc.) do not need extensions.

---

## 5. CORS Configuration

Hardcoding `localhost` will block your deployed frontend. Read the allowed origins from an env var:

```ts
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:3000'];

app.use(cors({ origin: allowedOrigins }));
```

Set `CORS_ORIGIN` in Vercel env vars after the frontend is deployed (comma-separated if multiple origins).

---

## 6. Vercel Deployment Steps

1. **Push all changes to GitHub**

2. **Go to [vercel.com](https://vercel.com) → New Project → Import your repo**

3. **Configure the project:**

    | Setting | Value |
    |---|---|
    | Root Directory | `backend` (or whichever folder contains your backend) |
    | Framework Preset | Other |
    | Build Command | *(leave empty)* |
    | Output Directory | *(leave empty)* |

4. **Add Environment Variables** (Settings → Environment Variables):

    | Key | Value |
    |---|---|
    | `GROQ_API_KEY` / `OPENAI_API_KEY` / etc. | your actual API key |
    | `CORS_ORIGIN` | your frontend URL (add after frontend is deployed) |

    > Do **not** add `PORT`.

5. **Deploy** — Vercel gives you a URL like `https://your-project.vercel.app`

6. **Test it in Postman:**
    ```
    POST https://your-project.vercel.app/your-endpoint
    Content-Type: application/json

    { "yourField": "value" }
    ```

---

## 7. After Frontend is Deployed

Update `CORS_ORIGIN` in Vercel environment variables with the frontend URL:

```
CORS_ORIGIN=https://your-frontend.vercel.app
```

Then trigger a redeploy (Vercel → Deployments → Redeploy).

---

## 8. Limitations on Vercel Free (Hobby) Plan

| Limit | Value |
|---|---|
| Function timeout | 10 seconds per request |
| Execution regions | Limited |
| Bandwidth | 100 GB/month |

If your endpoint calls an external API (like an LLM) that can take a long time, be aware of the 10s timeout. Prompts designed for short responses are unlikely to hit it.

---

## Common Errors and Fixes

| Error | Cause | Fix |
|---|---|---|
| `SyntaxError: Cannot use import statement outside a module` | Missing `"type": "module"` in `package.json` | Add `"type": "module"` |
| `ERR_MODULE_NOT_FOUND: Cannot find module './app'` | Missing `.js` extension on relative import | Change `'./app'` → `'./app.js'` |
| `FUNCTION_INVOCATION_FAILED` on every request | Missing env vars (e.g. API key) | Add required env vars in Vercel dashboard |
| Function crashes but build succeeds | Runtime error, not build error | Check **Logs** tab in Vercel (not Build Logs) |
| CORS error from browser | Frontend origin not in allowed list | Set `CORS_ORIGIN` env var in Vercel |
