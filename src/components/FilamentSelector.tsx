import { FilamentType, FILAMENTS } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { Circle } from 'lucide-react';

interface FilamentSelectorProps {
  selected: FilamentType | null;
  onSelect: (f: FilamentType) => void;
}

export function FilamentSelector({ selected, onSelect }: FilamentSelectorProps) {
  return (
    <div className="flex gap-3">
      {(Object.keys(FILAMENTS) as FilamentType[]).map((key) => {
        const filament = FILAMENTS[key];
        const isSelected = selected === key;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={cn(
              'flex-1 flex items-center gap-3 rounded-lg border p-4 transition-all duration-200',
              isSelected
                ? 'border-primary bg-primary/5 glow-primary'
                : 'border-border bg-card hover:border-muted-foreground/30'
            )}
          >
            <Circle className={cn(
              'h-4 w-4',
              isSelected ? 'text-primary fill-primary' : 'text-muted-foreground'
            )} />
            <div>
              <span className={cn(
                'font-semibold text-sm',
                isSelected ? 'text-primary' : 'text-foreground'
              )}>{filament.name}</span>
              <p className="text-xs text-muted-foreground">{filament.color}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
