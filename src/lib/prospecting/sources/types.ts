import type { RawProspect } from "../types";
import type { LocalFileFormat } from "../providers/file-provider-utils";

export type SourceCapability =
  | "local-file"
  | "csv"
  | "json"
  | "duckdb-query"
  | "http-api"
  | "rate-limited"
  | "future";

export type SourceStatus = "success" | "empty_result" | "timeout" | "request_failed" | "skipped_source" | "invalid_source" | "partial_success";

export type DataSourceInput = {
  id?: string;
  type?: string;
  sourceLabel?: string;
  input?: string;
  format?: LocalFileFormat;
  country?: string;
  city?: string;
  category?: string;
  limit?: number;
  checkedAt?: string;
  overpassUrl?: string;
  timeoutMs?: number;
  userAgent?: string;
  bbox?: [number, number, number, number];
  tags?: Record<string, string[]> | Array<{ key: string; value: string }>;
  query?: string;
  cacheKey?: string;
  cacheTtlMs?: number;
  forceRefresh?: boolean;
};

export type DataSourceResult = {
  sourceId: string;
  sourceLabel: string;
  checkedAt: string;
  input: DataSourceInput;
  rawProspects: RawProspect[];
  warnings: string[];
  errors?: string[];
  status?: SourceStatus;
};

export type DataSourceProvider = {
  id: string;
  label: string;
  capabilities: SourceCapability[];
  run(input: DataSourceInput): Promise<DataSourceResult>;
};
