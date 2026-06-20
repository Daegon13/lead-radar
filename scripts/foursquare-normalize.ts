import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { parseCsv, parseJson, parseNumber, readFirst, type RawFileRecord } from "../src/lib/prospecting/providers/file-provider-utils";

const DEFAULT_OUTPUT_DIR = "data/sources/uy/montevideo/foursquare";
const SOURCE_LABEL = "Foursquare OS Places";
const SOURCE_URL = "https://opensource.foursquare.com/os-places/";

type Args = {
  input?: string;
  format?: "csv" | "json";
  outDir: string;
  output?: string;
  checkedAt: string;
};

function usage(): never {
  console.error(`Uso: jiti scripts/foursquare-normalize.ts --input <export.json|csv> [--format json|csv] [--outDir ${DEFAULT_OUTPUT_DIR}] [--output normalized.json] [--checkedAt ISO]

Normaliza un export local de Foursquare OS Places al contrato consumido por foursquare-file-provider.
No lee tokens, no llama al Places Portal y no expone credenciales al frontend.`);
  process.exit(1);
}

function parseArgs(argv: string[]): Args {
  const args: Args = { outDir: DEFAULT_OUTPUT_DIR, checkedAt: new Date().toISOString() };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) usage();
    const key = arg.slice(2) as keyof Args;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) usage();
    if (key === "format" && value !== "csv" && value !== "json") usage();
    if (["input", "format", "outDir", "output", "checkedAt"].includes(key)) {
      (args as Record<string, string>)[key] = value;
    } else {
      usage();
    }
    index += 1;
  }
  if (!args.input) usage();
  if (!args.format) args.format = args.input.toLocaleLowerCase("es-UY").endsWith(".csv") ? "csv" : "json";
  return args;
}

function firstString(record: RawFileRecord, paths: string[]): string | undefined {
  const value = readFirst(record, paths);
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function joinAddress(record: RawFileRecord): string | undefined {
  const formatted = firstString(record, ["location.formatted_address", "formatted_address", "address", "location.address"]);
  if (formatted) return formatted;
  const parts = [
    firstString(record, ["address_extended", "location.address_extended"]),
    firstString(record, ["address", "location.address"]),
    firstString(record, ["postcode", "location.postcode"]),
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

function primaryCategory(record: RawFileRecord): string | undefined {
  const categories = record.categories;
  if (Array.isArray(categories)) {
    const first = categories.find((item) => typeof item === "object" && item !== null) as Record<string, unknown> | undefined;
    return firstString(first ?? {}, ["name", "short_name", "label"]);
  }
  return firstString(record, ["category", "primary_category", "fsq_category_name", "category_name"]);
}

function normalizeRecord(record: RawFileRecord, checkedAt: string): RawFileRecord {
  const lat = parseNumber(readFirst(record, ["latitude", "lat", "geocodes.main.latitude", "geometry.latitude"]));
  const lng = parseNumber(readFirst(record, ["longitude", "lng", "lon", "geocodes.main.longitude", "geometry.longitude"]));
  const website = firstString(record, ["website", "websiteUrl", "url", "tel.website"]);
  const phone = firstString(record, ["tel", "phone", "contact.phone", "telephone"]);
  const normalized: RawFileRecord = {
    id: firstString(record, ["fsq_place_id", "id", "place_id"]),
    name: firstString(record, ["name", "businessName"]),
    category: primaryCategory(record),
    country: firstString(record, ["country", "location.country", "addr:country"]),
    city: firstString(record, ["city", "location.locality", "locality", "addr:city"]),
    neighborhood: firstString(record, ["neighborhood", "location.neighborhood", "region", "location.region"]),
    address: joinAddress(record),
    website,
    phone,
    email: firstString(record, ["email", "contact.email"]),
    lat,
    lng,
    source: SOURCE_LABEL,
    sourceId: firstString(record, ["fsq_place_id", "id", "place_id"]),
    sourceUrl: SOURCE_URL,
    sourceCheckedAt: checkedAt,
    confidence: parseNumber(readFirst(record, ["confidence", "fsq_confidence"])),
    sourcePayload: record,
  };
  return Object.fromEntries(Object.entries(normalized).filter(([, value]) => value !== undefined && value !== ""));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = await readFile(args.input!, "utf8");
  const records = args.format === "csv" ? parseCsv(raw) : parseJson(raw);
  const normalized = records.map((record) => normalizeRecord(record, args.checkedAt));
  await mkdir(args.outDir, { recursive: true });
  const output = path.join(args.outDir, args.output ?? `${path.basename(args.input!, path.extname(args.input!))}.normalized.json`);
  await writeFile(output, `${JSON.stringify({ records: normalized }, null, 2)}\n`, "utf8");
  console.log(`Foursquare records read: ${records.length}`);
  console.log(`Normalized records written: ${normalized.length}`);
  console.log(`Output: ${output}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
