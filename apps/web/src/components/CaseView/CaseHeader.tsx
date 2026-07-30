import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Tooltip, Typography } from '@mui/material';
import type { Case } from '../../types';

const NAVY = '#0b0c2a';
const NAVY_2 = '#12143f';
const INDIGO = '#6d5ef5';

const headerButtonSx = {
  color: '#fff',
  borderColor: 'rgba(255,255,255,0.35)',
  bgcolor: 'rgba(255,255,255,0.06)',
  '&:hover': { borderColor: 'rgba(255,255,255,0.6)', bgcolor: 'rgba(255,255,255,0.14)' },
  '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.15)' },
};

/**
 * Full-bleed dark header, styled after the reference prototype (UI
 * Concepts/v6_calendar_heatmap.html) — brand dot + case name + subtitle on
 * the left, case-level actions on the right. Export PDF/PPT live here
 * (rather than the toolbar) per the reference; both are MVP placeholders
 * (PRD-Timeline-View.md §4 — "coming soon", not silently broken).
 */
export function CaseHeader({ caseData }: { caseData: Case }) {
  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${NAVY}, ${NAVY_2})`,
        color: '#fff',
        px: { xs: 2, md: 3 },
        py: 1.75,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1.5,
      }}
    >
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: INDIGO }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {caseData.name} — Medical Timeline
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>
          Body Map + Calendar · split view
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button component={RouterLink} to="/upload" size="small" variant="outlined" sx={headerButtonSx}>
          Load different Excel
        </Button>
        <Tooltip title="Coming soon">
          <span>
            <Button size="small" variant="outlined" disabled sx={headerButtonSx}>
              Export PDF
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Coming soon">
          <span>
            <Button size="small" variant="outlined" disabled sx={headerButtonSx}>
              Export PPT
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}
