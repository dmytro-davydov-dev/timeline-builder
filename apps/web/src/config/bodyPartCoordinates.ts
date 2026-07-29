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

export const BODY_PART_COORDINATES: Record<string, BodyPartCoordinate> = {
  Head: { x: 50, y: 6, view: 'both' },
  Face: { x: 50, y: 8, view: 'front' },
  Eye: { x: 46, y: 6, view: 'front' },
  Ear: { x: 57, y: 7, view: 'both' },
  Nose: { x: 50, y: 7.5, view: 'front' },
  Mouth: { x: 50, y: 9, view: 'front' },
  Sinuses: { x: 50, y: 7, view: 'front' },
  Neck: { x: 50, y: 14, view: 'both' },
  'Cervical Spine': { x: 50, y: 14, view: 'back' },
  Shoulder: { x: 30, y: 20, view: 'both' },
  'Upper Arm': { x: 20, y: 28, view: 'both' },
  'Upper Back': { x: 50, y: 24, view: 'back' },
  Back: { x: 50, y: 34, view: 'back' },
  Spine: { x: 50, y: 34, view: 'back' },
  'Lower Back': { x: 50, y: 42, view: 'back' },
  Chest: { x: 50, y: 24, view: 'front' },
  Lungs: { x: 50, y: 22, view: 'front' },
  Heart: { x: 46, y: 24, view: 'front' },
  Armpit: { x: 35, y: 22, view: 'both' },
  Abdomen: { x: 50, y: 34, view: 'front' },
  Stomach: { x: 50, y: 36, view: 'front' },
  Intestines: { x: 50, y: 40, view: 'front' },
  Genitals: { x: 50, y: 46, view: 'front' },
  Arm: { x: 20, y: 34, view: 'both' },
  Elbow: { x: 18, y: 42, view: 'both' },
  Forearm: { x: 16, y: 47, view: 'both' },
  Wrist: { x: 15, y: 52, view: 'both' },
  Hand: { x: 13, y: 58, view: 'both' },
  Finger: { x: 12, y: 62, view: 'both' },
  Hip: { x: 42, y: 48, view: 'both' },
  Leg: { x: 45, y: 66, view: 'both' },
  Knee: { x: 45, y: 74, view: 'both' },
  Ankle: { x: 45, y: 90, view: 'both' },
  Foot: { x: 45, y: 96, view: 'both' },
  Toe: { x: 45, y: 99, view: 'both' },
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
