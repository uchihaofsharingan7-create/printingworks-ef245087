import React, { useState } from 'react';
import { Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { getSlicedWeight, PrinterType } from '../lib/pricing';

interface StlUploaderProps {
  onWeightChange: (weight: number) => void;
  selectedPrinter: PrinterType;
}

export const StlUploader = ({ onWeightChange, selectedPrinter }: StlUploaderProps) => {
  const [isSlicing, setIsSlicing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsSlicing(true);

    try {
      const weight = await getSlicedWeight(file, selectedPrinter);
      onWeightChange(weight);
    } catch (error) {
      console.error("UI Slice Error:", error);
    } finally {
      setIsSlicing(false);
    }
  };

  return (
    <div className="mt-6 p-6 border-2 border-dashed border-white/10 rounded-xl bg-white/5">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
        <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">3</span>
        Upload STL File
      </h3>

      <label className="flex flex-col items-center justify-center cursor-pointer group">
        <div className="flex flex-col items-center justify-center py-10">
          {isSlicing ? (
            <>
              <Loader2 className="w-12 h-12 mb-3 animate-spin text-emerald-500" />
              <p className="text-emerald-400">Processing G-Code...</p>
            </>
          ) : fileName ? (
            <>
              <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-500" />
              <p className="text-sm font-medium text-white">{fileName}</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 mb-3 text-gray-400 group-hover:text-emerald-400" />
              <p className="text-sm font-medium text-gray-300">Click to upload and slice</p>
            </>
          )}
        </div>
        <input type="file" className="hidden" accept=".stl" onChange={handleFileUpload} disabled={isSlicing} />
      </label>
    </div>
  );
};
