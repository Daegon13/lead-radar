import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { runProspecting } from "../src/lib/prospecting/run-prospecting-job";
const exec = promisify(execFile);
async function main() {
  await exec("npx", ["jiti", "scripts/check-provider-contract.ts"], { timeout: 30_000 });
  const summary = await runProspecting({ input: "tests/fixtures/provider-basic.csv", format: "csv", provider: "csv-local", out: "exports/smoke", minPriority: "D", limit: 5, skipRemote: true, timeoutMs: 15_000 });
  console.log(`Smoke local demo: exported=${summary.exported}, errors=${summary.errors.length}`);
  await exec("npx", ["jiti", "scripts/yield-calibration-report.ts"], { timeout: 30_000 });
  console.log("prospect:smoke OK (sin OSM real ni schedule --all)");
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
