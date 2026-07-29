import { useState } from 'react';
import { Box, Button, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import type { Case } from '../../types';

interface SharedToolbarProps {
  caseData: Case;
  onSetAccidentDate: (date: string) => void;
  bodyView: 'front' | 'back';
  onBodyViewChange: (view: 'front' | 'back') => void;
  calendarColorMode: 'intensity' | 'medicineType';
  onCalendarColorModeChange: (mode: 'intensity' | 'medicineType') => void;
}

/**
 * Accident date write-through + the two local-only view toggles
 * (docs/Architecture.md §7.1/§7.3 — front/back and calendar color mode are
 * UI state, not synced to the backend).
 */
export function SharedToolbar({
  caseData,
  onSetAccidentDate,
  bodyView,
  onBodyViewChange,
  calendarColorMode,
  onCalendarColorModeChange,
}: SharedToolbarProps) {
  const [accidentDate, setAccidentDate] = useState(
    caseData.accidentDate?.slice(0, 10) ?? '',
  );

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }}
    >
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          label="Accident date"
          type="date"
          size="small"
          value={accidentDate}
          onChange={(e) => setAccidentDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
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

      <ToggleButtonGroup
        size="small"
        exclusive
        value={bodyView}
        onChange={(_, v) => v && onBodyViewChange(v)}
      >
        <ToggleButton value="front">Front</ToggleButton>
        <ToggleButton value="back">Back</ToggleButton>
      </ToggleButtonGroup>

      <ToggleButtonGroup
        size="small"
        exclusive
        value={calendarColorMode}
        onChange={(_, v) => v && onCalendarColorModeChange(v)}
      >
        <ToggleButton value="intensity">Intensity</ToggleButton>
        <ToggleButton value="medicineType">Medicine type</ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
        <Tooltip title="Coming soon">
          <span>
            <Button size="small" variant="outlined" disabled>
              Export PDF
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Coming soon">
          <span>
            <Button size="small" variant="outlined" disabled>
              Export PPT
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Stack>
  );
}
