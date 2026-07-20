/**
 * UPAS — Version Service
 * Phase 5D: Application version, build date, and git info
 * Pure service — no side effects, no UI dependencies
 */

export interface VersionInfo {
  /** Semantic version string, e.g. "1.0.0-RC1" */
  version: string;
  /** Release candidate label, e.g. "RC1" */
  releaseCandidate: string | null;
  /** ISO 8601 build timestamp */
  buildDate: string;
  /** Short git commit hash (available in dev/build) */
  gitCommit: string | null;
  /** Full application name */
  appName: string;
  /** Application name in Arabic */
  appNameAr: string;
}

const BUILD_DATE = new Date().toISOString().split('T')[0];

function getGitCommit(): string | null {
  try {
    // Vite exposes env vars prefixed with VITE_
    const env = (import.meta as Record<string, Record<string, string | undefined>>).env;
    return env?.VITE_GIT_COMMIT ?? null;
  } catch {
    return null;
  }
}

/** Returns current version information. */
export function getVersionInfo(): VersionInfo {
  return {
    version: '1.0.0-RC1',
    releaseCandidate: 'RC1',
    buildDate: BUILD_DATE,
    gitCommit: getGitCommit(),
    appName: 'UPAS — Underground Protective Analysis System',
    appNameAr: 'نظام تحليل المنشآت المحصنة تحت الأرض',
  };
}