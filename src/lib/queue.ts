import { PrinterType, FilamentType, PRINTERS, FILAMENTS } from './pricing';

export interface QueueItem {
  id: string;
  name: string;
  printer: PrinterType;
  filament: FilamentType;
  timeMinutes: number;
  grams: number;
  cost: number;
  status: 'queued' | 'printing' | 'done';
  createdAt: Date;
}

// In-memory queue for demo purposes
let queue: QueueItem[] = [
  {
    id: '1',
    name: 'Alex M.',
    printer: 'adventure5m',
    filament: 'pla',
    timeMinutes: 120,
    grams: 45,
    cost: 4.81,
    status: 'printing',
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    id: '2',
    name: 'Jordan K.',
    printer: 'ender3pro',
    filament: 'petg',
    timeMinutes: 90,
    grams: 30,
    cost: 3.86,
    status: 'queued',
    createdAt: new Date(Date.now() - 1800000),
  },
];

let nextId = 3;

export function getQueue(): QueueItem[] {
  return [...queue];
}

export function addToQueue(item: Omit<QueueItem, 'id' | 'status' | 'createdAt'>): QueueItem {
  const newItem: QueueItem = {
    ...item,
    id: String(nextId++),
    status: queue.length === 0 ? 'printing' : 'queued',
    createdAt: new Date(),
  };
  queue.push(newItem);
  return newItem;
}

export function getPrinterLabel(printer: PrinterType) {
  return PRINTERS[printer].name;
}

export function getFilamentLabel(filament: FilamentType) {
  return FILAMENTS[filament].name;
}

export function completeJob(id: string): void {
  queue = queue.filter((item) => item.id !== id);
  // Promote next queued item to printing
  const nextQueued = queue.find((item) => item.status === 'queued');
  if (nextQueued && !queue.some((item) => item.status === 'printing')) {
    nextQueued.status = 'printing';
  }
}
