import { Box, Chip, Paper, Tooltip, Typography } from '@mui/material';
import { lookupBodyPart, splitKnownAndUnknown } from '../../config/bodyPartCoordinates';
import type { GroupedByBodyPart } from '../../types';

interface BodyMapPanelProps {
  groups: GroupedByBodyPart[];
  bodyView: 'front' | 'back';
  highlightedBodyParts: Set<string>;
  onSelectBodyPart: (group: GroupedByBodyPart) => void;
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
}: BodyMapPanelProps) {
  const { known, unknown } = splitKnownAndUnknown(groups.map((g) => g.bodyPart));
  const byName = new Map(groups.map((g) => [g.bodyPart, g]));

  const visibleKnown = known.filter((part) => {
    const coord = lookupBodyPart(part);
    return coord?.view === 'both' || coord?.view === bodyView;
  });

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
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
        {visibleKnown.map((part) => {
          const coord = lookupBodyPart(part)!;
          const group = byName.get(part)!;
          const highlighted = highlightedBodyParts.has(part);
          return (
            <Tooltip key={part} title={`${part} — ${group.count} encounter(s)`}>
              <Box
                onClick={() => onSelectBodyPart(group)}
                sx={{
                  position: 'absolute',
                  left: `${coord.x}%`,
                  top: `${coord.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: Math.min(16 + group.count * 3, 44),
                  height: Math.min(16 + group.count * 3, 44),
                  borderRadius: '50%',
                  bgcolor: highlighted ? 'secondary.main' : 'primary.main',
                  opacity: 0.85,
                  cursor: 'pointer',
                  transition: 'transform 120ms ease',
                  '&:hover': { transform: 'translate(-50%, -50%) scale(1.1)' },
                }}
              />
            </Tooltip>
          );
        })}
      </Box>

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
