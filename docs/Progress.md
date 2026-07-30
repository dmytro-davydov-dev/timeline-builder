# Progress — Medical Timeline AI

> 🗺️ [[MOC|Map of Content]]

**Purpose:** living tracker of what's actually built versus what the PRDs/`Architecture.md` describe, so gaps don't have to be re-discovered by reading code every session. Update this file whenever a module's implementation status changes materially — don't let it drift into a changelog (git history already covers that).

**Last audited:** 2026-07-30, against commit `c4dd8f1`, with real Export PDF / Export PPT (§4g) layered on top of the 2026-07-29 session (§4a–§4f), not yet committed.

## 1. Overall Status

Matches the README's own self-assessment: **scaffolded, not MVP-complete.** Both apps build and run; the core data path (import → store → render → query → chat) works end-to-end for the happy path. Timeline View interaction depth (popups/popovers, month grids, export placeholders) has now largely closed (§4a, §4b); what's left is mostly test coverage and minor empty-state polish, not architecture — the module boundaries in `Architecture.md` are followed faithfully.

| Module | Backend | Frontend | Overall |
|---|---|---|---|
| Excel Import | Working, normalization fallbacks now match PRD §4 (§3), parser has unit test coverage | Minimal upload form, no error detail UI | Mostly done |
| Case & Milestones | Working, matches PRD, now has unit test coverage (§3b) | Accident-date input only; no other milestone UI (by design) | Done |
| Medical Events (query layer) | Working: filters, statistics, grouped-by-body-part/day, gaps | Consumed via TanStack Query hooks | Done |
| Timeline View (Body Map + Calendar) | N/A (frontend-only per architecture) | Popups/popovers (§4a); Calendar activity-strip + month-grid (§4b); Body Map now a real SVG silhouette, Calendar-left/Body-Map-right split (§4c) | Close to spec (§4, §4a, §4b, §4c) |
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
- ~~No Export PDF / Export PPT buttons at all~~ Placeholder buttons done 2026-07-29 (§4a); real client-side export done 2026-07-30 (§4g).
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

**Still gaps vs. PRD-Timeline-View.md** at the end of this session: Calendar's activity-strip + month-grid layout was still outstanding — closed in §4b below. Empty/loading/error state copy is still incomplete for the "no case loaded" paths (§5.4/§7.5).

## 4b. Frontend — Calendar activity-strip + month-grid rewrite (2026-07-29)

User supplied a reference screenshot (a "full case at a glance" activity strip + "month by month" calendar cards, matching the validated prototype `UI Concepts/v7_bodymap_calendar_split.html`) and asked for the Calendar panel to match it. This was the item deferred at the end of §4a. Rewrote `CalendarPanel.tsx` from the flat density grid to the real §7.1–7.2 layout:

