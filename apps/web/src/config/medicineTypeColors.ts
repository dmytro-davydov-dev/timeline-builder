/**
 * Medicine type is free-form text from the source Excel (no fixed enum —
 * see apps/api excel-import), so colors are assigned deterministically from
 * a fixed palette rather than keyed to specific known values. This keeps
 * the same type always mapping to the same color within one render without
 * requiring a maintained lookup of every possible value (the same
 * generic-Excel principle as config/bodyPartCoordinates.ts).
 */
const PALETTE = [
  '#1f77b4',
  '#d62728',
  '#ff7f0e',
  '#2ca02c',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#17becf',
  '#bcbd22',
  '#7f7f7f',
];

const UNKNOWN_COLOR = '#9e9e9e';

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function colorForMedicineType(medicineType: string | null | undefined): string {
  if (!medicineType) return UNKNOWN_COLOR;
  return PALETTE[hashString(medicineType) % PALETTE.length];
}

/** Stable-ordered distinct medicine types found in a set of values, for legends/chips. */
export function distinctMedicineTypes(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const v of values) {
    if (v) seen.add(v);
  }
  return Array.from(seen).sort();
}
