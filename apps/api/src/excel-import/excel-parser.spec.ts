import * as ExcelJS from 'exceljs';
import { parseWorkbook } from './excel-parser';

const FULL_HEADERS = [
  'Encounter Date',
  'Primary Provider',
  'Facility',
  'Body Parts',
  'Medicine Type',
  'Record Type',
  'Summary',
  'Link To Pdf',
];

/** Builds an in-memory .xlsx buffer with explicit cell types, mirroring
 * how a real export would set a Date cell vs. a plain string cell. */
async function buildWorkbook(
  headers: string[],
  rows: (string | Date | number | null)[][],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe('parseWorkbook', () => {
  it('imports a clean file with zero warnings', async () => {
    const buffer = await buildWorkbook(FULL_HEADERS, [
      [
        new Date('2024-01-15'),
        'Dr. Smith',
        'General Hospital',
        'Neck, Back',
        'Orthopedic',
        'Office Visit',
        'Initial consult',
        'pdf',
      ],
    ]);

    const { rows, issues } = await parseWorkbook(buffer);

    expect(issues).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      provider: 'Dr. Smith',
      facility: 'General Hospital',
      bodyPartsRaw: 'Neck, Back',
      medicineType: 'Orthopedic',
      recordType: 'Office Visit',
      summary: 'Initial consult',
      pdfLink: 'pdf',
    });
    expect(new Date(rows[0].date).toISOString().slice(0, 10)).toBe(
      '2024-01-15',
    );
  });

  it('rejects a file missing a required column, importing zero rows', async () => {
    const headersMissingProvider = FULL_HEADERS.filter(
      (h) => h !== 'Primary Provider',
    );
    const buffer = await buildWorkbook(headersMissingProvider, [
      [new Date('2024-01-15'), 'Facility', 'Neck', 'Ortho', 'Visit', 'x', 'pdf'],
    ]);

    const { rows, issues } = await parseWorkbook(buffer);

    expect(rows).toEqual([]);
    expect(issues).toEqual([
      expect.objectContaining({
        column: 'Primary Provider',
        reason: expect.stringContaining('Primary Provider'),
      }),
    ]);
  });

  it('skips rows with unparseable dates but imports the rest', async () => {
    const buffer = await buildWorkbook(FULL_HEADERS, [
      [
        new Date('2024-01-15'),
        'Dr. Smith',
        'General Hospital',
        'Neck',
        'Orthopedic',
        'Office Visit',
        'Good row',
        'pdf',
      ],
      [
        'not-a-date' as unknown as Date,
        'Dr. Jones',
        'Clinic',
        'Back',
        'Orthopedic',
        'Office Visit',
        'Bad date row',
        '',
      ],
      [
        null,
        'Dr. Lee',
        'Clinic',
        'Back',
        'Orthopedic',
        'Office Visit',
        'Blank date row',
        '',
      ],
    ]);

    const { rows, issues } = await parseWorkbook(buffer);

    expect(rows).toHaveLength(1);
    expect(rows[0].summary).toBe('Good row');
    expect(issues).toHaveLength(2);
    for (const issue of issues) {
      expect(issue.column).toBe('Encounter Date');
      expect(issue.reason).toMatch(/date/i);
    }
  });

  it('applies fallback values for blank optional/fallback fields instead of skipping the row', async () => {
    const buffer = await buildWorkbook(FULL_HEADERS, [
      [
        new Date('2024-02-01'),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
    ]);

    const { rows, issues } = await parseWorkbook(buffer);

    expect(issues).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      provider: 'Unknown',
      facility: 'Unknown facility',
      medicineType: 'Other',
      recordType: 'Record',
      bodyPartsRaw: undefined,
      summary: undefined,
      pdfLink: undefined,
    });
  });

  it('splits and trims multi-value Body Parts and multi-provider cells', async () => {
    const buffer = await buildWorkbook(FULL_HEADERS, [
      [
        new Date('2024-03-01'),
        ' Dr. Smith ;Dr. Jones ',
        'Clinic',
        ' Neck ,Back,  Shoulder ',
        'Ortho',
        'Visit',
        'x',
        '',
      ],
    ]);

    const { rows, issues } = await parseWorkbook(buffer);

    expect(issues).toEqual([]);
    expect(rows[0].provider).toBe('Dr. Smith; Dr. Jones');
    expect(rows[0].bodyPartsRaw).toBe('Neck, Back, Shoulder');
  });

  it('imports vocabulary never seen before without error', async () => {
    const buffer = await buildWorkbook(FULL_HEADERS, [
      [
        new Date('2024-04-01'),
        'Dr. Novel',
        'Some New Facility',
        'Left Pinky Toe, Auricle',
        'Experimental Regenerative',
        'Consultation',
        'x',
        '',
      ],
    ]);

    const { rows, issues } = await parseWorkbook(buffer);

    expect(issues).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].bodyPartsRaw).toBe('Left Pinky Toe, Auricle');
  });

  it('rejects a completely empty file (header row only)', async () => {
    const buffer = await buildWorkbook(FULL_HEADERS, []);

    const { rows, issues } = await parseWorkbook(buffer);

    expect(rows).toEqual([]);
    expect(issues).toEqual([
      expect.objectContaining({ reason: expect.stringContaining('No data rows') }),
    ]);
  });

  it('matches headers case-insensitively, tolerant of whitespace, regardless of column order', async () => {
    const shuffledHeaders = [
      '  encounter date ',
      'RECORD TYPE',
      'primary provider',
      'Summary',
      'Facility',
      'Body Parts',
      'Medicine Type',
      'Link To Pdf',
    ];
    const buffer = await buildWorkbook(shuffledHeaders, [
      [
        new Date('2024-05-01'),
        'Office Visit',
        'Dr. Smith',
        'x',
        'Clinic',
        'Neck',
        'Ortho',
        'pdf',
      ],
    ]);

    const { rows, issues } = await parseWorkbook(buffer);

    expect(issues).toEqual([]);
    expect(rows[0]).toMatchObject({
      provider: 'Dr. Smith',
      recordType: 'Office Visit',
      facility: 'Clinic',
    });
  });
});
