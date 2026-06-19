import { NextResponse } from "next/server";

import { getEnabledProspectingJobs } from "@/lib/prospecting/jobs/registry";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ jobs: getEnabledProspectingJobs() });
}
