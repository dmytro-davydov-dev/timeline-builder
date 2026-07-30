import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { AboutModal } from '../AboutModal';
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

interface CaseHeaderProps {
  caseData: Case;
  onExportPdf: () => void;
  onExportPpt: () => void | Promise<void>;
  exportReady: boolean;
}

/**
 * Full-bleed dark header, styled after the reference prototype (UI
 * Concepts/v6_calendar_heatmap.html) — brand dot + case name + subtitle on
 * the left, case-level actions on the right. Export PDF/PPT live here
 * (rather than the toolbar) per the reference; each button disables itself
 * only while its own export is running (or before case data has loaded),
 * not permanently — real generation happens client-side in
 * ../../utils/exportReport.ts.
 */
export function CaseHeader({ caseData, onExportPdf, onExportPpt, exportReady }: CaseHeaderProps) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pptLoading, setPptLoading] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleExportPdf = () => {
    setPdfLoading(true);
    try {
      onExportPdf();
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExportPpt = async () => {
    setPptLoading(true);
    try {
      await onExportPpt();
    } finally {
      setPptLoading(false);
    }
  };

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
        <Button
          size="small"
          variant="outlined"
          disabled={!exportReady || pdfLoading}
          onClick={handleExportPdf}
          startIcon={pdfLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={headerButtonSx}
        >
          {pdfLoading ? 'Exporting…' : 'Export PDF'}
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={!exportReady || pptLoading}
          onClick={handleExportPpt}
          startIcon={pptLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={headerButtonSx}
        >
          {pptLoading ? 'Exporting…' : 'Export PPT'}
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setAboutOpen(true)}
          sx={headerButtonSx}
        >
          About
        </Button>
      </Box>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </Box>
  );
}
