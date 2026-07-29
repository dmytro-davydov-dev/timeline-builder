import { Box, Stack, Typography } from '@mui/material';

interface StatCardProps {
  value: string | number;
  label: string;
  alert?: boolean;
}

function StatCard({ value, label, alert }: StatCardProps) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 120,
        bgcolor: alert ? '#fef2f2' : 'grey.50',
        borderRadius: 1.5,
        px: 1.5,
        py: 1.25,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, color: alert ? '#b91c1c' : 'primary.main', lineHeight: 1.3 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

interface StatsBarProps {
  encounters: number;
  treatmentSpanDays: number;
  daysWithActivity: number;
  longestQuietStretchDays: number;
}

/**
 * Top stats row — PRD-Timeline-View.md §4's "Stats bar" requirement, styled
 * and worded to match the reference prototype (UI Concepts/v6_calendar_heatmap.html):
 * Encounters, Treatment span, Days with activity, and Longest quiet stretch
 * (flagged red once it exceeds 21 days, same threshold as the prototype).
 */
export function StatsBar({ encounters, treatmentSpanDays, daysWithActivity, longestQuietStretchDays }: StatsBarProps) {
  return (
    <Stack direction="row" spacing={1.75} sx={{ flexWrap: 'wrap', py: 1.75 }}>
      <StatCard value={encounters} label="Encounters" />
      <StatCard value={`${treatmentSpanDays}d`} label="Treatment span" />
      <StatCard value={daysWithActivity} label="Days with activity" />
      <StatCard
        value={`${longestQuietStretchDays}d`}
        label="Longest quiet stretch"
        alert={longestQuietStretchDays > 21}
      />
    </Stack>
  );
}
