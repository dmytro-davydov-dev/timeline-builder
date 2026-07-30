import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material';
import {
  useCase,
  useEvents,
  useGroupedByBodyPart,
  useGroupedByDay,
  useSetMilestone,
  useStatistics,
  useTreatmentGaps,
} from '../api/cases';
import { CaseHeader } from '../components/CaseView/CaseHeader';
import { StatsBar } from '../components/CaseView/StatsBar';
import { SharedToolbar } from '../components/CaseView/SharedToolbar';
import { MedicineTypeModal } from '../components/CaseView/MedicineTypeModal';
import { EncounterDetailModal } from '../components/CaseView/EncounterDetailModal';
import { BodyMapPanel } from '../components/CaseView/BodyMapPanel';
import { CalendarPanel } from '../components/CaseView/CalendarPanel';
import { CalendarDayPopover } from '../components/CaseView/CalendarDayPopover';
import { CalendarMonthModal } from '../components/CaseView/CalendarMonthModal';
import { ChatPanel } from '../components/CaseView/ChatPanel';
import { distinctMedicineTypes } from '../config/medicineTypeColors';
import type { GroupedByBodyPart, GroupedByDay, MedicalEvent } from '../types';

/**
 * The flagship Case View — Body Map + Calendar split
 * (docs/Architecture.md §5, §7.1). Component tree matches the architecture
 * doc; UI-only state (toggles, highlight targets) stays local here rather
 * than synced to the backend (§7.3).
 */
