import { PrinterType, PRINTERS } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { Printer } from 'lucide-react';

interface PrinterCardProps {
  type: PrinterType;
  selected: boolean;
  onSelect: () => void;
}

export function PrinterCard({ type, selected, onSelect }: PrinterCardProps) {
  const printer = PRINTERS[type];

  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative flex flex-col items-center gap-3 rounded-lg border p-6 text-left transition-all duration-200',
        selected
          ? 'border-primary bg-primary/5 glow-primary'
          : 'border-border bg-card hover:border-muted-foreground/30'
      )}
    >
      {selected && (
        <div className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-primary animate-pulse-glow" />
      )}
      <div className={cn(
        'rounded-lg p-3 transition-colors',
        selected ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
      )}>
        <Printer className="h-8 w-8" />
      </div>
      <div className="text-center">
        <h3 className={cn(
          'font-semibold text-sm',
          selected ? 'text-primary glow-text' : 'text-foreground'
        )}>{printer.name}</h3>
        <p className="text-xs text-muted-foreground mt-1">{printer.description}</p>
      </div>
    </button>
  );
}
