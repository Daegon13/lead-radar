import { readdir, stat, readFile } from "node:fs/promises";
import path from "node:path";
import { getEnabledProspectingJobs } from "../src/lib/prospecting/jobs/registry";
import { PROSPECTING_RUNTIME_LIMITS, isRemoteProviderId } from "../src/lib/prospecting/runtime-guards";

async function dirStats(root: string, maxFiles = 2000) {
  let files = 0, bytes = 0, corruptSummaries = 0;
  const stack = [root];
  while (stack.length && files < maxFiles) {
    const dir = stack.pop()!;
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else { files++; const st = await stat(p).catch(() => undefined); bytes += st?.size ?? 0; if (e.name === "run-summary.json") { try { JSON.parse(await readFile(p,"utf8")); } catch { corruptSummaries++; } } }
      if (files >= maxFiles) break;
    }
  }
  return { files, bytes, corruptSummaries, capped: files >= maxFiles };
}
async function main() {
  const jobs = getEnabledProspectingJobs();
  const remoteJobs = jobs.filter((j) => j.sources.some((s) => isRemoteProviderId(s.id ?? s.type ?? j.provider)));
  const exportsStats = await dirStats(path.join(process.cwd(), "exports"));
  const cacheStats = await dirStats(path.join(process.cwd(), "exports", "source-cache", "osm-overpass"));
  const heavy = jobs.filter((j) => j.limit > 50 || j.sources.length > 2 || remoteJobs.includes(j));
  console.log("Lead Radar prospect:doctor (no ejecuta fuentes remotas)");
  console.log(`Jobs habilitados: ${jobs.length}`);
  console.log(`Jobs remotos: ${remoteJobs.length}${remoteJobs.length ? ` (${remoteJobs.map((j)=>j.id).join(", ")})` : ""}`);
  console.log(`Exports: archivos=${exportsStats.files}, tamaño≈${Math.round(exportsStats.bytes/1024)}KB, summaries corruptos=${exportsStats.corruptSummaries}${exportsStats.capped ? " (lectura limitada)" : ""}`);
  console.log(`Cache OSM: ${cacheStats.files > 0 ? "existe" : "no encontrada"}, archivos=${cacheStats.files}, tamaño≈${Math.round(cacheStats.bytes/1024)}KB`);
  console.log(`Límites: schedule maxJobs=${PROSPECTING_RUNTIME_LIMITS.defaultScheduleMaxJobs}, concurrency=${PROSPECTING_RUNTIME_LIMITS.defaultScheduleConcurrency}, jobTimeoutMs=${PROSPECTING_RUNTIME_LIMITS.defaultJobTimeoutMs}, overpassLimit=${PROSPECTING_RUNTIME_LIMITS.maxOverpassLimit}, runHistoryLimit=${PROSPECTING_RUNTIME_LIMITS.defaultRunHistoryLimit}`);
  console.log(`Jobs potencialmente pesados: ${heavy.length}${heavy.length ? ` (${heavy.map((j)=>j.id).join(", ")})` : ""}`);
  if (remoteJobs.length) console.warn("Advertencia: corré OSM real de a un job con --only/--maxJobs 1 y timeout explícito; no uses --all sin revisar dryRun.");
  if (exportsStats.corruptSummaries) console.warn("Advertencia: hay run-summary.json corruptos; la UI los ignora.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
