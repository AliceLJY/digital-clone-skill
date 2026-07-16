/**
 * @deprecated Compatibility shim. Use assessCorpusReadiness from readiness.ts.
 */

import {
  assessCorpusReadiness,
  type CorpusReadinessReport,
} from "./readiness.js";

export type LegacyQualityLevel = "excellent" | "good" | "fair" | "insufficient";
export type QualityReport = CorpusReadinessReport & {
  overall: LegacyQualityLevel;
  /** @deprecated Compatibility-only placeholder; no contradiction analysis is performed. */
  consistency: { contradictions: string[] };
};

const LEGACY_LEVELS: Record<CorpusReadinessReport["readiness"], LegacyQualityLevel> = {
  high: "excellent",
  ready: "good",
  developing: "fair",
  insufficient: "insufficient",
};

/** @deprecated Use assessCorpusReadiness. The generated report uses corpus-readiness naming. */
export function assessQuality(workspaceDir: string): QualityReport {
  const report = assessCorpusReadiness(workspaceDir);
  return {
    ...report,
    overall: LEGACY_LEVELS[report.readiness],
    consistency: { contradictions: [] },
  };
}
