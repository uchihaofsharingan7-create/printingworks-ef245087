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
 * Slice an STL file using CuraWASM to get accurate weight
 */
export async function getSlicedWeight(file: File, printerType: PrinterType): Promise<number> {
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
      transfer: true,
      verbose: false,
    } as any);

    const arrayBuffer = await file.arrayBuffer();
    const { gcode, metadata } = await slicer.slice(arrayBuffer, 'stl');

    // Try to extract weight from G-code comments
    const gcodeString = new TextDecoder().decode(gcode);
    const weightMatch = gcodeString.match(/filament used \[g\]\s*[:=]\s*([\d.]+)/i);
    
    if (weightMatch) {
      await slicer.destroy().catch(() => {});
      return parseFloat(weightMatch[1]);
    }

    // Fallback: extract filament length (mm) and calculate weight
    // PLA density ~1.24 g/cm³, filament diameter 1.75mm
    const lengthMatch = gcodeString.match(/filament used \[mm\]\s*[:=]\s*([\d.]+)/i) 
      || gcodeString.match(/Filament used:\s*([\d.]+)\s*mm/i);
    
    if (lengthMatch) {
      const lengthMm = parseFloat(lengthMatch[1]);
      const radiusCm = 0.175 / 2; // 1.75mm diameter in cm
      const volumeCm3 = Math.PI * radiusCm * radiusCm * (lengthMm / 10);
      const weightG = volumeCm3 * 1.24; // PLA density
      await slicer.destroy().catch(() => {});
      return Math.round(weightG * 10) / 10;
    }

    await slicer.destroy().catch(() => {});
    console.warn('Could not extract weight from G-code, returning 0');
    return 0;
  } catch (error) {
    console.error("Slicing engine error:", error);
    return 0;
  }
}

export function calculateCost(printer: PrinterType, filament: FilamentType, weightGrams: number): number {
  const materialCost = weightGrams * FILAMENT_GRAM_COST[filament];
  const printerFee = PRINTER_FEES[printer];
  return roundPrice(BASE_COST + materialCost + printerFee);
}
