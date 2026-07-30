import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import PptxGenJS from 'pptxgenjs';
import { colorForMedicineType } from '../config/medicineTypeColors';
import type { Case, CaseStatistics, GroupedByBodyPart, MedicalEvent, TreatmentGap } from '../types';

/**
 * Both exports read the same already-loaded Case View data (Case,
 * MedicalEvent[], CaseStatistics, GroupedByBodyPart[], TreatmentGap[]) —
 * no extra API calls. Output is a real "medical chronology" style document
 * (title/summary, body-part breakdown, chronological encounter table),
 * not a screenshot of the UI, per docs/Medical-timeline-MVP-plan.md's
 * Export section.
 */
export interface ExportReportData {
  caseData: Case;
  events: MedicalEvent[];
  statistics: CaseStatistics;
  groupedByBodyPart: GroupedByBodyPart[];
  gaps: TreatmentGap[];
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function sortedEvents(events: MedicalEvent[]): MedicalEvent[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date));
}

function longestGapDays(gaps: TreatmentGap[]): number {
  return gaps.length ? Math.max(...gaps.map((g) => g.gapDays)) : 0;
}

function summaryStats(data: ExportReportData) {
  const { caseData, statistics, gaps } = data;
  return [
    ['Accident date', formatDate(caseData.accidentDate)],
    ['Total encounters', String(statistics.totalEvents)],
    [
      'Treatment span',
      statistics.dateSpan.from
        ? `${formatDate(statistics.dateSpan.from)} – ${formatDate(statistics.dateSpan.to)} (${statistics.dateSpan.days} days)`
        : '—',
    ],
    ['Providers', String(Object.keys(statistics.byProvider).length)],
    ['Longest gap in treatment', `${longestGapDays(gaps)} days`],
  ];
}

export function exportCaseToPdf(data: ExportReportData): void {
  const { caseData, groupedByBodyPart } = data;
  const events = sortedEvents(data.events);
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`Medical Chronology — ${caseData.name}`, margin, 50);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, 68);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 85,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 160 } },
    body: summaryStats(data),
  });

  const afterSummaryY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  if (groupedByBodyPart.length > 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Body Part Breakdown', margin, afterSummaryY + 25);

    autoTable(doc, {
      startY: afterSummaryY + 35,
      head: [['Body Part', 'Encounters', 'Dominant Care Type']],
      body: [...groupedByBodyPart]
        .sort((a, b) => b.count - a.count)
        .map((g) => [g.bodyPart, String(g.count), g.dominantMedicineType ?? '—']),
      headStyles: { fillColor: [11, 12, 42] },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: margin, right: margin },
    });
  }

  doc.addPage();
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Chronological Encounter List', margin, 40);

  autoTable(doc, {
    startY: 50,
    head: [['Date', 'Provider', 'Facility', 'Type', 'Care Type', 'Body Parts', 'Summary', 'Source']],
    body: events.map((e) => [
      formatDate(e.date),
      e.provider,
      e.facility ?? '—',
      e.recordType,
      e.medicineType ?? '—',
      e.bodyParts.join(', ') || '—',
      e.summary ?? '',
      e.pdfLink ? 'Link' : '—',
    ]),
    headStyles: { fillColor: [11, 12, 42] },
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 65 },
      2: { cellWidth: 65 },
      3: { cellWidth: 45 },
      4: { cellWidth: 55 },
      5: { cellWidth: 65 },
      6: { cellWidth: 'auto' },
      7: { cellWidth: 35 },
    },
    margin: { left: margin, right: margin, top: 40 },
    didDrawCell: (hookData) => {
      if (hookData.section !== 'body' || hookData.column.index !== 7) return;
      const event = events[hookData.row.index];
      if (!event?.pdfLink) return;
      doc.setTextColor(29, 78, 216);
      doc.textWithLink('Link', hookData.cell.x + 4, hookData.cell.y + hookData.cell.height / 2 + 3, {
        url: event.pdfLink,
      });
      doc.setTextColor(0);
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 7) {
        hookData.cell.text = [];
      }
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 60, doc.internal.pageSize.getHeight() - 20);
  }

  doc.save(`${caseData.name.replace(/[^\w.-]+/g, '_')}-medical-chronology.pdf`);
}

