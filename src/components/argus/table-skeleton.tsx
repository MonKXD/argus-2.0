import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

// DESIGN section 6: Skeleton is "static Surface tone at final layout size;
// no shimmer." Table rows are 40px (DESIGN section 3.5), matching
// TableRow's own h-10 — sized to the real AnalysesTable, not guessed.

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
  return (
    <Table>
      <TableBody>
        {Array.from({ length: rows }, (_, row) => (
          <TableRow key={row}>
            {Array.from({ length: columns }, (_, col) => (
              <TableCell key={col}>
                <Skeleton className="h-4 w-24" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export { TableSkeleton };
export type { TableSkeletonProps };
