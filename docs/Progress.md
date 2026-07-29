# Progress — Medical Timeline AI

> 🗺️ [[MOC|Map of Content]]

**Purpose:** living tracker of what's actually built versus what the PRDs/`Architecture.md` describe, so gaps don't have to be re-discovered by reading code every session. Update this file whenever a module's implementation status changes materially — don't let it drift into a changelog (git history already covers that).

**Last audited:** 2026-07-29, against commit `1892384` (case management), with Timeline View popup/popover work (§4a, this session) layered on top not yet committed.

## 1. Overall Status

Matches the README's own self-assessment: **scaffolded, not MVP-complete.** Both apps build and run; the core data path (import → store → render → query → chat) works end-to-end for the happy path. Most of what's missing is Timeline View interaction depth (popups/popovers, month grids, export placeholders) and test coverage, not architecture — the module boundaries in `Architecture.md` are followed faithfully.

| Module | Backend | Frontend | Overall |
|---|---|---|---|
| Excel Import | Working, normalization fallbacks now match PRD §4 (§3), parser has unit test coverage | Minimal upload form, no error detail UI | Mostly done |
| Case & Milestones | Working, matches PRD, now has unit test coverage (§3b) | Accident-date input only; no other milestone UI (by design) | Done |
| Medical Events (query layer) | Working: filters, statistics, grouped-by-body-part/day, gaps | Consumed via TanStack Query hooks | Done |
| Timeline View (Body Map + Calendar) | N/A (frontend-only per architecture) | Popups/popovers implemented (§4a); still no month-grid/activity-strip layout, narrow-viewport unverified | Gaps narrowed (§4, §4a) |
| AI Chat | Working tool-calling loop (OpenAI only), honest fallback with no key | Basic message list, no highlight animation (state only) | Mostly done, needs polish |
| Tests | `excel-parser.spec.ts` (8) + `cases.service.spec.ts` (6) passing; rest is Nest's default boilerplate spec | None | Partial (§6) |

## 2. Backend (`apps/api`) — Implemented

