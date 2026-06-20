import { NextResponse } from "next/server";

import { getRunHistoryDetail, saveRunReviewState } from "@/lib/prospecting/run-history";

export const runtime = "nodejs";

type Context = { params: Promise<{ runId: string }> };

export async function GET(_request: Request, context: Context) {
  const { runId } = await context.params;
  const run = await getRunHistoryDetail(runId);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  return NextResponse.json({ run });
}

export async function POST(request: Request, context: Context) {
  const { runId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Parameters<typeof saveRunReviewState>[1];
  const state = await saveRunReviewState(runId, body);
  return NextResponse.json({ reviewState: state });
}
