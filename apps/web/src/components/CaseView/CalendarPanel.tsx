import { useEffect, useRef, useState } from 'react';
import { Box, Paper, Slider, Tooltip, Typography } from '@mui/material';
import { colorForMedicineType, distinctMedicineTypes } from '../../config/medicineTypeColors';
import type { GroupedByDay } from '../../types';

/** The strip (and the "Month by month" grid below it) always fill 100% of
 * this panel's column. The panel's column itself is pinned to a constant
 * 75% of the Case View grid (see `CaseViewPage`'s `minmax(0, 3fr) minmax(0,
 * 1fr)` split), so the on-screen size here is already constant across
 * cases — a long treatment span just scrolls horizontally inside it
 * instead of growing the column. */
const STRIP_WIDTH = '100%';

interface CalendarPanelProps {
  days: GroupedByDay[];
  colorMode: 'intensity' | 'medicineType';
  highlightedDays: Set<string>;
  accidentDate?: string | null;
  onSelectDay: (group: GroupedByDay, anchor: { x: number; y: number }) => void;
  /** Opens a modal listing every encounter in that month — triggered by
   * clicking the month's header in the "Month by month" grid below. */
  onSelectMonth: (monthKey: string, label: string) => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const INTENSITY_SCALE = ['#eef0f7', '#c7d2fe', '#93a5f0', '#5b6ee8', '#3730c7'];
const CELL = 12;
const GAP = 3;
const PITCH = CELL + GAP;

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Cell shading: intensity mode buckets the raw count into the 5-step scale
 * (capped at "4+" per PRD §7.3 so one outlier day doesn't wash out the
 * rest); medicine-type mode uses the dominant type's color with opacity
 * scaled by volume, same as `BodyMapPanel` hotspots.
 */
function cellColor(info: GroupedByDay | undefined, colorMode: 'intensity' | 'medicineType'): string {
  if (!info || info.count === 0) {
    return colorMode === 'intensity' ? INTENSITY_SCALE[0] : '#f1f2f8';
  }
  if (colorMode === 'intensity') {
    return INTENSITY_SCALE[Math.min(4, info.count)];
  }
  const alpha = Math.min(0.95, 0.35 + Math.min(info.count, 4) * 0.15);
  return hexToRgba(colorForMedicineType(info.dominantMedicineType), alpha);
}

interface StripCell {
  key: string;
  info?: GroupedByDay;
  isAccident: boolean;
}

interface MonthCell {
  day: number;
  key: string;
  info?: GroupedByDay;
  isAccident: boolean;
}

interface MonthGrid {
  /** `YYYY-MM`, used to identify the month to the encounters modal — not
   * derivable from `label` once localized (e.g. "juillet 2026"). */
  monthKey: string;
  label: string;
  cells: (MonthCell | null)[];
}

function buildActivityStrip(dayMap: Map<string, GroupedByDay>, first: Date, last: Date, accidentKey?: string) {
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay() - 7);
  const end = new Date(last);
  end.setDate(end.getDate() + (6 - end.getDay()) + 7);

  const cells: StripCell[] = [];
  const monthLabels: { col: number; text: string }[] = [];
  let col = 0;
  let lastMonth = -1;

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 0 && d.getMonth() !== lastMonth) {
      lastMonth = d.getMonth();
      monthLabels.push({ col, text: d.toLocaleDateString(undefined, { month: 'short' }) });
    }
    const key = dayKey(d);
    cells.push({ key, info: dayMap.get(key), isAccident: key === accidentKey });
    if (dow === 6) col++;
  }

  return { cells, monthLabels, totalCols: col + 1 };
}

function buildMonthGrids(dayMap: Map<string, GroupedByDay>, first: Date, last: Date, accidentKey?: string): MonthGrid[] {
  const months: MonthGrid[] = [];
  let cur = new Date(first.getFullYear(), first.getMonth(), 1);
  const endMonth = new Date(last.getFullYear(), last.getMonth(), 1);

  while (cur <= endMonth) {
    const y = cur.getFullYear();
    const mo = cur.getMonth();
    const firstDow = new Date(y, mo, 1).getDay();
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const cells: (MonthCell | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const key = dayKey(new Date(y, mo, day));
      cells.push({ day, key, info: dayMap.get(key), isAccident: key === accidentKey });
    }
    const monthKey = `${y}-${String(mo + 1).padStart(2, '0')}`;
    months.push({ monthKey, label: cur.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), cells });
    cur = new Date(y, mo + 1, 1);
  }

  return months;
}

/**
 * Activity strip (GitHub-contributions style, §7.1) + month-by-month grid
 * cards (§7.2) reading from the same sparse `days` data. The grouped-by-day
 * endpoint only returns days with activity, so a dense day map is built
 * locally to fill in zero-count cells for correct grid alignment.
 */
