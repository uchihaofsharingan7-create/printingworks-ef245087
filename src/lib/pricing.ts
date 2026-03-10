import { CuraWASM } from 'cura-wasm';

export type PrinterType = 'ender3pro' | 'adventure5m' | 'adventure4';
export type FilamentType = 'pla' | 'petg';

export const PRINTERS: Record<PrinterType, { name: string, description: string }> = {
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

const PRINTER_PROFILES = {
  ender3pro: { machine_name: "Ender 3 Pro", machine_width: 220, machine_depth: 220, machine_height: 250, nozzle_size: 0.4, layer_height: 0.2, infill_sparse_density: 20, speed_print: 50 },
  adventure4: { machine_name: "Adventure 4 Pro", machine_width: 220, machine_depth: 220, machine_height: 250, nozzle_size: 0.4, layer_height: 0.2, infill_sparse_density: 20, speed_print: 80 },
  adventure5m: { machine_name: "Adventure 5M Pro", machine_width: 220, machine_depth: 220, machine_height: 220, nozzle_size: 0.4, layer_height: 0.2, infill_sparse_density: 20, speed_print: 300 }
};

export async function getSlicedWeight(file: File, printerType: PrinterType): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const profile = PRINTER_PROFILES[printerType];

    const slicer = new CuraWASM({
      command: "slice",
      engine: "/cura-wasm/cura-engine.wasm",
      worker: "/cura-wasm/worker.js"
    } as any);

    const result = await (slicer as any).slice(arrayBuffer, profile) as any;
    if (!result || !result.gcode) return 0;

    const gcodeString = new TextDecoder().decode(result.gcode);
    
    // 1. Try finding weight comment (Standard)
    const match = gcodeString.match(/filament used \[g\]: ([\d.]+)/i);
    if (match) return parseFloat(match[1]);

    // 2. BRUTE FORCE FALLBACK: Scan for E-values
    // We look for every 'E' value and find the maximum one.
    const eMatches = gcodeString.match(/E([\d.]+)/g);
    
    if (eMatches && eMatches.length > 0) {
      // Map 'E1116.27' to '1116.27' and find the max
      const numbers = eMatches.map(v => parseFloat(v.substring(1)));
      const maxE = Math.max(...numbers);
      
      /** * PRECISION CALCULATION:
       * 1.75mm filament has a radius of 0.875mm.
       * Area = PI * r² ≈ 2.405 mm²
       * Grams = (Length * Area * Density) / 1000
       * PLA Density ≈ 1.25 g/cm³
       */
      const grams = (maxE * 2.405 * 1.25) / 1000;
      
      console.log(`🎯 Brute Force: Max E is ${maxE}mm. Calculated: ${grams.toFixed(1)}g`);
      return parseFloat(grams.toFixed(1));
    }

    return 0;
  } catch (error) {
    console.error("Slicer Error:", error);
    return 0;
  }
}

export function calculateCost(printer: PrinterType, filament: FilamentType, weightGrams: number): number {
  const finalWeight = weightGrams > 0 ? weightGrams : 1;
  const materialCost = finalWeight * FILAMENT_GRAM_COST[filament];
  const printerFee = PRINTER_FEES[printer];
  return Math.round((BASE_COST + materialCost + printerFee) * 100) / 100;
}
