# REVORA
### Autonomous Revenue Recovery

Built for the **Razorpay AI Buildathon** — Track: AI Revenue Recovery.

---

## Problem

Every merchant loses revenue to failed payments — bank declines, expired cards, insufficient
funds, abandoned checkouts, failed subscription renewals. Most of that revenue is *recoverable*,
but recovering it manually doesn't scale: someone has to notice the failure, figure out why it
happened, decide what to do about it, and do it — all within limits that keep the customer
experience (and the merchant's compliance posture) intact.

## Solution

Revora is an autonomous agent that runs this loop for every failed transaction:

```
DETECT → DIAGNOSE → DECIDE → POLICY CHECK → ACT → VERIFY → RECOVER / ESCALATE / STOP
```

It detects at-risk revenue, diagnoses the likely failure cause, computes a recovery probability,
picks the best intervention, checks it against merchant-defined safety boundaries, executes it,
verifies the outcome, and either recovers the revenue, escalates to a human, or stops safely.
Every step is logged to an immutable audit trail.

## Features

- **Real agent pipeline** — OBSERVE → DIAGNOSE → DECIDE → POLICY CHECK → ACT → VERIFY → STOP/ESCALATE, animated live in the UI.
- **Deterministic, explainable AI** — no black-box calls required. The recovery-probability model is a transparent, inspectable function of transaction signals (customer history, retry count, contact count, amount, failure type).
- **Real policy engine** — retry limits, contact limits, high-value approval gates, cooldown windows, and unknown-state escalation are all enforced server-side and visible in the UI.
- **Recovery Queue** with filtering, search, and a full investigation drawer per transaction.
- **Recovery Lab** — configurable batch simulation with live processing animation and result charts.
- **Failure simulation** — trigger "Payment API unavailable", "Retry limit exceeded", etc. and watch the agent correctly block the action and explain why.
- **Full audit trail** — every decision and action, filterable by type.
- **Analytics** — recovery rate over time, failure distribution, action performance, probability distribution, customer segment recovery.
- **Architecture page** — visual pipeline + safety boundaries, pitch-ready.
- **Settings** that genuinely drive policy — change max retries or minimum probability and the agent's behavior changes immediately.
- **Zero paid API keys required.** Runs entirely on a deterministic synthetic dataset and a mocked Razorpay integration by default.

## Architecture

```
MERCHANT
  ↓
PAYMENT EVENTS
  ↓
REVENUE RISK DETECTOR
  ↓
AI DIAGNOSIS            (deterministic agent — server/src/agents/recoveryAgent.ts)
  ↓
RECOVERY POLICY ENGINE  (server/src/services/policyEngine.ts)
  ↓
ACTION EXECUTOR         (server/src/services/recoveryService.ts)
  ↓
RAZORPAY TEST APIs      (server/src/services/razorpayService.ts — demo or test mode)
  ↓
VERIFICATION
  ↓
AUDIT TRAIL
```

## Agent workflow

1. **Observe** — a failed/at-risk transaction enters the queue.
2. **Diagnose** — the deterministic agent classifies the failure and estimates confidence.
3. **Decide** — a recovery probability is computed and an intervention is recommended (Payment Link, Retry, Retry Later, Update Payment Method, Recovery Reminder, Escalate, or Stop).
4. **Policy check** — the recommended action is evaluated against merchant-defined boundaries.
5. **Act** — if allowed, the action executes (e.g. a Razorpay Payment Link is generated).
6. **Verify** — the outcome is checked.
7. **Recover / Escalate / Stop** — the transaction resolves, or is safely routed to a human, or the agent stops to avoid unsafe/wasteful action.

## Recovery decision engine

`server/src/agents/recoveryAgent.ts` computes recovery probability from: base rate per failure
reason, previous successful payments, previous failures, retry count already used, contact count
already used, transaction amount vs. high-value threshold, and customer lifetime value. Every
factor is surfaced as a plain-English reasoning line in the UI — nothing is a hidden weight.

## Safety policies

`server/src/services/policyEngine.ts` implements, in order:

1. Already recovered → **STOP** (no duplicate action)
2. Retry count ≥ max retries → **STOP**
3. Contact count ≥ max contacts → **ESCALATE**
4. Amount > high-value threshold → **REQUIRE APPROVAL**
5. Recovery probability < minimum → **STOP** or **ESCALATE** depending on severity
6. Action inside cooldown window → **BLOCK DUPLICATE**
7. Unknown payment state → **ESCALATE**

Every rule produces a labelled pass/fail row shown directly in the transaction detail drawer.

## Razorpay integration

`server/src/services/razorpayService.ts` exposes `createPaymentLink`, `fetchPayment`,
`fetchOrder`, and `getPaymentStatus`.

- **Demo Mode (default):** no credentials needed. Returns deterministic, clearly-labelled mocked responses.
- **Razorpay Test Mode:** set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `server/.env` (see `.env.example`) and Revora automatically calls the real Razorpay Test API. Never uses real money. If the API call fails for any reason, Revora gracefully falls back to a mocked response so a live demo never breaks.

Secrets are read only in `server/src/services/razorpayService.ts` via `process.env` — they are
never sent to the frontend. The `/api/settings` endpoint returns only masked values.

## AI integration

`server/src/services/aiService.ts` exposes `runDiagnosis`. The deterministic Demo Agent
(`AI_PROVIDER=demo`, the default) requires no key and always runs first to produce the
probability/decision math. If `AI_PROVIDER=openai` or `AI_PROVIDER=anthropic` with a valid key
is configured, Revora will additionally call that provider to enrich the natural-language
diagnosis sentence — with the same deterministic fallback safety net.

## Demo mode

Revora launches in **DEMO MODE** by default — visible in the sidebar and on the landing page.
It uses 100 seeded synthetic transactions and mocked Razorpay responses so the entire product
works immediately after `npm install`, with zero configuration.

## Synthetic dataset

`server/src/data/generateTransactions.ts` deterministically generates 100 transactions (seeded
PRNG, so the dataset is identical across restarts) with realistic Indian customer names, INR
amounts, and a realistic mix of failure reasons, customer histories, and resolution states.

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Server + mode status |
| GET | `/api/dashboard` | KPI summary + time series |
| GET | `/api/transactions` | List, with `status`, `search`, `filter` query params |
| GET | `/api/transactions/:id` | Single transaction detail |
| POST | `/api/agent/run` | Run agent on `{ transactionId }` |
| POST | `/api/recovery/simulate` | Run a configurable batch simulation |
| POST | `/api/recovery/:id/execute` | Execute recovery for a transaction |
| POST | `/api/recovery/:id/pause` | Pause a transaction |
| POST | `/api/recovery/:id/escalate` | Manually escalate a transaction |
| POST | `/api/recovery/:id/simulate-failure` | Trigger a named failure scenario |
| GET | `/api/audit` | Audit trail, with `filter` query param |
| GET | `/api/analytics` | Full analytics payload |
| GET | `/api/settings` | Current policy + masked credential status |
| POST | `/api/settings` | Update recovery policies |
| POST | `/api/reset` | Reset the in-memory dataset |

## Environment variables

Copy `.env.example` to `server/.env` (all optional — the app runs fully without any of them):

```
PORT=5000
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
AI_PROVIDER=demo
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

## Local setup

Requires Node.js 18+.

```bash
npm install --prefix server
npm install --prefix client
npm run dev
```

This runs the Express API on `http://localhost:5000` and the Vite dev server on
`http://localhost:5173` (which proxies `/api` to the backend) concurrently.

Then open **http://localhost:5173**.

```bash
npm run build
```

Builds the server (`server/dist`) and the client (`client/dist`) for production.

## Deployment

- **Backend:** deploy `server/` (after `npm run build`) to any Node host (Render, Railway, Fly.io, EC2). Set environment variables from `.env.example` as needed.
- **Frontend:** deploy `client/dist` (after `npm run build`) to any static host (Vercel, Netlify, S3+CloudFront), pointing `/api` requests at the deployed backend URL (update the proxy / add a base URL env var as needed for your host).

## Exact demo walkthrough (~5 minutes)

1. Launch Revora → land on the entry screen → **Launch Demo**.
2. Overview: point out Revenue at Risk, Recovered Revenue, Recovery Rate KPI cards (all computed live from the dataset).
3. Open **Recovery Queue**.
4. Select any `Ready` transaction (e.g. the top row).
5. Walk through AI Diagnosis, recovery probability, recommended action, evidence, and safety checks in the drawer.
6. Click **Execute Recovery** — watch the transaction resolve and its status update live.
7. Open **Audit Trail** — show the complete decision/action log for that transaction.
8. Open **Recovery Lab** → set Batch Size to 100 → click **Run Agent**.
9. Watch batch rows animate in, then review Batch Results: revenue at risk, recovered, recovery rate, escalations, stopped.
10. Click **Retry Limit Exceeded** under Simulate Failure → show the **ACTION BLOCKED** panel and explain the policy that fired.
11. Open **Architecture** → walk through the full pipeline and the safety boundaries.

## Pitch talking points

- **It's a real agent, not a dashboard.** Every button click runs actual policy logic and mutates real application state — no button just flashes "Success."
- **Fully explainable.** Every probability, diagnosis, and decision traces back to a visible, deterministic calculation — no opaque model calls required to demo.
- **Safety-first by construction.** The agent cannot duplicate actions, exceed retry/contact limits, or silently touch high-value transactions — it escalates or stops instead, and shows you exactly why.
- **Zero setup cost.** Judges can run this in under two minutes with no API keys, and it upgrades cleanly to live Razorpay Test Mode the moment credentials are added.
