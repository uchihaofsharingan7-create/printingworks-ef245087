// 1. Added a flat $2 base cost to every order
const BASE_COST = 2;

// 2. Balanced Rates: 5M Pro is now the "Premium/Fast" option
const RATES: Record<PrinterType, { timeRate: Record<FilamentType, number>; gramRate: Record<FilamentType, number> }> = {
  adventure5m: {
    timeRate: { pla: 0.02, petg: 0.025 }, // $1.50/hr - High speed premium
    gramRate: { pla: 0.20, petg: 0.25 },
  },
  adventure4: {
    timeRate: { pla: 0.01, petg: 0.012 }, // $0.72/hr
    gramRate: { pla: 0.20, petg: 0.25 },
  },
  ender3pro: {
    timeRate: { pla: 0.005, petg: 0.007 }, // $0.42/hr - Economy/Slow
    gramRate: { pla: 0.20, petg: 0.25 },
  },
};

export function calculateCost(
  printer: PrinterType,
  filament: FilamentType,
  volumeCm3: number,
  infillPercent: number = 20,
  layerHeight: number = 0.2
): number {
  // Get time from your existing estimation function
  const timeMinutes = estimateTimeMinutes(volumeCm3, printer, infillPercent, layerHeight);
  
  // Calculate weight correctly: Volume * Density * (Infill as a decimal)
  const density = filament === 'pla' ? 1.24 : 1.27;
  const weightGrams = volumeCm3 * density * (infillPercent / 100);

  const rates = RATES[printer];
  
  // Calculate Costs
  const timeCost = timeMinutes * rates.timeRate[filament];
  const gramCost = weightGrams * rates.gramRate[filament];

  // Total = $2.00 + Time + Grams
  const totalCost = BASE_COST + timeCost + gramCost;

  return roundPrice(totalCost);
}
