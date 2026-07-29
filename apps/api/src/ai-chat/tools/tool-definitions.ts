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
          provider: { type: 'string', description: 'Clinician/practitioner name, e.g. "Grant T. Olsen, NP"' },
          bodyPart: { type: 'string', description: 'Anatomical region, e.g. "Shoulder", "Lumbar Spine"' },
          medicineType: {
            type: 'string',
            description:
              'Specialty/care category, e.g. "Physical Therapy", "Orthopedic", "Radiology", "Emergency Medicine". Use this — not recordType — for questions like "how many PT sessions" or "how many orthopedic visits".',
          },
          recordType: {
            type: 'string',
            description:
              'Document/note type, e.g. "Encounter Note", "Imaging Report", "Physical Therapy Note", "Discharge Summary". This is the kind of document, not the specialty — use medicineType for specialty questions.',
          },
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
          dateFrom: { type: 'string', description: 'ISO date, inclusive' },
          dateTo: { type: 'string', description: 'ISO date, inclusive' },
          provider: { type: 'string', description: 'Clinician/practitioner name' },
          bodyPart: { type: 'string', description: 'Anatomical region, e.g. "Shoulder", "Lumbar Spine"' },
          medicineType: {
            type: 'string',
            description:
              'Specialty/care category, e.g. "Physical Therapy", "Orthopedic", "Radiology". Use this — not recordType — for questions like "how many PT sessions".',
          },
          recordType: {
            type: 'string',
            description:
              'Document/note type, e.g. "Encounter Note", "Imaging Report". Not the specialty — use medicineType for specialty questions.',
          },
          keyword: { type: 'string', description: 'Matched against the summary text' },
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

/** Recursively upper-cases JSON-schema `type` values (STRING/OBJECT/NUMBER/…)
 * to match the Gemini function-calling REST API's `Schema.type` enum, which
 * is case-sensitive — everything else in the schema passes through as-is. */
function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (schema === null || typeof schema !== 'object') return schema;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (key === 'type' && typeof value === 'string') {
      out[key] = value.toUpperCase();
    } else if (key === 'properties' && value && typeof value === 'object') {
      out[key] = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toGeminiSchema(v)]),
      );
    } else {
      out[key] = toGeminiSchema(value);
    }
  }
  return out;
}

/** Same tools as TOOL_DEFINITIONS, reshaped for Gemini's generateContent
 * `tools[].functionDeclarations` field instead of OpenAI's `tools[].function`. */
export const GEMINI_TOOL_DEFINITIONS = TOOL_DEFINITIONS.map((t) => ({
  name: t.function.name,
  description: t.function.description,
  parameters: toGeminiSchema(t.function.parameters),
}));

export const GROUNDING_SYSTEM_PROMPT = `You are a grounded assistant answering questions about a single personal-injury case's medical timeline.

Rules:
1. You must never state a fact about the case that did not come from a tool result. If no tool covers the question, say so rather than guessing.
2. Always call a tool before answering a factual question about the case's events, counts, dates, gaps, or statistics.
3. semantic_search_events is a naive keyword match, not true semantic search — do not overstate its precision.
4. When your answer references specific events, include their ids so the UI can highlight them.`;
