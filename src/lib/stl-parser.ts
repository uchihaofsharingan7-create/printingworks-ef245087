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

/**
 * Estimate material weight from volume.
 * Uses a material fraction that accounts for:
 * - ~1.2mm shell walls (2-3 perimeters)
 * - ~20% grid infill on interior
 * - Top/bottom solid layers
 * Typical real-world material usage is ~28-35% of bounding volume.
 */
export function estimateGrams(volumeCm3: number, filament: 'pla' | 'petg'): number {
  const density = filament === 'pla' ? 1.24 : 1.27; // g/cm³
  const materialFraction = 0.30; // shells + 20% infill ≈ 30% fill
  return Math.round(volumeCm3 * density * materialFraction * 10) / 10;
}

/**
 * Estimate print time in minutes.
 * 
 * Profiles calibrated against typical slicer output:
 * - Ender 3 Pro: 50mm/s print speed, ~0.15 cm³/min effective throughput
 *   (slower due to lower acceleration, bowden tube limitations)
 * - Adventure 4 Pro: 60mm/s print speed, ~0.22 cm³/min effective throughput
 *   (direct drive, better retraction, good acceleration)
 * - Adventure 5M Pro: 300mm/s print speed, ~0.50 cm³/min effective throughput
 *   (high-speed Klipper firmware, input shaping, fast acceleration)
 * 
 * These rates account for travel moves, retraction, layer changes,
 * and cooling pauses that real prints experience.
 */
export function estimateTimeMinutes(
  volumeCm3: number,
  printer: 'ender3pro' | 'adventure5m' | 'adventure4'
): number {
  const profiles: Record<string, { rate: number; setupMin: number }> = {
    ender3pro:   { rate: 0.15, setupMin: 5 },  // slow, budget
    adventure4:  { rate: 0.22, setupMin: 3 },   // mid, reliable
    adventure5m: { rate: 0.50, setupMin: 2 },   // fast, high-speed
  };

  const p = profiles[printer] || profiles.ender3pro;
  const printTime = volumeCm3 / p.rate;
  return Math.max(5, Math.round(printTime + p.setupMin));
}
