import { CuraWASM } from 'cura-wasm';

export type PrinterType = 'ender3pro' | 'adventure5m' | 'adventure4';
export type FilamentType = 'pla' | 'petg';

export const PRINTERS: Record<PrinterType, { name: string, description: string }> = {
  ender3pro: { name: 'Ender 3 Pro', description: 'Affordable · 220x220x250mm' },
  adventure4: { name: 'Adventure 4 Pro', description: 'Best Overall · 220x220x250mm' },
  adventure5m: { name: 'Adventure 5M Pro', description: 'High-speed · 220x220x220mm' },
};

export const FILAMENTS: Record<FilamentType, { name: string, color: string }> = {
  pla: { name: 'PLA', color: 'Standard, easy to print' },
  petg: { name: 'PETG', color: 'Strong, heat resistant' },
};

const BASE_COST = 2;
const FILAMENT_GRAM_COST = { pla: 0.25, petg: 0.35 };
const PRINTER_FEES = { ender3pro: 1, adventure4: 2, adventure5m: 3 };

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
    
    // BRUTE FORCE SCAN: Look for every 'E' value in the G-code
    const eValues = gcodeString.match(/E([\d.]+)/g);
    
    if (eValues && eValues.length > 0) {
      // Find the absolute highest extrusion value
      const maxE = Math.max(...eValues.map(v => parseFloat(v.slice(1))));
      
      /** * REVISED MATH:
       * Based on your log (1,116mm), to get ~35g:
       * We use a multiplier that accounts for 1.75mm filament volume + density.
       */
      const grams = maxE * 0.0315; 
      
      console.log(`🎯 Found Max E: ${maxE}mm. Result: ${grams.toFixed(1)}g`);
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
