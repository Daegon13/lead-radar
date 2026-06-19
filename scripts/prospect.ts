import process from "node:process";

import {
  runProspecting,
  type Format,
  type ProspectRunOptions,
  type Provider,
} from "../src/lib/prospecting/run-prospecting-job";

export { leadsToReviewCsv, runProspecting } from "../src/lib/prospecting/run-prospecting-job";
export type { Format, ProspectRunOptions, ProspectRunSummary, Provider } from "../src/lib/prospecting/run-prospecting-job";

function usage(): never {
  console.error(`Uso: npm run prospect:run -- --input <archivo> --format csv|json --out <ruta> [--provider generic|overture|foursquare|osm] [--country UY] [--city Montevideo] [--category restaurant] [--limit 50]`);
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

  if (!values.input || !values.format || !values.out) usage();
  if (values.format !== "csv" && values.format !== "json") usage();
  const provider = values.provider ?? "generic";
  if (provider !== "generic" && provider !== "overture" && provider !== "foursquare" && provider !== "osm") usage();

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
  };
}

async function main() {
  const summary = await runProspecting(parseArgs(process.argv.slice(2)));
  console.log(`Leídos: ${summary.recordsRead}. Filtrados: ${summary.filtered}. Normalizados: ${summary.normalized}. Duplicados: ${summary.duplicateCount}. Exportados: ${summary.exported}.`);
  console.log(`JSON importable: ${summary.jsonPath}`);
  console.log(`CSV revisión: ${summary.csvPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
