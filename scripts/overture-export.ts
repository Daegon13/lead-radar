import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

type ExportFormat = "json" | "csv";

type Args = {
  country?: string;
  city?: string;
  zone?: string;
  bbox?: [number, number, number, number];
  category?: string;
  out?: string;
  limit?: number;
  format?: ExportFormat;
  dryRun?: boolean;
};

const OVERTURE_PLACES_PARQUET = "s3://overturemaps-us-west-2/release/latest/theme=places/type=place/*";

const CATEGORY_ALIASES: Record<string, string[]> = {
  dentist: ["dentist", "dental_clinic", "dental", "orthodontist"],
  dental_clinic: ["dental_clinic", "dentist", "dental", "orthodontist"],
  beauty_salon: ["beauty_salon", "beauty", "spa", "nail_salon", "esthetician"],
  spa: ["spa", "beauty_salon", "massage", "wellness_center"],
  veterinary: ["veterinary", "veterinarian", "animal_hospital", "pet_groomer"],
  real_estate_agency: ["real_estate_agency", "estate_agent", "real_estate", "property_management_company"],
  lawyer: ["lawyer", "law_firm", "legal_services"],
  accountant: ["accountant", "accounting", "tax_preparation_service", "bookkeeping_service"],
  hairdresser: ["hairdresser", "hair_salon", "barber", "barber_shop"],
  barber: ["barber", "barber_shop", "hairdresser", "hair_salon"],
  fitness: ["fitness_center", "gym", "personal_trainer", "yoga_studio", "pilates_studio"],
  yoga: ["yoga_studio", "fitness_center", "pilates_studio"],
  pilates: ["pilates_studio", "fitness_center", "yoga_studio"],
};

function usage(): never {
  console.error(`Uso: npx jiti scripts/overture-export.ts --country UY --city Montevideo --zone pocitos --bbox <minLat,minLng,maxLat,maxLng> --category dentist --out data/sources/uy/montevideo/overture/dentists-pocitos.json --limit 50 --format json [--dry-run]

Requerido: --bbox, --category, --out. No se permite consultar todo un país sin bbox.
Categorías ICP: ${Object.keys(CATEGORY_ALIASES).join(", ")}`);
  process.exit(1);
}

function parseBbox(value: string): [number, number, number, number] {
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) usage();
  const [minLat, minLng, maxLat, maxLng] = parts;
  if (minLat >= maxLat || minLng >= maxLng) usage();
  return [minLat, minLng, maxLat, maxLng];
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (!arg.startsWith("--")) usage();
    const key = arg.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) usage();
    index += 1;

    if (key === "bbox") args.bbox = parseBbox(value);
    else if (key === "limit") args.limit = Number(value);
    else if (key === "format" && (value === "json" || value === "csv")) args.format = value;
    else if (["country", "city", "zone", "category", "out"].includes(key)) args[key as keyof Args] = value as never;
    else usage();
  }

  if (!args.bbox || !args.category || !args.out) usage();
  if (args.country && !args.bbox) usage();
  if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 5000)) usage();
  return { ...args, format: args.format ?? "json", limit: args.limit ?? 100 };
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function normalizedCategoryTerms(category: string): string[] {
  const key = category.trim().toLocaleLowerCase("es-UY");
  return CATEGORY_ALIASES[key] ?? [key];
}

function buildSql(args: Required<Pick<Args, "bbox" | "category" | "out" | "format" | "limit">> & Args): string {
  const [minLat, minLng, maxLat, maxLng] = args.bbox;
  const terms = normalizedCategoryTerms(args.category);
  const categoryFilter = terms
    .map((term) => `contains(lower(coalesce(categories.primary, '')), ${sqlString(term)}) OR contains(lower(coalesce(array_to_string(categories.alternate, '|'), '')), ${sqlString(term)})`)
    .join(" OR ");
  const cityFilter = args.city ? `AND contains(lower(coalesce(addresses[1].locality, '')), lower(${sqlString(args.city)}))` : "";
  const countryFilter = args.country ? `AND upper(coalesce(addresses[1].country, '')) = upper(${sqlString(args.country)})` : "";
  const outputFormat = args.format === "json" ? "JSON, ARRAY true" : "CSV, HEADER true";

  return `INSTALL httpfs;\nLOAD httpfs;\n\nCOPY (\n  SELECT\n    id,\n    names.primary AS name,\n    categories.primary AS category,\n    confidence,\n    websites,\n    socials,\n    phones,\n    emails,\n    addresses[1].freeform AS address,\n    struct_pack(lat := bbox.ymin + ((bbox.ymax - bbox.ymin) / 2), lng := bbox.xmin + ((bbox.xmax - bbox.xmin) / 2)) AS coordinates,\n    'Overture Places' AS source,\n    id AS sourceId,\n    now()::VARCHAR AS sourceCheckedAt\n  FROM read_parquet(${sqlString(OVERTURE_PLACES_PARQUET)}, hive_partitioning = true)\n  WHERE bbox.ymin >= ${minLat}\n    AND bbox.ymax <= ${maxLat}\n    AND bbox.xmin >= ${minLng}\n    AND bbox.xmax <= ${maxLng}\n    ${countryFilter}\n    ${cityFilter}\n    AND (${categoryFilter})\n  LIMIT ${args.limit}\n) TO ${sqlString(args.out)} (FORMAT ${outputFormat});\n`;
}

function duckdbAvailable(): boolean {
  const result = spawnSync("duckdb", ["--version"], { encoding: "utf8" });
  return result.status === 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const out = path.normalize(args.out ?? usage());
  const sqlPath = out.replace(/\.(json|csv)$/i, ".sql");
  await mkdir(path.dirname(out), { recursive: true });
  const sql = buildSql({ ...args, out, format: args.format ?? "json", limit: args.limit ?? 100, bbox: args.bbox ?? usage(), category: args.category ?? usage() });
  await writeFile(sqlPath, sql, "utf8");

  if (args.dryRun || !duckdbAvailable()) {
    console.log(`SQL DuckDB generado: ${sqlPath}`);
    console.log("DuckDB CLI no disponible o ejecución en --dry-run. Para exportar manualmente:");
    console.log(`  duckdb -c ".read ${sqlPath}"`);
    console.log(`Salida esperada: ${out}`);
    return;
  }

  const result = spawnSync("duckdb", ["-c", `.read ${sqlPath}`], { encoding: "utf8", stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
  if (!existsSync(out)) throw new Error(`DuckDB terminó sin crear el archivo esperado: ${out}`);
  console.log(`Export Overture generado: ${out}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
