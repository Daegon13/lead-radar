import { NextResponse } from "next/server";

import { getAiResearcherConfig, researchLeadWithAi } from "@/lib/prospecting/ai-researcher";
import type { Lead } from "@/types/lead";

function isLeadLike(value: unknown): value is Lead {
  return typeof value === "object" && value !== null && typeof (value as Lead).id === "string" && typeof (value as Lead).businessName === "string";
}

export async function POST(request: Request) {
  const config = getAiResearcherConfig();
  if (config.status !== "configured") {
    return NextResponse.json({ error: config.status, config }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as { lead?: unknown } | null;
  if (!body || !isLeadLike(body.lead)) {
    return NextResponse.json({ error: "invalid_lead" }, { status: 400 });
  }

  try {
    const research = await researchLeadWithAi(body.lead);
    return NextResponse.json({ research });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI enrichment failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
