import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { calculateCommercialFeedbackStats } from "../src/lib/commercial-feedback";
import { OUTCOME_DEFINITIONS } from "../src/lib/outcomes";
import { seedLeads } from "../src/data/seed-leads";
import type { Lead } from "../src/types/lead";

function csvValue(value: unknown): string { const raw = String(value ?? ""); return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw; }
async function readJsonArray(file: string): Promise<Lead[] | null> { if (!existsSync(file)) return null; try { const parsed = JSON.parse(await readFile(file, "utf8")); return Array.isArray(parsed) ? parsed as Lead[] : null; } catch { return null; } }
async function loadLeads(): Promise<{ leads: Lead[]; source: string }> {
  const candidates = [path.join(process.cwd(), "exports", "leads-latest.json"), path.join(process.cwd(), "exports", "leads.json"), path.join(process.cwd(), "data", "leads.json")];
  for (const file of candidates) { const leads = await readJsonArray(file); if (leads) return { leads, source: file }; }
  return { leads: seedLeads as Lead[], source: "seed-leads (fallback; browser localStorage is not readable by CLI)" };
}
function recRows(stats: ReturnType<typeof calculateCommercialFeedbackStats>) { return stats.recommendations.map((recommendation) => ({ recommendation })); }
async function main() {
  const { leads, source } = await loadLeads();
  const stats = calculateCommercialFeedbackStats(leads);
  const hasOutcomes = stats.totalContactAttempts > 0 || Object.values(stats.outcomeCounts).some(Boolean);
  const report = {
    generatedAt: new Date().toISOString(),
    inputSource: source,
    message: hasOutcomes ? "Outcome calibration generated." : "No hay outcomes comerciales registrados en la fuente CLI; el reporte se genera vacío y legible.",
    outcomeDefinitions: OUTCOME_DEFINITIONS,
    totals: { leads: leads.length, attempts: stats.totalContactAttempts, contactedLeads: stats.contactedLeads, ...stats.funnel },
    rates: { answeredRate: stats.answeredRate, interestRate: stats.interestRate, meetingRate: stats.meetingRate, proposalRate: stats.proposalRate, closeRate: stats.closeRate, noAnswerRate: stats.noAnswerRate, wrongContactRate: stats.wrongContactRate, doNotContactRate: stats.doNotContactRate, alreadyHasProviderRate: stats.alreadyHasProviderRate, noBudgetRate: stats.noBudgetRate },
    bestSourcesByInterestRate: stats.bestSources,
    bestCategoriesByAnsweredAndInterest: stats.bestCategories,
    bestZonesByMeetings: [...stats.bestLocations].sort((a,b)=>b.meetings-a.meetings || b.interestRate-a.interestRate),
    prioritiesABThatDoNotAnswer: stats.bestPriorities.filter((s)=>["Prioridad A","Prioridad B"].includes(s.name) && s.noAnswerRate >= 50),
    callableLeadsThatDoNotConvert: stats.callableSegments.filter((s)=>s.name.includes("Callable") && s.closeRate === 0),
    signalsThatPredictInterest: stats.gapSegments.filter((s)=>s.interestRate > 0),
    frequentObjections: stats.frequentObjections,
    recommendations: stats.recommendations,
  };
  const outDir = path.join(process.cwd(), "exports", "reports");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "outcome-calibration-latest.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const rows = [["section","name","attempts","answeredRate","interestRate","meetingRate","proposalRate","closeRate","recommendation"],
    ...stats.bestSources.map((r)=>["source",r.name,r.attempts,r.answeredRate,r.interestRate,r.meetingRate,r.proposalRate,r.closeRate,""]),
    ...stats.bestCategories.map((r)=>["category",r.name,r.attempts,r.answeredRate,r.interestRate,r.meetingRate,r.proposalRate,r.closeRate,""]),
    ...stats.bestLocations.map((r)=>["zone",r.name,r.attempts,r.answeredRate,r.interestRate,r.meetingRate,r.proposalRate,r.closeRate,""]),
    ...recRows(stats).map((r)=>["recommendation","", "", "", "", "", "", "", r.recommendation]),
  ];
  await writeFile(path.join(outDir, "outcome-calibration-latest.csv"), `${rows.map((row)=>row.map(csvValue).join(",")).join("\n")}\n`, "utf8");
  console.log(`Outcome calibration report generated. leads=${leads.length} attempts=${stats.totalContactAttempts}`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
