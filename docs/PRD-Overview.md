# PRD — Medical Timeline AI (MVP Overview)

> 🗺️ [[MOC|Map of Content]]

**Status:** Proposed
**Date:** 2026-07-29
**Related docs:** [`Architecture.md`](./Architecture.md), [`PRD-Timeline-View.md`](./PRD-Timeline-View.md), [`PRD-Excel-Import.md`](./PRD-Excel-Import.md), [`PRD-AI-Chat.md`](./PRD-AI-Chat.md), [`PRD-Case-Management.md`](./PRD-Case-Management.md)

## 1. Problem

Personal-injury attorneys receive medical records as hundreds of pages per case. AI can already summarize those records into a structured table of encounters — that part is solved. What isn't solved: turning that table into something a jury can feel in ten seconds, a client can be walked through, or an adjuster can be shown the truth of at a glance. Every experienced attorney has a strong, different opinion of what a good timeline looks like, and no existing tool has nailed it.

## 2. Personas

| Persona | Need |
|---|---|
| **Trial attorney** | Wants to internalize a case's treatment story fast, and have a visual to use in front of a jury or in settlement negotiation |
| **Paralegal / case manager** | Prepares the case file, uploads records exports, keeps the timeline current as new records arrive, answers quick factual questions without re-reading everything |
| **Client-facing use (indirect)** | Attorney walks a client through their own treatment history using the same view |

MVP is built for the first two personas as direct users. Adjusters/juries see the output only in a presentation context (attorney-driven), not as direct users of the app itself.

## 3. Goals

1. Load any Excel of medical encounters in the agreed column schema and produce a working, visual timeline — no PDFs, no OCR, no manual data entry beyond the accident date.
2. Give the attorney two synchronized readings of the case at once: **where** (Body Map) and **when** (Calendar Heatmap) — see `PRD-Timeline-View.md`.
3. Let the attorney ask natural-language questions about the case and get answers grounded in the actual record, not the model's guesses — see `PRD-AI-Chat.md`.
4. Be something its user would keep using after the first look, not just a demo.

## 4. Success Metrics (MVP)

These mirror the hackathon's own judging scorecard, because it's a good proxy for real-world product quality on this specific problem:

| Metric | Target |
|---|---|
| Time to understand the treatment story from a first look at the Case View | < 30 seconds |
| Timeline clarity | Sequence, severity/density, and key events readable at a glance; full detail available on demand (click-through) |
| Ease of use | Operable without instructions — no onboarding flow needed for MVP |
| Real-world fit | An attorney could use the output in trial prep, client prep, or adjuster negotiation with no rework |
| AI usefulness | Chat answers are correct and grounded for the seeded example questions (§7) every time, not "usually" |
| Keeper test | A user who tries it with their own case's Excel would come back to it |

## 5. In Scope (MVP / Phase 1)

| Module | Summary | Detail |
|---|---|---|
| Excel Import | Upload, validate, parse, normalize, persist | `PRD-Excel-Import.md` |
| Timeline View | Body Map + Calendar split, the primary Case View | `PRD-Timeline-View.md` |
| Filters | Provider / body part / medicine type / record type / keyword, feeding both panels and the underlying query layer | `PRD-Timeline-View.md` §7, `Architecture.md` §9 |
| AI Chat | Tool-calling Q&A grounded in case data, with cross-panel highlighting | `PRD-AI-Chat.md` |
| Case & Milestones | Case creation on import, accident-date milestone | `PRD-Case-Management.md` |

## 6. Out of Scope (MVP)

Deferred to Phase 2 per `Medical-timeline-MVP-plan.md`:

- Multi-user auth, firm-wide case libraries, sharing/permissions.
- Real PDF / PowerPoint / Word export (Phase 1 ships clearly-labeled placeholder buttons only).
- Semantic/vector search (RAG) — Phase 1's `semantic_search_events` tool is an explicitly-labeled keyword-match stub.
- Third-party integrations (Google Drive, Dropbox, CRM, case management systems, Slack/email notifications).
- n8n-based background workflows and scheduled jobs.
- Editable/rephrase-with-AI summary editing (validated as a UI concept in earlier prototypes; not required for the MVP floor).
- OCR or PDF ingestion — explicitly out of scope per the source brief; input is always a pre-digested Excel.

## 7. Assumptions

- Source Excel columns: `Encounter Date`, `Primary Provider`, `Facility`, `Body Parts`, `Medicine Type`, `Record Type`, `Summary`, `Link To Pdf` (one row per encounter). Column *values* vary case to case; column *names/shape* are assumed stable per `PRD-Excel-Import.md` §2. If real-world files diverge, the schema-mapping config absorbs small naming variance.
- Single case loaded per session is acceptable for MVP (`PRD-Case-Management.md` §2).
- An LLM provider API key (OpenAI or Gemini) is available in the deployment environment.
- Accident date is never in the source Excel and must always be a manual, optional input.

## 8. Example Questions the AI Chat Must Answer Correctly

Used as the fixed manual test script before any demo (`Medical-Timeline-Phase1-Implementation-Plan.md` §8):

1. When was the first MRI?
2. How many PT sessions [so far]?
3. Show all lumbar spine / [body part] treatments.
4. Were there any treatment gaps? What's the longest one?
5. Summarize this patient's treatment.

## 9. Definition of Done (MVP)

Reframing the hackathon's own submission checklist as the MVP release bar:

- [ ] Deployed, working link — not localhost-only.
- [ ] Loads the sample case correctly **and** a second, previously-unseen Excel in the same schema, without code changes or hardcoded values.
- [ ] Body Map + Calendar Case View meets every acceptance criterion in `PRD-Timeline-View.md` §9.
- [ ] AI Chat correctly answers all five example questions (§8) against the seeded case, grounded (no hallucinated facts).
- [ ] Written, explicit statement of: assumptions made, where data goes (client vs. server, retention), and approximate cost to run one case.
- [ ] One paragraph: what was built and what the team is proud of.

## 10. Open Questions

- Exact real-world Excel variance — see `PRD-Excel-Import.md` §7.
- Whether a lightweight "present this case" mode (the Story Deck concept from `UI Concepts/v5`) belongs in MVP or is a fast-follow — currently scoped as fast-follow (`Architecture.md` §5).
