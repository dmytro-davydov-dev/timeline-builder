import { Box, Chip, Paper, Tooltip, Typography } from '@mui/material';
import { lookupBodyPart, splitKnownAndUnknown } from '../../config/bodyPartCoordinates';
import { colorForMedicineType } from '../../config/medicineTypeColors';
import { BodyMapDetailPopup } from './BodyMapDetailPopup';
import type { GroupedByBodyPart, MedicalEvent } from '../../types';

interface BodyMapPanelProps {
  groups: GroupedByBodyPart[];
  bodyView: 'front' | 'back';
  highlightedBodyParts: Set<string>;
  onSelectBodyPart: (group: GroupedByBodyPart) => void;
  selectedGroup: GroupedByBodyPart | null;
  selectedEvents: MedicalEvent[];
  accidentDate?: string | null;
  onClosePopup: () => void;
}

function hotspotSize(count: number): number {
  // radius = clamp(min, base + k * sqrt(count), max) per PRD §5.1
  return Math.min(48, Math.max(20, 16 + 4 * Math.sqrt(count)));
}

/**
 * Anatomical hotspot panel. Known terms (per config/bodyPartCoordinates.ts)
 * render as positioned hotspots over the silhouette; unmapped terms render
 * as "Other findings" chips — never dropped, never erroring
 * (docs/Architecture.md §7.2, the hackathon's "any Excel" requirement).
 */
export function BodyMapPanel({
  groups,
  bodyView,
  highlightedBodyParts,
  onSelectBodyPart,
  selectedGroup,
  selectedEvents,
  accidentDate,
  onClosePopup,
}: BodyMapPanelProps) {
  const { known, unknown } = splitKnownAndUnknown(groups.map((g) => g.bodyPart));
  const byName = new Map(groups.map((g) => [g.bodyPart, g]));

  const visibleKnown = known.filter((part) => {
    const coord = lookupBodyPart(part);
    return coord?.view === 'both' || coord?.view === bodyView;
  });

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', position: 'relative' }}>
      <Typography variant="subtitle1" gutterBottom>
        Body Map — {bodyView}
      </Typography>

      <Box
        sx={{
          position: 'relative',
          height: 420,
          borderRadius: 1,
          bgcolor: 'grey.100',
          border: '1px dashed',
          borderColor: 'grey.400',
        }}
      >
        {groups.length === 0 && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No body-part data was found in this case.
            </Typography>
          </Box>
        )}

        {visibleKnown.map((part) => {
          const coord = lookupBodyPart(part)!;
          const group = byName.get(part)!;
          const highlighted = highlightedBodyParts.has(part);
          const size = hotspotSize(group.count);
          return (
            <Tooltip key={part} title={`${part} — ${group.count} encounter(s)`}>
              <Box
                onClick={() => onSelectBodyPart(group)}
                sx={{
                  position: 'absolute',
                  left: `${coord.x}%`,
                  top: `${coord.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  bgcolor: colorForMedicineType(group.dominantMedicineType),
                  outline: highlighted ? '3px solid' : 'none',
                  outlineColor: 'secondary.main',
                  opacity: 0.9,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 120ms ease',
                  '&:hover': { transform: 'translate(-50%, -50%) scale(1.1)' },
                }}
              >
                <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1 }}>
                  {group.count}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {selectedGroup && (
        <BodyMapDetailPopup
          group={selectedGroup}
          events={selectedEvents}
          accidentDate={accidentDate}
          onClose={onClosePopup}
        />
      )}

      {unknown.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Other findings (not in the coordinate map yet)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
            {unknown.map((part) => (
              <Chip
                key={part}
                size="small"
                label={`${part} (${byName.get(part)?.count ?? 0})`}
                onClick={() => onSelectBodyPart(byName.get(part)!)}
              />
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
}
