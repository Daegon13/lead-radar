import { NextResponse } from "next/server";

import { getProspectingJobById, jobToRunOptions } from "@/lib/prospecting/jobs/registry";
import { runProspecting } from "@/lib/prospecting/run-prospecting-job";

export const runtime = "nodejs";

type RunJobRequest = {
  jobId?: unknown;
};

export async function POST(request: Request) {
  let body: RunJobRequest;

  try {
    body = (await request.json()) as RunJobRequest;
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  if (typeof body.jobId !== "string" || body.jobId.trim() === "") {
    return NextResponse.json({ error: "jobId es requerido." }, { status: 400 });
  }

  const job = getProspectingJobById(body.jobId);
  if (!job) {
    return NextResponse.json({ error: "Job no registrado o deshabilitado." }, { status: 404 });
  }

  try {
    const summary = await runProspecting(jobToRunOptions(job));
    return NextResponse.json({ job, summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo ejecutar el job." },
      { status: 500 },
    );
  }
}
