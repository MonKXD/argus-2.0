"use client";

import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import { confidenceLabel } from "@/lib/confidence";
import { formatDate } from "@/lib/format";
import type { Analysis } from "@/lib/schema/analysis";
import type { AnalysisStatus } from "@/lib/schema/enums";

import type { ColumnDef } from "@tanstack/react-table";

// FR-DSH-01: "List analyses with name, stage, sector, score, confidence,
// status, updated time." DESIGN section 5.2: table is the dominant element.

const STATUS_LABEL: Record<AnalysisStatus, string> = {
  DRAFT: "Draft",
  READY: "Ready",
  PROCESSING: "Processing",
  COMPLETE: "Complete",
  PARTIAL: "Partial",
  FAILED: "Failed",
};

const columns: ColumnDef<Analysis>[] = [
  {
    accessorKey: "startup.name",
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/app/analyses/${row.original.id}`}
        className="text-foreground hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {row.original.startup.name}
      </Link>
    ),
  },
  {
    accessorKey: "startup.stage",
    header: "Stage",
    cell: ({ row }) => row.original.startup.stage,
  },
  {
    accessorKey: "startup.sector",
    header: "Sector",
    cell: ({ row }) => row.original.startup.sector ?? "—",
  },
  {
    id: "score",
    accessorFn: (row) => row.latest?.overallScore ?? -1,
    header: "Score",
    meta: { numeric: true },
    cell: ({ row }) => {
      const latest = row.original.latest;
      if (!latest || latest.overallScore === null) return "—";
      return (
        <span className="tabular-nums">
          {latest.overallScore}{" "}
          <span className="text-mist">({confidenceLabel(latest.confidence)})</span>
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => STATUS_LABEL[row.original.status],
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
];

interface AnalysesTableProps {
  analyses: Analysis[];
}

function AnalysesTable({ analyses }: AnalysesTableProps) {
  return <DataTable columns={columns} data={analyses} emptyMessage="No analyses yet." />;
}

export { AnalysesTable };
