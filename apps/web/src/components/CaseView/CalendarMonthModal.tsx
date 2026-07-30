import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { EncounterCard } from './EncounterCard';
import { StatCard } from './StatsBar';
import type { MedicalEvent } from '../../types';

interface CalendarMonthModalProps {
  /** Display label, e.g. "July 2026" — from `MonthGrid.label` in CalendarPanel. */
  label: string;
  events: MedicalEvent[];
  accidentDate?: string | null;
  onClose: () => void;
  onSelectEncounter: (event: MedicalEvent) => void;
}

/**
 * Opened by clicking a month header in the "Month by month" grid
 * (CalendarPanel). Unlike MedicineTypeModal, the events for a month are
 * already available client-side (derived from the grouped-by-day data
 * CaseViewPage already holds), so this doesn't re-fetch — it just lists
 * and sorts what's passed in.
 */
export function CalendarMonthModal({
  label,
  events,
  accidentDate,
  onClose,
  onSelectEncounter,
}: CalendarMonthModalProps) {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const distinctProviders = new Set(events.map((e) => e.provider)).size;
  const distinctBodyParts = new Set(events.flatMap((e) => e.bodyParts)).size;
  const daysWithActivity = new Set(events.map((e) => e.date.slice(0, 10))).size;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { height: '80vh' } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" component="span">
          {label} — encounters
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close">
          ✕
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {events.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No encounters in {label}.
            </Typography>
          </Box>
        ) : (
          <>
            <Stack direction="row" spacing={1.75} sx={{ flexWrap: 'wrap' }}>
              <StatCard value={events.length} label="Encounters" />
              <StatCard value={daysWithActivity} label="Days active" />
              <StatCard value={distinctProviders} label="Providers" />
              <StatCard value={distinctBodyParts} label="Body parts" />
            </Stack>

            <Stack spacing={1.5}>
              {sortedEvents.map((event) => (
                <EncounterCard
                  key={event.id}
                  event={event}
                  isAccidentDate={Boolean(accidentDate) && event.date.slice(0, 10) === accidentDate?.slice(0, 10)}
                  onClick={onSelectEncounter}
                />
              ))}
            </Stack>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
