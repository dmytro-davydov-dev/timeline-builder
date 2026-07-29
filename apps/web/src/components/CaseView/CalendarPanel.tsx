import { Box, Paper, Tooltip, Typography } from '@mui/material';
import type { GroupedByDay } from '../../types';

interface CalendarPanelProps {
  days: GroupedByDay[];
  colorMode: 'intensity' | 'medicineType';
  highlightedDays: Set<string>;
  onSelectDay: (group: GroupedByDay) => void;
}

const MEDICINE_COLORS: Record<string, string> = {
  NSAID: '#4caf50',
  Opioid: '#f44336',
  'Muscle Relaxant': '#ff9800',
};

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
  onSelectDay,
}: CalendarPanelProps) {
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  const colorFor = (day: GroupedByDay) => {
    if (colorMode === 'medicineType' && day.dominantMedicineType) {
      return MEDICINE_COLORS[day.dominantMedicineType] ?? '#1f2d5c';
    }
    const intensity = day.count / maxCount;
    return `rgba(31, 45, 92, ${0.25 + intensity * 0.75})`;
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Typography variant="subtitle1" gutterBottom>
        Calendar — {colorMode === 'intensity' ? 'intensity' : 'medicine type'}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(14px, 1fr))',
          gap: '3px',
          maxHeight: 420,
          overflowY: 'auto',
        }}
      >
        {days.map((day) => (
          <Tooltip key={day.date} title={`${day.date} — ${day.count} encounter(s)`}>
            <Box
              onClick={() => onSelectDay(day)}
              sx={{
                width: 14,
                height: 14,
                borderRadius: 0.5,
                bgcolor: colorFor(day),
                outline: highlightedDays.has(day.date)
                  ? '2px solid'
                  : 'none',
                outlineColor: 'secondary.main',
                cursor: 'pointer',
              }}
            />
          </Tooltip>
        ))}
      </Box>

      {days.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No events yet.
        </Typography>
      )}
    </Paper>
  );
}
