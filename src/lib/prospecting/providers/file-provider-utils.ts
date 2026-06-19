import { readFile } from "node:fs/promises";

import type { RawProspect } from "../types";

export type LocalFileFormat = "csv" | "json";
export type RawFileRecord = Record<string, unknown>;

export type LocalFileProviderOptions = {
  input: string;
  format: LocalFileFormat;
  checkedAt?: string;
};

export function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export function parseCsv(raw: string): RawFileRecord[] {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const [headerLine, ...rows] = lines;
  if (!headerLine) return [];
  const headers = splitCsvLine(headerLine).map((header) => header.trim());

  return rows.map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function getRecordsContainer(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed !== "object" || parsed === null) return [];

  const record = parsed as Record<string, unknown>;
  for (const key of ["records", "items", "places", "features"] as const) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }

  return [];
}

export function parseJson(raw: string): RawFileRecord[] {
  const parsed: unknown = JSON.parse(raw);
  return getRecordsContainer(parsed).filter((record): record is RawFileRecord => typeof record === "object" && record !== null && !Array.isArray(record));
}

export async function readLocalRecords(options: LocalFileProviderOptions): Promise<RawFileRecord[]> {
  const raw = await readFile(options.input, "utf8");
  return options.format === "csv" ? parseCsv(raw) : parseJson(raw);
}

export function readFirst(record: RawFileRecord, paths: string[]): unknown {
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((current, key) => {
      if (typeof current !== "object" || current === null) return undefined;
      return (current as Record<string, unknown>)[key];
    }, record);

    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }

  return undefined;
}

export function parseNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[|;]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

export function withPayload(raw: RawProspect, sourcePayload: RawFileRecord): RawProspect {
  return { ...raw, sourcePayload };
}
