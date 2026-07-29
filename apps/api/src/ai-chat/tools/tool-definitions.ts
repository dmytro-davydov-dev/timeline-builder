/**
 * Tool schemas passed to the LLM as OpenAI-style function defs
 * (Medical-Timeline-Phase1-Implementation-Plan.md §5). Each tool is a thin
 * wrapper over MedicalEventsModule query methods — no duplicate business
 * logic between the REST API and the chat tools.
 *
 * `semantic_search_events` is a Phase 1 stub (naive keyword/LIKE match),
 * clearly labeled as such per the plan — do not fake semantic behavior.
 */
export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'find_events',
      description:
        'Find medical events for the case matching optional filters. Returns id, date, recordType, provider, bodyParts, summary for each match.',
      parameters: {
        type: 'object',
        properties: {
          dateFrom: { type: 'string', description: 'ISO date, inclusive' },
          dateTo: { type: 'string', description: 'ISO date, inclusive' },
          provider: { type: 'string' },
          bodyPart: { type: 'string' },
          medicineType: { type: 'string' },
          recordType: { type: 'string' },
          keyword: { type: 'string', description: 'Matched against the summary text' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'count_events',
      description:
        'Count medical events matching the same filters as find_events, without returning the full list.',
      parameters: {
        type: 'object',
        properties: {
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' },
          provider: { type: 'string' },
          bodyPart: { type: 'string' },
          medicineType: { type: 'string' },
          recordType: { type: 'string' },
          keyword: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_event_details',
      description: 'Get the full record for a single medical event by id.',
      parameters: {
        type: 'object',
        properties: { eventId: { type: 'string' } },
        required: ['eventId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_case_statistics',
      description:
        'Get totals, date span, and breakdowns by record type / provider / body part for the case.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_treatment_gaps',
      description:
        'Find gaps between consecutive treatment events exceeding a threshold, in days.',
      parameters: {
        type: 'object',
        properties: {
          thresholdDays: { type: 'number', description: 'Default 30' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'semantic_search_events',
      description:
        'PHASE 1 STUB: naive keyword/LIKE match over event summaries. Not true semantic search — do not overtrust results that depend on exact wording.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  },
] as const;

export const GROUNDING_SYSTEM_PROMPT = `You are a grounded assistant answering questions about a single personal-injury case's medical timeline.

Rules:
1. You must never state a fact about the case that did not come from a tool result. If no tool covers the question, say so rather than guessing.
2. Always call a tool before answering a factual question about the case's events, counts, dates, gaps, or statistics.
3. semantic_search_events is a naive keyword match, not true semantic search — do not overstate its precision.
4. When your answer references specific events, include their ids so the UI can highlight them.`;
