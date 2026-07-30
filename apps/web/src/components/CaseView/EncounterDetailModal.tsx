import type { ReactNode } from 'react';
import { Box, Chip, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import { colorForMedicineType } from '../../config/medicineTypeColors';
import type { MedicalEvent } from '../../types';

interface EncounterDetailModalProps {
  event: MedicalEvent;
  accidentDate?: string | null;
  onClose: () => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body2">{children}</Typography>
    </Box>
  );
}

/**
 * Second-layer modal opened on top of MedicineTypeModal when an encounter
 * card is clicked — shows every field on MedicalEvent (types/index.ts), not
 * just the summarized EncounterCard view. MUI stacks nested Dialogs by
 * mount order, so this renders above the modal that opened it with no extra
 * z-index handling needed.
 */
export function EncounterDetailModal({ event, accidentDate, onClose }: EncounterDetailModalProps) {
  const isAccidentDate = Boolean(accidentDate) && event.date.slice(0, 10) === accidentDate?.slice(0, 10);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="subtitle1" component="span">
            {event.provider}
            {isAccidentDate && ' ⚑'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close">
          ✕
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
            <Field label="Date">{event.date.slice(0, 10)}</Field>
            <Field label="Record type">{event.recordType}</Field>
            <Field label="Facility">{event.facility ?? 'Unknown'}</Field>
          </Stack>

          <Field label="Medicine type">
            {event.medicineType ? (
              <Chip
                size="small"
                label={event.medicineType}
                sx={{ bgcolor: colorForMedicineType(event.medicineType), color: '#fff' }}
              />
            ) : (
              '—'
            )}
          </Field>

          <Field label="Body parts">
            {event.bodyParts.length > 0 ? (
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', mt: 0.25 }}>
                {event.bodyParts.map((part) => (
                  <Chip key={part} size="small" variant="outlined" label={part} />
                ))}
              </Stack>
            ) : (
              '—'
            )}
          </Field>

          <Field label="Summary">{event.summary ?? '—'}</Field>

          <Field label="Source file">{event.sourceFile ?? '—'}</Field>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
