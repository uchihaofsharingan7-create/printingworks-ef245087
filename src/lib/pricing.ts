import { CuraWASM } from 'cura-wasm';

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

const PRINTER_PROFILES = {
  ender3pro: { machine_name: "Ender 3 Pro", machine_width: 220, machine_depth: 220, machine_height: 250, nozzle_size: 0.4, layer_height: 0.2, infill_sparse_density: 20, speed_print: 50 },
  adventure4: { machine_name: "Adventure 4 Pro", machine_width: 220, machine_depth: 220, machine_height: 250, nozzle_size: 0.4, layer_height: 0.2, infill_sparse_density: 20, speed_print: 80 },
  adventure5m: { machine_name: "Adventure 5M Pro", machine_width: 220, machine_depth: 220, machine_height: 220, nozzle_size: 0.4, layer_height: 0.2, infill_sparse_density: 20, speed_print: 300 }
};

export function roundPrice(price: number): number {
  return price >= 0.70 ? Math.round(price) : parseFloat(price.toFixed(2));
}

/**
 * CORE SLICER ENGINE
 * Points to local /public/cura-wasm/ files.
 */
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
    
    // 1. Try to find the weight comment
    const match = gcodeString.match(/filament used \[g\]: ([\d.]+)/i);
    if (match) return parseFloat(match[1]);

    // 2. FALLBACK: Calculate weight from "E" (Extrusion) values
    // This is necessary because your G-code is missing the weight comment.
    const eMatches = gcodeString.match(/E([\d.]+)/g);
    if (eMatches && eMatches.length > 0) {
      const lastE = eMatches[eMatches.length - 1];
      const lengthMm = parseFloat(lastE.replace('E', ''));
      
      // Math: (Length in mm / 1000) * (Filament Cross Section) * (Density)
      // Standard 1.75mm PLA is ~3.0 grams per meter.
      const calculatedGrams = (lengthMm / 1000) * 3.0;
      
      console.log(`📏 Extracted E-Value: ${lengthMm}mm. Calculated Weight: ${calculatedGrams.toFixed(1)}g`);
      return parseFloat(calculatedGrams.toFixed(1));
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
  return roundPrice(BASE_COST + materialCost + printerFee);
}
