import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';

interface AboutModalProps {
  onClose: () => void;
}

const INDIGO = '#6d5ef5';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: INDIGO, mb: 0.5 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

/**
 * Static, app-wide "About" reference — not case data, so it takes no props
 * beyond onClose and doesn't hit the API. Opened from CaseHeader's About
 * button (styled to match Export PDF/PPT), and kept out of components/CaseView
 * since its content describes the app as a whole rather than a single case.
 */
export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { maxHeight: '85vh' } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: INDIGO }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            About Medical Timeline AI
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close">
          ✕
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Section title="1. Purpose">
          <Typography variant="body2" color="text.secondary">
            Medical Timeline AI turns a structured Excel export of a personal-injury case's
            medical encounters into an interactive, visual treatment timeline. It's built for
            attorneys who need a jury, client, or insurance adjuster to <em>feel</em> a case's
            medical history in seconds, rather than read a table of eighty rows. The idea
            originated at the Swans Applied AI Hackathon (Sintra, July 2026) and this app
            continues that concept as a working MVP.
          </Typography>
        </Section>

        <Divider />

        <Section title="2. Functionality">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Upload an Excel file (Encounter Date, Primary Provider, Facility, Body Parts,
            Medicine Type, Record Type, Summary, Link To PDF) and the app builds a case page
            around it, showing where the client was hurt and when treatment happened:
          </Typography>
          <List dense sx={{ listStyleType: 'disc', pl: 2, '& .MuiListItem-root': { display: 'list-item', py: 0.25 } }}>
            <ListItem disablePadding>
              <ListItemText
                primary="Body Map"
                secondary="An anatomical figure (front/back) with hotspots per body part — bubble size shows how many encounters, color shows the most common care type. Click a hotspot to open a list of every encounter for that body part."
              />
            </ListItem>
            <ListItem disablePadding>
              <ListItemText
                primary="Calendar"
                secondary="A full-case activity strip plus a month-by-month grid, colored by either event frequency or medicine type. Click any day to open a list of that day's encounters, or click a month's header to open a list of every encounter in that month."
              />
            </ListItem>
            <ListItem disablePadding>
              <ListItemText
                primary="Filter by medicine type"
                secondary="Pick a care type from the toolbar dropdown to open a list of every encounter of that type across the whole case, with its own quick stats (count, span, providers, body parts)."
              />
            </ListItem>
            <ListItem disablePadding>
              <ListItemText
                primary="Stats bar"
                secondary="Total encounters, treatment span, days with activity, and the longest gap in treatment (flagged once it passes 21 days)."
              />
            </ListItem>
            <ListItem disablePadding>
              <ListItemText
                primary="Accident date"
                secondary="Set once in the toolbar; it's ringed on the calendar so treatment can be read relative to it."
              />
            </ListItem>
            <ListItem disablePadding>
              <ListItemText
                primary="Ask AI about this case"
                secondary="A grounded chat: questions are answered only from the case's real data (never invented), and any encounters the answer references light up on the Body Map and Calendar."
              />
            </ListItem>
            <ListItem disablePadding>
              <ListItemText
                primary="Export PDF / Export PPT"
                secondary="Generates a real medical-chronology document from the loaded case — a title/summary page, a body-part breakdown table, and a full chronological encounter table (PDF) or a matching slide deck (PPT) — not a screenshot of the screen."
              />
            </ListItem>
          </List>
        </Section>

        <Divider />

        <Section title="3. How it's built">
          <SubSection title="a. Architecture">
            <Typography variant="body2" color="text.secondary">
              A two-app monorepo: a single-page React frontend talks to a REST API backend over
              HTTP. The backend owns all domain logic — importing and normalizing Excel rows,
              computing statistics/groupings/treatment gaps, and running the AI chat's
              tool-calling loop — so the frontend only renders data it's given rather than
              recomputing it. On first boot with no case yet, the backend auto-imports a bundled
              demo Excel so the app never opens to a blank screen. PDF/PPT export is the one
              exception: it runs entirely client-side from data already loaded in the browser, so
              no export-specific backend endpoint is needed.
            </Typography>
          </SubSection>
          <SubSection title="b. Stack">
            <Typography variant="body2" color="text.secondary">
              Frontend: React 19 + TypeScript, Vite, MUI for components, TanStack Query for all
              server-state fetching/caching, React Router for the three screens (Upload, Case
              View, default-case redirect), and jsPDF/jsPDF-AutoTable + PptxGenJS for the export
              files. Backend: NestJS + TypeScript, TypeORM, Postgres in production (Neon) with a
              zero-setup SQLite fallback for local dev, and ExcelJS for parsing uploaded
              workbooks. AI chat calls out to Gemini or OpenAI (whichever API key is configured),
              with Gemini taking priority if both are set; without either key it says so honestly
              instead of fabricating an answer.
            </Typography>
          </SubSection>
          <SubSection title="c. Flow">
            <Typography variant="body2" color="text.secondary">
              Upload an Excel → backend parses and validates it against the fixed column schema →
              a Case plus one Medical Event per row is saved → the browser opens that case's page,
              which fetches statistics, body-part groupings, day groupings, and treatment gaps in
              parallel → the Body Map and Calendar render from that data and cross-highlight each
              other on selection → chat questions go through a tool-calling loop that queries the
              same backend data the panels use, so answers stay grounded → Export PDF/PPT reuses
              whatever the page already has loaded to build the downloadable document client-side.
            </Typography>
          </SubSection>
        </Section>

        <Divider />

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip size="small" label="Phase 1 / MVP" variant="outlined" />
          <Typography variant="caption" color="text.secondary">
            See the project's <code>docs/</code> folder for the full architecture and product specs.
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
