import { useState, useCallback } from 'react';
import { PrinterType, FilamentType, PRINTERS } from '@/lib/pricing';
import { getQueue, completeJob, QueueItem } from '@/lib/queue';
import { PrinterCard } from '@/components/PrinterCard';
import { FilamentSelector } from '@/components/FilamentSelector';
import { StlUploader } from '@/components/StlUploader';
import { OrderForm } from '@/components/OrderForm';
import { PrintQueue } from '@/components/PrintQueue';
import { Layers, ListOrdered } from 'lucide-react';

const Index = () => {
  const [printer, setPrinter] = useState<PrinterType | null>(null);
  const [filament, setFilament] = useState<FilamentType | null>(null);
  const [timeMinutes, setTimeMinutes] = useState(0);
  const [grams, setGrams] = useState(0);
  const [queue, setQueue] = useState<QueueItem[]>(getQueue());

  const handleEstimate = useCallback((time: number, g: number) => {
    setTimeMinutes(time);
    setGrams(g);
  }, []);

  const handleOrderPlaced = useCallback(() => {
    setQueue(getQueue());
    setPrinter(null);
    setFilament(null);
    setTimeMinutes(0);
    setGrams(0);
  }, []);

  const handleComplete = useCallback((id: string) => {
    completeJob(id);
    setQueue(getQueue());
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">PrintQueue</h1>
            <p className="text-[11px] text-muted-foreground">3D Printing Service</p>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            {/* Step 1: Printer */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary text-[11px] font-bold font-mono flex items-center justify-center">1</span>
                <h2 className="text-sm font-semibold text-foreground">Select Printer</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(Object.keys(PRINTERS) as PrinterType[]).map((key) => (
                  <PrinterCard key={key} type={key} selected={printer === key} onSelect={() => setPrinter(key)} />
                ))}
              </div>
            </section>

            {/* Step 2: Filament */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary text-[11px] font-bold font-mono flex items-center justify-center">2</span>
                <h2 className="text-sm font-semibold text-foreground">Choose Filament</h2>
              </div>
              <FilamentSelector selected={filament} onSelect={setFilament} />
            </section>

            {/* Step 3: Upload STL */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary text-[11px] font-bold font-mono flex items-center justify-center">3</span>
                <h2 className="text-sm font-semibold text-foreground">Upload STL File</h2>
              </div>
              <StlUploader printer={printer} filament={filament} onEstimate={handleEstimate} />
            </section>

            {/* Step 4: Submit */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary text-[11px] font-bold font-mono flex items-center justify-center">4</span>
                <h2 className="text-sm font-semibold text-foreground">Your Information</h2>
              </div>
              <OrderForm printer={printer} filament={filament} timeMinutes={timeMinutes} grams={grams} onOrderPlaced={handleOrderPlaced} />
            </section>
          </div>

          {/* Right: Queue */}
          <div className="lg:col-span-2">
            <div className="sticky top-20 space-y-3">
              <div className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Print Queue</h2>
                <span className="ml-auto text-[11px] font-mono text-muted-foreground">{queue.length} jobs</span>
              </div>
              <PrintQueue queue={queue} onComplete={handleComplete} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
