import { useState, useMemo } from 'react';
import { PrinterType, FilamentType, calculateCost } from '@/lib/pricing';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Weight } from 'lucide-react';

interface PriceEstimatorProps {
  printer: PrinterType | null;
  filament: FilamentType | null;
  timeMinutes: number;
  grams: number;
  onTimeChange: (t: number) => void;
  onGramsChange: (g: number) => void;
}

export function PriceEstimator({ printer, filament, timeMinutes, grams, onTimeChange, onGramsChange }: PriceEstimatorProps) {
  const cost = useMemo(() => {
    if (!printer || !filament || timeMinutes <= 0 || grams <= 0) return null;
    return calculateCost(printer, filament, timeMinutes, grams);
  }, [printer, filament, timeMinutes, grams]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Print Time (minutes)
          </Label>
          <Input
            type="number"
            min={0}
            value={timeMinutes || ''}
            onChange={(e) => onTimeChange(Math.max(0, Number(e.target.value)))}
            placeholder="e.g. 120"
            className="bg-secondary border-border font-mono text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Weight className="h-3.5 w-3.5" /> Filament (grams)
          </Label>
          <Input
            type="number"
            min={0}
            value={grams || ''}
            onChange={(e) => onGramsChange(Math.max(0, Number(e.target.value)))}
            placeholder="e.g. 50"
            className="bg-secondary border-border font-mono text-foreground"
          />
        </div>
      </div>

      {cost !== null && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center glow-primary">
          <p className="text-xs text-muted-foreground mb-1">Estimated Cost</p>
          <p className="text-3xl font-bold font-mono text-primary glow-text">${cost.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
