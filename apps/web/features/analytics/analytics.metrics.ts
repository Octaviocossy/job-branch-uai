import type { ApplicationStatus, Conversion, ProfileRoi, SourceDistribution } from "@/models";

export interface FunnelBar {
  stage: ApplicationStatus;
  count: number;
  pct: number;
}

export interface SourceSlice {
  name: string;
  value: number;
}

export interface CvRoiBar {
  cvVersionId: string;
  label: string;
  applications: number;
  interviews: number;
  pct: number;
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function toFunnelBars(conversion: Conversion[]): FunnelBar[] {
  return conversion.map(({ stage, count, conversionRate }) => ({
    stage,
    count,
    pct: Math.round(conversionRate * 100),
  }));
}

export function conversionRateFor(conversion: Conversion[], stage: ApplicationStatus): number {
  return conversion.find((entry) => entry.stage === stage)?.conversionRate ?? 0;
}

export function toSourceSlices(sources: SourceDistribution[]): SourceSlice[] {
  return sources.map(({ source, count }) => ({ name: source, value: count }));
}

export function toCvRoiBars(roi: ProfileRoi[]): CvRoiBar[] {
  return [...roi]
    .sort((a, b) => b.roi - a.roi)
    .map(({ cvVersionId, applications, interviews, roi: rate }) => ({
      cvVersionId,
      label: `CV ${cvVersionId.slice(0, 8)}`,
      applications,
      interviews,
      pct: Math.round(rate * 100),
    }));
}
