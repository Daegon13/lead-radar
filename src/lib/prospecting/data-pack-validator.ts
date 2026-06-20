import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { parseCsv, parseJson, type LocalFileFormat, type RawFileRecord } from "./providers/file-provider-utils";
import type { DataSourceInput, SourceStatus } from "./sources/types";

const NAME_FIELDS = ["name", "businessName", "nombre", "title"];
const CATEGORY_FIELDS = ["category", "rubro", "type", "amenity", "categories", "main_category"];
const LOCATION_FIELDS = ["city", "location", "localidad", "address", "direccion", "addr:city", "lat", "lng", "latitude", "longitude", "geometry"];
const TRACE_FIELDS = ["source", "sourceCheckedAt", "sourceId", "sourceUrl"];

export type DataPackValidationResult = {
  status: SourceStatus;
  records: RawFileRecord[];
  warnings: string[];
  errors: string[];
};

function hasAny(record: RawFileRecord, fields: string[]): boolean {
  return fields.some((field) => {
    const value = field.split(".").reduce<unknown>((current, key) => (typeof current === "object" && current !== null ? (current as Record<string, unknown>)[key] : undefined), record);
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
}

function expectedFormat(input: DataSourceInput): LocalFileFormat {
  return input.format ?? (input.input?.toLowerCase().endsWith(".csv") ? "csv" : "json");
}

export async function validateDataPack(input: DataSourceInput): Promise<DataPackValidationResult> {
  const filePath = input.input;
  const format = expectedFormat(input);
  if (!filePath) return { status: "skipped_source", records: [], warnings: ["skipped_source: fuente local opcional sin input configurado."], errors: [] };
  try {
    await access(filePath);
  } catch {
    return { status: "skipped_source", records: [], warnings: [`skipped_source: archivo local opcional no existe (${path.normalize(filePath)}).`], errors: [] };
  }
  const ext = path.extname(filePath).toLowerCase();
  if ((format === "json" && ext && ext !== ".json") || (format === "csv" && ext && ext !== ".csv")) {
    return { status: "invalid_source", records: [], warnings: [], errors: [`invalid_source: extensión ${ext || "sin extensión"} no coincide con formato ${format}.`] };
  }
  try {
    const raw = await readFile(filePath, "utf8");
    const records = format === "csv" ? parseCsv(raw) : parseJson(raw);
    if (records.length === 0) return { status: "empty_result", records: [], warnings: ["empty_result: data pack parseable pero vacío."], errors: [] };
    const validRecords = records.filter((record) => hasAny(record, NAME_FIELDS));
    const warnings: string[] = [];
    if (validRecords.length < records.length) warnings.push(`partial_success: ${records.length - validRecords.length} registros sin name/equivalente.`);
    if (!records.some((record) => hasAny(record, CATEGORY_FIELDS)) && !input.category) warnings.push("partial_success: falta category/rubro y no se puede inferir por job.");
    if (!records.some((record) => hasAny(record, LOCATION_FIELDS)) && !input.city) warnings.push("partial_success: falta ubicación/city inferible.");
    if (!records.some((record) => hasAny(record, TRACE_FIELDS))) warnings.push("partial_success: sin trazabilidad source/sourceCheckedAt/sourceId/sourceUrl en registros.");
    return { status: warnings.length ? "partial_success" : "success", records, warnings, errors: [] };
  } catch (error) {
    return { status: "invalid_source", records: [], warnings: [], errors: [`invalid_source: ${error instanceof Error ? error.message : "no se pudo parsear el archivo"}`] };
  }
}
