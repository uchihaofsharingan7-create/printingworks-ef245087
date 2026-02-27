export type PrinterType = 'ender3pro' | 'adventure5m' | 'adventure4';
export type FilamentType = 'pla' | 'petg';

export const PRINTERS: Record<PrinterType, { name: string; description: string }> = {
  ender3pro: { name: 'Ender 3 Pro', description: 'Most Affordable · 220×220×250mm build volume' },
  adventure5m: { name: 'Adventure 5M Pro', description: 'High-speed printing · 220×220×220mm build volume' },
  adventure4: { name: 'Adventure 4 Pro', description: 'Industrial grade · 220×220×250mm build volume' },
};

export const FILAMENTS: Record<FilamentType, { name: string; color: string }> = {
  pla: { name: 'PLA', color: 'Standard, easy to print' },
  petg: { name: 'PETG', color: 'Strong, heat resistant' },
};

// Rates: [timeRate, gramRatePLA, gramRatePETG]
const RATES: Record<PrinterType, { timeRate: Record<FilamentType, number>; gramRate: Record<FilamentType, number> }> = {
  adventure5m: {
    timeRate: { pla: 0.014, petg: 0.014 },
    gramRate: { pla: 0.025, petg: 0.035 },
  },
  ender3pro: {
    timeRate: { pla: 0.009, petg: 0.009 },
    gramRate: { pla: 0.025, petg: 0.035 },
  },
  adventure4: {
    timeRate: { pla: 0.05, petg: 0.08 },
    gramRate: { pla: 0.025, petg: 0.035 },
  },
};

const BASE_COST = 2;

export function calculateCost(printer: PrinterType, filament: FilamentType, timeMinutes: number, grams: number): number {
  const rate = RATES[printer];
  const cost = (timeMinutes * rate.timeRate[filament]) + (grams * rate.gramRate[filament]) + BASE_COST;
  return Math.round(cost * 100) / 100;
}
