import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DataTable } from "@/components/ui/data-table";

import type { ColumnDef } from "@tanstack/react-table";

interface Row {
  name: string;
  score: number;
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "score", header: "Score", meta: { numeric: true } },
];

const data: Row[] = [
  { name: "Beta", score: 58 },
  { name: "Alpha", score: 71 },
];

function bodyRows() {
  const table = screen.getByRole("table");
  return within(table).getAllByRole("row").slice(1);
}

describe("DataTable", () => {
  it("renders rows in the given order by default", () => {
    render(<DataTable columns={columns} data={data} />);

    const rows = bodyRows();
    expect(within(rows[0]).getByText("Beta")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Alpha")).toBeInTheDocument();
  });

  it("sorts rows when a sortable header is clicked", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} />);

    await user.click(screen.getByRole("button", { name: "Name" }));

    const rows = bodyRows();
    expect(within(rows[0]).getByText("Alpha")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Beta")).toBeInTheDocument();
  });

  it("right-aligns and marks numeric columns tabular", () => {
    render(<DataTable columns={columns} data={data} />);

    const rows = bodyRows();
    const scoreCell = within(rows[0]).getAllByRole("cell")[1];
    expect(scoreCell.className).toContain("text-right");
    expect(scoreCell.className).toContain("tabular-nums");
  });

  it("shows the empty message when there are no rows", () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="No analyses yet." />);

    expect(screen.getByText("No analyses yet.")).toBeInTheDocument();
  });
});
