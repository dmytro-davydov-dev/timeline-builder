import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, Container } from '@mui/material';
import {
  useCase,
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
  const setMilestone = useSetMilestone(caseId);

  const [bodyView, setBodyView] = useState<'front' | 'back'>('front');
  const [calendarColorMode, setCalendarColorMode] = useState<
    'intensity' | 'medicineType'
  >('intensity');
  const [highlightedEventIds, setHighlightedEventIds] = useState<Set<string>>(
    new Set(),
  );

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
  const days: GroupedByDay[] = groupedByDayQuery.data ?? [];

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
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
        }}
      >
        <BodyMapPanel
          groups={groups}
          bodyView={bodyView}
          highlightedBodyParts={highlightedBodyParts}
          onSelectBodyPart={(group) =>
            setHighlightedEventIds(new Set(group.eventIds))
          }
        />
        <CalendarPanel
          days={days}
          colorMode={calendarColorMode}
          highlightedDays={highlightedDays}
          onSelectDay={(group) =>
            setHighlightedEventIds(new Set(group.eventIds))
          }
        />
      </Box>

      <Box sx={{ mt: 2 }}>
        <ChatPanel
          caseId={caseQuery.data.id}
          onReferencedEventIds={(ids) => setHighlightedEventIds(new Set(ids))}
        />
      </Box>
    </Container>
  );
}
