import { NextResponse } from "next/server";

import { getAiResearcherConfig } from "@/lib/prospecting/ai-researcher";

export async function GET() {
  return NextResponse.json(getAiResearcherConfig());
}
