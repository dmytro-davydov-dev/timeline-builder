# PRD — Excel Import

> 🗺️ [[MOC|Map of Content]]

**Status:** Proposed
**Date:** 2026-07-29
**Related docs:** [`Architecture.md`](./Architecture.md) §6, §9–10, [`PRD-Overview.md`](./PRD-Overview.md), [`PRD-Timeline-View.md`](./PRD-Timeline-View.md) §4, §10, [`Medical-Timeline-Phase1-Implementation-Plan.md`](../Medical-Timeline-Phase1-Implementation-Plan.md) §2

## 1. Summary

Excel Import is the entry point for every case: upload a `.xlsx` file of medical encounters, validate and normalize it, and persist it as a `Case` with its `MedicalEvent` rows. Everything downstream (Timeline View, AI Chat, filters) depends on this pipeline producing clean, consistent data — and, per the hackathon's one hard rule, doing so for **any** Excel in the agreed column format, not only the sample case.

## 2. Expected Schema

One row per medical encounter. Column headers (case-insensitive match, tolerant of whitespace):

| Column | Maps to | Notes |
|---|---|---|
| `Encounter Date` | `MedicalEvent.date` | Required. Must parse to a valid date. |
| `Primary Provider` | `MedicalEvent.provider` | Required-ish (falls back to "Unknown" if blank). May contain multiple providers separated by `;`. |
| `Facility` | `MedicalEvent.facility`* | Falls back to "Unknown facility" if blank. |
| `Body Parts` | `MedicalEvent.bodyParts` | Comma-separated; split into an array on normalize. May be blank. |
| `Medicine Type` | `MedicalEvent.medicineType` | May be blank → normalize to "Other". |
| `Record Type` | `MedicalEvent.recordType` | Falls back to "Record" if blank. |
| `Summary` | `MedicalEvent.summary` | Free text; may be long. |
| `Link To Pdf` | `MedicalEvent.pdfLink` / `hasPdf` flag | Any non-empty value is treated as "has a linked PDF" for MVP (see §6 for the exact-URL caveat). |

\* `Facility` isn't in the minimal `MedicalEvent` shape in `Medical-Timeline-Phase1-Implementation-Plan.md` §1 but is used throughout the Timeline View (provider/facility line on every event card) — add it as a first-class column in the schema and data model, not folded into `rawRow` only.

Column *names* are matched flexibly (case-insensitive, trimmed); column *order* is not assumed. Extra/unexpected columns are preserved in `rawRow` and otherwise ignored, not treated as errors.

## 3. User Stories

- As a paralegal, I want to upload our firm's export and have it just work, without reformatting it to match a sample file exactly.
- As a paralegal, I want to know immediately and specifically what's wrong if my file doesn't import cleanly — which rows, which columns, why — not a generic "import failed."
- As an attorney, I want to swap in a corrected or updated Excel for an existing case without starting over.

## 4. Functional Requirements

1. **Upload:** accepts `.xlsx` (and `.xls` as a bonus, not required) via a file picker; multipart upload to `POST /cases/import`.
2. **Parse:** first sheet by default (configurable sheet name as a stretch goal, not MVP-required); read cell types explicitly so dates parse correctly rather than as serial numbers or strings-of-numbers.
3. **Validate**, before persisting anything:
   - All required columns present (by flexible name match, §2).
   - At least one data row beyond the header.
   - Each row's `Encounter Date` parses to a valid date.
   - Return a **structured, row-and-column-level list of problems** (`{ row, column, reason }[]`), not a single pass/fail — attorneys' source data will not be clean, and a generic failure gives them nothing to act on.
4. **Normalize**, per row:
   - Trim all string fields.
   - Parse `Encounter Date` to ISO 8601.
   - Split `Body Parts` and multi-provider `Primary Provider` on their respective delimiters (`,` and `;`) into arrays, trimming each element.
   - Blank `Medicine Type` → `"Other"`; blank `Facility` → `"Unknown facility"`; blank `Primary Provider` → `"Unknown"`; blank `Record Type` → `"Record"`. These fallbacks must be consistent with what `PRD-Timeline-View.md` expects (its grouping/coloring logic assumes non-null values).