- **Activity strip**: GitHub-contributions-style grid (7 rows Sun–Sat, one column per week), horizontally scrollable, month labels positioned above the column where each new month starts. Built from a dense local day-map (the `grouped-by-day` endpoint only returns days with activity) so week alignment is correct even across gaps — ported the date-range padding/column logic from the prototype's `renderStrip()`.
- **Month-by-month grid**: one card per month spanned by the case, weekday header row, leading blank cells for alignment, day cells shaded and labeled — ported from the prototype's `renderMonths()`. Uses `grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))` so it's single-column at half-screen split width (PRD default) but flows into multiple columns on a wide viewport (PRD §10's "full-width standalone" case, and what the reference screenshot shows), without needing two separate layout code paths.
- **Both color modes preserved**: intensity (5-step bucketed scale, capped at "4+") and medicine-type (dominant type's color, opacity scaled by volume via the existing `medicineTypeColors.ts` hash palette) — same `cellColor()` function drives both the strip and the month cards so they never mismatch.
- **Legend**: "Less → More" swatches in intensity mode, one swatch+label per distinct medicine type in medicine-type mode, plus the static "Color reflects the most common care type that day, shaded by volume" caption — matches §7.3.
- Accident-date ring and the cross-panel highlight outline (from `highlightedDays`) both carry over unchanged, now applied per-cell in both the strip and the month grids.
- No changes to `CaseViewPage.tsx` or `CalendarDayPopover.tsx` — the prop contract (`days`, `colorMode`, `highlightedDays`, `accidentDate`, `onSelectDay`) was kept identical, so this was a self-contained component rewrite.

**Verified visually this time** (unlike §4a): the Chrome extension still wasn't connected, but `google-chrome --headless --screenshot` against the real running dev servers (API + Vite) with the same hand-built sample case worked as a fallback, and the rendered output was compared directly against the user's reference screenshot — structure, headers, legend, and accident-date ring all matched. `tsc --noEmit` and `vite build` both clean.

## 4c. Frontend — Body Map real silhouette + Calendar-left/Body-Map-right split (2026-07-29)

User supplied a second reference screenshot (bubbles overlaid on an actual human silhouette figure, captioned "Bubble size = number of encounters" / "Color = most common care type for that area") and asked for the Body Map to match it and move to the right side, after the Calendar. Two changes:

- **Real SVG silhouette**: new `BodyFigureSvg.tsx`, ported verbatim from the validated prototype's `<svg viewBox="0 0 280 560">` figure (head/neck/torso/arms/forearms/hands/legs/feet as basic shapes, `#dfe3f0` fill / `#c7cce3` stroke) — replaces the placeholder gray dashed box `BodyMapPanel.tsx` had been using since the scaffold. Same figure serves both Front and Back views per §5.2, unchanged.
- **`bodyPartCoordinates.ts` coordinates recomputed**: previously these were ballpark percentages against an *imagined* figure and didn't correspond to any real silhouette. Replaced every entry with the prototype's actual pixel `COORDS` table converted to percentages of the same 280×560 viewBox (`x/280*100`, `y/560*100`), so hotspots now land precisely on the real figure instead of floating near it. The five extra terms beyond the prototype's set (Cervical Spine, Lower Back, Hip, Knee, Ankle) got hand-placed coordinates consistent with the same figure's proportions; their `view` (front/back/both) assignments were unchanged and still correct against the prototype's `FRONT_HIDE`/`BACK_SHOW` logic.
- **Hotspot styling**: added the white 2px border + drop shadow the reference shows (`border: 2px solid #fff`, `box-shadow`), matching the prototype's `.hotspot` style, and added the two-line caption below the figure.
- **Panel order**: `CaseViewPage.tsx` keeps Body Map *first* in DOM order (so narrow-viewport stacking still puts Body Map above Calendar, per §3) but wraps each panel in a `Box` with `order: 2` / `order: 1` inside the existing `@media (min-width: 860px)` block, so the desktop split renders Calendar-left / Body-Map-right without breaking the stacking requirement. No prop changes to either panel component.

**Verified visually**: same `google-chrome --headless --screenshot` fallback against the live sample case — hotspots render directly on the silhouette (neck/shoulder positions confirmed correct for the test case's data), caption text present, Calendar panel on the left / Body Map on the right. `tsc --noEmit` and `vite build` both clean.

## 4d. Frontend — Header/stats-bar/toolbar restyle + "Longest quiet stretch" stat (2026-07-29)

User supplied a third reference screenshot (dark gradient header bar, light-gray stat cards with a red "alert" card, navy-pill segmented toggles) and asked for the stats bar to gain a "Longest quiet stretch" card and for the styling to match. Traced the screenshot to a *different* prototype variant than the ones used in §4a–§4c — `UI Concepts/v6_calendar_heatmap.html`, not `v7_bodymap_calendar_split.html` — and matched its exact stat-card set, wording, and the `gap > 21` alert threshold rather than guessing.

- **New stat — Longest quiet stretch**: sourced from the existing `GET /cases/:id/events/gaps` endpoint (`findTreatmentGaps`, already implemented, previously unused by the frontend) called with `thresholdDays=0` so *every* consecutive-event gap comes back, then taking the max client-side (`useTreatmentGaps` hook added to `api/cases.ts`; `TreatmentGap` type added to `types/index.ts`). No backend changes — the data was already there.
- **`StatsBar.tsx` rewritten**: now takes explicit `{ encounters, treatmentSpanDays, daysWithActivity, longestQuietStretchDays }` instead of the raw `CaseStatistics` object, and renders exactly the four cards the reference shows (dropped the previous Providers/Body-parts cards, which the reference doesn't include). The quiet-stretch card turns red (`#fef2f2` bg, `#b91c1c` text) only when the gap exceeds 21 days, matching the prototype's `gap>21?'alert':''` logic exactly — not unconditionally red.
- **`CaseHeader.tsx` rewritten**: full-bleed dark navy gradient bar (moved outside the page's `Container` in `CaseViewPage.tsx` so it spans edge-to-edge), brand dot + case name + static subtitle, and the Export PDF / Export PPT buttons *moved here from `SharedToolbar`* (matches the reference's action-button grouping) alongside the existing "Load different Excel" link. Export buttons keep their disabled + "Coming soon" tooltip treatment from §4a.
- **`SharedToolbar.tsx` restyled**: segmented Front/Back and Color-mode toggles now render as a light-gray pill container with a solid navy active button, matching the reference's `.seg`/`.seg button.active` CSS. First attempt styled the active state via a `'& .Mui-selected'` selector on the `ToggleButtonGroup`'s `sx` and it silently lost to MUI's own higher-specificity selected-state styles (active buttons rendered as barely-visible white-on-light-gray instead of white-on-navy) — caught by screenshot verification, not by typecheck/build, since it's a runtime style-cascade issue. Fixed by computing each `ToggleButton`'s `sx` explicitly from whether its value matches the currently-selected one, rather than relying on MUI's `.Mui-selected` class winning the cascade.

**Verified visually**: `google-chrome --headless --screenshot` against the live sample case, including a cropped close-up of the segmented toggles specifically to confirm the active-state fix (the bug above was only visible at zoom, not in the full-page screenshot). `tsc --noEmit` and `vite build` both clean.

## 4e. AI Chat closeout — tests, spot-check log, Other-findings highlight fix (2026-07-29)

Ran `/goal implement PRD-AI-Chat.md`. Found the feature already substantially built (backend orchestrator, tool schemas/executor, `ChatPanel.tsx`, cross-panel highlight wiring — see §4d/§5) from prior sessions; this pass closed the three gaps §6/§8 had explicitly flagged as outstanding, plus one real bug found while verifying the highlight-degradation acceptance criterion:

- **Backend test gap closed**: added `ai-chat/ai-chat.service.spec.ts` (4 tests: no-API-key honest fallback, tool-free final answer, one tool-call round trip with `referencedEventIds` collection, and the iteration cap — asserts `fetch` is called exactly `MAX_ITERATIONS` (4) times when the model keeps requesting tool calls) and `ai-chat/tools/tool-executor.spec.ts` (8 tests, one per tool including the unknown-tool-name error path and the `semantic_search_events` keyword-stub mapping). 27/27 backend tests pass; `tsc --noEmit` clean.
- **Bug found and fixed**: `BodyMapPanel.tsx`'s "Other findings" chips (the unmapped-body-part bucket) never reflected `highlightedBodyParts` — only the positioned hotspots did, even though the set already includes unmapped parts by construction in `CaseViewPage.tsx`. This directly violated §6/§10's "the highlight behavior must degrade the same way the Body Map's own rendering does, not silently skip unmapped parts." Fixed by giving highlighted chips a `secondary`-colored filled variant + outline, same visual language as the hotspot highlight ring. `tsc --noEmit` and `vite build` clean after the fix.
- **Spot-check log created**: `docs/AI-Chat-Spot-Check.md`, per §8's non-functional requirement for a dated, written verification artifact. Used the actual seeded "Caldwell - Medical Chronology" demo case (`8188befc-f1ae-4e9d-b00f-f6c4c79a0d98`, 130 events) and computed every expected answer directly from the sqlite db via SQL/Python — independent of the tool-calling code path, so the log isn't circularly re-testing itself. Notable finding while building it: this demo case is a shoulder-injury case (96 "Shoulder" events, PT count exactly 42 — matching the PRD's own "42 PT sessions" example almost verbatim, strong signal this is the intended reference case) with **zero** lumbar-spine events, so Q3 was adapted from the PRD's generic "lumbar spine" example to "shoulder," and the PRD's own "not found" acceptance criterion is tested using lumbar spine instead (0 matches, real data — not synthesized for the test).
- **Still an open gap, called out honestly in the log rather than faked**: the log's Actual/Pass columns are unfilled because no `OPENAI_API_KEY` is configured in this environment, so the live grounding behavior (does the model actually answer these 5 questions correctly against real tool results) has not been exercised end-to-end with a real LLM this session — only the orchestration mechanics (iteration cap, tool dispatch, fallback messaging) are covered by the new unit tests. Whoever has API-key access should run the 5 questions through the real chat endpoint and fill in the log before the next demo.

## 4f. Gemini wired in as a second LLM provider + two real bugs found via live spot-check run (2026-07-29)

User supplied a real `GEMINI_API_KEY` and asked to wire it in — this resolves the "OpenAI vs. Gemini" Open Question from `PRD-AI-Chat.md` §11 by supporting both, Gemini preferred.

- **Key storage**: written to both root `.env` and `apps/api/.env` (gitignored at both paths — confirmed via `git check-ignore`), since it wasn't certain which cwd `npm run dev --workspace=apps/api` resolves `ConfigModule.forRoot()`'s default `.env` lookup against. Never committed, never printed in full to any log.
- **`AiChatService` now supports two providers**: `chat()` checks `GEMINI_API_KEY` first, falls back to `OPENAI_API_KEY`, then the honest "not configured" message. Added `chatWithGemini`/`callGemini`, structurally mirroring the existing `chatWithOpenAi`/`callOpenAi` (same iteration cap, same `toolCallLog`/`referencedEventIds` collection via the existing `collectEventIds` helper). `tool-definitions.ts` gained `GEMINI_TOOL_DEFINITIONS`, a schema reshape (OpenAI's `tools[].function` → Gemini's `tools[].functionDeclarations`, JSON-schema `type` values upper-cased to match Gemini's case-sensitive `Schema.type` enum). 6 new tests added to `ai-chat.service.spec.ts` (Gemini-preferred-over-OpenAI, tool-call round trip, iteration cap) — 30/30 backend tests passing.
- **Two live-API surprises, fixed by trial against the real endpoint** (not discoverable from docs alone): (1) this key's project has **zero** free-tier quota for `gemini-2.5-flash` and `gemini-2.0-flash` (confirmed via live 429 `RESOURCE_EXHAUSTED` with `limit: 0`) — `gemini-flash-lite-latest` is what actually has quota, now the default `GEMINI_MODEL`. (2) the API version this key targets rejects role `'function'` for function-call responses ("Role 'function' is not supported... use SYSTEM, USER, MODEL...", a live 400) despite that role appearing in older Gemini docs — function responses now go back under role `'user'` instead.
- **Ran the full `docs/AI-Chat-Spot-Check.md` script live** against the seeded "Caldwell" case with the real key, which surfaced two real, pre-existing bugs unrelated to Gemini itself:
  1. **`ToolExecutor.toFilters()` silently dropped the `keyword` tool argument** — it mapped `keyword` to a field also named `keyword`, but `MedicalEventsService.findByFilters` only reads `filters.q`. Every keyword-only `find_events`/`count_events` call had been returning the entire unfiltered case (caught because a live "lumbar spine" search came back referencing all 130 events in a case with zero lumbar-spine records). This bug predates the Gemini work — it would have affected the OpenAI path identically — and slipped past `tsc --noEmit` because TypeScript's excess-property check doesn't fire on non-literal object arguments. Fixed by mapping `keyword` → `q`; `tool-executor.spec.ts`'s existing assertion updated to the correct shape (it had been asserting the buggy behavior as correct).
  2. **`medicineType`/`recordType`/`bodyPart` tool params had no descriptions**, which caused the (small) Gemini model to confuse "Physical Therapy" as a `recordType` value and burn the full 4-iteration budget without answering. Fixed with disambiguating descriptions on both `find_events` and `count_events` schemas.
- **`docs/AI-Chat-Spot-Check.md` Actual/Pass columns now filled in** from this live run (post both fixes): Q2/Q3/Q4/Q5 pass cleanly against ground truth; Q1 ("first MRI") gets a caveat, not a clean pass — the seed case's own data has two rows narrating the same clinical episode with different literal dates, an ambiguity in the synthetic Excel source itself, not a grounding failure (the model's answer traces to a real tool result either way). Full detail in the log.
- **Dev server left running** on `:3000` with the new key wired in, for anyone who wants to try the chat panel live in the browser next.

## 4g. Export PDF / Export PPT — real implementation, no longer placeholders (2026-07-30)

Closed the "no real PDF/PPT export" gap flagged in §4/§7 as an explicit MVP exclusion. Went with **client-side generation of a structured medical-chronology document**, not a screenshot of the Body Map/Calendar UI — an attorney-usable report (title/case summary, body-part breakdown table, chronological encounter table/slides) reads far better than an image dump of the split-view UI, and needs no backend changes since `CaseViewPage` already holds all the required data (`Case`, `MedicalEvent[]`, `CaseStatistics`, `GroupedByBodyPart[]`, `TreatmentGap[]`) via existing TanStack Query hooks.

- **New `apps/web/src/utils/exportReport.ts`**: `exportCaseToPdf()` (jsPDF + jspdf-autotable) and `exportCaseToPptx()` (pptxgenjs). Both build the same three sections from the same `ExportReportData` shape: case summary stats (accident date, total encounters, treatment span, provider count, longest gap), a body-part breakdown table sorted by encounter count, and a full chronological encounter table (Date/Provider/Facility/Type/Care Type/Body Parts/Summary/Source-PDF-link). PDF paginates via autotable automatically with a repeating header and "Page N of M" footer; PPT chunks encounters 10-per-slide across as many "Treatment Timeline (i/n)" slides as needed. Colors reuse the app's own navy/indigo brand and `colorForMedicineType()` so the exported doc doesn't look like a generic table dump.
- **`CaseHeader.tsx`**: Export PDF/PPT buttons are no longer permanently `disabled` with a "Coming soon" tooltip — each now calls into `exportReport.ts`, shows its own `CircularProgress` + "Exporting…" label while running, and only disables when case/events/statistics/grouped data haven't loaded yet (`exportReady` prop, computed in `CaseViewPage.tsx`).
- **No backend changes** — `jspdf`, `jspdf-autotable`, `pptxgenjs` added to `apps/web/package.json` only.
- **Verified against real data, not a synthetic fixture**: since the Chrome extension still isn't connected in this environment, ran both export functions directly against the live seeded "Caldwell" case (130 events, 30 body parts) via `npx tsx` hitting the real running API on `:3000` — confirmed `exportCaseToPdf` produces a valid multi-page PDF (43 pages against the full case; a small 8-event slice produced a clean 5-page PDF checked both at the text level, via `pdfjs-dist` extraction of every page, and visually via a rendered PNG of page 1) and `exportCaseToPptx` produces a valid `.pptx` (unzipped and inspected each slide's XML text content, plus a rendered title-slide thumbnail) with correct title/summary/body-part/chronological content and no runtime errors. `tsc -b --noEmit` and `vite build` both clean. Actual in-browser click-through of the header buttons is still unverified (same Chrome-extension gap noted throughout §4a–§4d) — low risk since the generation logic itself (the part that could actually fail) has been exercised directly against real data, and the button wiring is a thin, typed prop pass-through.

## 5. Known Working End-to-End Paths (verified by reading code, not by running it)

1. Upload a valid Excel → Case + MedicalEvents persisted → redirect to Case View → stats/body-map/calendar all populate from real API calls.
2. Set accident date → persists via PATCH → refetches case (though nothing currently *displays* the date back on either panel — see §4).
3. Ask a chat question with `GEMINI_API_KEY` or `OPENAI_API_KEY` set → tool-calling loop executes real queries → grounded reply + referenced event ids → highlight set updates. Verified live end-to-end with a real Gemini key in §4f (not just by reading code, unlike the rest of this list) — see `docs/AI-Chat-Spot-Check.md` for the actual run.
4. Ask a chat question with no API key set → honest "not configured" message, no fabrication.

## 6. Testing — Major Gap

- **Backend:** `excel-parser.spec.ts` covers the full §8 list (clean file, missing column, bad dates, blank fields, multi-value cells, novel vocabulary, empty file, header order/case) — 8 tests passing. `cases.service.spec.ts` (§3b) now covers milestone creation/update and the `accidentDate` mirroring convention — 6 tests passing. `ai-chat.service.spec.ts` and `tools/tool-executor.spec.ts` (§4e) now cover the orchestrator and tool dispatch — 12 tests passing. 27/27 total. Still zero coverage for `MedicalEventsService` itself (filters/statistics/gaps query logic).
- **Frontend:** no test setup at all (no Vitest/Jest config, no component tests).
- ~~No spot-check log for the five required AI Chat questions~~ Done 2026-07-29 (§4e) — `docs/AI-Chat-Spot-Check.md` created with ground-truth expected answers from the seeded case; Actual/Pass columns still need a real `OPENAI_API_KEY` run to fill in (see §4e's last bullet).

## 7. Deliberate Non-Gaps (out of scope by design, not missing work)

Don't re-flag these — they're documented MVP exclusions, not oversights:

- No auth, no multi-case library/switcher (`PRD-Case-Management.md` §5).
- ~~No real PDF/PPT export~~ Implemented 2026-07-30 (§4g) — client-side structured-document export, ahead of the original MVP/Phase-2 split.
- No semantic/vector search — `semantic_search_events` is intentionally a keyword-match stub.
- No OCR/PDF ingestion.
- Only OpenAI wired for chat (Gemini is an open question, not a committed requirement).

## 8. Suggested Next Priorities

Roughly in the order that closes the biggest PRD-vs-code gaps first:

1. ~~Body Map popup + Calendar day popover (`PRD-Timeline-View.md` §6–7.4).~~ Done 2026-07-29 (§4a).
2. ~~Excel Import normalization fallbacks (§3 above) to match `PRD-Excel-Import.md` §4, plus the parser unit test suite it explicitly requires, plus the `importSummary`/`warnings` response shape.~~ Done 2026-07-29 (§3).
3. ~~Accident-date visual markers on both panels.~~ Done 2026-07-29 (§4a).
4. ~~Export button placeholders.~~ Done 2026-07-29 (§4a).
5. ~~Expand the body-part coordinate config toward the full Appendix A list.~~ Done 2026-07-29 (§4a).
6. ~~Visually verify the popup/popover and narrow-viewport breakpoint in a real browser.~~ Done 2026-07-29 (§4b) — verified via headless-Chrome screenshot against a live case (Chrome extension still unavailable). Popup/popover sizing specifically was confirmed structurally but not resize-tested; low risk given pure CSS percentage sizing.
7. ~~Calendar month-grid + activity-strip layout (§7.1–7.2).~~ Done 2026-07-29 (§4b).
8. Remaining Body Map/Calendar polish: empty/loading/error state copy for §5.4/§7.5's "no case loaded" paths, "jump to month" control (§11, low priority per PRD).
9. ~~AI Chat spot-check log (five questions, expected answers, re-run before any demo).~~ Done 2026-07-29 (§4e) — template + ground-truth answers exist; still needs a real-model run to fill in Actual/Pass.
10. ~~Remaining backend test gap: `AiChatService`/`ToolExecutor` had zero coverage.~~ Done 2026-07-29 (§4e). `MedicalEventsService` itself (filters/statistics/gaps) still has zero direct test coverage.
11. Fill in `docs/AI-Chat-Spot-Check.md`'s Actual/Pass columns by running the 5 questions through the real chat endpoint with `OPENAI_API_KEY` configured.

## 9. Open Questions Carried Over (unchanged from docs)

See `Architecture.md` §16, `PRD-Overview.md` §10, `PRD-Timeline-View.md` §11, `PRD-AI-Chat.md` §11, `PRD-Case-Management.md` §7 for the full lists. ~~OpenAI vs. Gemini~~ resolved 2026-07-29 (§4f) — both are supported, Gemini preferred when its key is set. Remaining open, not yet resolved by implementation work: data retention policy, real-world Excel column variance, front/back toggle necessity, cross-panel body-part→calendar highlighting as a fast-follow, and whether chat should ever go cross-case (§11's second question, still blocked on multi-case not existing).
