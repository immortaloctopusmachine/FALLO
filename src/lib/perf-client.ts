type PerfMetaValue = string | number | boolean | null | undefined;
type PerfMeta = Record<string, PerfMetaValue>;

interface PerfSummary {
  samples: number;
  lastMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
}

const MAX_SAMPLES = 200;

declare global {
  interface Window {
    __falloPerfMetrics?: Record<string, number[]>;
  }
}

function percentile(sortedValues: number[], percentileValue: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const index = (sortedValues.length - 1) * percentileValue;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];

  const lowerValue = sortedValues[lower];
  const upperValue = sortedValues[upper];
  const weight = index - lower;
  return lowerValue + (upperValue - lowerValue) * weight;
}

function buildSummary(values: number[]): PerfSummary {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, value) => acc + value, 0);
  const lastMs = values[values.length - 1] ?? 0;

  return {
    samples: values.length,
    lastMs,
    avgMs: values.length > 0 ? sum / values.length : 0,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
  };
}

export function recordClientPerf(
  metricName: string,
  durationMs: number,
  meta?: PerfMeta
): PerfSummary | null {
  if (typeof window === 'undefined') return null;
  if (!Number.isFinite(durationMs) || durationMs < 0) return null;

  const store = (window.__falloPerfMetrics ||= {});
  const values = (store[metricName] ||= []);
  values.push(durationMs);
  if (values.length > MAX_SAMPLES) {
    values.splice(0, values.length - MAX_SAMPLES);
  }

  const summary = buildSummary(values);

  // Keep metrics in-memory for low-overhead client profiling.
  // Read summaries via getClientPerfSummary/getAllClientPerfSummaries.
  void meta;

  return summary;
}

export function getClientPerfSummary(metricName: string): PerfSummary | null {
  if (typeof window === 'undefined') return null;
  const values = window.__falloPerfMetrics?.[metricName];
  if (!values || values.length === 0) return null;
  return buildSummary(values);
}

export function getAllClientPerfSummaries(): Record<string, PerfSummary> {
  if (typeof window === 'undefined') return {};
  const store = window.__falloPerfMetrics || {};
  return Object.fromEntries(
    Object.entries(store).map(([metricName, values]) => [
      metricName,
      buildSummary(values),
    ])
  );
}
