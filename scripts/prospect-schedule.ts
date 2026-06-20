import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { runProspecting, type ProspectRunSummary } from "../src/lib/prospecting/run-prospecting-job";
import { getEnabledProspectingJobs, jobToRunOptions, type ProspectingJobDefinition } from "../src/lib/prospecting/jobs/registry";
import type { Priority } from "../src/types/lead";

type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

const WEEKDAYS: Weekday[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const PRIORITIES: Priority[] = ["A", "B", "C", "D"];

function usage(): never {
  console.error("Uso: npm run prospect:schedule -- [--day monday|tuesday|...] [--all]");
  process.exit(1);
}

function parseArgs(argv: string[]): { day?: Weekday; all: boolean } {
  const parsed = { day: undefined as Weekday | undefined, all: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--all") {
      parsed.all = true;
      continue;
    }
    if (arg === "--config") {
      index += 1; // Kept as a no-op for backward CLI compatibility; registry is canonical.
      continue;
    }
    if (arg !== "--day") usage();
    const value = argv[index + 1];
    if (!value || value.startsWith("--") || !WEEKDAYS.includes(value as Weekday)) usage();
    parsed.day = value as Weekday;
    index += 1;
  }
  return parsed;
}

function todayWeekday(): Weekday {
  return WEEKDAYS[new Date().getDay()];
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function jobDay(job: ProspectingJobDefinition): Weekday | undefined {
  return job.day && WEEKDAYS.includes(job.day as Weekday) ? (job.day as Weekday) : undefined;
}

function renderReport(input: { runDate: string; job: ProspectingJobDefinition; summary: ProspectRunSummary }): string {
  const { job, summary } = input;
  return `# Resumen de corrida prospecting schedule\n\n- Fecha: ${input.runDate}\n- Job: ${job.label} (${job.id})\n- Día configurado: ${job.day ?? "sin día"}\n- Rubros: ${job.categories.join(", ")}\n- Zona: ${[job.city, job.country].filter(Boolean).join(", ") || "Sin filtro"}\n- Tipo de fuente: ${job.sourceType}\n- Fuentes: ${job.sources.map((source) => source.id ?? source.type ?? source.input ?? "local").join(", ")}\n- Total leídos: ${summary.recordsRead}\n- Normalizados: ${summary.normalized}\n- Descartados: ${summary.discarded}\n- Duplicados: ${summary.duplicateCount}\n- Exportados: ${summary.exported}\n- Prioridad A: ${summary.priorityCounts.A}\n- Prioridad B: ${summary.priorityCounts.B}\n- Prioridad C: ${summary.priorityCounts.C}\n- Prioridad D: ${summary.priorityCounts.D}\n- JSON exportado: ${summary.jsonPath}\n- CSV exportado: ${summary.csvPath}\n- Run summary: ${summary.runSummaryPath}\n\n## Warnings\n${summary.warnings.length ? summary.warnings.map((warning) => `- ${warning}`).join("\n") : "- Sin warnings"}\n\n## Errores parciales\n${summary.errors.length ? summary.errors.map((error) => `- ${error}`).join("\n") : "- Sin errores parciales"}\n\n## Límites de automatización\n\nEsta corrida solo genera archivos locales para revisión humana. No envía mensajes, no llama APIs pagas automáticamente y no automatiza contacto.\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const runDate = dateStamp();
  const selectedDay = args.day ?? todayWeekday();
  const jobs = getEnabledProspectingJobs().filter((job) => args.all || jobDay(job) === selectedDay);

  if (jobs.length === 0) {
    console.log(`No hay jobs habilitados para ${selectedDay}. No se exportaron archivos.`);
    return;
  }

  const aggregate: Record<Priority, number> = { A: 0, B: 0, C: 0, D: 0 };
  let totalFound = 0;
  let totalDiscarded = 0;
  let totalDuplicates = 0;

  for (const job of jobs) {
    const options = jobToRunOptions(job);
    const outDir = path.join(options.out, runDate);
    const summary = await runProspecting({ ...options, out: outDir });
    await mkdir(outDir, { recursive: true });
    const reportPath = path.join(outDir, "lead-radar-prospects.report.md");
    await writeFile(reportPath, renderReport({ runDate, job, summary }), "utf8");

    for (const priority of PRIORITIES) aggregate[priority] += summary.priorityCounts[priority];
    totalFound += summary.filtered;
    totalDiscarded += summary.discarded;
    totalDuplicates += summary.duplicateCount;

    console.log(`${job.label}: status=${summary.errors.length ? "warnings/errors" : "ok"}, encontrados=${summary.filtered}, descartados=${summary.discarded}, duplicados=${summary.duplicateCount}, exportados=${summary.exported}, A/B/C/D=${summary.priorityCounts.A}/${summary.priorityCounts.B}/${summary.priorityCounts.C}/${summary.priorityCounts.D}`);
    console.log(`Exportado: ${summary.jsonPath}`);
    console.log(`Run summary: ${summary.runSummaryPath}`);
  }

  console.log(`Resumen agenda: jobs=${jobs.length}, encontrados=${totalFound}, descartados=${totalDiscarded}, duplicados=${totalDuplicates}, A/B/C/D=${aggregate.A}/${aggregate.B}/${aggregate.C}/${aggregate.D}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
