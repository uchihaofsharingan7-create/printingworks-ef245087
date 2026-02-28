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

// Moved RATES up here so functions can access it
const RATES: Record<PrinterType, { timeRate: Record<FilamentType, number>; gramRate: Record<FilamentType, number> }> = {
  adventure5m: {
    timeRate: { pla: 0.009, petg: 0.009 },
    gramRate: { pla: 0.028, petg: 0.038 },
  },
  ender3pro: {
    timeRate: { pla: 0.00009, petg: 0.00009 },
    gramRate: { pla: 0.023, petg: 0.033 },
  },
  adventure4: {
    timeRate: { pla: 0.000005, petg: 0.000005 },
    gramRate: { pla: 0.025, petg: 0.035 },
  },
};

const BASE_COST = 2;

export function roundPrice(price: number): number {
  // If price is 0.70 or above, round to nearest whole number
  if (price >= 0.80) {
    return Math.round(price);
  }
  // Otherwise (less than 0.70), return the price unchanged
  return price;
}

export function estimateTimeMinutes(
  volumeCm3: number,
  printer: 'ender3pro' | 'adventure5m' | 'adventure4',
  infillPercent: number = 20,
  layerHeight: number = 0.2
): number {
  const printerProfiles = {
    ender3pro: { volumetricRate: 0.18, speedMultiplier: 1 },
    adventure4: { volumetricRate: 0.35, speedMultiplier: 1.2 },
    adventure5m: { volumetricRate: 0.95, speedMultiplier: 1.4 }
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

  const totalCost = BASE_COST + timeCost + gramCost;

  // Returning through the rounding function as requested
  return roundPrice(totalCost);
}
