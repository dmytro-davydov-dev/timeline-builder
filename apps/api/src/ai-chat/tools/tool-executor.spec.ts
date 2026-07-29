import { ToolExecutor } from './tool-executor';
import { MedicalEventsService } from '../../medical-events/medical-events.service';

/** Thin fake covering only the methods ToolExecutor calls — see
 * cases.service.spec.ts for the same pattern used elsewhere in this repo. */
function fakeEventsService() {
  return {
    findByFilters: jest.fn(async () => [
      { id: 'evt-1', date: '2024-01-05', recordType: 'Imaging', summary: 'MRI lumbar spine' },
    ]),
    findOne: jest.fn(async () => ({ id: 'evt-1', date: '2024-01-05' })),
    getStatistics: jest.fn(async () => ({ totalEvents: 1 })),
    findTreatmentGaps: jest.fn(async () => [{ from: '2024-01-05', to: '2024-03-01', gapDays: 56 }]),
  } as unknown as MedicalEventsService;
}

describe('ToolExecutor', () => {
  let events: ReturnType<typeof fakeEventsService>;
  let executor: ToolExecutor;

  beforeEach(() => {
    events = fakeEventsService();
    executor = new ToolExecutor(events);
  });

  it('find_events forwards filters to MedicalEventsService.findByFilters', async () => {
    const result = await executor.execute('case-1', 'find_events', {
      keyword: 'MRI',
      bodyPart: 'Lumbar Spine',
    });

    // The tool's `keyword` arg must map to QueryEventsDto's `q` field — that's
    // the only field MedicalEventsService.findByFilters actually reads for a
    // summary-text match (see tool-executor.ts's toFilters comment).
    expect(events.findByFilters).toHaveBeenCalledWith('case-1', {
      dateFrom: undefined,
      dateTo: undefined,
      provider: undefined,
      bodyPart: 'Lumbar Spine',
      medicineType: undefined,
      recordType: undefined,
      q: 'MRI',
    });
    expect(result).toEqual([
      { id: 'evt-1', date: '2024-01-05', recordType: 'Imaging', summary: 'MRI lumbar spine' },
    ]);
  });

  it('count_events returns an integer count rather than the row list', async () => {
    const result = await executor.execute('case-1', 'count_events', {
      medicineType: 'Physical Therapy',
    });

    expect(events.findByFilters).toHaveBeenCalled();
    expect(result).toEqual({ count: 1 });
  });

  it('get_event_details forwards eventId to findOne', async () => {
    const result = await executor.execute('case-1', 'get_event_details', {
      eventId: 'evt-1',
    });

    expect(events.findOne).toHaveBeenCalledWith('case-1', 'evt-1');
    expect(result).toEqual({ id: 'evt-1', date: '2024-01-05' });
  });

  it('get_case_statistics delegates to getStatistics', async () => {
    const result = await executor.execute('case-1', 'get_case_statistics', {});

    expect(events.getStatistics).toHaveBeenCalledWith('case-1');
    expect(result).toEqual({ totalEvents: 1 });
  });

  it('find_treatment_gaps passes thresholdDays through when numeric', async () => {
    await executor.execute('case-1', 'find_treatment_gaps', { thresholdDays: 45 });
    expect(events.findTreatmentGaps).toHaveBeenCalledWith('case-1', 45);
  });

  it('find_treatment_gaps falls back to the service default when thresholdDays is missing/non-numeric', async () => {
    await executor.execute('case-1', 'find_treatment_gaps', {});
    expect(events.findTreatmentGaps).toHaveBeenCalledWith('case-1', undefined);
  });

  it('semantic_search_events is a keyword stub over findByFilters, not real semantic search', async () => {
    await executor.execute('case-1', 'semantic_search_events', { query: 'gap in care' });
    expect(events.findByFilters).toHaveBeenCalledWith('case-1', { q: 'gap in care' });
  });

  it('returns an error payload for an unknown tool name instead of throwing', async () => {
    const result = await executor.execute('case-1', 'not_a_real_tool', {});
    expect(result).toEqual({ error: 'Unknown tool: not_a_real_tool' });
  });
});
