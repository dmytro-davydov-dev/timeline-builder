import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useDefaultCase } from '../api/cases';
import { UploadPage } from './UploadPage';

/**
 * Root route ("/"). Phase 1 is single-case-per-session with no case
 * switcher (docs/PRD-Case-Management.md §2), so the app should open
 * straight into a case on startup rather than showing the Upload screen
 * first — the backend auto-seeds a demo case from a bundled Excel on first
 * boot if none exists yet (apps/api/src/excel-import/default-case-seeder.service.ts).
 *
 * Falls back to the Upload screen only if no default case is available
 * (e.g. the seed asset is missing in this deployment), so the app never
 * dead-ends on a blank screen. "Load different Excel" (CaseHeader.tsx)
 * points at "/upload" so the Upload flow stays reachable once a case is
 * open.
 */
export function DefaultCaseRedirect() {
  const defaultCaseQuery = useDefaultCase();

  if (defaultCaseQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (defaultCaseQuery.isError || !defaultCaseQuery.data) {
    return <UploadPage />;
  }

  return <Navigate to={`/cases/${defaultCaseQuery.data.id}`} replace />;
}
