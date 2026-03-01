import { useCallback, useState } from 'react';
import { Upload, FileBox, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseSTL, estimateGrams, estimateTimeMinutes } from '@/lib/stl-parser';
import { PrinterType, FilamentType, calculateCost } from '@/lib/pricing';

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

  const processFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith('.stl')) {
      setError('Please upload an STL file');
      return;
    }
    setError(null);
    setFile(f);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const { volume, triangleCount } = parseSTL(buffer);

        const grams = printer && filament ? estimateGrams(volume, filament) : estimateGrams(volume, 'pla');
        const time = printer ? estimateTimeMinutes(volume, printer) : estimateTimeMinutes(volume, 'ender3pro');

        setStats({ volume, triangles: triangleCount, grams, time });
        onEstimate(time, grams);
      } catch {
        setError('Could not parse STL file. Make sure it is a valid binary STL.');
        setFile(null);
        setStats(null);
      }
    };
    reader.readAsArrayBuffer(f);
  }, [printer, filament, onEstimate]);

  // Recalculate when printer/filament changes
  const recalc = useCallback(() => {
    if (!file || !printer || !filament) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const { volume, triangleCount } = parseSTL(buffer);
        const grams = estimateGrams(volume, filament);
        const time = estimateTimeMinutes(volume, printer);
        setStats({ volume, triangles: triangleCount, grams, time });
        onEstimate(time, grams);
      } catch {}
    };
    reader.readAsArrayBuffer(file);
  }, [file, printer, filament, onEstimate]);

  // Trigger recalc when printer/filament change and file exists
  useState(() => {
    if (file && printer && filament) recalc();
  });

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
              <FileBox className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={clear} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {stats && (
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
                <p className="text-xs font-mono font-semibold text-foreground">{stats.time} min</p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {cost !== null && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center glow-primary">
          <p className="text-xs text-muted-foreground mb-1">Estimated Cost</p>
          <p className="text-3xl font-bold font-mono text-primary glow-text">${cost.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
