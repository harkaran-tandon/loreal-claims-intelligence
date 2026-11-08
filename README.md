# Claims Intelligence Engine

A full-stack technical assignment exploring AI-assisted review of cosmetic
product claims. A reviewer submits proposed claim wording and a description of
clinical evidence; the backend returns a structured, advisory assessment and
persists it in PostgreSQL. The React interface distinguishes real AI results
from deterministic mock results.

This is an evaluation project, not an official L'Oréal product. AI outputs do
not constitute scientific substantiation, regulatory approval, or professional
advice.

## Assignment objectives

- Model claims and assessments with PostgreSQL and Prisma.
- Provide a validated NestJS `POST /api/claims/assess` endpoint.
- Use OpenAI structured outputs to assess the submitted evidence.
- Persist claims and assessments transactionally.
- Provide a React interface for submission and review.
- Explain the business process, research, architecture, and proposed roadmap.

## Implemented features

- Required claim and clinical-evidence form with validation and loading/error
  states.
- OpenAI Responses API integration using a configurable model and Zod output
  schema.
- Optional deterministic backend mock mode; no external API key or call is
  needed in mock mode.
- PostgreSQL persistence of each claim and assessment.
- A `mockMode` response field and visible Demo / Mock AI indicator.
- Safe, sanitized provider error logging.
- Real OpenAI assessments for supporting and contradicting examples have been
  successfully tested end-to-end and saved to PostgreSQL.

The model-generated confidence score is a judgment score, **not a statistically
calibrated probability**. A qualified scientific and regulatory professional
must review assessments.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | NestJS, Node.js, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma 7 with PostgreSQL driver adapter |
| AI | OpenAI Node.js SDK Responses API, Zod structured outputs |
| Tests | Vitest, Jest, Supertest |

## Architecture

```mermaid
flowchart LR
  Reviewer --> Web[React + TypeScript]
  Web -->|POST /api/claims/assess| API[NestJS]
  API --> Validate[DTO validation]
  Validate --> Claims[Claims module]
  Claims --> AI[AiService]
  AI -->|Real mode| OpenAI[OpenAI Responses API]
  AI -->|Mock mode| Fixtures[Deterministic fixtures]
  Claims --> Prisma[Prisma 7]
  Prisma --> DB[(Local PostgreSQL)]
  Claims --> Web
```

## Project structure

```text
.
├── apps/
│   ├── api/
│   │   ├── prisma/              # Prisma schema and migrations
│   │   ├── src/ai/              # OpenAI integration and mock mode
│   │   ├── src/claims/          # Endpoint, DTO, persistence workflow
│   │   └── src/prisma/          # Prisma module/service
│   └── web/
│       └── src/                 # React app, components, API client, styles
└── docs/
    └── technical-proposal.md
```

## Prerequisites

- Node.js 22.12 or newer and npm.
- PostgreSQL 18 (or a compatible supported PostgreSQL release).
- An OpenAI API key only when running in real AI mode.

There is no root npm workspace; install and run commands from each app directory.

## Local PostgreSQL setup

On macOS with Homebrew, check whether PostgreSQL is already installed and
running before installing or starting anything:

```sh
brew list --versions postgresql@18
brew services list
```

If PostgreSQL 18 is not installed, install and start it:

```sh
brew install postgresql@18
brew services start postgresql@18
```

Use the following steps for a fresh local database. First inspect existing
roles/databases and do **not** overwrite an existing `loreal_claims` database or
role. If either already exists, use the existing authorized role/database or
resolve ownership with your local PostgreSQL administrator rather than deleting
or recreating it.

Create a dedicated login role and enter its password at the prompt:

```sh
"$(brew --prefix postgresql@18)/bin/createuser" --pwprompt --login claims_app
"$(brew --prefix postgresql@18)/bin/createdb" --owner=claims_app loreal_claims
```

The commands above are for resources that do not already exist. Verify the
server and database:

```sh
"$(brew --prefix postgresql@18)/bin/psql" -U claims_app -d loreal_claims -c '\conninfo'
```

The username is a project-specific local role, not the macOS account name. When
configuring `DATABASE_URL`, replace the password with the password you entered.
Use a URL-encoded password if it contains reserved URL characters.

## Install and configure

### Backend

```sh
cd apps/api
npm ci
cp .env.example .env
```

Edit `apps/api/.env` and set `DATABASE_URL` to your own local role, for example:

```dotenv
DATABASE_URL="postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:5432/loreal_claims?schema=public"
AI_MOCK_MODE=true
OPENAI_MODEL=gpt-4.1-mini
```

