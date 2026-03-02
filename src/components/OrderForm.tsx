import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrinterType, FilamentType, calculateCost } from '@/lib/pricing';
import { addToQueue, QueueItem } from '@/lib/queue';
import { toast } from 'sonner';

interface OrderFormProps {
  printer: PrinterType | null;
  filament: FilamentType | null;
  timeMinutes: number;
  grams: number;
  onOrderPlaced: (item: QueueItem) => void;
  isSlicing?: boolean; // New optional prop to disable button while slicing
}

export function OrderForm({ 
  printer, 
  filament, 
  timeMinutes, 
  grams, 
  onOrderPlaced,
  isSlicing = false // Default to false
}: OrderFormProps) {
  const [fullName, setFullName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const cost = printer && filament && grams > 0
    ? calculateCost(printer, filament, grams)
    : null;

  // Added !isSlicing to the submit check
  const canSubmit = fullName.trim().length >= 2 && agreed && cost !== null && !isSlicing;

  const handleSubmit = () => {
    if (!canSubmit || !printer || !filament) return;

    const item = addToQueue({
      name: fullName.trim(),
      printer,
      filament,
      timeMinutes,
      grams,
      cost: cost!,
    });

    onOrderPlaced(item);
    setFullName('');
    setAgreed(false);
    toast.success('Print job submitted!', {
      description: `Your print has been added to the queue. Total: $${cost!.toFixed(2)}. Please collect in person.`,
    });
  };

  return (
    <div className="space-y-4">
      {/* ... (Your existing Name Input and Terms section) ... */}

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-30"
      >
        {isSlicing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Calculating Cost...
          </>
        ) : (
          'Submit Print Job'
        )}
      </Button>

      <p className="text-[11px] text-muted-foreground text-center">
        ⚠ You must come and physically collect your print
      </p>
    </div>
  );
}
