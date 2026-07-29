# AI Chat Spot-Check Log

> 🗺️ [[MOC|Map of Content]]

**Purpose:** the concrete verification step for the grounding rule (`PRD-AI-Chat.md` §5, §8) — re-run this against the seeded demo case before every demo. Expected answers below were computed directly from the seeded database (SQL), independent of any LLM call, so a run can be graded objectively.

## Seeded demo case used

- Case: **"Caldwell - Medical Chronology"**, case id `8188befc-f1ae-4e9d-b00f-f6c4c79a0d98` (one of three identical imports currently in the local dev db — any of the three duplicates gives the same answers; re-seed via `npm run seed --workspace=apps/api -- <path-to-chronology.xlsx>` if the db is reset).
- 130 events, date span **2024-12-07 → 2026-05-04**.
- This is a shoulder-injury case (dominant `bodyPart` is "Shoulder", not "Lumbar Spine") — Q3 below is adapted accordingly; see note.

## Prerequisites to actually run this

- `OPENAI_API_KEY` set in `apps/api`'s environment (the orchestrator returns an honest "not configured" message otherwise — see `ai-chat.service.spec.ts`'s first test — which is correct behavior but not a real grounding test).
- API + web dev servers running against the db containing the case above.

## Results

**Last run:** _not yet run against a live model in this session — no `OPENAI_API_KEY` is configured in this environment. Expected answers are recorded below per the PRD's "before" half of the process; fill in Actual/Pass columns after running each question through the real chat endpoint._

| # | Question | Expected answer (from DB, ground truth) | Primary tool(s) | Actual answer | Pass? |
|---|---|---|---|---|---|
| 1 | When was the first MRI? | Earliest MRI-related encounter is dated **2025-07-13/07-14** (left shoulder MRI, Radiology) | `find_events(keyword="MRI")`, take earliest | | |
| 2 | How many PT sessions so far? | **42** events with `medicineType = "Physical Therapy"` | `count_events(medicineType="Physical Therapy")` | | |
| 3 | Show all shoulder treatments *(adapted from "lumbar spine" — this case has no lumbar-spine events; see below)* | **96** events where `bodyPart` matches "Shoulder" | `find_events(bodyPart="Shoulder")` | | |
| 4 | Were there any treatment gaps? | **3 gaps ≥ 30 days**: 2025-04-10→2025-07-13 (94d), 2025-09-08→2025-11-10 (62d), 2026-03-23→2026-05-04 (42d) | `find_treatment_gaps` | | |
| 5 | Summarize this patient's treatment | Totals: 130 events, span 2024-12-07→2026-05-04 (~514 days); top record types: Encounter Note (67), Imaging Report (12), PT Note (8); top providers: Grant T. Olsen, NP (26) | `get_case_statistics` + `find_events` (date-range extremes) | | |

## Acceptance-criterion check: honest "not found"

Per `PRD-AI-Chat.md` §10 — a question about a body part never treated in this case must return an honest "not found," not a fabricated answer:

| Question | Ground truth | Expected behavior | Actual | Pass? |
|---|---|---|---|---|
| Show all lumbar spine treatments | **0** events match `bodyPart LIKE '%Lumbar%'` in this case | Model should state no lumbar spine events were found, not invent one | | |

## Iteration-cap check

Per §10 — orchestrator must never exceed the ~4-iteration cap even for an intentionally convoluted multi-part question. Covered automatically by `ai-chat.service.spec.ts` ("never exceeds the iteration cap...") which forces the model to request tool calls indefinitely and asserts `fetch` is called exactly 4 times — no live-model run needed to verify this specific criterion.

## How the ground-truth numbers were computed

Directly against the seed sqlite db, independent of the tool-calling code path (so this log isn't just re-testing itself):

```sql
-- Q1: earliest MRI mention
select min(date) from medical_events where caseId = '<case-id>' and summary like '%MRI%';

-- Q2: PT session count
select count(*) from medical_events where caseId = '<case-id>' and medicineType = 'Physical Therapy';

-- Q3: shoulder treatments
select count(*) from medical_events where caseId = '<case-id>' and bodyPartsRaw like '%Shoulder%';

-- Q4/Q5: gap and date-span math done in Python from `select date from medical_events ... order by date asc`,
-- see docs/Progress.md for the session this was derived in.
```
