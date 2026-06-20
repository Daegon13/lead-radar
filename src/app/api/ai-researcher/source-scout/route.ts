import { NextResponse } from "next/server";

import { getAiResearcherConfig } from "@/lib/prospecting/ai-researcher";
import { scoutPublicSourcesWithAi } from "@/lib/prospecting/ai-source-scout";

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const config = getAiResearcherConfig();
  if (config.status !== "configured") {
    return NextResponse.json({ error: config.status, config }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const country = asText(body?.country);
  const city = asText(body?.city);
  const zone = asText(body?.zone);
  const category = asText(body?.category);
  const maxSources = typeof body?.maxSources === "number" ? body.maxSources : Number(body?.maxSources);

  if (!country || !city || !category) {
    return NextResponse.json({ error: "invalid_source_scout_input" }, { status: 400 });
  }

  try {
    const result = await scoutPublicSourcesWithAi({ country, city, zone, category, maxSources });
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI source scout failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
