import { CuraWASM } from 'cura-wasm';
import { resolveDefinition } from 'cura-wasm-definitions';

export type PrinterType = 'ender3pro' | 'adventure5m' | 'adventure4';
export type FilamentType = 'pla' | 'petg';

export const PRINTERS: Record<PrinterType, { name: string; description: string }> = {
  ender3pro: { name: 'Ender 3 Pro', description: 'Affordable · 220x220x250mm' },
  adventure4: { name: 'Adventure 4 Pro', description: 'Best Overall · 220x220x250mm' },
  adventure5m: { name: 'Adventure 5M Pro', description: 'High-speed · 220x220x220mm' },
};

export const FILAMENTS: Record<FilamentType, { name: string; color: string }> = {
  pla: { name: 'PLA', color: 'Standard · Matte' },
  petg: { name: 'PETG', color: 'Durable · Glossy' },
};

const FILAMENT_GRAM_COST = { pla: 0.25, petg: 0.35 };
const PRINTER_FEES = { ender3pro: 1, adventure4: 2, adventure5m: 3 };
const BASE_COST = 2;

// Speed overrides for time estimation when slicer doesn't provide it
const SPEED_OVERRIDES: Record<PrinterType, number> = {
  ender3pro: 50,
  adventure4: 80,
  adventure5m: 300,
};

export interface SliceResult {
  grams: number;
  timeMinutes: number;
}

/**
 * Convert filament length (mm) to weight (grams) for 1.75mm PLA
 * Area = PI * (0.875)^2 ≈ 2.405 mm²
 * Volume (mm³) = length * area
 * Weight = volume * density / 1000 (density PLA ≈ 1.24 g/cm³ = 0.00124 g/mm³)
 */
function filamentLengthToGrams(lengthMM: number): number {
  const area = Math.PI * 0.875 * 0.875; // ~2.405 mm²
  const volumeMM3 = lengthMM * area;
  return volumeMM3 * 0.00124; // PLA density
}

function parseGcodeForData(gcode: string): { grams: number; timeSeconds: number } {
  let grams = 0;
  let timeSeconds = 0;

  // Try weight in grams
  const gramMatch = gcode.match(/filament used \[g\]\s*[:=]\s*([\d.]+)/i)
    || gcode.match(/filament weight\s*[:=]\s*([\d.]+)/i);
  if (gramMatch) grams = parseFloat(gramMatch[1]);

  // Try length in meters
  if (grams === 0) {
    const meterMatch = gcode.match(/Filament used:\s*([\d.]+)\s*m/i)
      || gcode.match(/filament used \[m\]\s*[:=]\s*([\d.]+)/i);
    if (meterMatch) grams = filamentLengthToGrams(parseFloat(meterMatch[1]) * 1000);
  }

  // Try length in mm
  if (grams === 0) {
    const mmMatch = gcode.match(/filament used \[mm\]\s*[:=]\s*([\d.]+)/i);
    if (mmMatch) grams = filamentLengthToGrams(parseFloat(mmMatch[1]));
  }

  // Brute force: max E value
  if (grams === 0) {
    const eMatches = gcode.match(/E([\d.]+)/g);
    if (eMatches && eMatches.length > 0) {
      const maxE = Math.max(...eMatches.map(v => parseFloat(v.substring(1))));
      grams = filamentLengthToGrams(maxE);
      console.log(`🎯 Max E: ${maxE}mm → ${grams.toFixed(1)}g`);
    }
  }

  // Try print time
  const timeMatch = gcode.match(/;TIME:(\d+)/i)
    || gcode.match(/print time\s*[:=]\s*(\d+)/i);
  if (timeMatch) timeSeconds = parseInt(timeMatch[1]);

  return { grams, timeSeconds };
}

export async function getSlicedWeight(
  file: File,
  printerType: PrinterType,
  onProgress?: (pct: number) => void
): Promise<SliceResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    const slicer = new CuraWASM({
      command: `slice -j definitions/printer.def.json -o Model.gcode -s layer_height=0.2 -s infill_sparse_density=20 -s speed_print=${SPEED_OVERRIDES[printerType]} -l Model.stl`,
      definition: resolveDefinition('creality_ender3pro'),
      transfer: true,
      verbose: false,
    } as any);

    // Progress callback
    if (onProgress) {
      (slicer as any).on?.('progress', (pct: number) => {
        const normalized = pct > 1 ? pct : pct * 100;
        onProgress(Math.max(0, Math.min(100, normalized)));
      });
    }

    const sliceResult = await (slicer as any).slice(arrayBuffer, 'stl');
    const gcodeBytes: ArrayBuffer = sliceResult instanceof ArrayBuffer
      ? sliceResult
      : (sliceResult?.gcode as ArrayBuffer);

    // Clean up
    try { (slicer as any).dispose?.(); } catch {}

    if (!gcodeBytes || gcodeBytes.byteLength === 0) {
      console.warn('Slicer returned empty gcode');
      return { grams: 0, timeMinutes: 0 };
    }

    const gcodeString = new TextDecoder().decode(gcodeBytes);
    console.log('📄 G-code tail:', gcodeString.slice(-500));

    const { grams, timeSeconds } = parseGcodeForData(gcodeString);

    // Estimate time from weight if slicer didn't provide it
    const speed = SPEED_OVERRIDES[printerType];
    const timeMinutes = timeSeconds > 0
      ? Math.round(timeSeconds / 60)
      : Math.max(1, Math.round((grams / speed) * 60));

    return { grams: parseFloat(grams.toFixed(1)), timeMinutes };
  } catch (error) {
    console.error('Slicer Error:', error);
    return { grams: 0, timeMinutes: 0 };
  }
}

export function calculateCost(printer: PrinterType, filament: FilamentType, weightGrams: number): number {
  const finalWeight = weightGrams > 0 ? weightGrams : 1;
  const materialCost = finalWeight * FILAMENT_GRAM_COST[filament];
  const printerFee = PRINTER_FEES[printer];
  return Math.round((BASE_COST + materialCost + printerFee) * 100) / 100;
}
