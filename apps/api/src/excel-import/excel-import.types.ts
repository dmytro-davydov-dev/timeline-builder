export interface ValidationIssue {
  row: number;
  column?: string;
  reason: string;
}

export interface ParsedEventRow {
  date: string; // ISO
  provider: string;
  facility?: string;
  bodyPartsRaw?: string;
  medicineType?: string;
  recordType: string;
  summary?: string;
  pdfLink?: string;
  rawRow: Record<string, unknown>;
}

export interface ParseResult {
  rows: ParsedEventRow[];
  issues: ValidationIssue[];
}
