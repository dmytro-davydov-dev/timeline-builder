# Phase 1 Implementation Plan — Medical Timeline AI

> 🗺️ [[MOC|Map of Content]] · refined by [[Architecture]] and the [[PRD-Overview|PRDs in docs/]]

Detailed build plan for the Phase 1 MVP (no n8n) described in `Medical-timeline-MVP-plan.md`. Scoped for a hackathon timeline: fast to build, demoable end-to-end, structurally sound enough to extend into Phase 2.

## 0. Repo & Environment Setup

- Monorepo, two packages: `apps/web` (Vite + React + TS) and `apps/api` (NestJS + TS). Use npm/pnpm workspaces so both share root tooling (ESLint, Prettier, TS config).
- `apps/api` uses SQLite via TypeORM (or Prisma) for zero-setup local dev; connection string swappable to Postgres later with no code change beyond the driver.
- Env vars: `OPENAI_API_KEY` (or `GEMINI_API_KEY`), `DATABASE_URL`, `PORT`. `.env.example` committed, `.env` gitignored.
- Seed script that loads a sample Excel file into a demo case, for reliable local testing and the demo itself.

## 1. Data Model

```
Case
  id, name, patientAlias, accidentDate (nullable, manual milestone), createdAt

MedicalEvent
  id, caseId (FK)
  date (datetime)
  recordType        // e.g. "Office Visit", "MRI", "PT Session", "ER Visit"
  provider          // string, normalized/trimmed on import
  bodyPart          // string or string[] (comma-split on import)
  medicineType      // e.g. "NSAID", "Opioid", "Muscle Relaxant", nullable
  description        // free text from source
  sourceFile        // original filename, for traceability
  pdfLink           // nullable, for "open source PDF" nice-to-have
  rawRow            // JSON blob of the original Excel row, for debugging/audit

Milestone (optional, or just a field on Case)
  id, caseId, label, date   // e.g. "Accident Date", "Surgery Date"
```

Index `MedicalEvent` on `(caseId, date)` since every timeline/filter query is scoped to a case and ordered by date.

## 2. Excel Import

- Library: `exceljs` (handles formatting better than raw `xlsx` and lets us read cell types explicitly, important for dates).
- Define an explicit **expected column schema** up front (map source column headers → MedicalEvent fields). Ship a schema-mapping config file rather than hardcoding column names, since real-world exports will vary.
- Import pipeline:
  1. Upload endpoint accepts `.xlsx`, streams to temp storage.
  2. Parse workbook, first sheet by default (or a configurable sheet name).
  3. Validate: required columns present, date column parses, at least 1 data row. Return a structured validation error list (row + column + reason) rather than a single generic error — attorneys will not have clean data.
  4. Normalize: trim strings, parse dates to ISO, split multi-value cells (e.g. body part "Neck, Lower Back") into arrays.
  5. Persist `Case` + bulk-insert `MedicalEvent` rows in a transaction.
  6. Return case ID + import summary (rows imported, rows skipped with reasons).
- Keep the parser and the validator as pure, unit-testable functions separate from the NestJS controller, so bad-data edge cases can be tested without spinning up the app.

## 3. Backend Modules (NestJS)

- `CasesModule` — create/list/get case, set accident date/milestones.
- `MedicalEventsModule` — repository + query methods: `findByCase`, `findByFilters(caseId, {dateRange, provider, bodyPart, medicineType, recordType, keyword})`, `getStatistics(caseId)` (counts by type, date range span, provider list), `findTreatmentGaps(caseId, thresholdDays)`.
- `ExcelImportModule` — upload endpoint + parser/validator/normalizer described above; depends on `MedicalEventsModule` for persistence.
- `AiChatModule` — orchestrator + tool implementations; depends on `MedicalEventsModule` (tools are thin wrappers calling the same query methods the REST API uses — no duplicate logic).

## 4. REST API Contract

```
POST   /cases/import                multipart Excel upload -> { caseId, summary }
GET    /cases/:id                   case detail incl. milestones
PATCH  /cases/:id/milestones        set/update accident date etc.

GET    /cases/:id/events            ?dateFrom&dateTo&provider&bodyPart&medicineType&recordType&q
GET    /cases/:id/events/:eventId   single event detail
GET    /cases/:id/statistics        counts, span, gap summary

POST   /cases/:id/chat              { message, history } -> { reply, referencedEventIds, toolCalls[] }
```

