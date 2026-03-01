import { CuraWASM } from 'cura-wasm';
import { ENDER3_PROFILE, ADVENTURE4_PROFILE, ADVENTURE5M_PROFILE } from './printer-profiles';

export async function getSlicedWeight(file: File, printerType: string): Promise<number> {
  // Fix 1: Added empty object {} to satisfy the required config argument
  const slicer = new CuraWASM({});

  let profile: any = ENDER3_PROFILE;
  if (printerType === 'adventure4') profile = ADVENTURE4_PROFILE;
  if (printerType === 'adventure5m') profile = ADVENTURE5M_PROFILE;

  // Converts the file to a buffer for the slicer
  const arrayBuffer = await file.arrayBuffer();
  
  // Fix 2: Cast profile 'as any' so the slicer accepts the custom printer settings
  const result = await slicer.slice(arrayBuffer, profile);

  // Fix 3: Decode the result.gcode (ArrayBuffer) into a string so we can use .match()
  const gcodeString = new TextDecoder().decode(result.gcode);

  // Extracts the weight from the G-code comments
  const weightRegex = /filament used \[g\]: ([\d.]+)/;
  const match = gcodeString.match(weightRegex);

  return match ? parseFloat(match[1]) : 0;
}