export function CaseViewPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const caseQuery = useCase(caseId);
  const statisticsQuery = useStatistics(caseId);
  const groupedByBodyPartQuery = useGroupedByBodyPart(caseId);
  const groupedByDayQuery = useGroupedByDay(caseId);
  const eventsQuery = useEvents(caseId, {});
  const treatmentGapsQuery = useTreatmentGaps(caseId, 0);
  const setMilestone = useSetMilestone(caseId);

  const [bodyView, setBodyView] = useState<'front' | 'back'>('front');
  const [calendarColorMode, setCalendarColorMode] = useState<
    'intensity' | 'medicineType'
  >('medicineType');
  const [highlightedEventIds, setHighlightedEventIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedBodyPart, setSelectedBodyPart] = useState<GroupedByBodyPart | null>(null);
  const [selectedDay, setSelectedDay] = useState<GroupedByDay | null>(null);
  const [dayPopoverAnchor, setDayPopoverAnchor] = useState<{ x: number; y: number } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<{ key: string; label: string } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [medicineTypeFilter, setMedicineTypeFilter] = useState<string | null>(null);
  const [selectedEncounter, setSelectedEncounter] = useState<MedicalEvent | null>(null);

  // Loading a different Excel resets both panels' selection/popup state
  // (PRD-Timeline-View.md §4, §8) — keyed on caseId so it fires on navigation
  // to a different case, not on every re-render.
  useEffect(() => {
    setSelectedBodyPart(null);
    setSelectedDay(null);
    setDayPopoverAnchor(null);
    setSelectedMonth(null);
    setHighlightedEventIds(new Set());
    setChatOpen(false);
    setMedicineTypeFilter(null);
    setSelectedEncounter(null);
  }, [caseId]);

  if (caseQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (caseQuery.isError || !caseQuery.data) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Could not load this case.</Alert>
      </Container>
    );
  }

  const groups: GroupedByBodyPart[] = groupedByBodyPartQuery.data ?? [];
  const groupedDays: GroupedByDay[] = groupedByDayQuery.data ?? [];
  const eventsById = new Map(
    (eventsQuery.data ?? []).map((event) => [event.id, event]),
  );
  const accidentDate = caseQuery.data.accidentDate;

  // The accident date is ringed on the Calendar even if it has zero
  // encounters (PRD-Timeline-View.md §7.1) — the grouped-by-day endpoint
  // only returns days with activity, so synthesize a zero-count entry when
  // it's otherwise missing.
  const accidentDateKey = accidentDate?.slice(0, 10);
  const days: GroupedByDay[] =
    accidentDateKey && !groupedDays.some((d) => d.date.slice(0, 10) === accidentDateKey)
      ? [...groupedDays, { date: accidentDateKey, count: 0, dominantMedicineType: null, eventIds: [] }].sort(
          (a, b) => a.date.localeCompare(b.date),
        )
      : groupedDays;

  const highlightedBodyParts = new Set(
    groups
      .filter((g) => g.eventIds.some((id) => highlightedEventIds.has(id)))
      .map((g) => g.bodyPart),
  );
  const highlightedDays = new Set(
    days
      .filter((d) => d.eventIds.some((id) => highlightedEventIds.has(id)))
      .map((d) => d.date),
  );

  const selectedBodyPartEvents = selectedBodyPart
    ? selectedBodyPart.eventIds.map((id) => eventsById.get(id)).filter((e): e is NonNullable<typeof e> => Boolean(e))
    : [];
  const selectedDayEvents = selectedDay
    ? selectedDay.eventIds.map((id) => eventsById.get(id)).filter((e): e is NonNullable<typeof e> => Boolean(e))
    : [];
  // Month-click modal (calendar "Month by month" grid) — all encounters
  // whose day falls in the clicked month, derived from the same grouped-by-day
  // data already loaded for the grid rather than a separate fetch.
  const selectedMonthEvents = selectedMonth
    ? days
        .filter((d) => d.date.slice(0, 7) === selectedMonth.key)
        .flatMap((d) => d.eventIds)
        .map((id) => eventsById.get(id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
    : [];

  const gaps = treatmentGapsQuery.data ?? [];
  const longestQuietStretchDays = gaps.length ? Math.max(...gaps.map((g) => g.gapDays)) : 0;

  const medicineTypes = distinctMedicineTypes(
    (eventsQuery.data ?? []).map((event) => event.medicineType),
  );

  return (
    <>
      <CaseHeader caseData={caseQuery.data} />

      <Container maxWidth="xl" sx={{ py: 2 }}>
        {statisticsQuery.data && (
          <StatsBar
            encounters={statisticsQuery.data.totalEvents}
            treatmentSpanDays={statisticsQuery.data.dateSpan.days}
            daysWithActivity={groupedDays.length}
            longestQuietStretchDays={longestQuietStretchDays}
          />
        )}

      <SharedToolbar
        caseData={caseQuery.data}
        onSetAccidentDate={(date) =>
          setMilestone.mutate({ label: 'accidentDate', date })
        }
        bodyView={bodyView}
        onBodyViewChange={setBodyView}
        calendarColorMode={calendarColorMode}
        onCalendarColorModeChange={setCalendarColorMode}
        onOpenChat={() => setChatOpen(true)}
        medicineTypes={medicineTypes}
        onSelectMedicineType={(type) => setMedicineTypeFilter(type)}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          '@media (min-width: 860px)': {
            // minmax(0, Nfr) — not plain `Nfr` — keeps the 75/25 split fixed
            // regardless of case data. Grid items default to min-width:auto,
            // so a case with a long treatment span (wide calendar strip)
            // would otherwise force its column to grow past 75% and push
            // the Body Map column off-screen. minmax(0, …) caps each
            // column's minimum at 0, so overflow scrolls inside the column
            // instead of resizing it.
            gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 1fr)',
          },
          gap: 2,
        }}
      >
        {/* DOM order keeps Body Map, Calendar stacked in that order for
            narrow-viewport display; `order` rearranges them to
            Calendar / Body Map on the desktop split only. */}
        <Box sx={{ minWidth: 0, '@media (min-width: 860px)': { order: 2 } }}>
          <BodyMapPanel
            groups={groups}
            bodyView={bodyView}
            highlightedBodyParts={highlightedBodyParts}
            onSelectBodyPart={(group) => {
              setHighlightedEventIds(new Set(group.eventIds));
              setSelectedBodyPart(group);
            }}
            selectedGroup={selectedBodyPart}
            selectedEvents={selectedBodyPartEvents}
            accidentDate={accidentDate}
            onClosePopup={() => setSelectedBodyPart(null)}
          />
        </Box>
        <Box sx={{ minWidth: 0, '@media (min-width: 860px)': { order: 1 } }}>
          <CalendarPanel
            days={days}
            colorMode={calendarColorMode}
            highlightedDays={highlightedDays}
            accidentDate={accidentDate}
            onSelectDay={(group, anchor) => {
              if (group.count === 0) return;
              setHighlightedEventIds(new Set(group.eventIds));
              setSelectedDay(group);
              setDayPopoverAnchor(anchor);
            }}
            onSelectMonth={(key, label) => setSelectedMonth({ key, label })}
          />
        </Box>
      </Box>

      {selectedDay && dayPopoverAnchor && (
        <CalendarDayPopover
          day={selectedDay}
          events={selectedDayEvents}
          accidentDate={accidentDate}
          anchor={dayPopoverAnchor}
          onClose={() => {
            setSelectedDay(null);
            setDayPopoverAnchor(null);
          }}
        />
      )}

      {selectedMonth && (
        <CalendarMonthModal
          label={selectedMonth.label}
          events={selectedMonthEvents}
          accidentDate={accidentDate}
          onClose={() => setSelectedMonth(null)}
          onSelectEncounter={setSelectedEncounter}
        />
      )}

      <Dialog
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: { height: '70vh' } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Ask AI about this case
          <IconButton size="small" onClick={() => setChatOpen(false)} aria-label="Close">
            ✕
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column' }}>
          <ChatPanel
            caseId={caseQuery.data.id}
            onReferencedEventIds={(ids) => setHighlightedEventIds(new Set(ids))}
          />
        </DialogContent>
      </Dialog>

      {medicineTypeFilter && (
        <MedicineTypeModal
          caseId={caseQuery.data.id}
          medicineType={medicineTypeFilter}
          accidentDate={accidentDate}
          onClose={() => setMedicineTypeFilter(null)}
          onSelectEncounter={setSelectedEncounter}
        />
      )}

      {selectedEncounter && (
        <EncounterDetailModal
          event={selectedEncounter}
          accidentDate={accidentDate}
          onClose={() => setSelectedEncounter(null)}
        />
      )}
      </Container>
    </>
  );
}