5. **Persist:** create a `Case` row and bulk-insert `MedicalEvent` rows in a single transaction — partial imports (some rows in, some not) must never happen.
6. **Response:** `{ caseId, importSummary: { rowsImported, rowsSkipped, warnings[] } }`. Rows that fail validation are skipped and listed, not silently dropped and not enough to fail the whole import unless *zero* usable rows remain.
7. **Re-import / replace:** loading a different Excel from the Timeline View's "Load different Excel" control (`PRD-Timeline-View.md` §4) runs this same pipeline for a new case and switches the active `caseId` — it does not mutate an existing case's data in place for MVP (simpler, avoids partial-update edge cases; revisit if "update existing case with new records" becomes a real need).

## 5. Non-Functional Requirements

- Parser and validator are pure, unit-testable functions, decoupled from the NestJS controller (`Medical-Timeline-Phase1-Implementation-Plan.md` §2) — bad-data edge cases must be testable without spinning up the full app.
- Import of a ≤200-row file completes in under 3 seconds end-to-end (`Architecture.md` §13).
- Library: `exceljs` (not raw `xlsx`), specifically for its explicit cell-type handling — date parsing bugs are the single most likely real-world failure mode for this pipeline and must be guarded against with fixture tests (§8).

## 6. Edge Cases

| Case | Required behavior |
|---|---|
| Missing a required column entirely | Reject with a clear, specific error naming the missing column; zero rows imported |
| Some rows have unparseable dates | Skip those rows, list them in `warnings`, import the rest |
| `Body Parts` blank for a row | Import the row with an empty body-parts array; it simply won't appear on the Body Map (and will surface correctly in `PRD-Timeline-View.md`'s "case has zero body-part data" state only if *every* row is blank) |
| `Link To Pdf` contains a non-URL placeholder (the sample file uses the literal text `"pdf"`, not a real link) | Treat as a boolean "has a linked source record" flag for MVP UI purposes (enables the "Source PDF" action in the Timeline View), not as a clickable real link unless the value is a genuine URL — document this distinction so the UI doesn't silently 404 |
| Duplicate rows (same date/provider/summary) | Import as separate events — the source data is the source of truth; no dedup logic in MVP |
| File has multiple sheets | Use the first sheet only for MVP; no multi-sheet merge |
| Completely empty file / only a header row | Reject clearly: "no data rows found" |
| A body-part or provider vocabulary the app has never seen before | Must import successfully — this is exactly the generic-Excel requirement; downstream, `PRD-Timeline-View.md` §5.3 handles unrecognized body parts gracefully, but the import layer itself must never reject a row just because a value is unfamiliar |

## 7. Open Questions

- Real-world column-naming variance beyond the sample file — confirm before hardening the flexible-match logic further.
- Should a second sheet or a differently-named sheet ever be auto-detected, or is "first sheet always" acceptable long-term?
- Is any PII/PHI-specific handling required at the upload boundary itself (e.g. virus scanning, file-type sniffing beyond extension) for a production deployment — flagged in `Architecture.md` §12 as a broader security topic, not resolved here.

## 8. Acceptance Criteria

- [ ] Sample case Excel imports cleanly with zero warnings.
- [ ] A deliberately "messy" fixture file (missing column, several bad dates, mixed body-part formatting, blank cells across every optional column) imports the good rows and reports specific, row/column-level warnings for the rest.
- [ ] An Excel using body-part/provider vocabulary not seen in the sample case imports without error.
- [ ] Import of a ≤200-row file completes in under 3 seconds.
- [ ] Unit tests cover: clean file, missing required column, unparseable dates, blank optional fields, multi-value cells (body parts, multi-provider), empty file.
