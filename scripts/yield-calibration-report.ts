import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { listRunHistory, getRunHistoryDetail } from "../src/lib/prospecting/run-history";
import { isCallableLead } from "../src/lib/prospecting/callable-lead";

function pct(value?: number): string { return `${Math.round((value ?? 0) * 100)}%`; }
function csvValue(value: unknown): string { const raw = String(value ?? ""); return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw; }
function recommendation(run: Awaited<ReturnType<typeof listRunHistory>>[number]): string {
  if (run.exported === 0 && run.recordsRead === 0) return "ajustar bbox o revisar tags";
  if ((run.skippedSourcesCount ?? 0) > 0) return "fuente faltante opcional: agregar data pack local si aporta contacto";
  if ((run.invalidSourcesCount ?? 0) > 0) return "source invalid: corregir formato del data pack";
  if ((run.contactabilityRate ?? 0) < 0.25) return "baja contactabilidad: revisar fuentes/tags o enriquecer data pack local";
  if ((run.callableLeads ?? 0) > 0 && (run.callableRate ?? 0) >= 0.25) return "job útil para repetir";
  return "revisar tags y criterios de rubro/zona";
}

async function main() {
  const runs = await listRunHistory();
  const details = (await Promise.all(runs.map((run) => getRunHistoryDetail(run.runId)))).filter(Boolean);
  const allSources = details.flatMap((run) => run!.sourceSummaries.map((source) => ({ jobId: run!.jobId, jobLabel: run!.jobLabel, ...source })));
  const categories = new Map<string, { category: string; zone: string; runs: number; callableLeads: number; exported: number }>();
  for (const run of details) for (const lead of run!.leads) {
    const key = `${lead.category}__${lead.location}`;
    const prev = categories.get(key) ?? { category: lead.category, zone: lead.location, runs: 0, callableLeads: 0, exported: 0 };
    prev.exported += 1; prev.callableLeads += isCallableLead(lead) ? 1 : 0; categories.set(key, prev);
  }
  const report = {
    generatedAt: new Date().toISOString(),
    totals: { runs: runs.length, exported: runs.reduce((t, r) => t + r.exported, 0), callableLeads: runs.reduce((t, r) => t + (r.callableLeads ?? 0), 0) },
    topJobsByCallableLeads: [...runs].sort((a,b)=>(b.callableLeads??0)-(a.callableLeads??0)).slice(0,10),
    topJobsByAB: [...runs].sort((a,b)=>((b.priorityCounts.A+b.priorityCounts.B)-(a.priorityCounts.A+a.priorityCounts.B))).slice(0,10),
    topSourcesByContactabilityRate: [...allSources].sort((a,b)=>(b.sourceYieldScore??0)-(a.sourceYieldScore??0)).slice(0,10),
    jobsWithZeroResults: runs.filter((r) => r.exported === 0),
    jobsWithMostErrors: [...runs].sort((a,b)=>b.errorsCount-a.errorsCount).slice(0,10),
    mostFailedSources: [...allSources].filter((s) => ["request_failed","timeout","invalid_source"].includes(s.status)).slice(0,20),
    categoryZoneYield: Array.from(categories.values()).sort((a,b)=>b.callableLeads-a.callableLeads).slice(0,20),
    recommendations: runs.map((run) => ({ runId: run.runId, jobId: run.jobId, recommendation: recommendation(run), callableRate: run.callableRate ?? 0, contactabilityRate: run.contactabilityRate ?? 0 })),
  };
  const outDir = path.join(process.cwd(), "exports", "reports");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "yield-calibration-latest.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const rows = [["runId","jobId","exported","callableLeads","callableRate","contactabilityRate","digitalGapRate","recommendation"], ...runs.map((run) => [run.runId, run.jobId, run.exported, run.callableLeads ?? 0, pct(run.callableRate), pct(run.contactabilityRate), pct(run.digitalGapRate), recommendation(run)])];
  await writeFile(path.join(outDir, "yield-calibration-latest.csv"), `${rows.map((row) => row.map(csvValue).join(",")).join("\n")}\n`, "utf8");
  console.log(`Yield calibration report generated for ${runs.length} runs.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
