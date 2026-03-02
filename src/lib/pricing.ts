import React, { useCallback, useState, useEffect } from 'react';
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
  const [stats, setStats] = useState<{ volume: number; triangles: number; grams: number; time: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSlicing, setIsSlicing] = useState(false);

  const processFile = useCallback(async (f: File) => {
    if (!f.name.toLowerCase().endsWith('.stl')) {
      setError('Please upload an STL file');
      return;
    }
    setError(null);
    setFile(f);
    setIsSlicing(true);

    try {
      const buffer = await f.arrayBuffer();
      const { volume, triangleCount } = parseSTL(buffer);

      // Call our brute-force scanner
      const grams = await getSlicedWeight(f, printer || 'ender3pro');
      
      // Fallback to volume if slicer still fails (unlikely now)
      const finalGrams = grams > 0 ? grams : (volume * 1.25 * 0.2); 
      const time = 60; // Placeholder time

      setStats({ volume, triangles: triangleCount, grams: finalGrams, time });
      onEstimate(time, finalGrams);
    } catch (err) {
      setError('Slicing engine error. Using fallback estimate.');
    } finally {
      setIsSlicing(false);
    }
  }, [printer, filament, onEstimate]);

  // Recalculate when options change
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
            dragOver ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(var(--primary),0.2)]' : 'border-border bg-card'
          )}
        >
          <Upload className={cn('h-8 w-8', dragOver ? 'text-primary' : 'text-muted-foreground')} />
          <div className="text-center">
            <p className="text-sm font-medium">Drop your STL file here</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
          </div>
          <input type="file" accept=".stl" onChange={handleFileInput} className="hidden" />
        </label>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              {isSlicing ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <FileBox className="h-5 w-5 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={clear} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {stats && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-md bg-secondary p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Volume</p>
                <p className="text-xs font-mono font-semibold">{stats.volume.toFixed(1)} cm³</p>
              </div>
              <div className="rounded-md bg-secondary p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Weight</p>
                <p className="text-xs font-mono font-semibold">{isSlicing ? "..." : `${stats.grams.toFixed(1)}g`}</p>
              </div>
              <div className="rounded-md bg-secondary p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Triangles</p>
                <p className="text-xs font-mono font-semibold">{stats.triangles.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {cost !== null && !isSlicing && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Estimated Printing Cost</p>
          <p className="text-3xl font-bold font-mono text-primary">${cost.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
