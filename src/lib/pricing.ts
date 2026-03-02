import { CuraWASM } from 'cura-wasm';
new CuraWASM({
  definition,
  wasmPath: "/cura.wasm",
  workerPath: "/cura.worker.js",
});
import { resolveDefinition } from 'cura-wasm-definitions';

export type PrinterType = 'ender3pro' | 'adventure5m' | 'adventure4';
export type FilamentType = 'pla' | 'petg';

export const PRINTERS: Record<PrinterType, { name: string; description: string }> = {
  ender3pro: { name: 'Ender 3 Pro', description: 'Affordable · 220x220x250mm' },
  adventure4: { name: 'Adventure 4 Pro', description: 'Best Overall · 220x220x250mm' },
  adventure5m: { name: 'Adventure 5M Pro', description: 'High-speed · 220x220x220mm' },
};

export const FILAMENTS: Record<FilamentType, { name: string; color: string }> = {
  pla: { name: 'PLA', color: 'Standard, easy to print' },
  petg: { name: 'PETG', color: 'Strong, heat resistant' },
};

const BASE_COST = 2;
const FILAMENT_GRAM_COST = { pla: 0.25, petg: 0.35 };
const PRINTER_FEES = { ender3pro: 1, adventure4: 2, adventure5m: 3 };

// Map our printer types to cura-wasm-definitions printer IDs
// Adventure 4/5M don't have built-in definitions, so we use creality_ender3 as a base
// and apply overrides for speed
const CURA_DEFINITION_MAP: Record<PrinterType, string> = {
  ender3pro: 'creality_ender3pro',
  adventure4: 'creality_ender3pro',
  adventure5m: 'creality_ender3pro',
};

const SPEED_OVERRIDES: Record<PrinterType, number> = {
  ender3pro: 50,
  adventure4: 80,
  adventure5m: 300,
};

export function roundPrice(price: number): number {
  return price >= 0.70 ? Math.round(price) : parseFloat(price.toFixed(2));
}

/**
 * Slice an STL file using CuraWASM to get accurate weight.
 * Optionally accepts a progress callback (0-100).
 */
export async function getSlicedWeight(
  file: File,
  printerType: PrinterType,
  onProgress?: (percent: number) => void
): Promise<number> {
  try {
    const definitionId = CURA_DEFINITION_MAP[printerType];
    const definition = resolveDefinition(definitionId as any);
    
  const slicer = new CuraWASM({
  definition,
  overrides: [
    { scope: 'e0', key: 'speed_print', value: SPEED_OVERRIDES[printerType] },
    { scope: 'e0', key: 'infill_sparse_density', value: 20 },
    { scope: 'e0', key: 'layer_height', value: 0.2 },
  ],
  transfer: false,
  verbose: false,
} as any);

// IMPORTANT: Initialize Cura engine
await slicer.initialize();

    // Listen for progress events
    if (onProgress) {
      slicer.on('progress', (percent: number) => {
        onProgress(Math.round(percent));
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const { gcode } = await slicer.slice(arrayBuffer, 'stl');

    const gcodeString = new TextDecoder().decode(gcode);
    
    // Log last 60 lines to debug what CuraEngine actually outputs
    const lines = gcodeString.split('\n');
    const tail = lines.slice(-60).join('\n');
    console.log('[CuraWASM] G-code tail:\n', tail);

    // CuraEngine formats:
    // ;Filament used: 1.234m
    // ;Filament used: 1234.5mm  
    // ;Filament weight (g): 12.3
    // ;filament used [mm]: 1234
    // ;filament used [g]: 12.3

    // Try weight in grams first
    const gMatch = gcodeString.match(/filament\s*(?:weight|used)\s*(?:\(g\)|\[g\])\s*[:=]\s*([\d.]+)/i);
    if (gMatch) {
      const weight = parseFloat(gMatch[1]);
      console.log('[CuraWASM] Extracted weight (g):', weight);
      await slicer.destroy().catch(() => {});
      return Math.round(weight * 10) / 10;
    }

    // Try filament used in meters (e.g. "Filament used: 1.234m")
    const mMatch = gcodeString.match(/filament\s*used\s*:\s*([\d.]+)\s*m(?:\b|$)/i);
    if (mMatch) {
      const meters = parseFloat(mMatch[1]);
      const lengthMm = meters * 1000;
      const weight = filamentLengthToWeight(lengthMm);
      console.log('[CuraWASM] Extracted length (m):', meters, '=> weight (g):', weight);
      await slicer.destroy().catch(() => {});
      return weight;
    }

    // Try filament used in mm (e.g. "filament used [mm]: 1234" or "Filament used: 1234.5mm")
    const mmMatch = gcodeString.match(/filament\s*used\s*(?:\[mm\])?\s*[:=]\s*([\d.]+)\s*mm/i)
      || gcodeString.match(/filament\s*used\s*\[mm\]\s*[:=]\s*([\d.]+)/i);
    if (mmMatch) {
      const lengthMm = parseFloat(mmMatch[1]);
      const weight = filamentLengthToWeight(lengthMm);
      console.log('[CuraWASM] Extracted length (mm):', lengthMm, '=> weight (g):', weight);
      await slicer.destroy().catch(() => {});
      return weight;
    }

    // Last resort: scan all comment lines for any filament reference
    const filamentLines = lines.filter(l => l.startsWith(';') && /filament/i.test(l));
    console.warn('[CuraWASM] No weight regex matched. Filament-related lines:', filamentLines);

    await slicer.destroy().catch(() => {});
    return 0;
  } catch (error) {
    console.error("Slicing engine error:", error);
    return 0;
  }
}

/** Convert filament length (mm) to weight (g) assuming 1.75mm PLA */
function filamentLengthToWeight(lengthMm: number): number {
  const radiusCm = 0.175 / 2; // 1.75mm diameter
  const volumeCm3 = Math.PI * radiusCm * radiusCm * (lengthMm / 10);
  const weightG = volumeCm3 * 1.24; // PLA density g/cm³
  return Math.round(weightG * 10) / 10;
}

export function calculateCost(printer: PrinterType, filament: FilamentType, weightGrams: number): number {
  const materialCost = weightGrams * FILAMENT_GRAM_COST[filament];
  const printerFee = PRINTER_FEES[printer];
  return roundPrice(BASE_COST + materialCost + printerFee);
}
