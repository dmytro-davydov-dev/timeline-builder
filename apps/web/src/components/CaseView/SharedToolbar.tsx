import { useState } from 'react';
import { Box, Button, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type { Case } from '../../types';

interface SharedToolbarProps {
  caseData: Case;
  onSetAccidentDate: (date: string) => void;
  bodyView: 'front' | 'back';
  onBodyViewChange: (view: 'front' | 'back') => void;
  calendarColorMode: 'intensity' | 'medicineType';
  onCalendarColorModeChange: (mode: 'intensity' | 'medicineType') => void;
  onOpenChat: () => void;
}

const segGroupSx = {
  bgcolor: 'grey.100',
  borderRadius: 2,
  p: 0.5,
  gap: 0.5,
  '& .MuiToggleButtonGroup-grouped': {
    border: 'none',
    borderRadius: '6px !important',
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.75rem',
    px: 1.5,
  },
};

// Applied per-button (rather than via a `.Mui-selected` group selector) so
// the active-pill contrast can't be lost to MUI's own higher-specificity
// selected-state styles.
function segButtonSx(active: boolean) {
  return {
    bgcolor: active ? 'primary.main' : 'transparent',
    color: active ? '#fff' : 'text.secondary',
    '&:hover': {
      bgcolor: active ? 'primary.main' : 'action.hover',
    },
    '&.Mui-selected, &.Mui-selected:hover': {
      bgcolor: active ? 'primary.main' : 'action.hover',
      color: active ? '#fff' : 'text.secondary',
    },
  };
}

/**
 * Accident date write-through + the two local-only view toggles
 * (docs/Architecture.md §7.1/§7.3 — front/back and calendar color mode are
 * UI state, not synced to the backend). Segmented-control styling matches
 * the reference prototype (UI Concepts/v6_calendar_heatmap.html) — a light
 * pill container with a solid navy active state.
 */
export function SharedToolbar({
  caseData,
  onSetAccidentDate,
  bodyView,
  onBodyViewChange,
  calendarColorMode,
  onCalendarColorModeChange,
  onOpenChat,
}: SharedToolbarProps) {
  const [accidentDate, setAccidentDate] = useState(
    caseData.accidentDate?.slice(0, 10) ?? '',
  );

  return (
    <Stack
      direction="row"
      spacing={2.5}
      sx={{ py: 2, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}
    >
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
          Date of loss
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            type="date"
            size="small"
            value={accidentDate}
            onChange={(e) => setAccidentDate(e.target.value)}
          />
          <Button
            size="small"
            variant="outlined"
            disabled={!accidentDate}
            onClick={() => onSetAccidentDate(accidentDate)}
          >
            Set
          </Button>
        </Box>
      </Box>

      <ToggleButtonGroup
        size="small"
        exclusive
        value={bodyView}
        onChange={(_, v) => v && onBodyViewChange(v)}
        sx={segGroupSx}
      >
        <ToggleButton value="front" sx={segButtonSx(bodyView === 'front')}>Front</ToggleButton>
        <ToggleButton value="back" sx={segButtonSx(bodyView === 'back')}>Back</ToggleButton>
      </ToggleButtonGroup>

      <ToggleButtonGroup
        size="small"
        exclusive
        value={calendarColorMode}
        onChange={(_, v) => v && onCalendarColorModeChange(v)}
        sx={segGroupSx}
      >
        <ToggleButton value="intensity" sx={segButtonSx(calendarColorMode === 'intensity')}>
          Color: Intensity
        </ToggleButton>
        <ToggleButton value="medicineType" sx={segButtonSx(calendarColorMode === 'medicineType')}>
          Color: Medicine type
        </ToggleButton>
      </ToggleButtonGroup>

      <Button
        size="small"
        variant="outlined"
        onClick={onOpenChat}
        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
      >
        Ask about this case
      </Button>
    </Stack>
  );
}
