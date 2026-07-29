import { Box, Paper, Tooltip, Typography } from '@mui/material';
import { colorForMedicineType, distinctMedicineTypes } from '../../config/medicineTypeColors';
import type { GroupedByDay } from '../../types';

interface CalendarPanelProps {
  days: GroupedByDay[];
  colorMode: 'intensity' | 'medicineType';
  highlightedDays: Set<string>;
  accidentDate?: string | null;
  onSelectDay: (group: GroupedByDay, anchor: { x: number; y: number }) => void;
}

/**
 * GitHub-style density calendar (docs/Architecture.md §7.4). CSS Grid, no
 * canvas needed at MVP data scale. A simplified single activity-strip
 * rendering here; the full month-grid layout from PRD-Timeline-View.md is a
 * fast follow within this same component.
 */
export function CalendarPanel({
  days,
  colorMode,
  highlightedDays,
  accidentDate,
  onSelectDay,
}: CalendarPanelProps) {
  const accidentDateKey = accidentDate?.slice(0, 10);
  const legendTypes = colorMode === 'medicineType'
    ? distinctMedicineTypes(days.map((d) => d.dominantMedicineType))
    : [];

  const colorFor = (day: GroupedByDay) => {
    if (colorMode === 'medicineType' && day.dominantMedicineType) {
      const intensity = Math.min(day.count, 4) / 4;
      return colorForMedicineType(day.dominantMedicineType) + Math.round((0.35 + intensity * 0.65) * 255).toString(16).padStart(2, '0');
    }
    const bucket = Math.min(day.count, 4) / 4;
    return `rgba(31, 45, 92, ${0.2 + bucket * 0.8})`;
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Typography variant="subtitle1" gutterBottom>
        Calendar — {colorMode === 'intensity' ? 'intensity' : 'medicine type'}
      </Typography>

      {colorMode === 'intensity' ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <Typography variant="caption" color="text.secondary">Less</Typography>
          {[0, 1, 2, 3, 4].map((n) => (
            <Box
              key={n}
              sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: `rgba(31, 45, 92, ${0.2 + (n / 4) * 0.8})` }}
            />
          ))}
          <Typography variant="caption" color="text.secondary">More</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          {legendTypes.map((type) => (
            <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: colorForMedicineType(type) }} />
              <Typography variant="caption" color="text.secondary">{type}</Typography>
            </Box>
          ))}
        </Box>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(14px, 1fr))',
          gap: '3px',
          maxHeight: 420,
          overflowY: 'auto',
        }}
      >
        {days.map((day) => {
          const isAccidentDate = accidentDateKey === day.date.slice(0, 10);
          return (
            <Tooltip key={day.date} title={`${day.date.slice(0, 10)} — ${day.count} encounter(s)`}>
              <Box
                onClick={(e) => onSelectDay(day, { x: e.clientX, y: e.clientY })}
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: 0.5,
                  bgcolor: colorFor(day),
                  outline: highlightedDays.has(day.date)
                    ? '2px solid'
                    : isAccidentDate
                      ? '2px dashed'
                      : 'none',
                  outlineColor: isAccidentDate ? 'warning.main' : 'secondary.main',
                  outlineOffset: isAccidentDate ? '1px' : 0,
                  cursor: 'pointer',
                }}
              />
            </Tooltip>
          );
        })}
      </Box>

      {days.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No events yet.
        </Typography>
      )}
    </Paper>
  );
}