The chat endpoint returns `referencedEventIds` explicitly so the frontend can highlight timeline events without re-parsing the LLM's prose response.

## 5. AI Chat — Tool Calling Design

Orchestrator loop: send user message + tool schemas to the LLM, execute any requested tool calls against `MedicalEventsModule`, feed results back, repeat until the model returns a final answer (cap at ~4 iterations to avoid runaway loops).

Tool schemas (JSON Schema, passed as OpenAI/Gemini function defs):

- `find_events(dateFrom?, dateTo?, provider?, bodyPart?, medicineType?, recordType?, keyword?)` → list of matching events (id, date, type, provider, bodyPart, summary).
- `count_events(sameFiltersAsAbove)` → integer count, avoids the model having to count a long list itself.
- `get_event_details(eventId)` → full event record.
- `get_case_statistics(caseId)` → totals, date span, breakdown by record type/provider.
- `find_treatment_gaps(caseId, thresholdDays=30)` → list of `{ from, to, gapDays }` for gaps exceeding threshold.
- `semantic_search_events(caseId, query)` → Phase 1 stub: naive keyword/LIKE match over `description`, clearly labeled as a placeholder for the Phase 2 vector-search version. Do not fake semantic behavior; if it's just a keyword match, the system prompt should say so internally so the model doesn't overtrust it.

System prompt rule (matches guiding principle #6): the model must never state a fact about the case that didn't come from a tool result. If no tool covers the question, it should say so rather than guessing. Include this as an explicit, testable instruction and spot-check it during the demo dry run.

## 6. Frontend

- `apps/web`: Vite + React + TS + MUI + TanStack Query for all server state (cases, events, chat).
- Pages: Upload/Import, Case Timeline (main view), embedded Chat panel alongside the timeline.
- Timeline: vis-timeline (fastest path for zoom/pan/click out of the box) rendering events grouped/colored by `recordType`; milestones (accident date) rendered as a distinct marker style.
- Filters: a filter bar (date range, provider multi-select, body part multi-select, medicine type, record type, keyword) that maps directly to the `GET /events` query params — filtering re-fetches via TanStack Query rather than client-side filtering, so it stays correct as case sizes grow.
- Chat panel: message list + input; on receiving `referencedEventIds`, dispatch a "highlight" state that the timeline component consumes to select/scroll to those events.
- Event detail: click an event → side panel/drawer with full record, PDF link if present.

## 7. Suggested Build Order (Sprints)

1. **Foundations** — repo scaffold, DB schema + migrations, seed script, empty NestJS/React apps talking to each other (health check round trip).
2. **Import** — Excel upload, parse/validate/normalize, persistence, import summary UI.
3. **Timeline core** — events API, timeline rendering, event detail drawer, manual milestone.
4. **Filters** — filter bar wired to query params, verify against seeded multi-case data.
5. **AI Chat** — tool implementations against the same query layer, orchestrator loop, chat UI, highlight-on-reference.
6. **Polish** — loading/empty/error states, basic auth/case-isolation if multi-user, nice-to-haves as time allows (PDF links, AI summary, PDF export, dark mode).

## 8. Testing & Verification

- Unit tests for the Excel parser/validator/normalizer with fixture files (clean case, missing columns, bad dates, mixed body-part formats).
- Unit tests for each AI tool function against seeded data (known counts, known gaps).
- One integration test per REST endpoint (import → query → statistics) using an in-memory/temp SQLite DB.
- Manual test script for the chat: a fixed list of the example questions from the source plan (first MRI date, PT session count, lumbar spine treatments, gap check, summarize treatment) run against the seeded demo case, with expected answers written down beforehand to catch hallucination during the tool-calling loop.

## 9. Explicit Open Questions (confirm before/while building)

- Exact Excel column headers/format the real source files use — the schema-mapping config in §2 depends on this.
- Single-case-per-session demo, or multi-case/multi-user with auth from the start?
- OpenAI vs Gemini for function calling — affects the tool-schema format and SDK choice in §5.
