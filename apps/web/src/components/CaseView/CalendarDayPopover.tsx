import { Box, IconButton, Stack, Typography } from '@mui/material';
import { EncounterCard } from './EncounterCard';
import type { GroupedByDay, MedicalEvent } from '../../types';

interface CalendarDayPopoverProps {
  day: GroupedByDay;
  events: MedicalEvent[];
  accidentDate?: string | null;
  anchor: { x: number; y: number };
  onClose: () => void;
}

const CARD_WIDTH = 360;
const CARD_MAX_HEIGHT = 480;
const MARGIN = 12;

/**
 * Calendar day popover — PRD-Timeline-View.md §7.4. Deliberately positioned
 * in fixed viewport coordinates near the click (not scoped to the Calendar
 * panel), unlike the Body Map popup — see Architecture.md §7.4 for why.
 */
export function CalendarDayPopover({ day, events, accidentDate, anchor, onClose }: CalendarDayPopoverProps) {
  const left = Math.min(Math.max(anchor.x, MARGIN), window.innerWidth - CARD_WIDTH - MARGIN);
  const top = Math.min(Math.max(anchor.y, MARGIN), window.innerHeight - MARGIN);

  return (
    <>
      <Box
        onClick={onClose}
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: 'rgba(0,0,0,0.4)',
          zIndex: 1300,
        }}
      />
      <Box
        sx={{
          position: 'fixed',
          left,
          top,
          width: CARD_WIDTH,
          maxHeight: CARD_MAX_HEIGHT,
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: 8,
          zIndex: 1301,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="subtitle1">{day.date.slice(0, 10)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {day.count} encounter(s)
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Close">
            ✕
          </IconButton>
        </Box>
        <Stack spacing={1.5} sx={{ p: 1.5, overflowY: 'auto', flex: 1 }}>
          {events.map((event) => (
            <EncounterCard
              key={event.id}
              event={event}
              isAccidentDate={Boolean(accidentDate) && day.date.slice(0, 10) === accidentDate?.slice(0, 10)}
            />
          ))}
        </Stack>
      </Box>
    </>
  );
}
