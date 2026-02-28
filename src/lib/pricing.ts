export type PrinterType = 'ender3pro' | 'adventure5m' | 'adventure4';
export type FilamentType = 'pla' | 'petg';

export const PRINTERS: Record<PrinterType, { name: string; description: string }> = {
  ender3pro: { name: 'Ender 3 Pro', description: 'Most Affordable · 220×220×250mm build volume' },
  adventure5m: { name: 'Adventure 5M Pro', description: 'High-speed printing · 220×220×220mm build volume' },
  adventure4: { name: 'Adventure 4 Pro', description: 'Best Overall · 220×220×250mm build volume' },
};

// This export fixes the SyntaxError in your web app
export const FILAMENTS: Record<FilamentType, { name: string; color: string }> = {
  pla: { name: 'PLA', color: 'Standard, easy to print' },
  petg: { name: 'PETG', color: 'Strong, heat resistant' },
};

const BASE_COST = 2; // Flat $2 starting fee

const RATES: Record<PrinterType, { timeRate: Record<FilamentType, number>; gramRate: Record<FilamentType, number> }> = {
  // PREMIUM: Fast machine, high convenience fee
  adventure5m: {
    timeRate: { pla: 0.06, petg: 0.07 }, // ~$4.20/hr
    gramRate: { pla: 0.20, petg: 0.25 },
  },
  // MIDDLE GROUND: Moderate speed and cost
  adventure4: {
    timeRate: { pla: 0.03, petg: 0.035 }, // ~$2.10/hr
    gramRate: { pla: 0.20, petg: 0.25 },
  },
  // BUDGET: Slow machine, lowest cost to stay competitive
  ender3pro: {
    timeRate: { pla: 0.008, petg: 0.01 }, // ~$0.60/hr
    gramRate: { pla: 0.20, petg: 0.25 },
  },
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
  volumeCm3: number,
  infillPercent: number = 20,
  layerHeight: number = 0.2
): number {
  const timeMinutes = estimateTimeMinutes(volumeCm3, printer, infillPercent, layerHeight);
  const density = filament === 'pla' ? 1.24 : 1.27;
  const weightGrams = volumeCm3 * density * (infillPercent / 100);

  const rates = RATES[printer];
  const timeCost = timeMinutes * rates.timeRate[filament];
  const gramCost = weightGrams * rates.gramRate[filament];

  return roundPrice(BASE_COST + timeCost + gramCost);
}

