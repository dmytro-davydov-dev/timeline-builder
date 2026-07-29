# PRD — AI Chat (Tool-Calling Q&A)

> 🗺️ [[MOC|Map of Content]]

**Status:** Proposed
**Date:** 2026-07-29
**Related docs:** [`Architecture.md`](./Architecture.md) §8, §10, [`PRD-Overview.md`](./PRD-Overview.md) §8, [`PRD-Timeline-View.md`](./PRD-Timeline-View.md), [`Medical-Timeline-Phase1-Implementation-Plan.md`](../Medical-Timeline-Phase1-Implementation-Plan.md) §5

## 1. Summary

A chat panel lets an attorney ask natural-language questions about the loaded case and get answers grounded in the actual medical events — never the LLM's memory or guesses. The model reasons; the backend computes (per `Medical-timeline-MVP-plan.md`'s guiding principles). Where an answer references specific events, the Timeline View highlights them, tying the chat back to the two-panel Case View rather than existing as a disconnected side feature.

## 2. User Stories

- As an attorney, I want to ask "When was the first MRI?" and get a direct, correct answer with the actual date, without scrolling the whole case myself.
- As a paralegal, I want to ask "How many PT sessions so far?" and trust the count is exact, not an LLM estimate.
- As an attorney, I want to ask "Were there any treatment gaps?" and have the app compute this from real dates, not have the model eyeball it.
- As an attorney, I want a chat answer that references specific encounters to show me where those encounters are in the Body Map / Calendar, so I don't have to go find them myself.
- As a user, I want the app to tell me when it can't answer something reliably, rather than confidently making something up.

## 3. Functional Requirements

1. **Chat UI:** message list + text input, docked in the Case View (placement: below or beside the Body Map + Calendar split on wide viewports — exact placement is a layout decision for implementation, not fixed here since it doesn't affect the Timeline View's own layout contract in `PRD-Timeline-View.md`).
2. **Endpoint:** `POST /cases/:id/chat` with `{ message, history }`, returning `{ reply, referencedEventIds[], toolCalls[] }` (`Medical-Timeline-Phase1-Implementation-Plan.md` §4).
3. **Orchestration loop:** send the user message and tool schemas to the LLM; execute any requested tool call(s) against `MedicalEventsModule`; feed results back; repeat until a final answer, capped at ~4 iterations to prevent runaway loops.
4. **Tools are thin wrappers** over the same query methods the REST API itself uses (`findByFilters`, `getStatistics`, `findTreatmentGaps`, etc.) — no parallel/duplicate query logic for chat vs. UI filters.

## 4. Tool Contract

| Tool | Signature | Purpose |
|---|---|---|
| `find_events` | `(dateFrom?, dateTo?, provider?, bodyPart?, medicineType?, recordType?, keyword?)` → event list (id, date, type, provider, bodyPart, summary) | General lookup |
| `count_events` | same filters as above → integer | Avoids the model counting a long list itself, which is a common source of small errors |
| `get_event_details` | `(eventId)` → full event record | Drill into one result |
| `get_case_statistics` | `(caseId)` → totals, date span, breakdown by record type/provider | Summary-style questions |
| `find_treatment_gaps` | `(caseId, thresholdDays=30)` → `{ from, to, gapDays }[]` | Gap questions |
| `semantic_search_events` | `(caseId, query)` → naive keyword/`LIKE` match over `summary` | **Phase 1 stub**, explicitly labeled as such internally so the model doesn't over-trust it as true semantic search; real vector search is Phase 2 |

## 5. Grounding Rule (non-negotiable)

The system prompt must instruct: *the model must never state a fact about the case that didn't come from a tool result.* If no available tool covers the question, the model says so rather than guessing. This is a testable, explicit instruction, not a vague aspiration — verify it with the spot-check script in §8 before every demo, since tool-calling models can still narrate around gaps in results if not constrained clearly.

## 6. Cross-Panel Highlight Behavior

New requirement introduced by the two-panel Timeline View (not present in the original single-generic-timeline plan):

- When a chat reply includes `referencedEventIds`, the frontend resolves each referenced event to:
  - Its date → highlight/flash the corresponding **Calendar** day cell (strip and, if visible, the month grid).
  - Its body part(s), if any and if mapped in the coordinate lookup (`PRD-Timeline-View.md` §5.3) → flash the corresponding **Body Map** hotspot(s).
- If a referenced event's body part is in the "Other findings" bucket (unmapped), still highlight it there — the highlight behavior must degrade the same way the Body Map's own rendering does, not silently skip unmapped parts.
- Highlighting is transient (visual pulse/outline for a few seconds or until the next interaction) — it does not open either panel's detail popup/popover automatically, to avoid yanking focus away from the chat mid-conversation. Opening the detail view remains a deliberate user click.
- If a chat answer references many events (e.g. "all 42 PT sessions"), highlight all corresponding days/hotspots, not just the first — but do not auto-scroll the page; the user stays in control of what they're looking at.

## 7. Example Questions (must answer correctly — fixed test script)

Same list as `PRD-Overview.md` §8, repeated here as the concrete tool-mapping reference:

| Question | Primary tool(s) |
|---|---|
| When was the first MRI? | `find_events(keyword="MRI")`, take earliest |
| How many PT sessions so far? | `count_events(medicineType="Physical Therapy")` |
| Show all lumbar spine treatments | `find_events(bodyPart="...")` or `keyword` fallback |
| Were there any treatment gaps? | `find_treatment_gaps` |
| Summarize this patient's treatment | `get_case_statistics` + `find_events` (date range extremes), composed into a grounded narrative — not template-free generation |

## 8. Non-Functional Requirements

- Response time: < 8 seconds for a single tool-call round trip (`Architecture.md` §13); orchestrator iteration cap (~4) exists specifically to bound worst-case latency, not just cost.
- A written, dated spot-check log of the five example questions run against the seeded demo case, with expected answers recorded beforehand, re-run before every demo — this is the concrete verification step for the grounding rule (§5), not just a nice-to-have.
- No PHI in application logs — tool call logs may reference `eventId`s and filter parameters, not full `summary` text (`Architecture.md` §12).

## 9. Out of Scope (MVP)

- True semantic/vector search (`semantic_search_events` is a keyword stub only, §4).
- Multi-turn memory beyond the current case's chat `history` passed in each request — no cross-session memory.
- Voice input/output.
- AI-authored edits to event summaries (validated as a UI concept in earlier prototyping, not required for MVP chat scope).

## 10. Acceptance Criteria

- [ ] All five example questions (§7) answered correctly against the seeded demo case, every run.
- [ ] A question with no supporting data (e.g. asking about a body part never treated in the case) returns an honest "not found," not a fabricated answer.
- [ ] `referencedEventIds` correctly resolves to highlighted Calendar day(s) and, where applicable, Body Map hotspot(s) or Other-Findings chip(s).
- [ ] Orchestrator never exceeds the iteration cap even when asked an intentionally convoluted multi-part question.
- [ ] No PHI content appears in server logs for a chat interaction.

## 11. Open Questions

- OpenAI vs. Gemini for function calling — affects tool-schema format and SDK choice (`Architecture.md` §16, carried from `Medical-Timeline-Phase1-Implementation-Plan.md` §9).
- Should chat be scoped only to the currently-loaded case, or should a future multi-case mode (`PRD-Case-Management.md` §5) allow cross-case questions? Out of scope until multi-case exists.
