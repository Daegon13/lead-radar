import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getEnabledProspectingJobs } from "./jobs/registry";
import { PROSPECTING_RUNTIME_LIMITS, clampPositiveInteger } from "./runtime-guards";
import type { AcquisitionSourceSummary } from "./run-prospecting-job";
import type { Lead, Priority } from "@/types/lead";

export type RunHistoryStatus = "success" | "empty_result" | "timeout" | "request_failed" | "skipped_source" | "invalid_source" | "partial_success";
export type ReviewLeadState = "approved" | "discarded" | "imported";

export type RunReviewState = {
  runId: string;
  approvedLeadIds: string[];
  discardedLeadIds: string[];
  importedLeadIds: string[];
  reviewedAt?: string;
  notes?: string;
};

export type RunHistoryEntry = {
  runId: string;
  jobId: string;
  jobLabel: string;
  runStartedAt?: string;
  runFinishedAt?: string;
  durationMs?: number;
  status: RunHistoryStatus;
  sources: Array<{ id: string; label: string; status: AcquisitionSourceSummary["status"] | "partial_success" }>;
  recordsRead: number;
  exported: number;
  duplicates: number;
  discarded: number;
  priorityCounts: Record<Priority, number>;
  warningsCount: number;
  errorsCount: number;
  jsonPath?: string;
  csvPath?: string;
  summaryPath: string;
  callableLeads?: number;
  callableRate?: number;
  contactabilityRate?: number;
  digitalGapRate?: number;
  skippedSourcesCount?: number;
  invalidSourcesCount?: number;
  reviewState?: RunReviewState;
};

export type RunHistoryDetail = RunHistoryEntry & {
  sourceSummaries: AcquisitionSourceSummary[];
  warnings: string[];
  errors: string[];
  leads: Lead[];
  safePaths: { jsonPath?: string; csvPath?: string; summaryPath: string; reviewStatePath: string };
};

type RawRunSummary = {
  job?: { outputName?: string; [key: string]: unknown };
  options?: { out?: string; outputName?: string; [key: string]: unknown };
  sources?: AcquisitionSourceSummary[];
  recordsRead?: number;
  totalRecordsRead?: number;
  duplicates?: number;
  totalDuplicates?: number;
  exported?: number;
  totalExported?: number;
  discarded?: number;
  priorityCounts?: Partial<Record<Priority, number>>;
  warnings?: string[];
  errors?: string[];
  jsonPath?: string;
  csvPath?: string;
  runStartedAt?: string;
  runFinishedAt?: string;
  durationMs?: number;
  callableLeads?: number; callableRate?: number; contactabilityRate?: number; digitalGapRate?: number; skippedSourcesCount?: number; invalidSourcesCount?: number;
};

const RUNS_ROOT = path.join(process.cwd(), "exports", "prospecting-schedule");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asPriorityCounts(value: unknown): Record<Priority, number> {
  const source = isRecord(value) ? value : {};
  return { A: Number(source.A ?? 0), B: Number(source.B ?? 0), C: Number(source.C ?? 0), D: Number(source.D ?? 0) };
}

function relativeSafePath(filePath?: string): string | undefined {
  if (!filePath) return undefined;
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(`${RUNS_ROOT}${path.sep}`) && resolved !== RUNS_ROOT) return undefined;
  return path.relative(process.cwd(), resolved);
}

function assertPathInsideRuns(filePath: string): string {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(`${RUNS_ROOT}${path.sep}`)) throw new Error("Unsafe run file path.");
  return resolved;
}

function deriveRunStatus(sources: AcquisitionSourceSummary[], exported: number, errors: string[]): RunHistoryStatus {
  if (sources.length === 0) return errors.length ? "request_failed" : exported > 0 ? "success" : "empty_result";
  const statuses = sources.map((source) => source.status);
  const hasSuccessLike = sources.some((source) => source.status === "success" && source.recordsAccepted > 0);
  const hasFailure = statuses.some((status) => status === "request_failed" || status === "timeout" || status === "invalid_source");
  if (hasSuccessLike && hasFailure) return "partial_success";
  if (statuses.every((status) => status === "timeout")) return "timeout";
  if (statuses.every((status) => status === "invalid_source")) return "invalid_source";
  if (statuses.every((status) => status === "skipped_source")) return "skipped_source";
  if (statuses.every((status) => status === "request_failed")) return "request_failed";
  if (exported === 0 || statuses.every((status) => status === "empty_result")) return "empty_result";
  return "success";
}

function idsFromSummaryPath(summaryPath: string): { runId: string; jobId: string } {
  const runDir = path.dirname(summaryPath);
  const leaf = path.basename(runDir);
  const parent = path.basename(path.dirname(runDir));
  if (/^\d{4}-\d{2}-\d{2}$/.test(leaf)) return { runId: `${parent}--${leaf}`, jobId: parent };
  return { runId: leaf, jobId: leaf };
}

