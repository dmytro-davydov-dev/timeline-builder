import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicalEvent } from './entities/medical-event.entity';
import { QueryEventsDto } from './dto/query-events.dto';

export interface GapResult {
  from: string;
  to: string;
  gapDays: number;
}

export interface CaseStatistics {
  totalEvents: number;
  dateSpan: { from: string | null; to: string | null; days: number };
  byRecordType: Record<string, number>;
  byProvider: Record<string, number>;
  byBodyPart: Record<string, number>;
}

@Injectable()
export class MedicalEventsService {
  constructor(
    @InjectRepository(MedicalEvent)
    private readonly events: Repository<MedicalEvent>,
  ) {}

  /** Split on write, join for storage — see MedicalEvent.bodyPartsRaw. */
  private toBodyPartsArray(raw?: string): string[] {
    if (!raw) return [];
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  toResponse(event: MedicalEvent) {
    return {
      id: event.id,
      caseId: event.caseId,
      date: event.date,
      recordType: event.recordType,
      provider: event.provider,
      facility: event.facility ?? null,
      bodyParts: this.toBodyPartsArray(event.bodyPartsRaw),
      medicineType: event.medicineType ?? null,
      summary: event.summary ?? null,
      sourceFile: event.sourceFile ?? null,
      pdfLink: event.pdfLink ?? null,
    };
  }

  async findByFilters(caseId: string, filters: QueryEventsDto) {
    const qb = this.events
      .createQueryBuilder('e')
      .where('e.caseId = :caseId', { caseId })
      .orderBy('e.date', 'ASC');

    if (filters.dateFrom) {
      qb.andWhere('e.date >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters.dateTo) {
      qb.andWhere('e.date <= :dateTo', { dateTo: filters.dateTo });
    }
    if (filters.provider) {
      qb.andWhere('e.provider LIKE :provider', {
        provider: `%${filters.provider}%`,
      });
    }
    if (filters.bodyPart) {
      qb.andWhere('e.bodyPartsRaw LIKE :bodyPart', {
        bodyPart: `%${filters.bodyPart}%`,
      });
    }
    if (filters.medicineType) {
      qb.andWhere('e.medicineType = :medicineType', {
        medicineType: filters.medicineType,
      });
    }
    if (filters.recordType) {
      qb.andWhere('e.recordType = :recordType', {
        recordType: filters.recordType,
      });
    }
    if (filters.q) {
      qb.andWhere('e.summary LIKE :q', { q: `%${filters.q}%` });
    }

    const rows = await qb.getMany();
    return rows.map((r) => this.toResponse(r));
  }

  async findOne(caseId: string, eventId: string) {
    const event = await this.events.findOne({
      where: { id: eventId, caseId },
    });
    if (!event) throw new NotFoundException(`Event ${eventId} not found`);
    return this.toResponse(event);
  }

  async getStatistics(caseId: string): Promise<CaseStatistics> {
    const rows = await this.events.find({ where: { caseId } });

    const byRecordType: Record<string, number> = {};
    const byProvider: Record<string, number> = {};
    const byBodyPart: Record<string, number> = {};
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    for (const row of rows) {
      byRecordType[row.recordType] = (byRecordType[row.recordType] ?? 0) + 1;
      byProvider[row.provider] = (byProvider[row.provider] ?? 0) + 1;
      for (const part of this.toBodyPartsArray(row.bodyPartsRaw)) {
        byBodyPart[part] = (byBodyPart[part] ?? 0) + 1;
      }
      const d = new Date(row.date);
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;
    }

    const days =
      minDate && maxDate
        ? Math.round((maxDate.getTime() - minDate.getTime()) / 86_400_000)
        : 0;

    return {
      totalEvents: rows.length,
      dateSpan: {
        from: minDate ? minDate.toISOString() : null,
        to: maxDate ? maxDate.toISOString() : null,
        days,
      },
      byRecordType,
      byProvider,
      byBodyPart,
    };
  }

  /** Gaps between consecutive events exceeding thresholdDays. */
  async findTreatmentGaps(
    caseId: string,
    thresholdDays = 30,
  ): Promise<GapResult[]> {
    const rows = await this.events.find({
      where: { caseId },
      order: { date: 'ASC' },
    });

    const gaps: GapResult[] = [];
    for (let i = 1; i < rows.length; i++) {
      const prev = new Date(rows[i - 1].date);
      const curr = new Date(rows[i].date);
      const gapDays = Math.round(
        (curr.getTime() - prev.getTime()) / 86_400_000,
      );
      if (gapDays >= thresholdDays) {
        gaps.push({
          from: prev.toISOString(),
          to: curr.toISOString(),
          gapDays,
        });
      }
    }
    return gaps;
  }

  async groupedByBodyPart(caseId: string) {
    const rows = await this.events.find({ where: { caseId } });
    const groups = new Map<
      string,
      { count: number; medicineTypes: Record<string, number>; eventIds: string[] }
    >();

    for (const row of rows) {
      for (const part of this.toBodyPartsArray(row.bodyPartsRaw)) {
        if (!groups.has(part)) {
          groups.set(part, { count: 0, medicineTypes: {}, eventIds: [] });
        }
        const g = groups.get(part)!;
        g.count += 1;
        g.eventIds.push(row.id);
        if (row.medicineType) {
          g.medicineTypes[row.medicineType] =
            (g.medicineTypes[row.medicineType] ?? 0) + 1;
        }
      }
    }

    return Array.from(groups.entries()).map(([bodyPart, g]) => ({
      bodyPart,
      count: g.count,
      dominantMedicineType: this.dominant(g.medicineTypes),
      eventIds: g.eventIds,
    }));
  }

  async groupedByDay(caseId: string) {
    const rows = await this.events.find({ where: { caseId } });
    const groups = new Map<
      string,
      { count: number; medicineTypes: Record<string, number>; eventIds: string[] }
    >();

    for (const row of rows) {
      const day = new Date(row.date).toISOString().slice(0, 10);
      if (!groups.has(day)) {
        groups.set(day, { count: 0, medicineTypes: {}, eventIds: [] });
      }
      const g = groups.get(day)!;
      g.count += 1;
      g.eventIds.push(row.id);
      if (row.medicineType) {
        g.medicineTypes[row.medicineType] =
          (g.medicineTypes[row.medicineType] ?? 0) + 1;
      }
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, g]) => ({
        date,
        count: g.count,
        dominantMedicineType: this.dominant(g.medicineTypes),
        eventIds: g.eventIds,
      }));
  }

  private dominant(counts: Record<string, number>): string | null {
    let best: string | null = null;
    let bestCount = 0;
    for (const [key, count] of Object.entries(counts)) {
      if (count > bestCount) {
        best = key;
        bestCount = count;
      }
    }
    return best;
  }
}
