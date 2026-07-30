import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useEvents } from '../../api/cases';
import { colorForMedicineType } from '../../config/medicineTypeColors';
import { EncounterCard } from './EncounterCard';
import { StatCard } from './StatsBar';
import type { MedicalEvent } from '../../types';

interface MedicineTypeModalProps {
  caseId: string;
  medicineType: string;
  accidentDate?: string | null;
  onClose: () => void;
  onSelectEncounter: (event: MedicalEvent) => void;
}

/**
 * Opened from MedicineTypeFilterRow. Re-fetches events scoped to the
 * selected medicine type via the server-side filter (EventFilters.medicineType,
 * already supported by the API) rather than filtering client-side, matching
 * the re-fetch-on-filter pattern in api/cases.ts. Stats shown here (span,
 * distinct providers/body parts) aren't exposed by the statistics endpoint
 * for a filtered subset, so they're derived client-side from the fetched rows.
 */
export function MedicineTypeModal({
  caseId,
  medicineType,
  accidentDate,
  onClose,
  onSelectEncounter,
}: MedicineTypeModalProps) {
  const eventsQuery = useEvents(caseId, { medicineType });
  const events = eventsQuery.data ?? [];

  const dateTimes = events.map((e) => new Date(e.date).getTime()).filter((t) => !Number.isNaN(t));
  const spanDays = dateTimes.length
    ? Math.round((Math.max(...dateTimes) - Math.min(...dateTimes)) / 86_400_000)
    : 0;
  const distinctProviders = new Set(events.map((e) => e.provider)).size;
  const distinctBodyParts = new Set(events.flatMap((e) => e.bodyParts)).size;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { height: '80vh' } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            size="small"
            label={medicineType}
            sx={{ bgcolor: colorForMedicineType(medicineType), color: '#fff' }}
          />
          <Typography variant="subtitle1" component="span">
            encounters
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close">
          ✕
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {eventsQuery.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <Stack direction="row" spacing={1.75} sx={{ flexWrap: 'wrap' }}>
              <StatCard value={events.length} label="Encounters" />
              <StatCard value={`${spanDays}d`} label="Span" />
              <StatCard value={distinctProviders} label="Providers" />
              <StatCard value={distinctBodyParts} label="Body parts" />
            </Stack>

            <Stack spacing={1.5}>
              {events.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No encounters for this medicine type.
                </Typography>
              )}
              {events.map((event) => (
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
