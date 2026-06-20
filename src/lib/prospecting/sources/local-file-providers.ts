import { loadFoursquareFileProspects } from "../providers/foursquare-file-provider";
import { loadOsmFileProspects } from "../providers/osm-file-provider";
import { loadOvertureFileProspects } from "../providers/overture-file-provider";
import { readLocalRecords } from "../providers/file-provider-utils";
import type { RawProspect } from "../types";
import type { DataSourceInput, DataSourceProvider, DataSourceResult } from "./types";

function requireFileInput(input: DataSourceInput): { input: string; format: "csv" | "json"; checkedAt: string } {
  if (!input.input) throw new Error("Data source input path is required for local file providers.");
  return { input: input.input, format: input.format ?? "json", checkedAt: input.checkedAt ?? new Date().toISOString() };
}

function result(provider: DataSourceProvider, input: DataSourceInput, checkedAt: string, rawProspects: RawProspect[], warnings: string[] = []): DataSourceResult {
  return { sourceId: provider.id, sourceLabel: input.sourceLabel ?? provider.label, checkedAt, input, rawProspects, warnings };
}

function withGenericTrace(record: Record<string, unknown>, checkedAt: string, providerLabel: string): RawProspect {
  return {
    ...record,
    id: String(record.id ?? record.sourceId ?? record.externalId ?? record.providerId ?? ""),
    source: String(record.source ?? providerLabel),
    sourceUrl: typeof record.sourceUrl === "string" ? record.sourceUrl : undefined,
    sourceCheckedAt: checkedAt,
    confidence: typeof record.confidence === "number" ? record.confidence : undefined,
    sourcePayload: record,
  } as RawProspect;
}

export const csvProvider: DataSourceProvider = {
  id: "csv-local",
  label: "CSV local",
  capabilities: ["local-file", "csv"],
  async run(input) {
    const file = requireFileInput({ ...input, format: "csv" });
    const records = await readLocalRecords(file);
    return result(this, input, file.checkedAt, records.map((record) => withGenericTrace(record, file.checkedAt, this.label)));
  },
};

export const jsonProvider: DataSourceProvider = {
  id: "json-local",
  label: "JSON local",
  capabilities: ["local-file", "json"],
  async run(input) {
    const file = requireFileInput({ ...input, format: "json" });
    const records = await readLocalRecords(file);
    return result(this, input, file.checkedAt, records.map((record) => withGenericTrace(record, file.checkedAt, this.label)));
  },
};

export const overtureFileProvider: DataSourceProvider = {
  id: "overture-file",
  label: "Overture Places local file",
  capabilities: ["local-file", "json", "csv", "duckdb-query"],
  async run(input) {
    const file = requireFileInput(input);
    return result(this, input, file.checkedAt, await loadOvertureFileProspects(file));
  },
};

export const foursquareFileProvider: DataSourceProvider = {
  id: "foursquare-file",
  label: "Foursquare OS Places local file",
  capabilities: ["local-file", "json", "csv"],
  async run(input) {
    const file = requireFileInput(input);
    return result(this, input, file.checkedAt, await loadFoursquareFileProspects(file));
  },
};

export const osmFileProvider: DataSourceProvider = {
  id: "osm-file",
  label: "OpenStreetMap local file",
  capabilities: ["local-file", "json", "csv"],
  async run(input) {
    const file = requireFileInput(input);
    return result(this, input, file.checkedAt, await loadOsmFileProspects(file));
  },
};
