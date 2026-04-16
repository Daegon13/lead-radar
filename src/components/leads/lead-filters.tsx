"use client";

import { LEAD_STATUSES } from "@/lib/constants";
import { formatStatus } from "@/lib/utils";
import type { LeadStatus, Priority } from "@/types/lead";

type LeadFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedPriority: "all" | Priority;
  onPriorityChange: (value: "all" | Priority) => void;
  selectedStatus: "all" | LeadStatus;
  onStatusChange: (value: "all" | LeadStatus) => void;
  categories: string[];
};

const PRIORITIES: Array<"all" | Priority> = ["all", "A", "B", "C", "D"];

export function LeadFilters({
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedPriority,
  onPriorityChange,
  selectedStatus,
  onStatusChange,
  categories,
}: LeadFiltersProps) {
  return (
    <div className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-950">
      <label className="space-y-1">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Buscar por nombre</span>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Ej: Panadería"
          className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-zinc-500 dark:border-zinc-700"
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Rubro</span>
        <select
          value={selectedCategory}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-zinc-500 dark:border-zinc-700"
        >
          <option value="all">Todos</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Prioridad</span>
        <select
          value={selectedPriority}
          onChange={(event) => onPriorityChange(event.target.value as "all" | Priority)}
          className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-zinc-500 dark:border-zinc-700"
        >
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority === "all" ? "Todas" : `Prioridad ${priority}`}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Estado</span>
        <select
          value={selectedStatus}
          onChange={(event) => onStatusChange(event.target.value as "all" | LeadStatus)}
          className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-zinc-500 dark:border-zinc-700"
        >
          <option value="all">Todos</option>
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatStatus(status)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
