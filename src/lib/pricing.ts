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
 * FULLY INLINED SLICER ENGINE
 */
export async function getSlicedWeight(file: File, printerType: PrinterType): Promise<number> {
  console.log("🚀 Slicer engine ignition...");

  try {
    const arrayBuffer = await file.arrayBuffer();
    const profile = PRINTER_PROFILES[printerType];

    // Use a direct worker constructor to bypass CDN blocking issues
    const slicer = new CuraWASM({
      command: "slice",
      engine: "https://cdn.jsdelivr.net/npm/cura-wasm-definitions@1.1.0/dist/cura-engine.wasm",
      worker: new Worker(
        new URL("https://cdn.jsdelivr.net/npm/cura-wasm@2.2.0/dist/worker.js")
      )
    } as any);

    console.log("📡 Slicing in progress for", printerType, "...");
    
    // Perform slicing with a 20-second hard limit
    const resultPromise = (slicer as any).slice(arrayBuffer, profile);
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("The slicer took too long to respond.")), 20000)
    );

    const result = await Promise.race([resultPromise, timeout]) as any;

    if (!result || !result.gcode) {
      console.error("❌ Slicer returned nothing.");
      return 0;
    }

    const gcodeString = new TextDecoder().decode(result.gcode);
    
    // Pattern to find: ";Filament used: 15.5g" or "filament used [g]: 15.5"
    const weightMatch = gcodeString.match(/filament used \[g\]: ([\d.]+)/i) || 
                        gcodeString.match(/Filament used: ([\d.]+)g/i);

    if (weightMatch) {
      const grams = parseFloat(weightMatch[1]);
      console.log("✅ SUCCESS:", grams, "grams");
      return grams;
    }

    console.warn("⚠️ G-code generated but weight comment missing.");
    return 0;

  } catch (error: any) {
    console.error("🚨 Slicer Error:", error.message);
    alert("Slicer failed: " + error.message);
    return 0;
  }
}

export function calculateCost(printer: PrinterType, filament: FilamentType, weightGrams: number): number {
  const materialCost = weightGrams * FILAMENT_GRAM_COST[filament];
  const printerFee = PRINTER_FEES[printer];
  return roundPrice(BASE_COST + materialCost + printerFee);
}
