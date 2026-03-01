export type PrinterType = 'ender3pro' | 'adventure5m' | 'adventure4';
export type FilamentType = 'pla' | 'petg';

export const PRINTERS: Record<PrinterType, { name: string; description: string }> = {
  ender3pro: { name: 'Ender 3 Pro', description: 'Most Affordable · 220×220×250mm build volume' },
  adventure5m: { name: 'Adventure 5M Pro', description: 'High-speed printing · 220×220×220mm build volume' },
  adventure4: { name: 'Adventure 4 Pro', description: 'Best Overall · 220×220×250mm build volume' },
};

export const FILAMENTS: Record<FilamentType, { name: string; color: string }> = {
  pla: { name: 'PLA', color: 'Standard, easy to print' },
  petg: { name: 'PETG', color: 'Strong, heat resistant' },
};

const BASE_COST = 2;

const FILAMENT_GRAM_COST: Record<FilamentType, number> = {
  pla: 0.25,  // Your requested price
  petg: 0.35, // Your requested price
};

const PRINTER_FEES: Record<PrinterType, number> = {
  ender3pro: 1,   // Your requested $1
  adventure4: 2,  // Your requested $2
  adventure5m: 3, // Your requested $3
};

export function roundPrice(price: number): number {
  return price >= 0.70 ? Math.round(price) : parseFloat(price.toFixed(2));
}

export function estimateTimeMinutes(
  volumeCm3: number,
  printer: PrinterType,
  infillPercent: number = 20,
  layerHeight: number = 0.2
): number {
  const printerProfiles = {
    ender3pro: { volumetricRate: 0.18, speedMultiplier: 1 },
    adventure4: { volumetricRate: 0.35, speedMultiplier: 1 },
    adventure5m: { volumetricRate: 0.95, speedMultiplier: 1.2 }
  };
  const profile = printerProfiles[printer] || printerProfiles.ender3pro;
  const infillFactor = 0.6 + (infillPercent / 100);
  const layerFactor = 0.2 / layerHeight;
  const adjustedRate = profile.volumetricRate * profile.speedMultiplier;
  const estimated = (volumeCm3 / adjustedRate) * infillFactor * layerFactor;
  return Math.max(5, Math.round(estimated));
}

export function calculateCost(
  printer: PrinterType,
  filament: FilamentType,
  weightGrams: number
): number {
  const materialCost = weightGrams * FILAMENT_GRAM_COST[filament];
  const printerFee = PRINTER_FEES[printer];
  const totalCost = BASE_COST + materialCost + printerFee;
  return roundPrice(totalCost);
}
