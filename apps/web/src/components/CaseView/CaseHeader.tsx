import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import type { Case } from '../../types';

export function CaseHeader({ caseData }: { caseData: Case }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 2,
      }}
    >
      <Box>
        <Typography variant="h5">{caseData.name}</Typography>
        {caseData.patientAlias && (
          <Typography variant="body2" color="text.secondary">
            {caseData.patientAlias}
          </Typography>
        )}
      </Box>
      <Button component={RouterLink} to="/" variant="outlined" size="small">
        Upload a different case
      </Button>
    </Box>
  );
}
