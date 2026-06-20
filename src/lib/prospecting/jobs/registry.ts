import config from "../../../../prospecting.config.json";
import type { DataSourceInput } from "@/lib/prospecting/sources";
import type { Format, ProspectRunOptions, Provider } from "@/lib/prospecting/run-prospecting-job";
import type { Priority } from "@/types/lead";

export type ProspectingJobDefinition = {
  id: string;
  label: string;
  description: string;
  country?: string;
  city?: string;
  categories: string[];
  sourceType: string;
  sources: DataSourceInput[];
  limit: number;
  minPriority: Priority;
  outputName: string;
  input: string;
  format: Format;
  provider: Provider;
  enabled: boolean;
  day?: string;
};

type ConfigJob = {
  id: string;
  enabled?: boolean;
  day?: string;
  label: string;
  category: string;
  categories?: string[];
  sourceType?: string;
  city?: string;
  country?: string;
  input: string;
  format: Format;
  provider?: Provider;
  sources?: Array<DataSourceInput & { provider?: Provider }>;
  limit?: number;
  minPriority?: Priority;
  description?: string;
  outputName?: string;
};

const VALID_PRIORITIES: Priority[] = ["A", "B", "C", "D"];
const MAX_CONFIG_LIMIT = 100;
const MAX_OVERPASS_TIMEOUT_MS = 25_000;

function slugify(value: string): string {
  return value
    .toLocaleLowerCase("es-UY")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "prospecting-job";
}

function assertSafeSources(job: ConfigJob, sources: DataSourceInput[]) {
  for (const source of sources) {
    const sourceId = source.id ?? source.type ?? job.provider;
    if (sourceId !== "osm-overpass") continue;
    if (!source.bbox) throw new Error(`Job ${job.id} usa osm-overpass sin bbox; las consultas amplias no están permitidas.`);
    if ((source.limit ?? job.limit ?? 50) > MAX_CONFIG_LIMIT) throw new Error(`Job ${job.id} supera el límite máximo ${MAX_CONFIG_LIMIT} para config.`);
    if ((source.timeoutMs ?? 0) > MAX_OVERPASS_TIMEOUT_MS) throw new Error(`Job ${job.id} supera timeoutMs máximo ${MAX_OVERPASS_TIMEOUT_MS}.`);
  }
}

function normalizeJob(job: ConfigJob): ProspectingJobDefinition {
  const provider = job.provider ?? "generic";
  const minPriority = VALID_PRIORITIES.includes(job.minPriority ?? "D")
    ? (job.minPriority ?? "D")
    : "D";

  const sources = job.sources?.length
    ? job.sources.map((source) => ({ ...source, id: source.id ?? source.provider ?? provider, input: source.input ?? job.input, format: source.format ?? job.format }))
    : [{ id: provider === "generic" ? (job.format === "csv" ? "csv-local" : "json-local") : provider, input: job.input, format: job.format }];
  assertSafeSources(job, sources);

  return {
    id: job.id,
    label: job.label,
    description:
      job.description ??
      `Ejecuta prospección local allowlisted para ${job.category} en ${[job.city, job.country].filter(Boolean).join(", ") || "zona sin filtro"}.`,
    country: job.country,
    city: job.city,
    categories: job.categories?.length ? job.categories : [job.category],
    sourceType: job.sourceType ?? (provider === "generic" ? "local-file" : provider),
    sources,
    limit: Math.min(job.limit ?? 50, MAX_CONFIG_LIMIT),
    minPriority,
    outputName: job.outputName ?? `lead-radar-${slugify(job.id)}`,
    input: job.input,
    format: job.format,
    provider,
    enabled: job.enabled !== false,
    day: job.day,
  };
}

export const prospectingJobs: ProspectingJobDefinition[] = (config.jobs as ConfigJob[]).map(normalizeJob);

export function getEnabledProspectingJobs(): ProspectingJobDefinition[] {
  return prospectingJobs.filter((job) => job.enabled);
}

export function getProspectingJobById(jobId: string): ProspectingJobDefinition | undefined {
  return getEnabledProspectingJobs().find((job) => job.id === jobId);
}

export function jobToRunOptions(job: ProspectingJobDefinition): ProspectRunOptions {
  return {
    input: job.input,
    format: job.format,
    provider: job.provider,
    country: job.country,
    city: job.city,
    category: job.categories.length === 1 ? job.categories[0] : undefined,
    limit: job.limit,
    minPriority: job.minPriority,
    out: `${((config.outputDir as string | undefined) ?? "exports/prospecting-jobs").replace(/\/$/, "")}/${job.id}`,
    outputName: job.outputName,
    sources: job.sources,
  };
}
