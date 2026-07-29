/**
 * Maps source Excel column headers -> MedicalEvent fields. Shipped as a
 * config rather than hardcoded, since real-world exports will vary
 * (Medical-Timeline-Phase1-Implementation-Plan.md §2). The header match is
 * case-insensitive and trims whitespace.
 *
 * Column set per README.md: Encounter Date, Primary Provider, Facility,
 * Body Parts, Medicine Type, Record Type, Summary, Link To Pdf.
 */
export interface ColumnMapping {
  header: string;
  field:
    | 'date'
    | 'provider'
    | 'facility'
    | 'bodyPartsRaw'
    | 'medicineType'
    | 'recordType'
    | 'summary'
    | 'pdfLink';
  required: boolean;
}

export const COLUMN_SCHEMA: ColumnMapping[] = [
  { header: 'Encounter Date', field: 'date', required: true },
  { header: 'Primary Provider', field: 'provider', required: true },
  { header: 'Facility', field: 'facility', required: false },
  { header: 'Body Parts', field: 'bodyPartsRaw', required: false },
  { header: 'Medicine Type', field: 'medicineType', required: false },
  { header: 'Record Type', field: 'recordType', required: true },
  { header: 'Summary', field: 'summary', required: false },
  { header: 'Link To Pdf', field: 'pdfLink', required: false },
];

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}
