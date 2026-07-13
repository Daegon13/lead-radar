import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { runProspecting, type ProspectRunSummary } from "../src/lib/prospecting/run-prospecting-job";
import { getEnabledProspectingJobs, jobToRunOptions, type ProspectingJobDefinition } from "../src/lib/prospecting/jobs/registry";
import { PROSPECTING_RUNTIME_LIMITS, clampPositiveInteger, compactList, isRemoteProviderId } from "../src/lib/prospecting/runtime-guards";
import type { Priority } from "../src/types/lead";

type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
type Args = { day?: Weekday; all: boolean; confirmAll: boolean; dryRun: boolean; maxJobs: number; only?: string; skipRemote: boolean; concurrency: number; timeoutMs: number; verbose: boolean };

const WEEKDAYS: Weekday[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const PRIORITIES: Priority[] = ["A", "B", "C", "D"];

function usage(): never {
  console.error("Uso: npm run prospect:schedule -- [--day monday|...] [--all --confirmAll true] [--dryRun] [--maxJobs 3] [--only jobId] [--skipRemote true] [--concurrency 1] [--timeoutMs 30000] [--verbose]");
  process.exit(1);
}
function readBool(argv: string[], index: number): { value: boolean; next: number } {
  const next = argv[index + 1];
  if (next === "true" || next === "false") return { value: next === "true", next: index + 1 };
  return { value: true, next: index };
}
function parseArgs(argv: string[]): Args {
  const parsed: Args = { all: false, confirmAll: false, dryRun: false, maxJobs: PROSPECTING_RUNTIME_LIMITS.defaultScheduleMaxJobs, skipRemote: false, concurrency: PROSPECTING_RUNTIME_LIMITS.defaultScheduleConcurrency, timeoutMs: PROSPECTING_RUNTIME_LIMITS.defaultJobTimeoutMs, verbose: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--all") { parsed.all = true; continue; }
    if (["--confirmAll", "--dryRun", "--skipRemote", "--verbose"].includes(arg)) { const b = readBool(argv, index); (parsed as unknown as Record<string, boolean>)[arg.slice(2)] = b.value; index = b.next; continue; }
    if (["--maxJobs", "--concurrency", "--timeoutMs", "--only", "--day", "--config"].includes(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) usage();
      if (arg === "--config") { index += 1; continue; }
      if (arg === "--only") parsed.only = value;
      if (arg === "--maxJobs") parsed.maxJobs = clampPositiveInteger(value, PROSPECTING_RUNTIME_LIMITS.defaultScheduleMaxJobs, 100);
      if (arg === "--concurrency") parsed.concurrency = clampPositiveInteger(value, PROSPECTING_RUNTIME_LIMITS.defaultScheduleConcurrency, 4);
      if (arg === "--timeoutMs") parsed.timeoutMs = clampPositiveInteger(value, PROSPECTING_RUNTIME_LIMITS.defaultJobTimeoutMs, PROSPECTING_RUNTIME_LIMITS.maxJobTimeoutMs);
      if (arg === "--day") { if (!WEEKDAYS.includes(value as Weekday)) usage(); parsed.day = value as Weekday; }
      index += 1; continue;
    }
    usage();
  }
  return parsed;
}
function todayWeekday(): Weekday { return WEEKDAYS[new Date().getDay()]; }
function dateStamp(): string { return new Date().toISOString().slice(0, 10); }
function jobDay(job: ProspectingJobDefinition): Weekday | undefined { return job.day && WEEKDAYS.includes(job.day as Weekday) ? (job.day as Weekday) : undefined; }
function jobHasRemote(job: ProspectingJobDefinition): boolean { return job.sources.some((source) => isRemoteProviderId(source.id ?? source.type ?? job.provider)); }
function renderReport(input: { runDate: string; job: ProspectingJobDefinition; summary: ProspectRunSummary }): string {
  const { job, summary } = input; const warnings = compactList(summary.warnings); const errors = compactList(summary.errors);
  return `# Resumen de corrida prospecting schedule\n\n- Fecha: ${input.runDate}\n- Job: ${job.label} (${job.id})\n- Tipo de fuente: ${job.sourceType}\n- Total leídos: ${summary.recordsRead}\n- Exportados: ${summary.exported}\n- Prioridad A/B/C/D: ${summary.priorityCounts.A}/${summary.priorityCounts.B}/${summary.priorityCounts.C}/${summary.priorityCounts.D}\n- JSON exportado: ${summary.jsonPath}\n- CSV exportado: ${summary.csvPath}\n- Run summary: ${summary.runSummaryPath}\n\n## Warnings\n${warnings.visible.length ? warnings.visible.map((w) => `- ${w}`).join("\n") : "- Sin warnings"}${warnings.hidden ? `\n- ... ${warnings.hidden} warnings adicionales omitidos` : ""}\n\n## Errores parciales\n${errors.visible.length ? errors.visible.map((e) => `- ${e}`).join("\n") : "- Sin errores parciales"}${errors.hidden ? `\n- ... ${errors.hidden} errores adicionales omitidos` : ""}\n`;
}
async function runOne(job: ProspectingJobDefinition, args: Args, runDate: string) {
  const options = jobToRunOptions(job); const outDir = path.join(options.out, runDate);
  if (args.dryRun) { console.log(`[dryRun] ${job.id}: remote=${jobHasRemote(job)} out=${outDir}`); return null; }
  let summary: ProspectRunSummary;
  try {
    summary = await runProspecting({ ...options, out: outDir, skipRemote: args.skipRemote, timeoutMs: args.timeoutMs });
  } catch (error) {
    await mkdir(outDir, { recursive: true });
    const message = error instanceof Error ? error.message : "job_failed_unknown";
    await writeFile(path.join(outDir, "run-summary.json"), `${JSON.stringify({ job: { id: job.id, label: job.label }, status: message.includes("job_failed_timeout") ? "job_failed_timeout" : "job_failed", errors: [message], runStartedAt: new Date().toISOString(), runFinishedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
    console.error(`${job.label}: ${message}. Se continúa con el siguiente job.`);
    return null;
  }
  await mkdir(outDir, { recursive: true }); await writeFile(path.join(outDir, "lead-radar-prospects.report.md"), renderReport({ runDate, job, summary }), "utf8");
  console.log(`${job.label}: status=${summary.errors.length ? "warnings/errors" : "ok"}, leídos=${summary.recordsRead}, exportados=${summary.exported}, A/B/C/D=${summary.priorityCounts.A}/${summary.priorityCounts.B}/${summary.priorityCounts.C}/${summary.priorityCounts.D}`);
  if (args.verbose) for (const warning of compactList(summary.warnings).visible) console.log(`  warning: ${warning}`);
  return summary;
}
async function main() {
  const args = parseArgs(process.argv.slice(2)); const runDate = dateStamp(); const selectedDay = args.day ?? todayWeekday();
  if (args.all && !args.confirmAll) throw new Error("Guardrail: --all requiere --confirmAll true. Usá --dryRun primero o --maxJobs/--only para corridas acotadas.");
  let jobs = getEnabledProspectingJobs().filter((job) => args.only ? job.id === args.only : args.all ? true : jobDay(job) === selectedDay);
  if (!args.all && !args.only && jobs.length > args.maxJobs) jobs = jobs.slice(0, args.maxJobs);
  if (args.only && jobs.length === 0) throw new Error(`No existe job habilitado: ${args.only}`);
  if (jobs.length === 0) { console.log(`No hay jobs habilitados para ${selectedDay}.`); return; }
  console.log(`Prospecting schedule seguro: jobs=${jobs.length}, dryRun=${args.dryRun}, skipRemote=${args.skipRemote}, concurrency=${args.concurrency}, timeoutMs=${args.timeoutMs}`);
  const aggregate: Record<Priority, number> = { A: 0, B: 0, C: 0, D: 0 }; let totalFound = 0; let totalDiscarded = 0; let totalDuplicates = 0;
  for (const job of jobs) {
    const summary = await runOne(job, args, runDate); if (!summary) continue;
    for (const priority of PRIORITIES) aggregate[priority] += summary.priorityCounts[priority]; totalFound += summary.filtered; totalDiscarded += summary.discarded; totalDuplicates += summary.duplicateCount;
  }
  console.log(`Resumen agenda: jobs=${jobs.length}, encontrados=${totalFound}, descartados=${totalDiscarded}, duplicados=${totalDuplicates}, A/B/C/D=${aggregate.A}/${aggregate.B}/${aggregate.C}/${aggregate.D}`);
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
