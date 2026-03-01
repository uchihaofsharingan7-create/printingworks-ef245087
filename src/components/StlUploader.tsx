import { useCallback, useState, useEffect } from 'react';
import { Upload, FileBox, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseSTL } from '@/lib/stl-parser';
import { PrinterType, FilamentType, calculateCost, getSlicedWeight } from '@/lib/pricing';

interface StlUploaderProps {
  printer: PrinterType | null;
  filament: FilamentType | null;
  onEstimate: (timeMinutes: number, grams: number) => void;
}

export function StlUploader({ printer, filament, onEstimate }: StlUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSlicing, setIsSlicing] = useState(false);
  const [stats, setStats] = useState<{ volume: number; triangles: number; grams: number; time: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (f: File) => {
    if (!f.name.toLowerCase().endsWith('.stl')) {
      setError('Please upload an STL file');
      return;
    }
    if (!printer) {
      setError('Please select a printer first');
      return;
    }

    setError(null);
    setFile(f);
    setIsSlicing(true);

    try {
      // 1. Get basic geometry (Volume/Triangles)
      const buffer = await f.arrayBuffer();
      const { volume, triangleCount } = parseSTL(buffer);

      // 2. RUN THE REAL SLICER (This takes a moment)
      const realGrams = await getSlicedWeight(f, printer);
      
      // 3. Estimate time based on the real weight (approx 8 mins per gram)
      const estimatedTime = Math.round(realGrams * 8);

      setStats({ 
        volume, 
        triangles: triangleCount, 
        grams: realGrams, 
        time: estimatedTime 
      });
      
      onEstimate(estimatedTime, realGrams);
    } catch (err) {
      console.error(err);
      setError('Slicing failed. The file might be too complex or corrupt.');
      setFile(null);
      setStats(null);
    } finally {
      setIsSlicing(false);
    }
  }, [printer, onEstimate]);

  // If the user changes the printer/filament AFTER uploading, re-slice
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
                {isSlicing ? 'Slicing model...' : `${(file.size / 1024).toFixed(1)} KB`}
              </p>
            </div>
            {!isSlicing && (
              <button onClick={clear} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {stats && !isSlicing && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-md bg-secondary p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Volume</p>
                <p className="text-xs font-mono font-semibold text-foreground">{stats.volume.toFixed(1)} cm³</p>
              </div>
              <div className="rounded-md bg-secondary p-2 text-center border border-primary/20">
                <p className="text-[10px] text-primary/80 font-bold">Sliced Weight</p>
                <p className="text-xs font-mono font-semibold text-foreground">{stats.grams.toFixed(1)} g</p>
              </div>
              <div className="rounded-md bg-secondary p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Est. Time</p>
                <p className="text-xs font-mono font-semibold text-foreground">{stats.time} min</p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive font-medium bg-destructive/10 p-2 rounded">{error}</p>
      )}

      {cost !== null && !isSlicing && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center glow-primary transition-all animate-in fade-in zoom-in duration-300">
          <p className="text-xs text-muted-foreground mb-1">Final Calculated Cost</p>
          <p className="text-3xl font-bold font-mono text-primary glow-text">${cost.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
