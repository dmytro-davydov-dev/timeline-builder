import { Injectable } from '@nestjs/common';
import { MedicalEventsService } from '../../medical-events/medical-events.service';
import { QueryEventsDto } from '../../medical-events/dto/query-events.dto';

interface EventFilterArgs {
  dateFrom?: string;
  dateTo?: string;
  provider?: string;
  bodyPart?: string;
  medicineType?: string;
  recordType?: string;
  keyword?: string;
}

/**
 * Executes a named tool call against MedicalEventsModule. Thin wrappers
 * only — see docs/Architecture.md §8 ("LLM reasons; backend computes").
 */
@Injectable()
export class ToolExecutor {
  constructor(private readonly eventsService: MedicalEventsService) {}

  async execute(caseId: string, name: string, args: Record<string, unknown>) {
    switch (name) {
      case 'find_events':
        return this.eventsService.findByFilters(caseId, this.toFilters(args));
      case 'count_events': {
        const rows = await this.eventsService.findByFilters(
          caseId,
          this.toFilters(args),
        );
        return { count: rows.length };
      }
      case 'get_event_details':
        return this.eventsService.findOne(caseId, String(args.eventId ?? ''));
      case 'get_case_statistics':
        return this.eventsService.getStatistics(caseId);
      case 'find_treatment_gaps':
        return this.eventsService.findTreatmentGaps(
          caseId,
          typeof args.thresholdDays === 'number' ? args.thresholdDays : undefined,
        );
      case 'semantic_search_events':
        // Phase 1 stub: keyword/LIKE match, per docs/Architecture.md §2 non-goals.
        return this.eventsService.findByFilters(caseId, {
          q: String(args.query ?? ''),
        });
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  // NB: the tool's `keyword` argument maps to QueryEventsDto's `q` field —
  // MedicalEventsService.findByFilters only reads `q` for the summary-text
  // match, so a straight passthrough of `keyword` here silently no-ops the
  // filter and returns every event unfiltered (caught live: a "lumbar spine"
  // keyword search was coming back with all 130 case events referenced).
  private toFilters(args: Record<string, unknown>): QueryEventsDto {
    const filters = args as EventFilterArgs;
    return {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      provider: filters.provider,
      bodyPart: filters.bodyPart,
      medicineType: filters.medicineType,
      recordType: filters.recordType,
      q: filters.keyword,
    };
  }
}
