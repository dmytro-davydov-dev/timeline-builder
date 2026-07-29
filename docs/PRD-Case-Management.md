# PRD — Case & Milestone Management

> 🗺️ [[MOC|Map of Content]]

**Status:** Proposed
**Date:** 2026-07-29
**Related docs:** [`Architecture.md`](./Architecture.md) §6, §9, §12, [`PRD-Overview.md`](./PRD-Overview.md), [`PRD-Excel-Import.md`](./PRD-Excel-Import.md), [`PRD-Timeline-View.md`](./PRD-Timeline-View.md) §4

## 1. Summary

A `Case` is created automatically when an Excel imports successfully (`PRD-Excel-Import.md` §4) and holds the data every other module reads: its `MedicalEvent` rows, and its milestones — the most important of which is the accident date, a fact that is never in the source Excel and must always be entered manually.

## 2. MVP Scope: Single Case Per Session

For MVP, the app supports one active case at a time:

- Importing an Excel creates a new case and makes it the active one.
- Loading a different Excel via the Timeline View's "Load different Excel" control (`PRD-Timeline-View.md` §4) creates another new case and switches to it — it does not merge into or overwrite the previous case's data.
- There is no case list/browser UI in MVP, and no authentication — this is an explicit, documented limitation (`Architecture.md` §12), not an oversight. It matches the hackathon's own demo model (one deployed link, one case loaded at a time) and keeps MVP scope honest.

## 3. Functional Requirements

1. `POST /cases/import` creates the `Case` row as part of the same transaction that inserts its `MedicalEvent` rows (`PRD-Excel-Import.md` §4) — a case never exists without at least one successfully-imported event.
2. `GET /cases/:id` returns case detail including milestones.
3. `PATCH /cases/:id/milestones` sets or updates a milestone, `{ label, date }`. The Timeline View's accident-date field is a thin wrapper around this endpoint using the reserved `label: "accidentDate"` convention (`Architecture.md` §9) — `accidentDate` is additionally surfaced as a first-class field directly on `Case` for fast reads, since both Timeline View panels read it on every render (`Architecture.md` §6).
4. Milestones beyond the accident date (e.g. "Surgery Date," "MMI Date") are supported by the same generic table/endpoint for extensibility, even though only the accident date has dedicated UI treatment in MVP (`PRD-Timeline-View.md`).
5. A case has an optional `name` and `patientAlias` for display purposes — the sample data contains no patient name field, so this should default to something like "Case — [import date]" rather than requiring manual entry before a case is usable.

## 4. Non-Functional Requirements

- Case creation is atomic with its first event batch (§3.1) — no orphaned empty cases.
- No PHI (event summaries, raw rows) appears in case-level logs beyond what's necessary for debugging import failures (`Architecture.md` §12).

## 5. Out of Scope (MVP) — Phase 2 Path

- **Multi-case library / switcher.** Earlier UI exploration (`UI Concepts/v3_command_center.html`) prototyped a mocked case-switcher dropdown ("Caldwell v. Doe," "Martinez v. Rivera," ...) as a concept, not a built feature. Real multi-case support requires:
  - A case list endpoint and UI.
  - Some form of user/firm scoping (auth) so cases aren't globally visible to anyone with the deployed link.
  - Decisions on retention/deletion policy per case (ties to `Architecture.md` §12's data-retention decision, which currently assumes session/demo-scoped storage).
- **Auth & multi-user.** No login, no roles, no per-firm data isolation in MVP. This is the single biggest gap between MVP and a real production tool and should be the first Phase 2 priority if the project continues past the hackathon.
- **Case editing/merging** (e.g. appending newly-received records to an existing case rather than creating a new one) — not required for MVP; each import is a fresh case.

## 6. Acceptance Criteria

- [ ] Importing an Excel always results in exactly one new `Case` with all its valid rows as `MedicalEvent`s, or zero new data if import fails validation entirely (`PRD-Excel-Import.md` §4).
- [ ] Setting the accident date via the Timeline View persists it and it is present on subsequent `GET /cases/:id` calls (i.e., survives a refresh within the same deployed session/database).
- [ ] Loading a second Excel does not corrupt or merge with the first case's data.
- [ ] No case list or auth UI is present in MVP — confirmed absent, not half-built.

## 7. Open Questions

- When Phase 2 introduces multi-case support, does the accident-date-as-first-class-field decision (§3.3) still hold, or should all milestones move to a uniform generic model with no special-cased fields? Revisit once multi-case UI requirements (from the `v3_command_center` case-switcher concept) are formalized into their own PRD.
- Data retention policy for stored cases beyond a single demo session — flagged in `Architecture.md` §12 as a decision to make explicitly before any real client data is loaded.