When `AI_MOCK_MODE=true`, no OpenAI API key is required and no provider request
is made. Mock results require the backend test markers described below; other
evidence returns the deterministic insufficient-evidence fixture.

Generate the Prisma client and apply the migrations in this repository:

```sh
npm run prisma:generate
npx prisma migrate deploy
```

`npm run prisma:migrate` runs `prisma migrate dev`, intended for local
development when creating or applying development migrations. The backend
Prisma 7 configuration is in `apps/api/prisma.config.ts`.

### Frontend

In a second terminal:

```sh
cd apps/web
npm ci
cp .env.example .env
```

The example sets `VITE_API_URL=http://localhost:3000/api`, which matches the
local NestJS default. Vite environment variables are public client configuration;
never put provider credentials in `apps/web`.

## Start the applications

Start the backend from `apps/api`:

```sh
npm run start:dev
```

Start the frontend from `apps/web` in a second terminal:

```sh
npm run dev
```

Open the Vite URL printed in the terminal, normally
<http://localhost:5173>. The API listens on port `3000` by default. Local CORS
allows the Vite development origins; `WEB_ORIGIN` can configure allowed origins
for a different environment.

## API

### `POST /api/claims/assess`

Request:

```json
{
  "claim": "Reduces wrinkles by 20% in 4 weeks",
  "evidence": "A controlled clinical study involving 80 participants reported an average 12% wrinkle reduction after 4 weeks, compared with 5% in the control group."
}
```

The claim is limited to 2,000 characters and evidence to 20,000. Both must be
non-empty strings; unexpected properties are rejected.

Response shape:

```json
{
  "claimId": "claim-uuid",
  "assessmentId": "assessment-uuid",
  "justified": false,
  "confidenceScore": 90,
  "reasoning": "Assessment rationale returned by the configured AI mode.",
  "mockMode": false
}
```

Response values above illustrate the shape only; the result and score are not
hardcoded in the frontend. The confidence score is not a calibrated probability.
The database also stores the evidence and `modelUsed`; the endpoint response does
not expose the model identifier.

Example request with `curl`:

```sh
curl -X POST http://localhost:3000/api/claims/assess \
  -H 'Content-Type: application/json' \
  -d '{"claim":"Reduces wrinkles by 20% in 4 weeks","evidence":"Describe the study, results, comparator, and limitations here."}'
```

## Real OpenAI integration

To use real AI, edit `apps/api/.env`:

```dotenv
AI_MOCK_MODE=false
OPENAI_API_KEY=your_real_key
OPENAI_MODEL=gpt-4.1-mini
```

Use a valid key in the backend environment only, restart NestJS after changing
environment variables, and never commit or share the `.env` file. The API key
must not be added to Vite variables or browser code. Real-mode provider errors
are returned in sanitized form; logs contain only selected provider metadata.

## Optional backend mock mode

Keep `AI_MOCK_MODE=true` to work without external AI access. In the submitted
evidence, use one of these explicit test markers:

- `[MOCK_FIXTURE:SUPPORTING]` — fixed supporting fixture.
- `[MOCK_FIXTURE:CONTRADICTING]` — fixed contradicting fixture.
- No recognized marker — fixed insufficient-evidence fixture.

These are deterministic interface/test fixtures, not scientific assessments.
Mock records use `modelUsed=mock-fixture-v1`, and API responses include
`"mockMode": true`.

## Tests and checks

Run commands in the relevant app directory:

```sh
# apps/api
npm run build
npm test
npm run test:jest
npm run test:e2e
npm run lint

# apps/web
npm run build
npm run lint
```

Real-provider calls are not part of automated tests; they can incur usage
charges. Unit tests mock provider/Prisma boundaries. End-to-end tests exercise
the Nest API; a running PostgreSQL instance and configured `DATABASE_URL` are
needed for live persistence verification.

## Known limitations and future improvements

- No authentication, role-based permissions, claim-manager/scientist/evaluator
  workflow, or approval/sign-off process.
- The endpoint accepts claim and evidence text only; it does not ingest or cite
  original study documents. `productName` is modeled but is not accepted by the
  current endpoint.
- AI conclusions and confidence scores need qualified human review and are not
  calibrated or validated as a regulatory decision system.
- No rate limiting, idempotency, background jobs, retention controls, or
  production operations/monitoring are implemented.
- Mock fixtures deliberately do not analyze evidence.

See the [technical proposal](docs/technical-proposal.md) for the business
workflow distinction, database and API design, research references, architecture
tradeoffs, security considerations, and phased roadmap. All roadmap items are
proposed unless explicitly listed as implemented above.
