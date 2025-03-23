
import React, { useState } from "react";
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
import { ChevronDown, ChevronUp } from "lucide-react";

interface Company {
  name: string;
  lei: string;
  address: string;
  jurisdiction: string;
  status: string;
  parentLei?: string;
  legalForm?: string;
  registrationAuthority?: string;
  nextRenewalDate?: string;
  initialRegistrationDate?: string;
  lastUpdateDate?: string;
  entityCategory?: string;
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
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  // Count suppliers with match attempts
  const attemptedCount = suppliers.filter(
    (supplier) => supplier.company !== undefined
  ).length;
  const matchedCount = suppliers.filter(
    (supplier) => supplier.company !== null && supplier.company !== undefined
  ).length;

  const toggleRow = (index: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(index)) {
      newExpandedRows.delete(index);
    } else {
      newExpandedRows.add(index);
    }
    setExpandedRows(newExpandedRows);
  };

  const toggleAllRows = () => {
    if (allExpanded) {
      setExpandedRows(new Set());
    } else {
      const allIndices = new Set(suppliers.map((_, index) => index));
      setExpandedRows(allIndices);
    }
    setAllExpanded(!allExpanded);
  };

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border/50 bg-background">
      <div className="p-4 flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={toggleAllRows}
          className="flex items-center gap-1"
        >
          {allExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" /> Collapse All
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" /> Expand All
            </>
          )}
        </Button>
      </div>
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
            <React.Fragment key={index}>
              <TableRow className={supplier.company ? "" : "opacity-60"}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {supplier.company && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleRow(index)}
                      >
                        {expandedRows.has(index) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {supplier.name}
                  </div>
                </TableCell>
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
              {expandedRows.has(index) && supplier.company && (
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={8} className="p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium mb-2">Additional Information</h4>
                        <dl className="grid grid-cols-[120px_1fr] gap-1">
                          <dt className="text-muted-foreground">Legal Form:</dt>
                          <dd>{supplier.company.legalForm || "—"}</dd>
                          
                          <dt className="text-muted-foreground">Entity Category:</dt>
                          <dd>{supplier.company.entityCategory || "—"}</dd>
                          
                          <dt className="text-muted-foreground">Registration:</dt>
                          <dd>{supplier.company.registrationAuthority || "—"}</dd>
                        </dl>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Registration Dates</h4>
                        <dl className="grid grid-cols-[120px_1fr] gap-1">
                          <dt className="text-muted-foreground">Initial:</dt>
                          <dd>{supplier.company.initialRegistrationDate ? 
                            new Date(supplier.company.initialRegistrationDate).toLocaleDateString() : "—"}</dd>
                          
                          <dt className="text-muted-foreground">Last Update:</dt>
                          <dd>{supplier.company.lastUpdateDate ? 
                            new Date(supplier.company.lastUpdateDate).toLocaleDateString() : "—"}</dd>
                          
                          <dt className="text-muted-foreground">Next Renewal:</dt>
                          <dd>{supplier.company.nextRenewalDate ? 
                            new Date(supplier.company.nextRenewalDate).toLocaleDateString() : "—"}</dd>
                        </dl>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SupplierTable;
