import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, Container } from '@mui/material';
import {
  useCase,
  useEvents,
  useGroupedByBodyPart,
  useGroupedByDay,
  useSetMilestone,
  useStatistics,
} from '../api/cases';
import { CaseHeader } from '../components/CaseView/CaseHeader';
import { StatsBar } from '../components/CaseView/StatsBar';
import { SharedToolbar } from '../components/CaseView/SharedToolbar';
import { BodyMapPanel } from '../components/CaseView/BodyMapPanel';
import { CalendarPanel } from '../components/CaseView/CalendarPanel';
import { CalendarDayPopover } from '../components/CaseView/CalendarDayPopover';
import { ChatPanel } from '../components/CaseView/ChatPanel';
import type { GroupedByBodyPart, GroupedByDay } from '../types';

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
  const setMilestone = useSetMilestone(caseId);

  const [bodyView, setBodyView] = useState<'front' | 'back'>('front');
  const [calendarColorMode, setCalendarColorMode] = useState<
    'intensity' | 'medicineType'
  >('intensity');
  const [highlightedEventIds, setHighlightedEventIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedBodyPart, setSelectedBodyPart] = useState<GroupedByBodyPart | null>(null);
  const [selectedDay, setSelectedDay] = useState<GroupedByDay | null>(null);
  const [dayPopoverAnchor, setDayPopoverAnchor] = useState<{ x: number; y: number } | null>(null);

  // Loading a different Excel resets both panels' selection/popup state
  // (PRD-Timeline-View.md §4, §8) — keyed on caseId so it fires on navigation
  // to a different case, not on every re-render.
  useEffect(() => {
    setSelectedBodyPart(null);
    setSelectedDay(null);
    setDayPopoverAnchor(null);
    setHighlightedEventIds(new Set());
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

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <CaseHeader caseData={caseQuery.data} />

      {statisticsQuery.data && <StatsBar statistics={statisticsQuery.data} />}

      <SharedToolbar
        caseData={caseQuery.data}
        onSetAccidentDate={(date) =>
          setMilestone.mutate({ label: 'accidentDate', date })
        }
        bodyView={bodyView}
        onBodyViewChange={setBodyView}
        calendarColorMode={calendarColorMode}
        onCalendarColorModeChange={setCalendarColorMode}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          '@media (min-width: 860px)': {
            gridTemplateColumns: '1fr 1fr',
          },
          gap: 2,
        }}
      >
        {/* DOM order keeps Body Map above Calendar for narrow-viewport
            stacking (PRD-Timeline-View.md §3); `order` flips them to
            Calendar-left / Body-Map-right on the desktop split only. */}
        <Box sx={{ '@media (min-width: 860px)': { order: 2 } }}>
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
        <Box sx={{ '@media (min-width: 860px)': { order: 1 } }}>
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

      <Box sx={{ mt: 2 }}>
        <ChatPanel
          caseId={caseQuery.data.id}
          onReferencedEventIds={(ids) => setHighlightedEventIds(new Set(ids))}
        />
      </Box>
    </Container>
  );
}
