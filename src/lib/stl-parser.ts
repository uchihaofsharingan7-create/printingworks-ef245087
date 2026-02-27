// Parse binary STL files and calculate volume
export function parseSTL(buffer: ArrayBuffer): { volume: number; triangleCount: number } {
  const view = new DataView(buffer);
  // Skip 80-byte header
  const triangleCount = view.getUint32(80, true);

  let volume = 0;

  for (let i = 0; i < triangleCount; i++) {
    const offset = 84 + i * 50;
    // Skip normal (12 bytes), read 3 vertices
    const v1x = view.getFloat32(offset + 12, true);
    const v1y = view.getFloat32(offset + 16, true);
    const v1z = view.getFloat32(offset + 20, true);
    const v2x = view.getFloat32(offset + 24, true);
    const v2y = view.getFloat32(offset + 28, true);
    const v2z = view.getFloat32(offset + 32, true);
    const v3x = view.getFloat32(offset + 36, true);
    const v3y = view.getFloat32(offset + 40, true);
    const v3z = view.getFloat32(offset + 44, true);

    // Signed volume of tetrahedron with origin
    volume += (
      v1x * (v2y * v3z - v3y * v2z) -
      v2x * (v1y * v3z - v3y * v1z) +
      v3x * (v1y * v2z - v2y * v1z)
    ) / 6.0;
  }

  // Volume in mm³ (STL units are typically mm), convert to cm³
  const volumeCm3 = Math.abs(volume) / 1000;

  return { volume: volumeCm3, triangleCount };
}

// Infill factor ~20% infill typical
const INFILL_FACTOR = 0.2;
const SHELL_THICKNESS = 1.2; // mm

// Estimate grams from volume
export function estimateGrams(volumeCm3: number, filament: 'pla' | 'petg'): number {
  const density = filament === 'pla' ? 1.24 : 1.27; // g/cm³
  // Rough estimate: ~30% of total volume is material (shells + infill)
  const materialFraction = 0.30;
  return Math.round(volumeCm3 * density * materialFraction * 10) / 10;
}

// Estimate print time in minutes from volume
export function estimateTimeMinutes(volumeCm3: number, printer: 'ender3pro' | 'adventure5m' | 'adventure4'): number {
  // Rough rates: cm³ per minute (accounting for travel, retraction, etc.)
  const rates: Record<string, number> = {
    ender3pro: 0.15,    // slower
    adventure5m: 0.35,  // fast
    adventure4: 0.25,   // medium
  };
  const rate = rates[printer] || 0.2;
  return Math.max(5, Math.round(volumeCm3 / rate));
}