- **Modules wired per `Architecture.md` §8:** `CasesModule`, `MedicalEventsModule`, `ExcelImportModule`, `AiChatModule`, `DatabaseModule` — all present in `app.module.ts`, correct controller → service → repository layering.
- **Database:** SQLite via `sql.js` (pure-JS, no native build), `synchronize: true` (no migrations yet — expected for Phase 1 per decision #5).
- **Cases:** `GET /cases/:id`, `PATCH /cases/:id/milestones` (generic milestone table + `accidentDate` mirrored onto `Case` for the `label: "accidentDate"` convention). Matches `PRD-Case-Management.md` exactly.
- **Medical Events:** `findByFilters` (date range, provider, bodyPart, medicineType, recordType, keyword — all via `LIKE`/exact match), `getStatistics`, `groupedByBodyPart`, `groupedByDay`, `findTreatmentGaps`. All the endpoints `Architecture.md` §9 lists exist.
- **Excel Import:** `POST /cases/import`, `exceljs`-based parser (`excel-parser.ts`) with a real column-schema config (`column-schema.config.ts`), case-insensitive/trimmed header matching, transaction-wrapped Case+MedicalEvent insert.
- **AI Chat:** `POST /cases/:id/chat`, OpenAI tool-calling orchestrator (`ai-chat.service.ts`), 4-iteration cap, 6 tools defined (`find_events`, `count_events`, `get_event_details`, `get_case_statistics`, `find_treatment_gaps`, `semantic_search_events` stub), grounding system prompt matches `PRD-AI-Chat.md` §5 wording closely. No API key → returns an honest "not configured" message instead of fabricating (correct per the grounding rule).
- **Seed script:** `npm run seed -- <file>` loads a sample Excel into a demo case for local testing.

## 3. Backend — Deviations from PRD-Excel-Import.md §4 (resolved 2026-07-29)

The parser previously skipped rows instead of applying the PRD's documented fallback values. Fixed in `excel-parser.ts`:

- Blank `Primary Provider` → now defaults to `"Unknown"` instead of skipping the row.
- Blank `Record Type` → now defaults to `"Record"` instead of skipping the row.
- Blank `Medicine Type` → now defaults to `"Other"` (previously left `undefined` with no fallback).
- Multi-value `Primary Provider` (split on `;`) and `Body Parts` (split on `,`) are now trimmed per-element and rejoined consistently (`normalizeMultiValue`), so inconsistent source spacing doesn't leak into storage — entity columns stay flat strings per the existing `bodyPartsRaw`/read-time-split pattern in `MedicalEventsService`.
- Added `excel-parser.spec.ts` covering all cases required by §8: clean file, missing required column, unparseable dates (partial skip), blank fallback fields, multi-value cells, novel vocabulary, empty file, and case-insensitive/reordered headers. 8 tests, all passing.
- Response shape now matches PRD §4.6 exactly: `{ caseId, importSummary: { rowsImported, rowsSkipped, warnings[] } }` (was a flat `{ caseId, rowsImported, rowsSkipped, issues }`). Updated in lockstep: `excel-import.service.ts` (`ImportSummary` interface + return + the zero-rows `BadRequestException` body), `apps/web/src/types/index.ts` `ImportSummary`, and `apps/api/src/scripts/seed.ts`'s log lines. `apps/web/src/pages/UploadPage.tsx` / `apps/web/src/api/cases.ts` only ever read `summary.caseId`, so no UI behavior changed. Both apps typecheck clean; backend test suite (9 tests) passes.

No error-detail UI was added — the frontend still has no surface for `importSummary.warnings` (tracked separately as a known gap, not part of this PRD-compliance pass).

## 3b. Backend — `CasesService` test coverage added (2026-07-29)

`PRD-Case-Management.md`'s implementation was already correct (transaction-atomic case creation, `GET /cases/:id`, `PATCH /cases/:id/milestones`, `accidentDate` mirroring) but had zero test coverage. Added `cases.service.spec.ts` (6 tests, using an in-memory fake repository rather than a real DB/TypeORM connection):

- Case creation.
- `findOne` throws `NotFoundException` for a missing case.
- Setting the `accidentDate` milestone mirrors it onto `Case.accidentDate` and appears in `case.milestones`.
- Setting a non-`accidentDate` milestone (e.g. `"Surgery Date"`) leaves `Case.accidentDate` untouched.
- Re-setting the same milestone label updates it in place rather than duplicating the row.
- `setMilestone` on a missing case throws `NotFoundException`.

No production code changed — this closes a test-coverage gap, not a behavioral one. Full backend suite: 15 tests / 3 suites passing; `tsc --noEmit` clean.

## 4. Frontend (`apps/web`) — Implemented vs. Gaps

**Implemented:**
- Routing: `/` (Upload) and `/cases/:caseId` (Case View), via React Router.
- Upload flow: file picker → `POST /cases/import` → navigate to the new case.
- Case View shell: `CaseHeader`, `StatsBar`, `SharedToolbar` (accident date input, front/back toggle, calendar color-mode toggle), Body Map panel, Calendar panel, Chat panel — matches the component tree in `Architecture.md` §7.1.
- Body Map: known/unknown split via `bodyPartCoordinates.ts`, sized/colored hotspots, "Other findings" chip fallback — the core generic-Excel requirement is honored.
- Calendar: single density grid colored by intensity or dominant medicine type.
- Chat: message history, calls `/chat`, threads `referencedEventIds` back up to set a highlight set.
- Cross-panel highlight *state* exists (`highlightedEventIds` in `CaseViewPage`) and is read by both panels to outline matching hotspots/day cells.

**Gaps vs. `PRD-Timeline-View.md`:**
- **No detail popup (Body Map) or popover (Calendar).** §6 and §7.4 specify a fairly detailed modal/popover with per-encounter cards, medicine-type filter chips, and a "Source PDF" action. Currently, clicking a hotspot or day only sets the highlight set — there is no way to see individual encounter details (provider, facility, summary, PDF link) from either panel at all. This is the single biggest UI gap relative to spec.
- **Calendar is a single flat grid, not the activity-strip + month-grid combination** in §7.1–§7.2. No week/weekday structure, no per-month cards, no "jump to month," and — per the component's own code comment — this is explicitly called out as a placeholder ("simplified... full month-grid layout... is a fast follow").
- **No legend** for either calendar color mode (§7.3 requires one).
- **No accident-date visual marker** on the Calendar (ring/outline on the matching day) or Body Map (⚑ flag on popup cards — moot until popups exist). The date is stored and settable, but nothing currently renders it back.
- **No Export PDF / Export PPT buttons at all** — §4 requires them present as clearly-labeled disabled/"coming soon" controls, not absent.
- **Body-part coordinate config covers ~19 terms**, not the ~30 in Appendix A. Missing from the curated set: Face, Eye, Ear, Nose, Mouth, Sinuses, Upper Arm, Forearm, Finger, Lungs, Heart, Armpit, Stomach, Intestines, Genitals, Toe. These currently fall into "Other findings," which is the correct *fallback* behavior but wasn't meant to be the primary path for that many common terms.
- **No narrow-viewport stacking behavior verified** — the grid uses a responsive `xs`/`md` breakpoint, but the < 860px vertical-stack requirement and "no horizontal page scroll" acceptance criterion (§9) haven't been checked against the actual breakpoint value MUI uses.
- **No empty/loading/error state copy** matching §5.4/§7.5 (e.g. "no body-part data found in this case" messaging) — components render an empty grid/figure rather than the specified instructional text in most cases.

**Chat panel gaps vs. `PRD-AI-Chat.md` §6:**
- Highlighting is state-only (a `Set<string>` of event ids) — nothing currently renders a *visual pulse/flash* distinct from the static "highlighted" outline style already used for manual selection, so a chat-driven highlight and a manual click currently look identical instead of being a transient effect as specified.

## 4a. Frontend — Timeline View popups/popovers + related gaps closed (2026-07-29)

Addressed the single biggest gap flagged in §4 (no way to see individual encounter detail) plus several smaller PRD-Timeline-View.md items, via `/goal` session:

- **Body Map detail popup** (§6): new `BodyMapDetailPopup.tsx`, rendered as a child of the Body Map `Paper` (which is now `position: relative`) so it sizes to 90% × 90% of the *panel's own bounding box*, not the viewport — matches the explicit acceptance criterion. Header (body part + "N of M" count badge), medicine-type filter chips (multi-toggle, re-filters in place), scrollable encounter list, empty-filter state, ✕ + backdrop dismissal. Opening a new body part replaces content in place (React state, not a stack).
- **Calendar day popover** (§7.4): new `CalendarDayPopover.tsx`, fixed-viewport-positioned near the click coordinates (clamped to stay on-screen), full-screen dim backdrop — deliberately different scoping from the Body Map popup, per spec.
- **Shared `EncounterCard.tsx`**: same card shape (provider, facility, date, medicine-type tag, summary, Source PDF link) used by both popup and popover, per §7.4's visual-consistency requirement.
- **`medicineTypeColors.ts`**: medicine type is free-form text from the source Excel (no fixed enum in the backend), so colors are assigned deterministically by hashing the string against a fixed palette rather than a maintained lookup — same generic-Excel principle as `bodyPartCoordinates.ts`.
- **Body Map hotspots now colored by dominant medicine type** (§5.1) instead of a static primary/secondary color; count is rendered as the hotspot's label.
- **Accident-date markers**: Calendar cells for the accident date get a dashed ring even when that date has zero encounters (§7.1) — `CaseViewPage` synthesizes a zero-count day entry since `grouped-by-day` only returns days with activity. Body Map popup cards flag (⚑) the encounter(s) matching the accident date.
- **Export PDF / Export PPT**: added as disabled, clearly-labeled buttons with a "Coming soon" tooltip in `SharedToolbar` (§4) — previously absent entirely.
- **Body-part coordinate config** (`bodyPartCoordinates.ts`) expanded from ~19 to the full Appendix A set (30 terms: added Face, Eye, Ear, Nose, Mouth, Sinuses, Upper Arm, Forearm, Finger, Lungs, Heart, Armpit, Stomach, Intestines, Genitals, Toe) plus a few extras already present (Cervical Spine, Lower Back, Hip, Knee, Ankle).
- Selection/popup state (`selectedBodyPart`, `selectedDay`, highlight set) now resets on `caseId` change via a `useEffect`, matching §4/§8's "no full page reload, state resets on new Excel" requirement.
- **Narrow-viewport breakpoint fixed**: the panel split used MUI's default `md` breakpoint (900px), which would stack panels between 860–900px — a violation of §3's "desktop ≥860px: two panels side by side" requirement. Replaced with an explicit `@media (min-width: 860px)` matching the PRD's exact threshold.
- Verified against a hand-built sample case (via a temporary xlsx, imported through the real `POST /cases/import` endpoint, not a mock) that `grouped-by-body-part`, `grouped-by-day`, and `events` response shapes match what the new components consume — confirmed by reading API responses directly (`curl`), since no Chrome browser extension was available in this session to visually verify the popup/popover in-browser. **This is a gap**: sizing/positioning correctness (the 90%×90% acceptance criterion, popover clamping near viewport edges) has been verified by code/CSS reasoning only, not by rendering it.

**Still gaps vs. PRD-Timeline-View.md** (unchanged from §4 below): Calendar is still a flat density grid, not the activity-strip + month-grid combination (§7.1–7.2); no legend redesign beyond the two simple legends added here; narrow-viewport (<860px) stacking behavior still unverified; empty/loading/error state copy still incomplete for the "no case loaded" paths.

## 5. Known Working End-to-End Paths (verified by reading code, not by running it)

1. Upload a valid Excel → Case + MedicalEvents persisted → redirect to Case View → stats/body-map/calendar all populate from real API calls.
2. Set accident date → persists via PATCH → refetches case (though nothing currently *displays* the date back on either panel — see §4).
3. Ask a chat question with `OPENAI_API_KEY` set → tool-calling loop executes real queries → grounded reply + referenced event ids → highlight set updates.
4. Ask a chat question with no API key set → honest "not configured" message, no fabrication.

## 6. Testing — Major Gap

- **Backend:** `excel-parser.spec.ts` covers the full §8 list (clean file, missing column, bad dates, blank fields, multi-value cells, novel vocabulary, empty file, header order/case) — 8 tests passing. `cases.service.spec.ts` (§3b) now covers milestone creation/update and the `accidentDate` mirroring convention — 6 tests passing. Still just the Nest CLI boilerplate (`app.controller.spec.ts`, `app.e2e-spec.ts`) beyond that: zero tests for `MedicalEventsService` or `AiChatService`/`ToolExecutor`.
- **Frontend:** no test setup at all (no Vitest/Jest config, no component tests).
- **No spot-check log** for the five required AI Chat questions (`PRD-Overview.md` §8, `PRD-AI-Chat.md` §8) — this is supposed to be a dated, written verification artifact re-run before every demo, and doesn't exist yet even as a template.

## 7. Deliberate Non-Gaps (out of scope by design, not missing work)

Don't re-flag these — they're documented MVP exclusions, not oversights:

- No auth, no multi-case library/switcher (`PRD-Case-Management.md` §5).
- No real PDF/PPT export (placeholder buttons are the only MVP requirement, and even those are currently absent — see §4).
- No semantic/vector search — `semantic_search_events` is intentionally a keyword-match stub.
- No OCR/PDF ingestion.
- Only OpenAI wired for chat (Gemini is an open question, not a committed requirement).

## 8. Suggested Next Priorities

Roughly in the order that closes the biggest PRD-vs-code gaps first:

1. ~~Body Map popup + Calendar day popover (`PRD-Timeline-View.md` §6–7.4).~~ Done 2026-07-29 (§4a) — **not yet visually verified in-browser**, see §4a caveat.
2. ~~Excel Import normalization fallbacks (§3 above) to match `PRD-Excel-Import.md` §4, plus the parser unit test suite it explicitly requires, plus the `importSummary`/`warnings` response shape.~~ Done 2026-07-29 (§3).
3. ~~Accident-date visual markers on both panels.~~ Done 2026-07-29 (§4a).
4. ~~Export button placeholders.~~ Done 2026-07-29 (§4a).
5. ~~Expand the body-part coordinate config toward the full Appendix A list.~~ Done 2026-07-29 (§4a).
6. Visually verify the new popup/popover in a real browser (sizing, positioning, resize behavior) — flagged as unverified in §4a.
7. Calendar month-grid + activity-strip layout (§7.1–7.2) — still the largest remaining structural gap; current Calendar is a flat density grid.
8. ~~Narrow-viewport (<860px) stacking verification.~~ Done 2026-07-29 (§4a) — breakpoint corrected to an exact 860px match; still not visually verified in-browser (same caveat as item 6).
9. AI Chat spot-check log (five questions, expected answers, re-run before any demo).
10. Remaining backend test gap: `MedicalEventsService` and `AiChatService`/`ToolExecutor` still have zero coverage (cases/milestones closed 2026-07-29, §3b).

## 9. Open Questions Carried Over (unchanged from docs)

See `Architecture.md` §16, `PRD-Overview.md` §10, `PRD-Timeline-View.md` §11, `PRD-AI-Chat.md` §11, `PRD-Case-Management.md` §7 for the full lists — none of these have been resolved by implementation work yet (OpenAI vs. Gemini, data retention policy, real-world Excel column variance, front/back toggle necessity, cross-panel body-part→calendar highlighting as a fast-follow).
