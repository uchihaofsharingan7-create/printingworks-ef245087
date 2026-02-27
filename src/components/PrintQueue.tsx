import { QueueItem, getPrinterLabel, getFilamentLabel } from '@/lib/queue';
import { cn } from '@/lib/utils';
import { Loader2, Clock, CheckCircle2 } from 'lucide-react';

interface PrintQueueProps {
  queue: QueueItem[];
}

export function PrintQueue({ queue }: PrintQueueProps) {
  if (queue.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground text-sm">No prints in queue</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {queue.map((item, i) => (
        <div
          key={item.id}
          className={cn(
            'flex items-center gap-4 rounded-lg border p-4 transition-all',
            item.status === 'printing'
              ? 'border-primary/40 bg-primary/5 glow-primary'
              : item.status === 'done'
              ? 'border-success/30 bg-success/5 opacity-60'
              : 'border-border bg-card'
          )}
        >
          <div className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold font-mono',
            item.status === 'printing'
              ? 'bg-primary/20 text-primary'
              : item.status === 'done'
              ? 'bg-success/20 text-success'
              : 'bg-secondary text-muted-foreground'
          )}>
            {item.status === 'printing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : item.status === 'done' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              i + 1
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground">
              {getPrinterLabel(item.printer)} · {getFilamentLabel(item.filament)} · {item.timeMinutes}min · {item.grams}g
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm font-mono font-semibold text-foreground">${item.cost.toFixed(2)}</p>
            <p className={cn(
              'text-xs font-medium',
              item.status === 'printing' ? 'text-primary' : item.status === 'done' ? 'text-success' : 'text-muted-foreground'
            )}>
              {item.status === 'printing' ? 'Printing' : item.status === 'done' ? 'Complete' : 'Queued'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
