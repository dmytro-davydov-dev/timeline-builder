import { Box, Paper, Stack, Typography } from '@mui/material';
import type { CaseStatistics } from '../../types';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Box>
      <Typography variant="h6">{value}</Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

export function StatsBar({ statistics }: { statistics: CaseStatistics }) {
  const providerCount = Object.keys(statistics.byProvider).length;
  const bodyPartCount = Object.keys(statistics.byBodyPart).length;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap' }}>
        <Stat label="Encounters" value={statistics.totalEvents} />
        <Stat label="Span (days)" value={statistics.dateSpan.days} />
        <Stat label="Providers" value={providerCount} />
        <Stat label="Body parts" value={bodyPartCount} />
      </Stack>
    </Paper>
  );
}
