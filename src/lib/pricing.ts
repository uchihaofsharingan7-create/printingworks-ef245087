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

// Base cost to cover electricity and setup
const BASE_COST = 2;

// Balanced rates to ensure the price hierarchy is logical
const RATES: Record<PrinterType, { timeRate: Record<FilamentType, number>; gramRate: Record<FilamentType, number> }> = {
  adventure5m: {
    timeRate: { pla: 0.02, petg: 0.025 }, // Premium: Fastest machine, highest cost per minute
    gramRate: { pla: 0.20, petg: 0.25 },
  },
  adventure4: {
    timeRate: { pla: 0.012, petg: 0.015 }, // Middle Ground: Balanced speed and cost
    gramRate: { pla: 0.20, petg: 0.25 },
  },
  ender3pro: {
    timeRate: { pla: 0.005, petg: 0.006 }, // Budget: Slowest machine, lowest cost per minute
    gramRate: { pla: 0.20, petg: 0.25 },
  },
};

export function roundPrice(price: number): number {
  // If the price is $0.70 or more, round to the nearest whole dollar
  if (price >= 0.70) {
    return Math.round(price);
  }
  // Otherwise, keep the exact decimals for very small test prints
  return
