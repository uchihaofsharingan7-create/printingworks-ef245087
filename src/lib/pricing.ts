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
 * CORE SLICER ENGINE
 * Uses JSDelivr for high-speed, reliable loading of the WASM brain.
 */
export async function getSlicedWeight(file: File, printerType: PrinterType): Promise<number> {
  console.log("🛠️ Slicer: Starting process for", file.name);
  
  try {
    // We use 'as any' to bypass strict Type checking that causes red lines
    const slicer = new CuraWASM({
      command: "slice",
      // Using a different CDN (JSDelivr) which is often more stable for Workers
      engine: "https://cdn.jsdelivr.net/npm/cura-wasm-definitions@1.1.0/dist/cura-engine.wasm",
      worker: "https://cdn.jsdelivr.net/npm/cura-wasm@2.2.0/dist/worker.js"
    } as any);
    
    const profile = PRINTER_PROFILES[printerType];
    if (!profile) {
      alert("Please select a printer first!");
      return 0;
    }

    const arrayBuffer = await file.arrayBuffer();
    
    // Check if the file actually loaded into memory
    if (arrayBuffer.byteLength === 0) {
      throw new Error("File is empty or could not be read.");
    }

    // This is where the magic happens. We wait for the WASM engine to slice.
    const result = await (slicer as any).slice(arrayBuffer, profile) as any;
    
    if (!result || !result.gcode) {
      throw new Error("Slicer completed but failed to generate G-code.");
    }

    // Convert the binary result into a string so we can search it
    const gcodeString = new TextDecoder().decode(result.gcode);
    
    // Look for the weight comment line: "filament used [g]: 15.5"
    const weightMatch = gcodeString.match(/filament used \[g\]: ([\d.]+)/);
    
    if (weightMatch) {
      const grams = parseFloat(weightMatch[1]);
      console.log("✅ Success! Weight:", grams, "g");
      return grams;
    }
    
    console.warn("⚠️ Weight not found in G-code. Check printer settings.");
    return 0;

  } catch (error: any) {
    // If it fails, we want to know EXACTLY why.
    console.error("🚨 Slicer Crash:", error);
    
    // If you see this alert, tell me the message!
    if (error.message.includes("SharedArrayBuffer")) {
      alert("Security Error: Your browser is blocking the slicer's memory. Try a different browser or check site settings.");
    } else {
      alert("Slicer Error: " + error.message);
    }
    
    return 0;
  }
}

export function calculateCost(printer: PrinterType, filament: FilamentType, weightGrams: number): number {
  const materialCost = weightGrams * FILAMENT_GRAM_COST[filament];
  const printerFee = PRINTER_FEES[printer];
  return roundPrice(BASE_COST + materialCost + printerFee);
}
