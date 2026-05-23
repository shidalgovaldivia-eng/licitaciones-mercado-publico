import "server-only";

export type EndpointPerformanceRecord = {
  endpoint: string;
  method: string;
  totalMs: number;
  mercadoPublicoMs?: number;
  supabaseReadMs?: number;
  supabaseWriteMs?: number;
  recordsProcessed?: number;
  recordsReturned?: number;
  externalCalls?: number;
  cacheHit?: boolean;
  status: number;
  createdAt: string;
};

type PerformanceGlobal = typeof globalThis & {
  __radarPerformanceRecords?: EndpointPerformanceRecord[];
};

const MAX_RECORDS = 200;

export function nowMs() {
  return performance.now();
}

export function elapsedMs(start: number) {
  return Math.round(performance.now() - start);
}

export function recordEndpointPerformance(record: EndpointPerformanceRecord) {
  const globalStore = globalThis as PerformanceGlobal;
  const records = globalStore.__radarPerformanceRecords ?? [];
  records.unshift(record);
  globalStore.__radarPerformanceRecords = records.slice(0, MAX_RECORDS);

  if (process.env.NODE_ENV === "development") {
    console.info("[perf]", record);
  }
}

export function getEndpointPerformanceRecords() {
  const globalStore = globalThis as PerformanceGlobal;
  return globalStore.__radarPerformanceRecords ?? [];
}
