# PRD — Timeline View (Body Map + Calendar Split)

> 🗺️ [[MOC|Map of Content]]

**Status:** Proposed
**Date:** 2026-07-29
**Related docs:** [`Architecture.md`](./Architecture.md) §5–7, [`PRD-Overview.md`](./PRD-Overview.md), [`PRD-Excel-Import.md`](./PRD-Excel-Import.md), [`PRD-AI-Chat.md`](./PRD-AI-Chat.md)
**Reference prototype:** [`UI Concepts/v7_bodymap_calendar_split.html`](../UI%20Concepts/v7_bodymap_calendar_split.html) — working, self-contained HTML prototype loaded with the real sample case (130 encounters, Dec 2024–May 2026). Behavior described below matches this prototype; deviations for production are called out explicitly in §10.

## 1. Summary

The Timeline View is the primary Case View and the app's answer to the hackathon's floor requirement ("render a clear timeline where each event is seen") and its ceiling ambition ("make a jury feel eighty medical events in ten seconds"). It presents the same case through two synchronized, half-screen panels:

- **Left — Body Map:** *where* the client was hurt. A simplified human figure with clickable hotspots per body part.
- **Right — Calendar Heatmap:** *when* treatment happened, and how dense or sparse it was.

Both read from the same case data, share the same accident-date milestone, and update together when a different Excel is loaded.

## 2. User Stories

- As an attorney, I want to click "Shoulder" and immediately see every encounter that treated it, in order, so I can build the injury narrative for that body part without hunting through the full record.
- As an attorney, I want to see at a glance which months were treatment-dense and which were quiet, so I can identify and explain (or challenge) gaps in care.
- As an attorney, I want to mark the date of the accident — which is never in the medical records — and see it reflected on both views, so the "before vs. after" story is visually obvious.
- As a paralegal, I want to load a different case's Excel into the same view without anything breaking, even if that case uses body-part or provider vocabulary the sample case didn't use.
- As an attorney, I want a body part or a calendar day's detail to open without losing my place in the rest of the view — not a full-page navigation, not something that requires re-finding my spot.

## 3. Layout Requirements

- **Desktop (≥ 860px viewport width):** two panels side by side, each exactly 50% of the available width, separated by a visible divider. A shared header, stats bar, and toolbar sit above the split and are never duplicated per panel.
- **Narrow viewports (< 860px):** panels stack vertically, Body Map above Calendar. No horizontal scrolling of the whole page (individual panel internals may scroll).
- Each panel scrolls independently and vertically within its own bounds; the shared header/stats/toolbar remain visible (sticky) as the user scrolls a panel's content.

## 4. Shared Controls (above the split)

| Control | Behavior |
|---|---|
| **Load different Excel** | Re-runs Excel Import (`PRD-Excel-Import.md`) for a new file; on success, resets both panels' selection/open-popup state and re-renders from the new case data. Must not require a page reload. |
| **Date of loss (accident date)** | Optional date input. On change: persists via `PATCH /cases/:id/milestones` (`Architecture.md` §9) and immediately re-renders both panels — a dashed/ringed marker on the Calendar's matching day, and an inline "⚑" flag on any Body Map popup card whose event date matches. |
| **Front / Back view toggle** | Body Map only. Switches which curated set of hotspots is visible on the same figure (§5.2). Pure UI state, not persisted. |
| **Calendar color mode toggle** | Calendar only: *Intensity* (single-hue scale by encounter count) vs. *Medicine type* (dominant care type per day/cell, shaded by volume). Pure UI state, not persisted. |
| **Stats bar** | Read-only summary computed from the full case: total encounters, treatment span in days, distinct body parts noted, distinct providers, days with recorded activity. Recomputes whenever a new Excel loads. |
| **Export PDF / Export PPT** | MVP: visible, clearly labeled, but disabled or linking to a "coming soon" state — not silently broken buttons. Real export is Phase 2 (`Medical-timeline-MVP-plan.md` Phase 2 → Export). |

## 5. Panel A — Body Map

### 5.1 Figure & hotspots

- A simplified, stylized human figure (not photorealistic; abstraction is intentional and sufficient — validated in the prototype).
- One hotspot per **known** body-part term present in the case (§5.3 defines "known").
- **Sizing:** hotspot radius scales with that body part's encounter count (`radius = clamp(min, base + k·√count, max)`), so a body part mentioned 40 times reads as visibly more significant than one mentioned twice, without one dominating the whole figure.
- **Coloring:** each hotspot is colored by the *dominant* `medicineType` among that body part's encounters (majority vote), using the same medicine-type color key used elsewhere in the app (Calendar panel, event tags).
- Each hotspot displays its encounter count as its label.
- Hovering a hotspot shows a tooltip with the body-part name and count; hotspots scale up slightly on hover to confirm interactivity.

### 5.2 Front / Back toggle

