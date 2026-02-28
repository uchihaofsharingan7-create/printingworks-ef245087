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

const RATES: Record<PrinterType, { timeRate: Record<FilamentType, number>; gramRate: Record<FilamentType, number> }> = {
  adventure5m: {
    timeRate: { pla: 0.01, petg: 0.01 }, // $0.01 per minute
    gramRate: { pla: 0.20, petg: 0.25 }, 
  },
  ender3pro: {
    timeRate: { pla: 0.005, petg: 0.005 },
    gramRate: { pla: 0.20, petg: 0.25 },
  },
  adventure4: {
    timeRate: { pla: 0.008, petg: 0.008 },
    gramRate: { pla: 0.20, petg: 0.25 },
  },
};

const BASE_COST = 3; // Starting at $3 to help hit the $10 goal

export function roundPrice(price: number): number {
  if (price >= 0.80) {
    return Math.round(price);
  }
  return price;
}

export function estimateTimeMinutes(
  volumeCm3: number,
  printer: 'ender3pro' | 'adventure5m' | 'adventure4',
  infillPercent: number = 20,
  layerHeight: number = 0.2
): number {
  const printerProfiles = {
    ender3pro: { volumetricRate: 0.18, speedMultiplier: 1.3 },
    adventure4: { volumetricRate: 0.35, speedMultiplier: 1.4 },
    adventure5m: { volumetricRate: 0.95, speedMultiplier: 1.6 }
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
  
  // Logic to prevent time from making the price explode
  const timeCost = timeMinutes * rates.timeRate[filament];
  const gramCost = weightGrams * rates.gramRate[filament];

  const totalCost = BASE_COST + timeCost + gramCost;

  return roundPrice(totalCost);
}
