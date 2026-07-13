import { NextResponse } from "next/server";

import { listRunHistory } from "@/lib/prospecting/run-history";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 100);
  return NextResponse.json({ runs: await listRunHistory({ limit }) });
}
