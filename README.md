# Medical Timeline AI

An app that turns a structured Excel of a personal-injury case's medical encounters into an interactive, visual treatment timeline — built for attorneys who need to make a jury, client, or insurance adjuster *feel* a case's medical history in seconds, not read a table of eighty events.

Originating brief: [Swans Applied AI Hackathon](https://www.swans.io) (Sintra, 24 Jul 2026) — digest a clean Excel of medical events, produce a visual, usable timeline. This repo continues that concept as a real MVP.

## What's here

- **`docs/`** — architecture and product requirements for the MVP. Start at [`docs/MOC.md`](./docs/MOC.md) (Map of Content) or [`docs/PRD-Overview.md`](./docs/PRD-Overview.md).
- **`UI Concepts/`** — seven working, self-contained HTML prototypes exploring different ways to visualize the same case data. **v7 (Body Map + Calendar split)** was selected as the MVP's flagship Case View — see [`docs/PRD-Timeline-View.md`](./docs/PRD-Timeline-View.md).
- **`Medical-timeline-MVP-plan.md`** / **`Medical-Timeline-Phase1-Implementation-Plan.md`** — the original two-phase build plan that `docs/Architecture.md` refines and extends.

## The idea, in one line

Upload any Excel in the agreed column format (`Encounter Date`, `Primary Provider`, `Facility`, `Body Parts`, `Medicine Type`, `Record Type`, `Summary`, `Link To Pdf`) → get a case view showing **where** the client was hurt (an anatomical body map) and **when** treatment happened, including the gaps (a density calendar) → ask an AI chat grounded questions about the case (`When was the first MRI?`) with answers that highlight the relevant spots on both views.

## Quick links

- [Map of Content](./docs/MOC.md) — full index of every doc and prototype
- [Product overview](./docs/PRD-Overview.md) — problem, personas, MVP scope
- [Architecture](./docs/Architecture.md) — system design and key decisions
- [Timeline View spec](./docs/PRD-Timeline-View.md) — the flagship Body Map + Calendar view
- [v7 prototype](./UI%20Concepts/v7_bodymap_calendar_split.html) — open directly in a browser

## Status

Planning stage. `docs/` defines the MVP to be built; `UI Concepts/` are validated interaction prototypes, not the production app.
