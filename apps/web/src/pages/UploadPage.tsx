import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useImportCase } from '../api/cases';

/**
 * Upload / Import screen (docs/Architecture.md §7.1 CaseView component
 * tree — this is the entry point that produces a Case).
 */
export function UploadPage() {
  const navigate = useNavigate();
  const importCase = useImportCase();
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async () => {
    if (!file) return;
    const summary = await importCase.mutateAsync(file);
    navigate(`/cases/${summary.caseId}`);
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <Paper sx={{ p: 4, maxWidth: 480, width: '100%' }} elevation={2}>
        <Stack spacing={2}>
          <Typography variant="h5">Medical Timeline AI</Typography>
          <Typography variant="body2" color="text.secondary">
            Upload a case Excel (columns: Encounter Date, Primary Provider,
            Facility, Body Parts, Medicine Type, Record Type, Summary, Link
            To Pdf) to build the case's timeline.
          </Typography>

          <Button variant="outlined" component="label">
            {file ? file.name : 'Choose Excel file'}
            <input
              type="file"
              hidden
              accept=".xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Button>

          <Button
            variant="contained"
            disabled={!file || importCase.isPending}
            onClick={handleSubmit}
          >
            {importCase.isPending ? 'Importing…' : 'Import case'}
          </Button>

          {importCase.isError && (
            <Alert severity="error">
              {importCase.error instanceof Error
                ? importCase.error.message
                : 'Import failed'}
            </Alert>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
