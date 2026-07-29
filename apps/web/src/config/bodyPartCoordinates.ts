/**
 * Curated body-part-term -> figure-coordinate lookup. This is what makes
 * the Body Map work with ANY Excel, not just the sample case
 * (docs/Architecture.md §7.2, the hackathon's one hard rule): a term found
 * here renders as a hotspot; anything else falls into the "Other findings"
 * list instead of being dropped or erroring.
 *
 * Pure config, versioned and extendable — adding vocabulary like "Cervical
 * Spine" is a one-line addition here, not a rewrite.
 */
export interface BodyPartCoordinate {
  /** 0-100, percentage position on the figure silhouette. */
  x: number;
  y: number;
  view: 'front' | 'back' | 'both';
}

// Percentages below are the reference prototype's pixel COORDS (280x560
// viewBox, UI Concepts/v7_bodymap_calendar_split.html) converted to
// x/280*100, y/560*100 — kept in lockstep with the SVG figure rendered in
// BodyMapPanel.tsx so hotspots land on the actual silhouette, not just in
// its general vicinity.
export const BODY_PART_COORDINATES: Record<string, BodyPartCoordinate> = {
  Head: { x: 50, y: 6.79, view: 'both' },
  Face: { x: 50, y: 8.93, view: 'front' },
  Eye: { x: 53.57, y: 7.86, view: 'front' },
  Ear: { x: 58.57, y: 8.21, view: 'both' },
  Nose: { x: 50, y: 9.29, view: 'front' },
  Mouth: { x: 50, y: 10.36, view: 'front' },
  Sinuses: { x: 47.14, y: 7.86, view: 'front' },
  Neck: { x: 50, y: 14.64, view: 'both' },
  'Cervical Spine': { x: 50, y: 14.64, view: 'back' },
  Shoulder: { x: 68.57, y: 17.86, view: 'both' },
  'Upper Arm': { x: 72.86, y: 26.79, view: 'both' },
  'Upper Back': { x: 50, y: 21.43, view: 'back' },
  Back: { x: 50, y: 32.14, view: 'back' },
  Spine: { x: 50, y: 35.71, view: 'back' },
  'Lower Back': { x: 50, y: 39, view: 'back' },
  Chest: { x: 50, y: 25, view: 'front' },
  Lungs: { x: 42.86, y: 25.89, view: 'front' },
  Heart: { x: 55.36, y: 26.79, view: 'front' },
  Armpit: { x: 63.57, y: 21.43, view: 'both' },
  Abdomen: { x: 50, y: 48.21, view: 'front' },
  Stomach: { x: 44.64, y: 47.32, view: 'front' },
  Intestines: { x: 50, y: 50.89, view: 'front' },
  Genitals: { x: 50, y: 53.57, view: 'front' },
  Arm: { x: 75, y: 32.14, view: 'both' },
  Elbow: { x: 75.71, y: 36.61, view: 'both' },
  Forearm: { x: 76.43, y: 41.96, view: 'both' },
  Wrist: { x: 78.21, y: 46.79, view: 'both' },
  Hand: { x: 79.64, y: 51.79, view: 'both' },
  Finger: { x: 79.64, y: 54.46, view: 'both' },
  Hip: { x: 42.5, y: 54, view: 'both' },
  Leg: { x: 42.5, y: 67.86, view: 'both' },
  Knee: { x: 42.5, y: 76.8, view: 'both' },
  Ankle: { x: 42.5, y: 92, view: 'both' },
  Foot: { x: 41.07, y: 91.96, view: 'both' },
  Toe: { x: 41.07, y: 95.54, view: 'both' },
};

export function lookupBodyPart(term: string): BodyPartCoordinate | undefined {
  return BODY_PART_COORDINATES[term.trim()];
}

export function splitKnownAndUnknown(bodyParts: string[]) {
  const known: string[] = [];
  const unknown: string[] = [];
  for (const part of bodyParts) {
    if (lookupBodyPart(part)) known.push(part);
    else unknown.push(part);
  }
  return { known, unknown };
}
