import assert from "node:assert/strict";
import Module from "node:module";
import path from "node:path";
import { readFileSync } from "node:fs";

type NodeModuleWithResolver = typeof Module & { _resolveFilename: (request: string, parent?: unknown, isMain?: boolean, options?: unknown) => string };
const moduleWithResolver = Module as NodeModuleWithResolver;
const originalResolveFilename = moduleWithResolver._resolveFilename;
moduleWithResolver._resolveFilename = function resolveAlias(request: string, parent?: unknown, isMain?: boolean, options?: unknown) {
  if (typeof request === "string" && request.startsWith("@/")) {
    return originalResolveFilename.call(this, path.join(process.cwd(), "src", request.slice(2)), parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const ALLOWED_SOURCE_IDS = new Set(["generic", "csv-local", "json-local", "overture-file", "foursquare-file", "osm-file", "osm-overpass"]);
const LOCAL_PREFIXES = ["samples/", "data/sources/", "tests/fixtures/"];
const API_KEY_PATTERNS = [/api[_-]?key\s*[:=]/i, /sk-[a-z0-9_-]{20,}/i, /AIza[0-9A-Za-z_-]{20,}/];

function sourceId(source: { id?: string; type?: string }, fallback?: string): string {
  return source.id ?? source.type ?? fallback ?? "generic";
}

async function main() {
  const { buildCallQueueItem } = await import("../src/lib/call-queue");
  const { dedupeProspects } = await import("../src/lib/prospecting/dedupe");
  const { calculateProspectFitScore } = await import("../src/lib/prospecting/fit-score");
  const { normalizeProspects } = await import("../src/lib/prospecting/normalize");
  const { runProspecting } = await import("../src/lib/prospecting/run-prospecting-job");
  const { getEnabledProspectingJobs, prospectingJobs } = await import("../src/lib/prospecting/jobs/registry");
  const { getEffectivePriority, scoreLead } = await import("../src/lib/scoring");
  const { importLeadsFromJson } = await import("../src/lib/storage");

  const raw = JSON.parse(readFileSync("tests/fixtures/provider-basic.json", "utf8")) as Record<string, unknown>[];
  const normalized = normalizeProspects(raw, { defaultSource: "json-fixture", checkedAt: "2026-06-20T00:00:00.000Z" });
  assert.equal(normalized.length, 6, "normalization keeps all fixture rows");
  assert.ok(normalized.every((item) => item.source && item.sourceCheckedAt), "normalized prospects keep traceability");

  const deduped = dedupeProspects(normalized);
  assert.equal(deduped.duplicateCount, 1, "dedupe detects duplicate business/address/contact");
  assert.equal(deduped.prospects.length, 5, "dedupe returns unique prospects");

  const noContact = normalized.find((item) => item.sourceId === "json-nocontact");
  assert.ok(noContact, "fixture includes no-contact lead");
  assert.notEqual(calculateProspectFitScore(noContact).priority, "A", "scoring blocks priority A without public contact");

  const imported = importLeadsFromJson(JSON.stringify([{ businessName: "Importado Incompleto", priority: "A", source: "json-fixture" }]));
  assert.equal(imported.preview.valid, 1, "incomplete prospect import remains valid");
  const importedLead = imported.leads?.[0];
  assert.ok(importedLead, "import returns normalized lead");
  assert.equal(importedLead.source, "json-fixture", "import preserves/normalizes source");
  assert.ok(importedLead.sourceCheckedAt, "prospected import receives sourceCheckedAt fallback");
  assert.ok(Array.isArray(importedLead.scoreReasons), "prospected import receives normalized scoreReasons");
  assert.ok(Array.isArray(importedLead.gapSignals), "prospected import receives normalized gapSignals");
  assert.notEqual(getEffectivePriority(importedLead, scoreLead(importedLead)), "A", "effective priority blocks A without public contact");
  assert.notEqual(buildCallQueueItem(importedLead, scoreLead(importedLead)).effectivePriority, "A", "call queue uses same effective priority");

  const run = await runProspecting({ input: "tests/fixtures/provider-basic.csv", format: "csv", provider: "csv-local", out: "exports/provider-contract-check", minPriority: "D" });
  assert.equal(run.recordsRead, 6, "run reads fixture records");
  assert.equal(run.duplicateCount, 1, "run reports deduplicated records");
  assert.ok(run.priorityCounts.A + run.priorityCounts.B + run.priorityCounts.C + run.priorityCounts.D === run.exported, "run priority counts match exports");
  assert.ok(Array.isArray(run.errors), "run summary includes errors array");
  assert.ok(run.runSummaryPath?.endsWith("run-summary.json"), "run writes auditable run-summary.json");

  const jobs = getEnabledProspectingJobs();
  assert.ok(jobs.length > 0, "registered jobs stay allowlisted by id");
  const allJobIds = new Set(prospectingJobs.map((job) => job.id));
  assert.equal(allJobIds.size, prospectingJobs.length, "registry job ids are unique");

  for (const job of jobs) {
    assert.ok(job.id && job.label && job.sourceType, `job ${job.id} has id, label and sourceType`);
    assert.ok(Array.isArray(job.categories) && job.categories.length > 0, `job ${job.id} has categories`);
    assert.ok(["A", "B", "C", "D"].includes(job.minPriority), `job ${job.id} has minPriority`);
    assert.ok(Array.isArray(job.sources) && job.sources.length > 0, `job ${job.id} has sources`);
    for (const source of job.sources) {
      const id = sourceId(source, job.provider);
      assert.ok(ALLOWED_SOURCE_IDS.has(id), `job ${job.id} uses allowlisted provider ${id}`);
      assert.ok(![source.input, source.query, source.overpassUrl, source.userAgent].filter(Boolean).some((value) => API_KEY_PATTERNS.some((pattern) => pattern.test(String(value)))), `job ${job.id} has no hardcoded API keys`);
      if (id === "osm-overpass") {
        assert.ok(source.bbox, `job ${job.id} OSM Overpass has bbox`);
        assert.ok((source.limit ?? job.limit) <= 100, `job ${job.id} OSM Overpass limit <= 100`);
        assert.ok((source.timeoutMs ?? 0) <= 25000, `job ${job.id} OSM Overpass timeout <= 25000`);
      } else {
        assert.ok(source.input && LOCAL_PREFIXES.some((prefix) => source.input?.startsWith(prefix)), `job ${job.id} local source path is allowlisted`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