export function CalendarPanel({
  days,
  colorMode,
  highlightedDays,
  accidentDate,
  onSelectDay,
  onSelectMonth,
}: CalendarPanelProps) {
  const dayMap = new Map(days.map((d) => [d.date.slice(0, 10), d]));
  const sortedKeys = Array.from(dayMap.keys()).sort();
  const accidentKey = accidentDate?.slice(0, 10);

  const legendTypes = colorMode === 'medicineType' ? distinctMedicineTypes(days.map((d) => d.dominantMedicineType)) : [];

  const stripRef = useRef<HTMLDivElement>(null);
  const [stripScrollMax, setStripScrollMax] = useState(0);
  const [stripScrollLeft, setStripScrollLeft] = useState(0);

  useEffect(() => {
    const measure = () => {
      const el = stripRef.current;
      if (!el) return;
      setStripScrollMax(Math.max(0, el.scrollWidth - el.clientWidth));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [days]);

  const handleStripScroll = () => {
    if (stripRef.current) setStripScrollLeft(stripRef.current.scrollLeft);
  };

  const handleSliderChange = (_: Event, value: number | number[]) => {
    const next = Array.isArray(value) ? value[0] : value;
    setStripScrollLeft(next);
    if (stripRef.current) stripRef.current.scrollLeft = next;
  };

  const handleCellClick = (info: GroupedByDay | undefined, e: React.MouseEvent) => {
    if (!info || info.count === 0) return;
    onSelectDay(info, { x: e.clientX, y: e.clientY });
  };

  const cellOutline = (key: string, isAccident: boolean) => {
    if (highlightedDays.has(key)) return { outline: '2px solid', outlineColor: 'secondary.main' };
    if (isAccident) return { outline: '2px dashed', outlineColor: 'warning.main', outlineOffset: '-1px' };
    return {};
  };

  if (days.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
        <Typography variant="subtitle1" gutterBottom>
          Calendar — {colorMode === 'intensity' ? 'intensity' : 'medicine type'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No events yet. Load a case to see activity here.
        </Typography>
      </Paper>
    );
  }

  const first = parseDayKey(sortedKeys[0]);
  const last = parseDayKey(sortedKeys[sortedKeys.length - 1]);

  const { cells, monthLabels, totalCols } = buildActivityStrip(dayMap, first, last, accidentKey);
  const months = buildMonthGrids(dayMap, first, last, accidentKey);

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Typography variant="subtitle1" gutterBottom>
        Calendar — {colorMode === 'intensity' ? 'intensity' : 'medicine type'}
      </Typography>

      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
        Full case at a glance
      </Typography>

      <Box
        ref={stripRef}
        onScroll={handleStripScroll}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.5,
          p: 1.5,
          width: STRIP_WIDTH,
          overflowX: 'auto',
        }}
      >
        <Box sx={{ position: 'relative', pt: '16px', width: totalCols * PITCH }}>
          {monthLabels.map((label) => (
            <Typography
              key={label.col}
              variant="caption"
              color="text.secondary"
              sx={{ position: 'absolute', top: 0, left: label.col * PITCH, whiteSpace: 'nowrap', fontSize: '10px' }}
            >
              {label.text}
            </Typography>
          ))}
          <Box
            sx={{
              display: 'grid',
              gridAutoFlow: 'column',
              gridTemplateRows: `repeat(7, ${CELL}px)`,
              gap: `${GAP}px`,
            }}
          >
            {cells.map((cell) => (
              <Tooltip
                key={cell.key}
                title={`${cell.key}${cell.info ? ` — ${cell.info.count} encounter(s)` : ''}`}
              >
                <Box
                  onClick={(e) => handleCellClick(cell.info, e)}
                  sx={{
                    width: CELL,
                    height: CELL,
                    borderRadius: 0.5,
                    bgcolor: cellColor(cell.info, colorMode),
                    cursor: cell.info && cell.info.count > 0 ? 'pointer' : 'default',
                    ...cellOutline(cell.key, cell.isAccident),
                  }}
                />
              </Tooltip>
            ))}
          </Box>
        </Box>
      </Box>

      {stripScrollMax > 0 && (
        <Box sx={{ width: STRIP_WIDTH, px: 1.5, mt: 0.25 }}>
          <Slider
            size="small"
            value={Math.min(stripScrollLeft, stripScrollMax)}
            min={0}
            max={stripScrollMax}
            onChange={handleSliderChange}
            aria-label="Scroll full case timeline"
          />
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Color reflects the most common care type that day, shaded by volume.
      </Typography>

      {colorMode === 'intensity' ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
          <Typography variant="caption" color="text.secondary">Less</Typography>
          {INTENSITY_SCALE.map((c) => (
            <Box key={c} sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: c }} />
          ))}
          <Typography variant="caption" color="text.secondary">More</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1 }}>
          {legendTypes.map((type) => (
            <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: colorForMedicineType(type) }} />
              <Typography variant="caption" color="text.secondary">{type}</Typography>
            </Box>
          ))}
        </Box>
      )}

      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5, display: 'block', mt: 3, mb: 1 }}>
        Month by month
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 1.5,
          maxHeight: 480,
          overflowY: 'auto',
          pr: 0.5,
        }}
      >
        {months.map((month) => (
          <Box
            key={month.label}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.25 }}
          >
            <Typography
              variant="subtitle2"
              onClick={() => onSelectMonth(month.monthKey, month.label)}
              sx={{ mb: 0.75, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              {month.label}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', mb: 0.5 }}>
              {WEEKDAYS.map((w) => (
                <Typography key={w} variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '9px' }}>
                  {w}
                </Typography>
              ))}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
              {month.cells.map((cell, i) =>
                cell === null ? (
                  <Box key={`blank-${i}`} sx={{ aspectRatio: '1' }} />
                ) : (
                  <Tooltip
                    key={cell.key}
                    title={cell.info ? `${cell.info.count} encounter(s)` : ''}
                  >
                    <Box
                      onClick={(e) => handleCellClick(cell.info, e)}
                      sx={{
                        aspectRatio: '1',
                        borderRadius: 0.75,
                        fontSize: '10px',
                        fontWeight: cell.info ? 700 : 400,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: cellColor(cell.info, colorMode),
                        cursor: cell.info && cell.info.count > 0 ? 'pointer' : 'default',
                        '&:hover': cell.info && cell.info.count > 0 ? { outline: '2px solid', outlineColor: 'primary.main' } : undefined,
                        ...cellOutline(cell.key, cell.isAccident),
                      }}
                    >
                      {cell.day}
                    </Box>
                  </Tooltip>
                ),
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
