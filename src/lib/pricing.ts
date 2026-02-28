// Fixed Rates: Time is now in dollars per minute (e.g., 0.01 = $0.60/hour)
const RATES: Record<PrinterType, { timeRate: Record<FilamentType, number>; gramRate: Record<FilamentType, number> }> = {
  adventure5m: {
    timeRate: { pla: 0.01, petg: 0.015 }, // Faster machine, slightly higher premium
    gramRate: { pla: 0.20, petg: 0.25 },
  },
  ender3pro: {
    timeRate: { pla: 0.005, petg: 0.008 }, // Cheaper per hour because it's slower
    gramRate: { pla: 0.20, petg: 0.25 },
  },
  adventure4: {
    timeRate: { pla: 0.008, petg: 0.01 },
    gramRate: { pla: 0.20, petg: 0.25 },
  },
};

export function calculateCost(
  printer: PrinterType,
  filament: FilamentType,
  volumeCm3: number, // Total plastic volume from Slicer
  timeMinutes: number // Total print time from Slicer
): number {
  const density = filament === 'pla' ? 1.24 : 1.27;
  
  // 1. Calculate actual weight
  const weightGrams = volumeCm3 * density;

  // 2. Get rates for this specific printer
  const rates = RATES[printer];
  
  // 3. Calculate components
  const materialCost = weightGrams * rates.gramRate[filament];
  const machineTimeCost = timeMinutes * rates.timeRate[filament];

  const total = materialCost + machineTimeCost;

  // 4. Rounding logic (Only round to whole dollars if over $0.70)
  return total >= 0.70 ? Math.round(total) : parseFloat(total.toFixed(2));
}
