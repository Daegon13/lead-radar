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
  sources: DataSourceInput[];
  limit: number;
  minPriority: Priority;
  outputName: string;
  input: string;
  format: Format;
  provider: Provider;
  enabled: boolean;
};

type ConfigJob = {
  id: string;
  enabled?: boolean;
  day?: string;
  label: string;
  category: string;
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

function slugify(value: string): string {
  return value
    .toLocaleLowerCase("es-UY")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "prospecting-job";
}

function normalizeJob(job: ConfigJob): ProspectingJobDefinition {
  const provider = job.provider ?? "generic";
  const minPriority = VALID_PRIORITIES.includes(job.minPriority ?? "D")
    ? (job.minPriority ?? "D")
    : "D";

  return {
    id: job.id,
    label: job.label,
    description:
      job.description ??
      `Ejecuta prospección local allowlisted para ${job.category} en ${[job.city, job.country].filter(Boolean).join(", ") || "zona sin filtro"}.`,
    country: job.country,
    city: job.city,
    categories: [job.category],
    sources: job.sources?.length
      ? job.sources.map((source) => ({ ...source, id: source.id ?? source.provider ?? provider, input: source.input ?? job.input, format: source.format ?? job.format }))
      : [{ id: provider === "generic" ? (job.format === "csv" ? "csv-local" : "json-local") : provider, input: job.input, format: job.format }],
    limit: job.limit ?? 50,
    minPriority,
    outputName: job.outputName ?? `lead-radar-${slugify(job.id)}`,
    input: job.input,
    format: job.format,
    provider,
    enabled: job.enabled !== false,
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
    category: job.categories[0],
    limit: job.limit,
    minPriority: job.minPriority,
    out: `${((config.outputDir as string | undefined) ?? "exports/prospecting-jobs").replace(/\/$/, "")}/${job.id}`,
    outputName: job.outputName,
    sources: job.sources,
  };
}
