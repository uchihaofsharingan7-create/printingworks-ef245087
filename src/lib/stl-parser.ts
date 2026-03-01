/**
 * Parse binary STL files and calculate raw geometric volume.
 * This is used for UI stats only. The actual printing weight 
 * is now handled by the real slicer in pricing.ts.
 */
export function parseSTL(buffer: ArrayBuffer): { volume: number; triangleCount: number } {
  const view = new DataView(buffer);
  
  // Basic validation: check if buffer is long enough for the header
  if (buffer.byteLength < 84) {
    throw new Error('Invalid STL file: Too short.');
  }

  // Skip 80-byte header to get triangle count
  const triangleCount = view.getUint32(80, true);

  // Safety check to prevent crashing on corrupt files
  const expectedSize = 84 + triangleCount * 50;
  if (buffer.byteLength < expectedSize) {
    throw new Error('Invalid STL file: Data missing.');
  }

  let volume = 0;

  for (let i = 0; i < triangleCount; i++) {
    const offset = 84 + i * 50;
    
    // Read 3 vertices (v1, v2, v3)
    const v1x = view.getFloat32(offset + 12, true);
    const v1y = view.getFloat32(offset + 16, true);
    const v1z = view.getFloat32(offset + 20, true);
    
    const v2x = view.getFloat32(offset + 24, true);
    const v2y = view.getFloat32(offset + 28, true);
    const v2z = view.getFloat32(offset + 32, true);
    
    const v3x = view.getFloat32(offset + 36, true);
    const v3y = view.getFloat32(offset + 40, true);
    const v3z = view.getFloat32(offset + 44, true);

    // Math: Signed volume of tetrahedron with origin
    volume += (
      v1x * (v2y * v3z - v3y * v2z) -
      v2x * (v1y * v3z - v3y * v1z) +
      v3x * (v1y * v2z - v2y * v1z)
    ) / 6.0;
  }

  // Convert mm³ to cm³
  const volumeCm3 = Math.abs(volume) / 1000;

  return { volume: volumeCm3, triangleCount };
}
