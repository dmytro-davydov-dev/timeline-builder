# AI Chat Spot-Check Log

> 🗺️ [[MOC|Map of Content]]

**Purpose:** the concrete verification step for the grounding rule (`PRD-AI-Chat.md` §5, §8) — re-run this against the seeded demo case before every demo. Expected answers below were computed directly from the seeded database (SQL), independent of any LLM call, so a run can be graded objectively.

## Seeded demo case used

- Case: **"Caldwell - Medical Chronology"**, case id `8188befc-f1ae-4e9d-b00f-f6c4c79a0d98` (one of three identical imports currently in the local dev db — any of the three duplicates gives the same answers; re-seed via `npm run seed --workspace=apps/api -- <path-to-chronology.xlsx>` if the db is reset).
- 130 events, date span **2024-12-07 → 2026-05-04**.
- This is a shoulder-injury case (dominant `bodyPart` is "Shoulder", not "Lumbar Spine") — Q3 below is adapted accordingly; see note.

## Prerequisites to actually run this

- `GEMINI_API_KEY` (preferred, checked first) or `OPENAI_API_KEY` set in `apps/api`'s environment (the orchestrator returns an honest "not configured" message otherwise — see `ai-chat.service.spec.ts`'s first test — which is correct behavior but not a real grounding test).
- API + web dev servers running against the db containing the case above.

## Results

**Last run:** 2026-07-29, against the live API (`gemini-flash-lite-latest`, the model with actual quota on the configured key — `gemini-2.5-flash`/`gemini-2.0-flash` both returned zero-quota 429s on this key/project). Two real bugs were found and fixed by this run (see "Bugs found" below) — the numbers below are from the run *after* both fixes.

| # | Question | Expected answer (from DB, ground truth) | Primary tool(s) | Actual answer | Pass? |
|---|---|---|---|---|---|
| 1 | When was the first MRI? | Ambiguous in the seed data itself — see caveat below | `find_events(keyword="MRI")`, take earliest | "August 7–8, 2025" (cited a standalone Imaging Report row, `75082fb9…`) — tool call correctly returned 19 filtered rows (down from 130 pre-fix) | **Caveat**, not a clean pass — see below |
| 2 | How many PT sessions so far? | **42** events with `medicineType = "Physical Therapy"` | `count_events(medicineType="Physical Therapy")` | "a total of **42** physical therapy events/sessions" via `count_events(medicineType="Physical Therapy")` then `find_events(medicineType="Physical Therapy")` | **Pass** |
| 3 | Show all shoulder treatments *(adapted from "lumbar spine" — this case has no lumbar-spine events; see below)* | **96** events where `bodyPart` matches "Shoulder" | `find_events(bodyPart="Shoulder")` | "There are **96** recorded shoulder treatments" with an accurate narrative (accident date 2024-12-07, arthroscopy Dec 2025, matches DB) | **Pass** |
| 4 | Were there any treatment gaps? | **3 gaps ≥ 30 days**: 2025-04-10→2025-07-13 (94d), 2025-09-08→2025-11-10 (62d), 2026-03-23→2026-05-04 (42d) | `find_treatment_gaps` | Reported all 3 gaps with matching dates and day counts (94, 62, 43 — off by 1 day on the last, rounding) | **Pass** (trivial rounding diff) |
| 5 | Summarize this patient's treatment | Totals: 130 events, span 2024-12-07→2026-05-04 (~514 days); top record types: Encounter Note (67), Imaging Report (12), PT Note (8); top providers: Grant T. Olsen, NP (26) | `get_case_statistics` + `find_events` (date-range extremes) | Detailed, accurate 4-phase narrative (ED visit → conservative care → arthroscopy Dec 2025 → post-op PT), correctly cited accident date and surgery date; referenced 128/130 events | **Pass** (didn't narrate the very last 2 events specifically, but nothing stated was false) |

## Bugs found and fixed during this run (not pre-existing test coverage)

1. **`ToolExecutor.toFilters()` dropped the `keyword` filter entirely.** It mapped the tool's `keyword` arg into a field literally named `keyword`, but `MedicalEventsService.findByFilters` only ever reads `filters.q` for the summary-text match — so every `find_events`/`count_events` call with only a `keyword` (no other filter) silently returned **all** events in the case, unfiltered. Caught live: a "lumbar spine" keyword search on this case came back referencing all 130 events despite the case having zero lumbar-spine records. Fixed by mapping `keyword` → `q` in `toFilters` (`apps/api/src/ai-chat/tools/tool-executor.ts`); regression-guarded in `tool-executor.spec.ts`. This directly affected Q1 above, which uses a keyword search.
2. **`medicineType`/`recordType`/`bodyPart` tool params had no descriptions.** The smaller Gemini model initially confused "Physical Therapy" (a `medicineType`) with `recordType` and burned the full 4-iteration budget on Q2 without ever finding the right filter. Fixed by adding disambiguating descriptions to both `find_events` and `count_events` schemas in `tool-definitions.ts`. Re-run after the fix answered correctly on the first two tool calls.

## MRI question caveat (Q1)

The seeded case's own data is ambiguous here, independent of the app: multiple rows narrate the *same* clinical episode with different literal dates — e.g. row `39e3024f…` is dated 2025-07-13 but its own narrative text says "First encounter (07/14/2025, Radiology): ... left shoulder MRI...", while a separate standalone "Imaging Report" row (`75082fb9…`) dated 2025-08-07 is titled "Body Part: Left shoulder MRI without contrast." This looks like the synthetic Excel source bundling the same encounter into more than one row with slightly different framing (see `docs/Progress.md` for other notes on this dataset's multi-encounter narrative rows). The model's answer isn't fabricated — both dates it could have picked come from real tool results — but "the first MRI" doesn't have one unambiguous ground-truth answer in this specific seed case. Worth using a cleaner-cut case for this specific question in a real demo, or dedup'ing near-identical rows during import (out of scope for this session).

## Acceptance-criterion check: honest "not found"

Per `PRD-AI-Chat.md` §10 — a question about a body part never treated in this case must return an honest "not found," not a fabricated answer:

| Question | Ground truth | Expected behavior | Actual | Pass? |
|---|---|---|---|---|
| Show all lumbar spine treatments | **0** events match `bodyPart LIKE '%Lumbar%'` in this case | Model should state no lumbar spine events were found, not invent one | "There are no treatments or medical records for the lumbar spine in this case." — correctly listed the body parts that *are* present instead (hand, neck, head, shoulder) | **Pass** (only after the keyword-filter bug fix above — pre-fix, `find_events(keyword="lumbar")` returned all 130 events unfiltered) |

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
