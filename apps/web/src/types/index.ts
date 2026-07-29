// Mirrors apps/api response shapes (docs/Architecture.md §9). Kept as a
// plain hand-written source of truth for the scaffold; consider generating
// this from the API (e.g. OpenAPI) once the contract stabilizes.

export interface Milestone {
  id: string;
  caseId: string;
  label: string;
  date: string;
}

export interface Case {
  id: string;
  name: string;
  patientAlias?: string | null;
  accidentDate?: string | null;
  createdAt: string;
  milestones?: Milestone[];
}

export interface MedicalEvent {
  id: string;
  caseId: string;
  date: string;
  recordType: string;
  provider: string;
  facility: string | null;
  bodyParts: string[];
  medicineType: string | null;
  summary: string | null;
  sourceFile: string | null;
  pdfLink: string | null;
}

export interface EventFilters {
  dateFrom?: string;
  dateTo?: string;
  provider?: string;
  bodyPart?: string;
  medicineType?: string;
  recordType?: string;
  q?: string;
}

export interface CaseStatistics {
  totalEvents: number;
  dateSpan: { from: string | null; to: string | null; days: number };
  byRecordType: Record<string, number>;
  byProvider: Record<string, number>;
  byBodyPart: Record<string, number>;
}

export interface TreatmentGap {
  from: string;
  to: string;
  gapDays: number;
}

export interface GroupedByBodyPart {
  bodyPart: string;
  count: number;
  dominantMedicineType: string | null;
  eventIds: string[];
}

export interface GroupedByDay {
  date: string;
  count: number;
  dominantMedicineType: string | null;
  eventIds: string[];
}

export interface ImportSummary {
  caseId: string;
  importSummary: {
    rowsImported: number;
    rowsSkipped: number;
    warnings: { row: number; column?: string; reason: string }[];
  };
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  referencedEventIds: string[];
  toolCalls: { name: string; args: Record<string, unknown> }[];
}