- The same figure serves both views; only the *set* of visible hotspots changes.
- A fixed set of predominantly-posterior terms (e.g. Back, Upper Back, Spine) are Back-view-only.
- A shared set of terms that reasonably appear on either view (Head, Neck, Shoulder, Arm, Hand, Leg, Foot, etc.) remain visible on both, so the Back view is never empty/sparse when a case has posterior-only findings alongside common ones.
- Default view on load: Front.

### 5.3 Generic-Excel requirement — "Other findings"

This is a direct implementation of the hackathon's one hard rule (works with any Excel, not just the sample) and must not be treated as optional polish.

- The app ships with a curated coordinate lookup covering common anatomical terms (Appendix A lists the set validated against the sample case: 30 terms).
- Any `bodyPart` value present in the loaded case but **not** in the lookup is never dropped and never causes an error. It renders instead as a clickable chip in an "Other findings" list beneath the figure, labeled with the term and its count.
- Clicking an "Other findings" chip opens the exact same detail popup (§6) as clicking a hotspot.
- Acceptance check: load a case whose `Body Parts` column uses different or unusual terminology than the sample case (e.g. "Cervical Spine," "L4-L5," "Bilateral Knees") and confirm the app renders correctly with those terms appearing under Other Findings, with zero console errors and zero silently-dropped events.

### 5.4 Empty / loading / error states

- No case loaded: figure renders with no hotspots and a short instructional hint ("Click a body part to explore" is replaced by an upload prompt).
- Case has zero `Body Parts` values populated: figure renders with no hotspots; a message states no body-part data was found in this case rather than silently showing an empty figure.

## 6. Body Map Detail Popup — Sizing & Behavior (explicit acceptance criteria)

This is the most specific interaction requirement in this document and must be implemented exactly as specified, not approximated:

- **Trigger:** clicking any hotspot or "Other findings" chip.
- **Sizing:** the popup card's width and height are **90% of the width and 90% of the height of the Body Map panel's own bounding box** — not 90% of the browser viewport, not 90% of the full page. On a half-screen desktop layout this means the popup is visibly contained within the left half of the screen; it must never visually extend into or over the Calendar panel.
- **Positioning:** centered within the Body Map panel (5% inset on all sides), absolutely positioned relative to that panel's container.
- **Backdrop:** a dimmed overlay covers the Body Map panel only (not the Calendar panel), so the Calendar remains legible and interactable-looking behind the dim, reinforcing that the popup is scoped to its half.
- **Dismissal:** an explicit close control (✕) in the popup's header, and clicking the dimmed backdrop.
- **Content, top to bottom:**
  1. Header: body part name (large) and a count badge ("N of M encounters" — M is the unfiltered total, N reflects any active medicine-type filter).
  2. Medicine-type filter chips: one per distinct `medicineType` present among this body part's events, multi-toggle, restyled (filled with that type's color) when active; toggling re-filters the list below without closing the popup.
  3. Scrollable list of matching encounters, each as a card showing: provider, facility, date (with an accident-date flag if it matches), a medicine-type tag, the full summary text, and a "Source PDF" link/action if the record has one.
  4. Empty state within the popup if the active medicine-type filter(s) leave zero matching encounters.
- Opening a new body part while one popup is already open replaces its content in place (does not stack multiple popups).
- Loading a different Excel closes any open popup and clears the selected body part.

## 7. Panel B — Calendar Heatmap

### 7.1 Activity strip

- A GitHub-contributions-style strip spanning the full case date range (padded a few days on each end), one column per week, 7 rows (Sun–Sat).
- Each day cell is shaded by encounter count that day, per the active color mode (§7.3).
- Horizontally scrollable within its own container; month labels appear above the column where each new month begins.
- The accident date, if set, is visually ringed/outlined on the strip regardless of whether it has any encounters.

### 7.2 Month-by-month grids

- Below the strip: one traditional calendar card per month spanned by the case, in chronological order, single-column stacked layout (appropriate for half-screen width; a wider standalone view could use a multi-column grid, see §10).
- Each card: month/year header, weekday header row, day cells (leading/trailing blanks for alignment), each populated cell shaded per the active color mode and showing the day number.
- Days with ≥1 encounter are visually distinguished as clickable (cursor + hover outline); days with zero encounters are not clickable.
- The accident date's cell, if within a rendered month, is ringed/outlined the same way as on the strip.

### 7.3 Color modes

- **Intensity (default):** a single-hue sequential scale (light → dark) keyed to encounter count that day, capped at a "4+" bucket so one outlier day doesn't wash out the rest of the scale. A legend showing the "Less → More" scale is always visible.
- **Medicine type:** each day is colored using the dominant `medicineType` for that day's encounters, with opacity scaled by count. A legend listing each medicine type's color is shown in this mode.
- Toggling the mode re-renders both the strip and all month grids together — never a mismatched state where one shows intensity and the other shows medicine type.

### 7.4 Day detail popover

