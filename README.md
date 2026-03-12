# AI Q&A

A full-stack AI-powered Q&A application that demonstrates how to get **validated, structured JSON output** from a Large Language Model (LLM). The user asks a question, and the LLM returns a machine-parseable JSON response with a `summary` and a `confidence` score — validated at runtime with Zod.

> **Note:** This app has no memory, no tool calling, and no web search. Each question is answered independently using a single LLM call that returns structured JSON.

---

## Data Flow (End to End)

```
User types a question (e.g. "What is React?")
        │
        ▼
Browser sends POST /api/ask { query: "What is React?" }
        │
        ▼
Next.js Route Handler (client/src/app/api/ask/route.ts)
  — acts as a proxy, forwards the request to the Express backend
        │
        ▼
Express Backend receives POST /ask (backend/src/server.ts)
  — validates that the query field exists
        │
        ▼
askStructured() is called (backend/src/ask-core.ts)
  — builds a system + user prompt instructing the LLM to return JSON
  — sends the prompt to Groq API with response_format: { type: 'json_object' }
        │
        ▼
ChatGroq / Llama 3.1 8B Instant (via @langchain/groq)
  — LLM generates a JSON response: { "summary": "...", "confidence": 0.95 }
        │
        ▼
Zod Validation (backend/src/schema.ts)
  — AskResultSchema.parse() ensures the JSON matches { summary: string, confidence: number }
  — throws a clear error if the LLM returned something unexpected
        │
        ▼
Express responds with 200 and the validated JSON
        │
        ▼
Next.js proxy forwards the response to the browser
        │
        ▼
React UI renders an answer card showing the summary + confidence score
```

---

## Project Structure

```
json_structured_output_abdul/
├── backend/                  # Express + LangChain API server (port 3002)
│   ├── src/
│   │   ├── env.ts            # Loads .env variables (singleton)
│   │   ├── lc-model.ts       # Creates the ChatGroq model instance
│   │   ├── schema.ts         # Zod schema for structured LLM output
│   │   ├── ask-core.ts       # Core logic: prompt → LLM → validate
│   │   └── server.ts         # Express HTTP server with POST /ask
│   ├── .env                  # GROQ_API_KEY, PORT
│   ├── package.json
│   └── tsconfig.json
│
└── client/                   # Next.js frontend (port 3000)
    ├── src/
    │   ├── app/
    │   │   ├── api/ask/route.ts   # Proxy route handler → backend
    │   │   ├── page.tsx           # Main chat UI
    │   │   ├── layout.tsx         # Root layout with fonts
    │   │   └── globals.css        # Tailwind v4 + shadcn theme
    │   ├── components/ui/         # shadcn components (Button, Card, Input)
    │   └── lib/utils.ts           # cn() utility for class merging
    ├── .env                  # NEXT_PUBLIC_BACKEND_URL
    ├── components.json        # shadcn configuration
    ├── package.json
    └── tsconfig.json
```

---

## Backend Dependencies

Install in the `backend/` folder.

### 1. Initialize the project

```bash
npm init -y
```

### 2. Install TypeScript & dev tooling (install first — needed to run everything)

```bash
npm install -D typescript tsx @types/node @types/express @types/cors
```

| Package          | Why                                                                           |
| ---------------- | ----------------------------------------------------------------------------- |
| `typescript`     | TypeScript compiler and type-checking                                         |
| `tsx`            | Runs .ts files directly without a compile step (used by `npm run dev:server`) |
| `@types/node`    | Type definitions for Node.js APIs                                             |
| `@types/express` | Type definitions for Express                                                  |
| `@types/cors`    | Type definitions for the cors middleware                                      |

### 3. Install runtime dependencies

```bash
npm install express cors dotenv zod @langchain/groq
```

| Package           | Why                                                                           |
| ----------------- | ----------------------------------------------------------------------------- |
| `express`         | HTTP server framework — exposes the `/ask` endpoint                           |
| `cors`            | Allows cross-origin requests from the Next.js frontend (port 3000 → 3002)     |
| `dotenv`          | Loads `.env` file variables into `process.env` (keeps API keys out of code)   |
| `zod`             | Runtime schema validation — ensures the LLM's JSON matches the expected shape |
| `@langchain/groq` | LangChain wrapper for the Groq inference API — provides the `ChatGroq` class  |

### 4. Add dev script to `package.json`

```json
"scripts": {
  "dev:server": "tsx src/server.ts"
}
```

### 5. Create `.env` in the backend root

```
GROQ_API_KEY=your_groq_api_key_here
PROVIDER=groq
PORT=3002
```

---

## Client (Frontend) Dependencies

Install in the `client/` folder.

### 1. Create the Next.js app

```bash
npx create-next-app@latest client
```

Select: TypeScript, Tailwind CSS, App Router, `src/` directory.

### 2. Install shadcn and its peer dependencies

```bash
npx shadcn@latest init
```

This automatically installs:

| Package                    | Why                                                             |
| -------------------------- | --------------------------------------------------------------- |
| `shadcn`                   | CLI for adding pre-built, customizable UI components            |
| `@base-ui/react`           | Headless UI primitives that shadcn v4 builds on                 |
| `class-variance-authority` | Type-safe component variant styles (button sizes, colors, etc.) |
| `clsx`                     | Conditionally joins CSS class names                             |
| `tailwind-merge`           | Resolves Tailwind class conflicts intelligently                 |
| `tw-animate-css`           | Animation utilities for shadcn components                       |
| `lucide-react`             | SVG icon library as React components                            |

### 3. Add the UI components you need

```bash
npx shadcn@latest add button card input
```

### 4. Already included via `create-next-app`

| Package                                | Why                                                         |
| -------------------------------------- | ----------------------------------------------------------- |
| `next`                                 | React meta-framework — routing, API routes, SSR, dev server |
| `react` / `react-dom`                  | Core React library                                          |
| `tailwindcss` / `@tailwindcss/postcss` | Tailwind CSS v4 and its PostCSS integration                 |

### 5. Create `.env` in the client root

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
```

---

## Getting Started

### 1. Start the backend

```bash
cd backend
npm install
npm run dev:server
```

### 2. Start the client

```bash
cd client
npm install
npm run dev
```

### 3. Open the app

Navigate to [http://localhost:3000](http://localhost:3000), type a question, and press **Ask**.

---

## Key Concepts Demonstrated

- **JSON Object Mode** — `response_format: { type: 'json_object' }` constrains the LLM to output valid JSON
- **Runtime validation with Zod** — guarantees the LLM's output matches the expected TypeScript type
- **API proxy pattern** — Next.js route handler forwards requests to the backend, hiding the backend URL from the browser
- **LangChain abstraction** — swap LLM providers (OpenAI, Gemini, Groq) with minimal code changes
