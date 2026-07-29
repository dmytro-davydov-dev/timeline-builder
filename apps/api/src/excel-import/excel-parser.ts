import * as ExcelJS from 'exceljs';
import { COLUMN_SCHEMA, normalizeHeader } from './column-schema.config';
import { ParsedEventRow, ParseResult, ValidationIssue } from './excel-import.types';

/**
 * Pure, unit-testable parse/validate/normalize pipeline — kept separate
 * from the NestJS controller so bad-data edge cases can be tested without
 * spinning up the app (Medical-Timeline-Phase1-Implementation-Plan.md §2).
 *
 * The hard rule from docs/Architecture.md §1: must work with any Excel in
 * the agreed column format, not just the sample case.
 */
export async function parseWorkbook(buffer: Buffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];

  const issues: ValidationIssue[] = [];
  if (!sheet) {
    return { rows: [], issues: [{ row: 0, reason: 'Workbook has no sheets' }] };
  }

  const headerRow = sheet.getRow(1);
  const headerIndexToField = new Map<number, (typeof COLUMN_SCHEMA)[number]>();
  headerRow.eachCell((cell, colNumber) => {
    const header = normalizeHeader(String(cell.value ?? ''));
    const mapping = COLUMN_SCHEMA.find(
      (m) => normalizeHeader(m.header) === header,
    );
    if (mapping) headerIndexToField.set(colNumber, mapping);
  });

  for (const mapping of COLUMN_SCHEMA) {
    if (
      mapping.required &&
      ![...headerIndexToField.values()].some((m) => m.field === mapping.field)
    ) {
      issues.push({
        row: 1,
        column: mapping.header,
        reason: `Required column "${mapping.header}" not found`,
      });
    }
  }
  if (issues.length > 0) return { rows: [], issues };

  const rows: ParsedEventRow[] = [];
  const totalRows = sheet.rowCount;

  for (let rowNumber = 2; rowNumber <= totalRows; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (row.actualCellCount === 0) continue;

    const rawRow: Record<string, unknown> = {};
    const parsed: Record<string, unknown> = {};

    headerIndexToField.forEach((mapping, colNumber) => {
      const cell = row.getCell(colNumber);
      rawRow[mapping.header] = cell.value;
      parsed[mapping.field] = cell.value;
    });

    const dateValue = parsed['date'];
    const parsedDate =
      dateValue instanceof Date
        ? dateValue
        : typeof dateValue === 'string' && dateValue.trim()
          ? new Date(dateValue)
          : null;

    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      issues.push({
        row: rowNumber,
        column: 'Encounter Date',
        reason: 'Missing or unparseable date',
      });
      continue;
    }

    const providerRaw = String(parsed['provider'] ?? '').trim();
    const provider = providerRaw ? normalizeMultiValue(providerRaw, ';') : 'Unknown';
    const recordType = String(parsed['recordType'] ?? '').trim() || 'Record';
    const facility = optionalString(parsed['facility']) ?? 'Unknown facility';
    const medicineType = optionalString(parsed['medicineType']) ?? 'Other';
    const bodyPartsRaw = optionalString(parsed['bodyPartsRaw']);
    const bodyPartsNormalized = bodyPartsRaw
      ? normalizeMultiValue(bodyPartsRaw, ',')
      : undefined;

    rows.push({
      date: parsedDate.toISOString(),
      provider,
      recordType,
      facility,
      bodyPartsRaw: bodyPartsNormalized,
      medicineType,
      summary: optionalString(parsed['summary']),
      pdfLink: optionalString(parsed['pdfLink']),
      rawRow,
    });
  }

  if (rows.length === 0 && issues.length === 0) {
    issues.push({ row: 0, reason: 'No data rows found' });
  }

  return { rows, issues };
}

function optionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
}

/**
 * Splits a delimiter-separated cell (multi-provider `;`, multi-body-part
 * `,`) into trimmed elements and rejoins them, so downstream storage is
 * consistently normalized regardless of source spacing (PRD-Excel-Import.md
 * §4.4) — entity columns stay flat strings, split again on read.
 */
function normalizeMultiValue(raw: string, delimiter: string): string {
  return raw
    .split(delimiter)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(delimiter === ';' ? '; ' : ', ');
}