const NAVY = '0B0C2A';
const INDIGO = '6D5EF5';

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function exportCaseToPptx(data: ExportReportData): Promise<void> {
  const { caseData, groupedByBodyPart } = data;
  const events = sortedEvents(data.events);
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
  pptx.layout = 'WIDE';

  // Title slide
  const title = pptx.addSlide();
  title.background = { color: NAVY };
  title.addText(caseData.name, {
    x: 0.6, y: 2.6, w: 12, h: 1,
    fontSize: 36, bold: true, color: 'FFFFFF', fontFace: 'Arial',
  });
  title.addText('Medical Chronology', {
    x: 0.6, y: 3.5, w: 12, h: 0.6,
    fontSize: 20, color: INDIGO, fontFace: 'Arial',
  });
  title.addText(`Generated ${new Date().toLocaleDateString()}`, {
    x: 0.6, y: 4.2, w: 12, h: 0.4,
    fontSize: 12, color: 'CCCCCC', fontFace: 'Arial',
  });

  // Stats overview slide
  const stats = pptx.addSlide();
  stats.addText('Case Overview', { x: 0.5, y: 0.35, w: 12, h: 0.6, fontSize: 26, bold: true, color: NAVY });
  stats.addTable(
    summaryStats(data).map(([label, value]) => [
      { text: label, options: { bold: true, color: NAVY } },
      { text: value },
    ]),
    {
      x: 0.5, y: 1.2, w: 10, colW: [3.5, 6.5],
      fontSize: 14, border: { type: 'solid', color: 'E0E0E0', pt: 1 },
      autoPage: false,
    },
  );

  // Body part breakdown slide
  if (groupedByBodyPart.length > 0) {
    const bodySlide = pptx.addSlide();
    bodySlide.addText('Body Part Breakdown', { x: 0.5, y: 0.35, w: 12, h: 0.6, fontSize: 26, bold: true, color: NAVY });
    const rows: PptxGenJS.TableRow[] = [
      [
        { text: 'Body Part', options: { bold: true, color: 'FFFFFF', fill: { color: NAVY } } },
        { text: 'Encounters', options: { bold: true, color: 'FFFFFF', fill: { color: NAVY } } },
        { text: 'Dominant Care Type', options: { bold: true, color: 'FFFFFF', fill: { color: NAVY } } },
      ],
      ...[...groupedByBodyPart]
        .sort((a, b) => b.count - a.count)
        .slice(0, 18)
        .map((g): PptxGenJS.TableRow => [
          { text: g.bodyPart },
          { text: String(g.count) },
          {
            text: g.dominantMedicineType ?? '—',
            options: g.dominantMedicineType
              ? { color: colorForMedicineType(g.dominantMedicineType).replace('#', '') }
              : {},
          },
        ]),
    ];
    bodySlide.addTable(rows, { x: 0.5, y: 1.2, w: 10, colW: [4, 3, 3], fontSize: 12, autoPage: false });
  }

  // Chronological encounter slides, chunked to keep each table readable
  const chunks = chunk(events, 10);
  chunks.forEach((group, idx) => {
    const slide = pptx.addSlide();
    slide.addText(`Treatment Timeline (${idx + 1}/${chunks.length})`, {
      x: 0.5, y: 0.3, w: 12, h: 0.5, fontSize: 22, bold: true, color: NAVY,
    });
    const rows: PptxGenJS.TableRow[] = [
      [
        { text: 'Date', options: { bold: true, color: 'FFFFFF', fill: { color: NAVY } } },
        { text: 'Provider', options: { bold: true, color: 'FFFFFF', fill: { color: NAVY } } },
        { text: 'Type', options: { bold: true, color: 'FFFFFF', fill: { color: NAVY } } },
        { text: 'Care Type', options: { bold: true, color: 'FFFFFF', fill: { color: NAVY } } },
        { text: 'Summary', options: { bold: true, color: 'FFFFFF', fill: { color: NAVY } } },
      ],
      ...group.map((e): PptxGenJS.TableRow => [
        { text: formatDate(e.date) },
        { text: e.provider },
        { text: e.recordType },
        { text: e.medicineType ?? '—' },
        { text: (e.summary ?? '').slice(0, 140) },
      ]),
    ];
    slide.addTable(rows, {
      x: 0.4, y: 0.95, w: 12.5,
      colW: [1.3, 2, 1.5, 1.7, 6],
      fontSize: 10,
      autoPage: false,
      valign: 'top',
    });
  });

  await pptx.writeFile({ fileName: `${caseData.name.replace(/[^\w.-]+/g, '_')}-medical-chronology.pptx` });
}
