# MVP Plan -- Medical Timeline AI (Hackathon)

> 🗺️ [[MOC|Map of Content]] · superseded/extended by [[Architecture]] and the [[PRD-Overview|PRDs in docs/]]

## Goal

Build a web application that transforms a structured Excel file
containing medical encounters into an interactive treatment timeline for
personal injury attorneys.

The MVP is divided into two implementation phases.

------------------------------------------------------------------------

# Phase 1 --- Core Product (No n8n)

## Objectives

-   Upload Excel file
-   Parse and normalize medical events
-   Render an interactive timeline
-   AI Chat using LLM Tool Calling
-   Structured retrieval (no vector database required)
-   Production-quality UX

## Suggested Stack

### Frontend

-   React + TypeScript + Vite
-   MUI
-   TanStack Query
-   Timeline visualization (vis-timeline / custom)

### Backend

-   NestJS
-   TypeScript
-   SQLite (or PostgreSQL)
-   OpenAI or Gemini Function Calling

------------------------------------------------------------------------

## Architecture

React UI ↓ NestJS REST API ↓ Case Service ↓ Medical Event Repository ↓
AI Chat Orchestrator ↓ LLM + Tool Calling ↓ Domain Tools

------------------------------------------------------------------------

## Functional Requirements

### Excel Import

-   Upload Excel
-   Validate schema
-   Parse into MedicalEvent objects
-   Persist case

### Timeline

-   Chronological events
-   Zoom & pan
-   Event details
-   Highlight selected event
-   Manual milestone (e.g. Accident Date)

### Filters

-   Date
-   Provider
-   Body Part
-   Medicine Type
-   Record Type
-   Keyword search

### AI Chat

LLM never answers directly from memory.

Instead it calls backend tools.

Example tools:

-   find_events
-   count_events
-   get_event_details
-   get_case_statistics
-   find_treatment_gaps
-   semantic_search_events (optional stub)

Example questions:

-   When was the first MRI?
-   How many PT sessions?
-   Show all lumbar spine treatments.
-   Were there any treatment gaps?
-   Summarize this patient's treatment.

------------------------------------------------------------------------

## Backend Modules

-   Cases
-   Medical Events
-   Timeline
-   AI Chat
-   Excel Import

------------------------------------------------------------------------

## AI Chat Flow

User Question ↓ LLM chooses tool(s) ↓ Backend executes tool ↓ LLM
receives factual data ↓ Grounded response ↓ Timeline highlights
referenced events

------------------------------------------------------------------------

## Nice-to-have

-   PDF link opening
-   AI-generated treatment summary
-   Export timeline as PDF
-   Dark mode

------------------------------------------------------------------------

# Phase 2 --- Automation & AI Platform (with n8n)

## Goals

Extend the MVP into a production-oriented AI platform.

------------------------------------------------------------------------

## Add n8n

Run n8n in Docker Compose.

Responsibilities:

-   AI workflows
-   Background jobs
-   Integrations
-   Scheduled tasks
-   Notifications

Business logic remains inside NestJS.

------------------------------------------------------------------------

## New Features

### AI Workflows

-   Generate case summaries
-   Rewrite summaries
-   Generate attorney reports
-   Generate insurer reports
-   Generate client-friendly summaries

### Background Processing

-   Create embeddings
-   Index new cases
-   Cache AI summaries

### Export

-   PDF
-   PowerPoint
-   Word

### Notifications

-   Email reports
-   Slack
-   Webhooks

### Integrations

-   Google Drive
-   Dropbox
-   CRM
-   Case Management Systems

------------------------------------------------------------------------

## Semantic Search (RAG)

Introduce vector search.

Pipeline:

Medical Events ↓ Embeddings ↓ Vector Store ↓ Semantic Retrieval ↓ LLM

Use RAG only for semantic queries.

Structured queries continue using backend tools.

------------------------------------------------------------------------

## Advanced AI

-   Multi-step tool calling
-   Treatment phase detection
-   AI recommendations
-   Timeline narrative generation
-   AI editing assistant

------------------------------------------------------------------------

## High-Level Architecture

React ↓ NestJS ├── Domain Services ├── AI Chat Orchestrator ├── REST API
└── n8n Client ↓ n8n ├── AI Workflows ├── Export Workflows ├──
Notifications ├── Embedding Pipeline └── Integrations

------------------------------------------------------------------------

# Guiding Principles

1.  Domain logic lives in NestJS.
2.  LLM reasons; backend computes.
3.  Tool Calling is preferred over prompt-only reasoning.
4.  RAG is used only when semantic retrieval adds value.
5.  n8n orchestrates workflows, not core business logic.
6.  Every AI answer should be grounded in retrieved evidence.