- **Trigger:** clicking any day cell (strip or month grid) with ≥1 encounter.
- **Positioning:** a small card anchored near the click/cursor position, in fixed viewport coordinates (not scoped to the panel — deliberately different from the Body Map popup, see `Architecture.md` §7.4 for rationale). Repositions to stay on-screen near viewport edges.
- **Backdrop:** full-screen dim; clicking it or the ✕ closes the popover.
- **Content:** date header with encounter count, then one card per encounter that day (medicine-type tag, provider, facility, record type, full summary, source PDF action if present) — same card format as the Body Map popup's list items, for visual consistency across the app.

### 7.5 Empty / loading / error states

- No case loaded: strip and month grids render empty with an upload prompt.
- Case with a very short span (all encounters on one day): strip and a single month grid still render correctly — must not divide by zero or crash when `maxDate - minDate` is effectively 0.

## 8. Cross-Panel Synchronization

| Event | Body Map reaction | Calendar reaction |
|---|---|---|
| New Excel loaded | Hotspots, "Other findings," and open popup reset and rebuild from new data | Strip, month grids, and any open popover reset and rebuild from new data |
| Accident date set/changed | Any open popup's matching card shows the ⚑ flag; no other change (Body Map has no inherent date axis) | Strip cell and month-grid cell for that date get the ring/outline treatment immediately |
| Stats bar | Recomputed from full case, not from either panel's current filter/selection state | Same |

The two panels never require the user to re-select or re-filter to stay in sync — synchronization is driven entirely by shared case data and the shared accident-date field, not by cross-panel event listeners on transient UI state (e.g. selecting a body part does not filter the calendar, and vice versa — each panel's own detail view is independently scoped, by design, so a user can explore one axis without losing the other).

## 9. Acceptance Criteria

- [ ] Loads and renders both panels correctly for the sample case (130 encounters) and for at least one different, previously-unseen Excel in the same column schema.
- [ ] Body Map hotspot sizing and coloring reflect count and dominant medicine type respectively, visibly different between a high-count and low-count body part.
- [ ] Body Map popup measures 90% × 90% of the Body Map panel's own box on both a wide desktop viewport and immediately after a browser resize — not fixed pixel dimensions, not viewport-relative.
- [ ] Body Map popup never visually overlaps the Calendar panel.
- [ ] "Other findings" correctly captures and displays any `bodyPart` value not in the curated coordinate lookup, with zero dropped events and zero console errors.
- [ ] Calendar color-mode toggle updates strip and all month grids together, with correct legend for the active mode.
- [ ] Accident-date marker appears correctly on both panels from a single input.
- [ ] Loading a new Excel resets all selection/popup state on both panels without a full page reload.
- [ ] Narrow-viewport layout stacks panels vertically with no horizontal page scroll.
- [ ] No dependency on the sample case's specific values anywhere in the rendering logic (coordinate lookup keys on body-part *names*, not case-specific data).

## 10. Prototype → Production Deltas

The referenced prototype (`v7_bodymap_calendar_split.html`) embeds case data directly and re-parses an uploaded Excel client-side via SheetJS with no backend. Production differences:

- Event data comes from `GET /cases/:id/events` (and, for larger cases, the grouped endpoints in `Architecture.md` §8) rather than an embedded JSON blob or fully-client-side re-parse.
- "Load different Excel" calls the real `POST /cases/import` endpoint (`PRD-Excel-Import.md`) and swaps the active `caseId`, rather than re-parsing in-browser only.
- Accident date is persisted server-side (`PATCH /cases/:id/milestones`) instead of living only in a local `<input>`'s uncontrolled state.
- For a body part with a very large number of encounters (well beyond the sample case's max of ~96 for "Shoulder"), the popup's encounter list should virtualize or paginate rather than rendering every card at once — not required for the sample case, but noted so it isn't a surprise at scale.
- The body-part coordinate lookup ships as a maintained config file (`Architecture.md` §7.2) rather than an inline object literal, so it can grow without a component rewrite.
- Multi-column month-grid layout becomes viable if the Timeline View is ever offered as a full-width standalone page (e.g. a "focus on Calendar" expand action) — not required for MVP's split layout.

## 11. Open Questions

- Should selecting a body part optionally cross-highlight matching days on the Calendar (a "show me when the shoulder was treated" overlay)? Deliberately excluded from MVP (§8) to keep each panel independently legible; worth user-testing as a fast-follow.
- Should the Front/Back toggle auto-select based on which posterior-only terms are present in the loaded case, rather than always defaulting to Front? Low priority — current default is acceptable per prototype validation.
- At what case size (event count or date span) does the single-column month-grid list become a usability problem, and does that threshold warrant a "jump to month" control? Not observed in the sample case (18 months, comfortably scrollable).

## Appendix A — Curated Body-Part Coordinate Set (validated against the sample case)

Head, Face, Eye, Ear, Nose, Mouth, Sinuses, Neck, Shoulder, Upper Arm, Arm, Elbow, Forearm, Wrist, Hand, Finger, Chest, Lungs, Heart, Armpit, Abdomen, Stomach, Intestines, Genitals, Leg, Upper Back, Back, Spine, Foot, Toe.

This list is a starting point, not a hard ceiling — extend it as real-world case data surfaces additional common terms, per `Architecture.md` §7.2.
