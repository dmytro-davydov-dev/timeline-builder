import { Box, Chip, Paper, Typography } from '@mui/material';
import { colorForMedicineType } from '../../config/medicineTypeColors';
import type { MedicalEvent } from '../../types';

interface EncounterCardProps {
  event: MedicalEvent;
  isAccidentDate: boolean;
  /** Optional — when provided the card becomes clickable (e.g. the medicine
   * type filter modal opens a full-detail modal on click). Cards without a
   * handler render exactly as before. */
  onClick?: (event: MedicalEvent) => void;
}

/**
 * Shared encounter card format used by both the Body Map popup (§6) and the
 * Calendar day popover (§7.4) — PRD-Timeline-View.md requires the same card
 * shape in both places for visual consistency.
 */
export function EncounterCard({ event, isAccidentDate, onClick }: EncounterCardProps) {
  return (
    <Paper
      variant="outlined"
      onClick={onClick ? () => onClick(event) : undefined}
      sx={{
        p: 1.5,
        ...(onClick && {
          cursor: 'pointer',
          '&:hover': { borderColor: 'primary.main' },
        }),
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {event.provider}
            {isAccidentDate && ' ⚑'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {event.facility ?? 'Unknown facility'} &middot; {event.date.slice(0, 10)} &middot; {event.recordType}
          </Typography>
        </Box>
        {event.medicineType && (
          <Chip
            size="small"
            label={event.medicineType}
            sx={{
              bgcolor: colorForMedicineType(event.medicineType),
              color: '#fff',
            }}
          />
        )}
      </Box>
      {event.summary && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          {event.summary}
        </Typography>
      )}
    </Paper>
  );
}
