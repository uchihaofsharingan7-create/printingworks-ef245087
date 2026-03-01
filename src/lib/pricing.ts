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
 * The Brain: Uses Cura-WASM to get exact grams from an STL file.
 * Fixed the 3 errors regarding: constructor arguments, profile types, and .match() availability.
 */
export async function getSlicedWeight(file: File, printerType: PrinterType): Promise<number> {
  try {
    // Fix 1: Pass an empty object to satisfy the required 'config' argument
    const slicer = new CuraWASM({});
    
    const profile = PRINTER_PROFILES[printerType];
    const arrayBuffer = await file.arrayBuffer();
    
    // Fix 2: Cast profile 'as any' to bypass strict string-only type checks
    const result = await slicer.slice(arrayBuffer, profile as any);

    // Fix 3: Result is an object; we must decode the ArrayBuffer 'gcode' into a string
    const gcodeString = new TextDecoder().decode(result.gcode);
    
    const weightMatch = gcodeString.match(/filament used \[g\]: ([\d.]+)/);
    return weightMatch ? parseFloat(weightMatch[1]) : 0;
  } catch (error) {
    console.error("Slicing engine error:", error);
    return 0;
  }
}

/**
 * The Accountant: $2 Base + (Grams * Material) + Machine Fee
 */
export function calculateCost(printer: PrinterType, filament: FilamentType, weightGrams: number): number {
  const materialCost = weightGrams * FILAMENT_GRAM_COST[filament];
  const printerFee = PRINTER_FEES[printer];
  
  const total = BASE_COST + materialCost + printerFee;
  return roundPrice(total);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}