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
  ender3pro: {
    machine_name: "Ender 3 Pro",
    machine_width: 220, machine_depth: 220, machine_height: 250,
    nozzle_size: 0.4, layer_height: 0.2, infill_sparse_density: 20, speed_print: 50,
  },
  adventure4: {
    machine_name: "Adventure 4 Pro",
    machine_width: 220, machine_depth: 220, machine_height: 250,
    nozzle_size: 0.4, layer_height: 0.2, infill_sparse_density: 20, speed_print: 80,
  },
  adventure5m: {
    machine_name: "Adventure 5M Pro",
    machine_width: 220, machine_depth: 220, machine_height: 220,
    nozzle_size: 0.4, layer_height: 0.2, infill_sparse_density: 20, speed_print: 300,
  }
};

export function roundPrice(price: number): number {
  return price >= 0.70 ? Math.round(price) : parseFloat(price.toFixed(2));
}

/**
 * FIXED getSlicedWeight
 * This version uses CDN links so the browser can download the slicer engine
 * without needing the messy files in your /public folder.
 */
export async function getSlicedWeight(file: File, printerType: PrinterType): Promise<number> {
  try {
    // We provide the command AND the direct links to the engine/worker
    const slicer = new CuraWASM({
      command: "slice",
      engine: "https://unpkg.com/cura-wasm-definitions@1.1.0/dist/cura-engine.wasm",
      worker: "https://unpkg.com/cura-wasm@2.2.0/dist/worker.js"
    } as any);
    
    const profile = PRINTER_PROFILES[printerType];
    const arrayBuffer = await file.arrayBuffer();
    
    // Run the slice and cast to 'any' to avoid TypeScript property errors
    const result = await slicer.slice(arrayBuffer, profile as any) as any;
    
    if (!result || !result.gcode) {
      console.error("Slicer returned no G-code.");
      return 0;
    }

    const gcodeString = new TextDecoder().decode(result.gcode);
    
    // Look for the filament weight line in the G-code comments
    const weightMatch = gcodeString.match(/filament used \[g\]: ([\d.]+)/);
    return weightMatch ? parseFloat(weightMatch[1]) : 0;
  } catch (error) {
    console.error("Slicing engine failure:", error);
    return 0;
  }
}

export function calculateCost(printer: PrinterType, filament: FilamentType, weightGrams: number): number {
  const materialCost = weightGrams * FILAMENT_GRAM_COST[filament];
  const printerFee = PRINTER_FEES[printer];
  return roundPrice(BASE_COST + materialCost + printerFee);
}
