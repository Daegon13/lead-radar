import { NextResponse } from "next/server";

import { listRunHistory } from "@/lib/prospecting/run-history";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ runs: await listRunHistory() });
}
