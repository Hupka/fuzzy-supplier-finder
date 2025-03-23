
import React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Company {
  name: string;
  lei: string;
  address: string;
  jurisdiction: string;
  status: string;
  parentLei?: string;
}

interface Supplier {
  [key: string]: string | any;
  company?: Company | null;
}

interface SupplierTableProps {
  suppliers: Supplier[];
  onShowDetails: (supplier: Supplier) => void;
}

const SupplierTable: React.FC<SupplierTableProps> = ({ suppliers, onShowDetails }) => {
  // Count suppliers with match attempts
  const attemptedCount = suppliers.filter(
    (supplier) => supplier.company !== undefined
  ).length;
  const matchedCount = suppliers.filter(
    (supplier) => supplier.company !== null && supplier.company !== undefined
  ).length;

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border/50 bg-background">
      <Table>
        <TableCaption>
          {attemptedCount} match attempts ({matchedCount} successful matches) out of{" "}
          {suppliers.length} suppliers
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Original Name</TableHead>
            <TableHead>Match Result</TableHead>
            <TableHead>Official Company Name</TableHead>
            <TableHead>LEI</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Jurisdiction</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier, index) => (
            <TableRow key={index} className={supplier.company ? "" : "opacity-60"}>
              <TableCell className="font-medium">{supplier.name}</TableCell>
              <TableCell>
                {supplier.company === undefined ? (
                  <span className="text-muted-foreground">Not attempted</span>
                ) : supplier.company === null ? (
                  <span className="text-red-500">No match found</span>
                ) : (
                  <span className="text-green-500">Matched successfully</span>
                )}
              </TableCell>
              <TableCell>
                {supplier.company?.name || (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {supplier.company?.lei || (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {supplier.company?.address || (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {supplier.company?.jurisdiction || (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {supplier.company?.status || (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onShowDetails(supplier)}
                  disabled={!supplier.company}
                >
                  Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SupplierTable;
