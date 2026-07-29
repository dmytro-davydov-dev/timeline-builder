import { useState } from 'react';
import { Box, Chip, IconButton, Stack, Typography } from '@mui/material';
import { colorForMedicineType, distinctMedicineTypes } from '../../config/medicineTypeColors';
import { EncounterCard } from './EncounterCard';
import type { GroupedByBodyPart, MedicalEvent } from '../../types';

interface BodyMapDetailPopupProps {
  group: GroupedByBodyPart;
  events: MedicalEvent[];
  accidentDate?: string | null;
  onClose: () => void;
}

/**
 * Body Map detail popup — PRD-Timeline-View.md §6. Sizing/positioning are
 * explicit acceptance criteria: 90% x 90% of the Body Map panel's own box
 * (not the viewport), 5% inset, absolutely positioned relative to the
 * panel container the caller renders this inside.
 */
export function BodyMapDetailPopup({ group, events, accidentDate, onClose }: BodyMapDetailPopupProps) {
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());

  const allTypes = distinctMedicineTypes(events.map((e) => e.medicineType));
  const filtered = activeTypes.size === 0
    ? events
    : events.filter((e) => e.medicineType && activeTypes.has(e.medicineType));

  const toggleType = (type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  return (
    <>
      <Box
        onClick={onClose}
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: 'rgba(0,0,0,0.4)',
          zIndex: 10,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '5%',
          left: '5%',
          width: '90%',
          height: '90%',
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: 8,
          zIndex: 11,
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
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="h6">{group.bodyPart}</Typography>
            <Typography variant="caption" color="text.secondary">
              {filtered.length} of {group.count} encounters
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Close">
            ✕
          </IconButton>
        </Box>

        {allTypes.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', px: 2, pt: 1.5 }}>
            {allTypes.map((type) => {
              const active = activeTypes.has(type);
              return (
                <Chip
                  key={type}
                  size="small"
                  label={type}
                  onClick={() => toggleType(type)}
                  sx={{
                    bgcolor: active ? colorForMedicineType(type) : 'transparent',
                    color: active ? '#fff' : 'text.primary',
                    border: '1px solid',
                    borderColor: colorForMedicineType(type),
                  }}
                />
              );
            })}
          </Box>
        )}

        <Stack spacing={1.5} sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No encounters match the active filter.
            </Typography>
          )}
          {filtered.map((event) => (
            <EncounterCard
              key={event.id}
              event={event}
              isAccidentDate={Boolean(accidentDate) && event.date.slice(0, 10) === accidentDate?.slice(0, 10)}
            />
          ))}
        </Stack>
      </Box>
    </>
  );
}
