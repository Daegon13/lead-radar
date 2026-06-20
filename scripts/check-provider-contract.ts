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

async function main() {
  const { buildCallQueueItem } = await import("../src/lib/call-queue");
  const { dedupeProspects } = await import("../src/lib/prospecting/dedupe");
  const { calculateProspectFitScore } = await import("../src/lib/prospecting/fit-score");
  const { normalizeProspects } = await import("../src/lib/prospecting/normalize");
  const { runProspecting } = await import("../src/lib/prospecting/run-prospecting-job");
  const { getEnabledProspectingJobs } = await import("../src/lib/prospecting/jobs/registry");
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

  const jobs = getEnabledProspectingJobs();
  assert.ok(jobs.length > 0, "registered jobs stay allowlisted by id");
  assert.ok(jobs.every((job) => job.sources.every((source) => source.input?.startsWith("samples/"))), "demo jobs use local samples");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
