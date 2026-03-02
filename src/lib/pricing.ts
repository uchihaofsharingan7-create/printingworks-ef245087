import { CuraWASM } from 'cura-wasm';

export type PrinterType = 'ender3pro' | 'adventure5m' | 'adventure4';
export type FilamentType = 'pla' | 'petg';

/**
 * UI Constants for Selection
 */
export const PRINTERS: Record<PrinterType, { name: string; description: string }> = {
  ender3pro: { name: 'Ender 3 Pro', description: 'Affordable · 220x220x250mm' },
  adventure4: { name: 'Adventure 4 Pro', description: 'Best Overall · 220x220x250mm' },
  adventure5m: { name: 'Adventure 5M Pro', description: 'High-speed · 220x220x220mm' },
};

export const FILAMENTS: Record<FilamentType, { name: string; color: string }> = {
  pla: { name: 'PLA', color: 'Standard, easy to print' },
  petg: { name: 'PETG', color: 'Strong, heat resistant' },
};

/**
 * Pricing Logic Constants
 */
const BASE_COST = 2;
const FILAMENT_GRAM_COST = { pla: 0.25, petg: 0.35 };
const PRINTER_FEES = { ender3pro: 1, adventure4: 2, adventure5m: 3 };

/**
 * Slicer Profiles
 * These tell the WASM engine the physical limits and settings of your printers.
 */
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

/**
 * Utility to format the final price
 */
export function roundPrice(price: number): number {
  return price >= 0.70 ? Math.round(price) : parseFloat(price.toFixed(2));
}

/**
 * LOCAL MULTI-FILE SLICER ENGINE
 * * IMPORTANT: Requires the following files in /public/cura-wasm/:
 * - worker.js
 * - cura-engine.wasm
 */
export async function getSlicedWeight(file: File, printerType: PrinterType): Promise<number> {
  console.log("🏠 Initializing Local Slicer for:", file.name);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const profile = PRINTER_PROFILES[printerType];

    if (!profile) {
      console.error("❌ No printer profile selected.");
      return 0;
    }

    // Initialize the multi-file engine using local paths
    const slicer = new CuraWASM({
      command: "slice",
      engine: "/cura-wasm/cura-engine.wasm",
      worker: "/cura-wasm/worker.js"
    } as any);

    console.log("⏳ Slicing logic executing...");
    
    // We wrap this in a timeout promise to prevent the UI from freezing forever 
    // if the WASM worker crashes silently.
    const slicePromise = (slicer as any).slice(arrayBuffer, profile);
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Slicing timed out (20s)")), 20000)
    );

    const result = await Promise.race([slicePromise, timeout]) as any;

    if (!result || !result.gcode) {
      console.warn("⚠️ Slicer returned no G-code data.");
      return 0;
    }

    // Decode binary G-code to searchable text
    const gcodeString = new TextDecoder().decode(result.gcode);
    
    // Search for weight metadata in the G-code comments
    const weightMatch = gcodeString.match(/filament used \[g\]: ([\d.]+)/i) || 
                        gcodeString.match(/Filament used: ([\d.]+)g/i);

    if (weightMatch) {
      const grams = parseFloat(weightMatch[1]);
      console.log("✅ Weight Found:", grams, "g");
      return grams;
    }

    console.warn("⚠️ G-code parsed but weight metadata was missing.");
    return 0;

  } catch (error: any) {
    console.error("🚨 Local Slicer Error:", error);
    // This alert is vital for debugging the "0.0g" issue
    alert("Slicer Failed: " + (error.message || "Unknown Error"));
    return 0;
  }
}

/**
 * Final Calculation Logic
 */
export function calculateCost(printer: PrinterType, filament: FilamentType, weightGrams: number): number {
  if (weightGrams <= 0) return 3.00; // Base minimum cost if weight fails
  
  const materialCost = weightGrams * FILAMENT_GRAM_COST[filament];
  const printerFee = PRINTER_FEES[printer];
  return roundPrice(BASE_COST + materialCost + printerFee);
}
