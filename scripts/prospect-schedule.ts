import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { runProspecting, type Format, type Provider } from "./prospect";
import type { Priority } from "../src/types/lead";

type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

type ProspectingScheduleJob = {
  id: string;
  enabled?: boolean;
  day: Weekday;
  label: string;
  category: string;
  city?: string;
  country?: string;
  input: string;
  format: Format;
  provider?: Provider;
  limit?: number;
};

type ProspectingScheduleConfig = {
  timezone?: string;
  outputDir: string;
  runMode?: "today" | "all";
  jobs: ProspectingScheduleJob[];
};

const WEEKDAYS: Weekday[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const PRIORITIES: Priority[] = ["A", "B", "C", "D"];

function usage(): never {
  console.error("Uso: npm run prospect:schedule -- [--config prospecting.config.json] [--day monday|tuesday|...] [--all]");
  process.exit(1);
}

function parseArgs(argv: string[]): { configPath: string; day?: Weekday; all: boolean } {
  const parsed = { configPath: "prospecting.config.json", day: undefined as Weekday | undefined, all: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--all") {
      parsed.all = true;
      continue;
    }

    if (arg !== "--config" && arg !== "--day") usage();
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) usage();

    if (arg === "--config") parsed.configPath = value;
    if (arg === "--day") {
      if (!WEEKDAYS.includes(value as Weekday)) usage();
      parsed.day = value as Weekday;
    }
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

function slugify(value: string): string {
  return value
    .toLocaleLowerCase("es-UY")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "job";
}

function validateConfig(value: unknown): ProspectingScheduleConfig {
  if (typeof value !== "object" || value === null) throw new Error("prospecting.config.json debe ser un objeto JSON.");
  const config = value as Partial<ProspectingScheduleConfig>;
  if (typeof config.outputDir !== "string" || config.outputDir.trim() === "") throw new Error("Config inválida: outputDir es requerido.");
  if (!Array.isArray(config.jobs)) throw new Error("Config inválida: jobs debe ser un array.");

  for (const job of config.jobs) {
    if (!job || typeof job !== "object") throw new Error("Config inválida: cada job debe ser un objeto.");
    if (typeof job.id !== "string" || typeof job.day !== "string" || typeof job.label !== "string" || typeof job.category !== "string") {
      throw new Error("Config inválida: cada job requiere id, day, label y category.");
    }
    if (!WEEKDAYS.includes(job.day as Weekday)) throw new Error(`Config inválida: day no soportado en job ${job.id}.`);
    if (job.format !== "csv" && job.format !== "json") throw new Error(`Config inválida: format debe ser csv|json en job ${job.id}.`);
    const provider = job.provider ?? "generic";
    if (!["generic", "overture", "foursquare", "osm"].includes(provider)) throw new Error(`Config inválida: provider no soportado en job ${job.id}.`);
  }

  return config as ProspectingScheduleConfig;
}

async function loadConfig(configPath: string): Promise<ProspectingScheduleConfig> {
  const raw = await readFile(configPath, "utf8");
  return validateConfig(JSON.parse(raw));
}

function renderReport(input: {
  runDate: string;
  job: ProspectingScheduleJob;
  totalFound: number;
  discarded: number;
  duplicates: number;
  priorityCounts: Record<Priority, number>;
  jsonPath: string;
  csvPath: string;
}): string {
  return `# Resumen de corrida prospecting schedule\n\n- Fecha: ${input.runDate}\n- Job: ${input.job.label} (${input.job.id})\n- Día configurado: ${input.job.day}\n- Rubro: ${input.job.category}\n- Zona: ${[input.job.city, input.job.country].filter(Boolean).join(", ") || "Sin filtro"}\n- Provider: ${input.job.provider ?? "generic"}\n- Total encontrados: ${input.totalFound}\n- Descartados: ${input.discarded}\n- Duplicados: ${input.duplicates}\n- Prioridad A: ${input.priorityCounts.A}\n- Prioridad B: ${input.priorityCounts.B}\n- Prioridad C: ${input.priorityCounts.C}\n- Prioridad D: ${input.priorityCounts.D}\n- JSON exportado: ${input.jsonPath}\n- CSV exportado: ${input.csvPath}\n\n## Límites de automatización\n\nEsta corrida solo genera archivos locales para revisión humana. No envía mensajes, no llama APIs pagas automáticamente y no automatiza contacto.\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = await loadConfig(args.configPath);
  const runDate = dateStamp();
  const selectedDay = args.day ?? todayWeekday();
  const shouldRunAll = args.all || config.runMode === "all";
  const jobs = config.jobs.filter((job) => job.enabled !== false && (shouldRunAll || job.day === selectedDay));

  await mkdir(config.outputDir, { recursive: true });

  if (jobs.length === 0) {
    console.log(`No hay jobs habilitados para ${selectedDay}. No se exportaron archivos.`);
    return;
  }

  const aggregate: Record<Priority, number> = { A: 0, B: 0, C: 0, D: 0 };
  let totalFound = 0;
  let totalDiscarded = 0;
  let totalDuplicates = 0;

  for (const job of jobs) {
    const jobSlug = `${runDate}-${job.day}-${slugify(job.category)}-${slugify(job.city ?? job.label)}`;
    const outDir = path.join(config.outputDir, jobSlug);
    const summary = await runProspecting({
      input: job.input,
      format: job.format,
      provider: job.provider ?? "generic",
      country: job.country,
      city: job.city,
      category: job.category,
      limit: job.limit,
      out: outDir,
    });

    const reportPath = path.join(outDir, "lead-radar-prospects.report.md");
    await writeFile(reportPath, renderReport({
      runDate,
      job,
      totalFound: summary.filtered,
      discarded: summary.discarded,
      duplicates: summary.duplicateCount,
      priorityCounts: summary.priorityCounts,
      jsonPath: summary.jsonPath,
      csvPath: summary.csvPath,
    }), "utf8");

    for (const priority of PRIORITIES) aggregate[priority] += summary.priorityCounts[priority];
    totalFound += summary.filtered;
    totalDiscarded += summary.discarded;
    totalDuplicates += summary.duplicateCount;

    console.log(`${job.label}: encontrados=${summary.filtered}, descartados=${summary.discarded}, duplicados=${summary.duplicateCount}, A/B/C/D=${summary.priorityCounts.A}/${summary.priorityCounts.B}/${summary.priorityCounts.C}/${summary.priorityCounts.D}`);
    console.log(`Exportado: ${summary.jsonPath}`);
  }

  console.log(`Resumen agenda: jobs=${jobs.length}, encontrados=${totalFound}, descartados=${totalDiscarded}, duplicados=${totalDuplicates}, A/B/C/D=${aggregate.A}/${aggregate.B}/${aggregate.C}/${aggregate.D}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
