"use client";

import Link from "next/link";
import { type ChangeEvent, useRef, useState } from "react";

import { useLeads } from "@/hooks/use-leads";
import {
  exportLeadsAsJson,
  importLeadsFromCsv,
  importLeadsFromJson,
  type LeadImportResult,
} from "@/lib/storage";

export default function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { leads, isLoaded, replaceLeads, resetLeads } = useLeads();

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [preview, setPreview] = useState<LeadImportResult | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");

  function handleExport() {
    const serialized = exportLeadsAsJson(leads);
    const blob = new Blob([serialized], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(blob);
    const fileName = `lead-radar-export-${new Date().toISOString().slice(0, 10)}.json`;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(downloadUrl);

    setFeedback({ type: "success", message: `Exportación completada (${leads.length} leads).` });
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    let rawText = "";

    try {
      rawText = await selectedFile.text();
    } catch {
      setFeedback({ type: "error", message: "No se pudo leer el archivo seleccionado." });
      event.target.value = "";
      return;
    }

    const parsed =
      selectedFile.name.toLowerCase().endsWith(".csv")
        ? importLeadsFromCsv(rawText)
        : importLeadsFromJson(rawText);

    if (!parsed.leads || parsed.error) {
      setFeedback({
        type: "error",
        message: parsed.error ?? "No se pudo importar el archivo.",
      });
      setPreview(null);
      setPreviewFileName("");
      event.target.value = "";
      return;
    }

    setPreview(parsed);
    setPreviewFileName(selectedFile.name);
    setFeedback(null);
    event.target.value = "";
  }

  function handleConfirmImport() {
    if (!preview?.leads) {
      return;
    }

    replaceLeads(preview.leads);
    setFeedback({ type: "success", message: `Importación completa: ${preview.leads.length} leads cargados.` });
    setPreview(null);
    setPreviewFileName("");
  }

  function handleCancelImport() {
    setPreview(null);
    setPreviewFileName("");
    setFeedback({ type: "success", message: "Importación cancelada. No se aplicaron cambios." });
  }

  function handleReset() {
    const confirmed = window.confirm(
      "Vas a eliminar todos los leads guardados localmente en este navegador. Esta acción no se puede deshacer. ¿Continuar?",
    );

    if (!confirmed) {
      return;
    }

    resetLeads();
    setFeedback({ type: "success", message: "Datos reseteados. Ahora tenés un estado local vacío." });
  }

  if (!isLoaded) {
    return <p className="text-sm text-zinc-500">Cargando configuración...</p>;
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <Link href="/leads" className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
          ← Volver a leads
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Gestión local de datos: exportación, restauración desde JSON y reset del estado.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Estado local</h2>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">Leads guardados actualmente: {leads.length}</p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Exportar</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Descargá una copia completa de tus leads en JSON.</p>
        <button
          type="button"
          onClick={handleExport}
          className="mt-3 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Exportar JSON
        </button>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Importar</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Seleccioná un archivo JSON o CSV para previsualizarlo antes de reemplazar tus leads.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Elegir archivo JSON/CSV
          </button>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">La importación confirmada reemplaza el estado actual.</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,text/csv,.csv"
          onChange={handleImport}
          className="sr-only"
        />

        {preview ? (
          <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <h3 className="font-medium text-zinc-800 dark:text-zinc-100">Previsualización: {previewFileName}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
              <li>Total de registros: {preview.preview.total}</li>
              <li>Válidos: {preview.preview.valid}</li>
              <li>Descartados: {preview.preview.discarded.length}</li>
            </ul>

            {preview.preview.discarded.length > 0 ? (
              <ul className="mt-3 max-h-32 list-disc space-y-1 overflow-y-auto pl-5 text-xs text-rose-700 dark:text-rose-300">
                {preview.preview.discarded.map((discard, index) => (
                  <li key={`${discard.row}-${discard.reason}-${index}`}>
                    {discard.row > 0 ? `Registro ${discard.row}: ` : ""}{discard.reason}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleConfirmImport}
                className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600"
              >
                Confirmar importación
              </button>
              <button
                type="button"
                onClick={handleCancelImport}
                className="rounded-md border border-zinc-300 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-rose-300 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">Resetear datos</h2>
        <p className="mt-2 text-sm text-rose-700/90 dark:text-rose-200/90">
          Elimina todos los leads almacenados localmente en este navegador.
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="mt-3 rounded-md bg-rose-700 px-3 py-2 text-sm font-medium text-white hover:bg-rose-600 dark:bg-rose-500 dark:text-zinc-950 dark:hover:bg-rose-400"
        >
          Resetear datos locales
        </button>
      </section>

      {feedback ? (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
          }`}
          role="status"
        >
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
