import process from "node:process";

import {
  runProspecting,
  type Format,
  type ProspectRunOptions,
  type ProspectRunSummary,
  type Provider,
} from "../src/lib/prospecting/run-prospecting-job";
import { getProspectingJobById, jobToRunOptions } from "../src/lib/prospecting/jobs/registry";

export { leadsToReviewCsv, runProspecting } from "../src/lib/prospecting/run-prospecting-job";
export type { Format, ProspectRunOptions, ProspectRunSummary, Provider } from "../src/lib/prospecting/run-prospecting-job";

function usage(): never {
  console.error(`Uso: npm run prospect:run -- --jobId <job-registrado>
  o: npm run prospect:run -- --input <archivo> --format csv|json --out <ruta> [--provider generic|csv-local|json-local|overture-file|foursquare-file|osm-file|osm-overpass] [--country UY] [--city Montevideo] [--category restaurant] [--limit 50] [--forceRefresh true]`);
  process.exit(1);
}

function parseArgs(argv: string[]): ProspectRunOptions {
  const values: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) usage();
    const key = arg.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) usage();
    values[key] = value;
    index += 1;
  }

  if (values.jobId) {
    const job = getProspectingJobById(values.jobId);
    if (!job) usage();
    return { ...jobToRunOptions(job), forceRefresh: values.forceRefresh === "true" };
  }

  if (!values.input || !values.format || !values.out) usage();
  if (values.format !== "csv" && values.format !== "json") usage();
  const provider = values.provider ?? "generic";
  const allowedProviders: Provider[] = ["generic", "csv-local", "json-local", "overture", "overture-file", "foursquare", "foursquare-file", "osm", "osm-file", "osm-overpass"];
  if (!allowedProviders.includes(provider as Provider)) usage();

  const limit = values.limit === undefined ? undefined : Number(values.limit);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) usage();

  return {
    input: values.input,
    format: values.format as Format,
    provider: provider as Provider,
    country: values.country,
    city: values.city,
    category: values.category,
    limit,
    out: values.out,
    forceRefresh: values.forceRefresh === "true",
  };
}

function printList(title: string, values: string[]) {
  if (values.length === 0) return;
  console.log(`\n${title}`);
  for (const value of values) console.log(`- ${value}`);
}

export async function runProspectCli(argv = process.argv.slice(2)): Promise<ProspectRunSummary> {
  const summary = await runProspecting(parseArgs(argv));
  console.log("Resumen global");
  console.log(`Leídos: ${summary.recordsRead}. Filtrados: ${summary.filtered}. Normalizados: ${summary.normalized}. Duplicados: ${summary.duplicateCount}. Exportados: ${summary.exported}. Descartados: ${summary.discarded}.`);
  console.log(`A/B/C/D: ${summary.priorityCounts.A}/${summary.priorityCounts.B}/${summary.priorityCounts.C}/${summary.priorityCounts.D}`);
  console.log("\nResumen por fuente");
  for (const source of summary.sources) {
    console.log(`- ${source.sourceLabel} (${source.sourceId}): status=${source.status}, leídos=${source.recordsRead}, aceptados=${source.recordsAccepted}, rechazados=${source.recordsRejected}, duración=${source.durationMs}ms`);
    for (const warning of source.warnings) console.log(`  warning: ${warning}`);
    for (const error of source.errors) console.log(`  error: ${error}`);
  }
  printList("Warnings", summary.warnings);
  printList("Errores parciales", summary.errors);
  console.log("\nPaths generados");
  console.log(`JSON importable: ${summary.jsonPath}`);
  console.log(`CSV revisión: ${summary.csvPath}`);
  console.log(`Run summary: ${summary.runSummaryPath}`);
  if (summary.exported === 0) console.warn("ADVERTENCIA: la corrida exportó 0 leads. Revisar filtros, fuentes, errores parciales y run-summary.json antes de asumir que no hay negocios.");
  return summary;
}

if (process.argv[1]?.endsWith("prospect.ts")) {
  runProspectCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
