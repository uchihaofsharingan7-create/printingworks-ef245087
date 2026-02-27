import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { PrinterType, FilamentType, calculateCost } from '@/lib/pricing';
import { addToQueue, QueueItem } from '@/lib/queue';
import { toast } from 'sonner';
import { User, FileCheck } from 'lucide-react';

interface OrderFormProps {
  printer: PrinterType | null;
  filament: FilamentType | null;
  timeMinutes: number;
  grams: number;
  onOrderPlaced: (item: QueueItem) => void;
}

export function OrderForm({ printer, filament, timeMinutes, grams, onOrderPlaced }: OrderFormProps) {
  const [fullName, setFullName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const cost = printer && filament && timeMinutes > 0 && grams > 0
    ? calculateCost(printer, filament, timeMinutes, grams)
    : null;

  const canSubmit = fullName.trim().length >= 2 && agreed && cost !== null;

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
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" /> Full Name
        </Label>
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Enter your full name"
          className="bg-secondary border-border text-foreground"
          maxLength={100}
        />
      </div>

      <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-3">
        <button
          onClick={() => setShowTerms(!showTerms)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <FileCheck className="h-3.5 w-3.5" />
          <span className="font-medium">Terms & Conditions</span>
          <span className="ml-auto text-[10px]">{showTerms ? '▲' : '▼'}</span>
        </button>

        {showTerms && (
          <div className="text-xs text-muted-foreground space-y-2 border-t border-border pt-3">
            <p>1. All prints must be collected in person from our facility.</p>
            <p>2. Payment of the estimated amount is required upon collection.</p>
            <p>3. Print times are estimates and may vary. Final cost is based on actual usage.</p>
            <p>4. We are not responsible for print failures due to model issues.</p>
            <p>5. Uncollected prints will be recycled after 7 days.</p>
            <p>6. By submitting, you agree to pay the stated price.</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Checkbox
            id="terms"
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
            className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer">
            I agree to the terms and conditions and will pay <span className="font-mono font-semibold text-primary">{cost ? `$${cost.toFixed(2)}` : 'the estimated amount'}</span>
          </label>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-30"
      >
        Submit Print Job
      </Button>

      <p className="text-[11px] text-muted-foreground text-center">
        ⚠ You must come and physically collect your print
      </p>
    </div>
  );
}
