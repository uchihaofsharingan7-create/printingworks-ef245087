import { useCallback, useState, useEffect } from 'react';
import { Upload, FileBox, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseSTL } from '@/lib/stl-parser';
import { PrinterType, FilamentType, calculateCost, getSlicedWeight } from '@/lib/pricing';
import { Progress } from '@/components/ui/progress';

interface StlUploaderProps {
  printer: PrinterType | null;
  filament: FilamentType | null;
  onEstimate: (timeMinutes: number, grams: number) => void;
}

export function StlUploader({ printer, filament, onEstimate }: StlUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [stats, setStats] = useState<{ volume: number; grams: number; time: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSlicing, setIsSlicing] = useState(false);
  const [sliceProgress, setSliceProgress] = useState(0);

  const processFile = useCallback(async (f: File) => {
    if (!f.name.toLowerCase().endsWith('.stl')) {
      setError('Please upload an STL file');
      return;
    }
    setError(null);
    setFile(f);
    setIsSlicing(true);
    setSliceProgress(0);

    try {
      const buffer = await f.arrayBuffer();
      const { volume } = parseSTL(buffer);

      const result = await getSlicedWeight(f, printer || 'ender3pro', (pct) => {
        setSliceProgress(Math.round(pct * 100));
      });

      // Fallback: if slicer returns 0g, estimate from volume
      const finalGrams = result.grams > 0 ? result.grams : parseFloat((volume * 1.25 * 0.2).toFixed(1));
      const finalTime = result.timeMinutes > 0 ? result.timeMinutes : Math.max(1, Math.round(finalGrams * 1.2));

      setStats({ volume, grams: finalGrams, time: finalTime });
      onEstimate(finalTime, finalGrams);
    } catch (err) {
      console.error('Slicing failed:', err);
      setError('Could not process STL. Using fallback estimation.');
      // Volume-based fallback
      try {
        const buffer = await f.arrayBuffer();
        const { volume } = parseSTL(buffer);
        const fallbackGrams = parseFloat((volume * 1.25 * 0.2).toFixed(1));
        const fallbackTime = Math.max(1, Math.round(fallbackGrams * 1.2));
        setStats({ volume, grams: fallbackGrams, time: fallbackTime });
        onEstimate(fallbackTime, fallbackGrams);
      } catch {}
    } finally {
      setIsSlicing(false);
      setSliceProgress(100);
    }
  }, [printer, filament, onEstimate]);

  useEffect(() => {
    if (file && printer && filament) {
      processFile(file);
    }
  }, [printer, filament]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  }, [processFile]);

  const clear = () => {
    setFile(null);
    setStats(null);
    setError(null);
    setSliceProgress(0);
    onEstimate(0, 0);
  };

  const cost = printer && filament && stats
    ? calculateCost(printer, filament, stats.grams)
    : null;

  return (
    <div className="space-y-3">
      {!file ? (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-all duration-200',
            dragOver
              ? 'border-primary bg-primary/5 glow-primary'
              : 'border-border bg-card hover:border-muted-foreground/40'
          )}
        >
          <Upload className={cn('h-8 w-8', dragOver ? 'text-primary' : 'text-muted-foreground')} />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Drop your STL file here</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
          </div>
          <input type="file" accept=".stl" onChange={handleFileInput} className="hidden" />
        </label>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              {isSlicing ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <FileBox className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {isSlicing ? `Slicing... ${sliceProgress}%` : `${(file.size / 1024).toFixed(1)} KB`}
              </p>
            </div>
            <button onClick={clear} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {isSlicing && (
            <div className="mt-3">
              <Progress value={sliceProgress} className="h-2" />
            </div>
          )}

          {stats && !isSlicing && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-md bg-secondary p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Volume</p>
                <p className="text-xs font-mono font-semibold text-foreground">{stats.volume.toFixed(1)} cm³</p>
              </div>
              <div className="rounded-md bg-secondary p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Est. Weight</p>
                <p className="text-xs font-mono font-semibold text-foreground">{stats.grams.toFixed(1)} g</p>
              </div>
              <div className="rounded-md bg-secondary p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Est. Time</p>
                <p className="text-xs font-mono font-semibold text-foreground">
                  {stats.time >= 60 ? `${Math.floor(stats.time / 60)}h ${stats.time % 60}m` : `${stats.time} min`}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {cost !== null && !isSlicing && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center glow-primary">
          <p className="text-xs text-muted-foreground mb-1">Estimated Cost</p>
          <p className="text-3xl font-bold font-mono text-primary glow-text">${cost.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