function summaryPathFromRunId(runId: string): string {
  const [jobId, date] = runId.split("--");
  return date ? path.join(RUNS_ROOT, jobId, date, "run-summary.json") : path.join(RUNS_ROOT, jobId, "run-summary.json");
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function toEntry(summaryPath: string, summary: RawRunSummary, reviewState?: RunReviewState): RunHistoryEntry {
  const { runId, jobId } = idsFromSummaryPath(summaryPath);
  const job = getEnabledProspectingJobs().find((item) => item.id === jobId);
  const sources = summary.sources ?? [];
  const warnings = asStringArray(summary.warnings);
  const errors = asStringArray(summary.errors);
  const exported = Number(summary.totalExported ?? summary.exported ?? 0);
  return {
    runId,
    jobId,
    jobLabel: job?.label ?? jobId,
    runStartedAt: summary.runStartedAt,
    runFinishedAt: summary.runFinishedAt,
    durationMs: summary.durationMs,
    status: deriveRunStatus(sources, exported, errors),
    sources: sources.map((source) => ({ id: source.sourceId, label: source.sourceLabel, status: source.status })),
    recordsRead: Number(summary.totalRecordsRead ?? summary.recordsRead ?? 0),
    exported,
    duplicates: Number(summary.totalDuplicates ?? summary.duplicates ?? 0),
    discarded: Number(summary.discarded ?? 0),
    priorityCounts: asPriorityCounts(summary.priorityCounts),
    warningsCount: warnings.length + sources.reduce((total, source) => total + source.warnings.length, 0),
    errorsCount: errors.length + sources.reduce((total, source) => total + source.errors.length, 0),
    jsonPath: relativeSafePath(summary.jsonPath),
    csvPath: relativeSafePath(summary.csvPath),
    summaryPath: path.relative(process.cwd(), summaryPath),
    callableLeads: Number(summary.callableLeads ?? 0),
    callableRate: Number(summary.callableRate ?? 0),
    contactabilityRate: Number(summary.contactabilityRate ?? 0),
    digitalGapRate: Number(summary.digitalGapRate ?? 0),
    skippedSourcesCount: Number(summary.skippedSourcesCount ?? 0),
    invalidSourcesCount: Number(summary.invalidSourcesCount ?? 0),
    reviewState,
  };
}

async function findSummaryPaths(limit: number = PROSPECTING_RUNTIME_LIMITS.defaultRunHistoryLimit): Promise<string[]> {
  const jobDirs = await readdir(RUNS_ROOT, { withFileTypes: true }).catch(() => []);
  const paths: string[] = [];
  for (const jobDir of jobDirs.filter((entry) => entry.isDirectory())) {
    const directSummaryPath = path.join(RUNS_ROOT, jobDir.name, "run-summary.json");
    paths.push(directSummaryPath);
    if (paths.length >= limit) return paths;
    const children = await readdir(path.join(RUNS_ROOT, jobDir.name), { withFileTypes: true }).catch(() => []);
    for (const child of children.filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))) {
      paths.push(path.join(RUNS_ROOT, jobDir.name, child.name, "run-summary.json"));
      if (paths.length >= limit) return paths;
    }
  }
  return paths;
}

export async function listRunHistory(options: { limit?: number } = {}): Promise<RunHistoryEntry[]> {
  const limit = clampPositiveInteger(options.limit, PROSPECTING_RUNTIME_LIMITS.defaultRunHistoryLimit, PROSPECTING_RUNTIME_LIMITS.maxRunHistoryLimit);
  const summaryPaths = await findSummaryPaths(limit);
  const runs = await Promise.all(summaryPaths.map(async (summaryPath) => {
    const summary = await readJsonFile<RawRunSummary>(summaryPath);
    if (!summary) return null;
    const reviewState = (await readJsonFile<RunReviewState>(path.join(path.dirname(summaryPath), "review-state.json"))) ?? undefined;
    return toEntry(summaryPath, summary, reviewState);
  }));
  return runs.filter((run): run is RunHistoryEntry => Boolean(run)).sort((a, b) => Date.parse(b.runStartedAt ?? "") - Date.parse(a.runStartedAt ?? "")).slice(0, limit);
}

export async function getRunHistoryDetail(runId: string): Promise<RunHistoryDetail | null> {
  if (!/^[a-zA-Z0-9_-]+(?:--\d{4}-\d{2}-\d{2})?$/.test(runId)) return null;
  const summaryPath = assertPathInsideRuns(summaryPathFromRunId(runId));
  const summary = await readJsonFile<RawRunSummary>(summaryPath);
  if (!summary) return null;
  const reviewStatePath = path.join(path.dirname(summaryPath), "review-state.json");
  const reviewState = (await readJsonFile<RunReviewState>(reviewStatePath)) ?? undefined;
  const entry = toEntry(summaryPath, summary, reviewState);
  const jsonPath = summary.jsonPath ? assertPathInsideRuns(summary.jsonPath) : undefined;
  const leads = jsonPath ? ((await readJsonFile<unknown>(jsonPath)) as Lead[] | null) ?? [] : [];
  return {
    ...entry,
    sourceSummaries: summary.sources ?? [],
    warnings: asStringArray(summary.warnings),
    errors: asStringArray(summary.errors),
    leads: Array.isArray(leads) ? leads : [],
    safePaths: { jsonPath: entry.jsonPath, csvPath: entry.csvPath, summaryPath: entry.summaryPath, reviewStatePath: path.relative(process.cwd(), reviewStatePath) },
  };
}

export async function saveRunReviewState(runId: string, patch: Partial<RunReviewState>): Promise<RunReviewState> {
  if (!/^[a-zA-Z0-9_-]+(?:--\d{4}-\d{2}-\d{2})?$/.test(runId)) throw new Error("Invalid run id.");
  const summaryPath = assertPathInsideRuns(summaryPathFromRunId(runId));
  const reviewStatePath = path.join(path.dirname(summaryPath), "review-state.json");
  const current = (await readJsonFile<RunReviewState>(reviewStatePath)) ?? { runId, approvedLeadIds: [], discardedLeadIds: [], importedLeadIds: [] };
  const next: RunReviewState = {
    ...current,
    ...patch,
    runId,
    approvedLeadIds: patch.approvedLeadIds ?? current.approvedLeadIds,
    discardedLeadIds: patch.discardedLeadIds ?? current.discardedLeadIds,
    importedLeadIds: patch.importedLeadIds ?? current.importedLeadIds,
    reviewedAt: new Date().toISOString(),
  };
  await writeFile(reviewStatePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}
