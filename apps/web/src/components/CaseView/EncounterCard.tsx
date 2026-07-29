import { Box, Chip, Link, Paper, Typography } from '@mui/material';
import { colorForMedicineType } from '../../config/medicineTypeColors';
import type { MedicalEvent } from '../../types';

interface EncounterCardProps {
  event: MedicalEvent;
  isAccidentDate: boolean;
}

/**
 * Shared encounter card format used by both the Body Map popup (§6) and the
 * Calendar day popover (§7.4) — PRD-Timeline-View.md requires the same card
 * shape in both places for visual consistency.
 */
export function EncounterCard({ event, isAccidentDate }: EncounterCardProps) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
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
      {event.pdfLink && (
        <Link href={event.pdfLink} target="_blank" rel="noopener" variant="caption" sx={{ mt: 1, display: 'inline-block' }}>
          Source PDF
        </Link>
      )}
    </Paper>
  );
}
