
import React, { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { 
  ChevronDown, 
  ChevronUp, 
  RefreshCcw, 
  Search, 
  Filter,
  X
} from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

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
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>(suppliers);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // "all", "matched", "not-matched", "not-attempted"
  const [pendingMatches, setPendingMatches] = useState<Set<string>>(new Set());

  // Count suppliers with match attempts
  const attemptedCount = suppliers.filter(
    (supplier) => supplier.company !== undefined
  ).length;
  const matchedCount = suppliers.filter(
    (supplier) => supplier.company !== null && supplier.company !== undefined
  ).length;
  const successRate = attemptedCount > 0 ? Math.round((matchedCount / attemptedCount) * 100) : 0;

  useEffect(() => {
    // Apply filters whenever the suppliers, searchTerm, or filterStatus changes
    let result = [...suppliers];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(
        (supplier) => 
          supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (supplier.company?.name && 
            supplier.company.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply status filter
    if (filterStatus !== "all") {
      switch (filterStatus) {
        case "matched":
          result = result.filter(
            (supplier) => supplier.company !== null && supplier.company !== undefined
          );
          break;
        case "not-matched":
          result = result.filter(
            (supplier) => supplier.company === null
          );
          break;
        case "not-attempted":
          result = result.filter(
            (supplier) => supplier.company === undefined
          );
          break;
      }
    }
    
    setFilteredSuppliers(result);
  }, [suppliers, searchTerm, filterStatus]);

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
      const allIndices = new Set(filteredSuppliers.map((_, index) => index));
      setExpandedRows(allIndices);
    }
    setAllExpanded(!allExpanded);
  };

  const refetchSupplier = async (supplier: Supplier, index: number) => {
    // Check if we're already fetching this supplier to prevent duplicate requests
    if (pendingMatches.has(supplier.name)) {
      return; // Already in progress, don't start another request
    }

    try {
      // Add supplier to pending matches
      setPendingMatches(prev => new Set(prev).add(supplier.name));
      
      // Display a single loading toast with an ID we can reference later
      const toastId = toast.loading(`Attempting to match ${supplier.name}...`);
      
      // Encode the supplier name for the URL
      const encodedName = encodeURIComponent(supplier.name);
      const url = `https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=${encodedName}&page[size]=1`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const record = data.data[0];
        const attributes = record.attributes;
        const entity = attributes.entity;
        const legalAddress = entity.legalAddress;
        
        // Format address from components
        const addressParts = [
          legalAddress.addressLines?.join(', '),
          legalAddress.city,
          legalAddress.postalCode,
          legalAddress.country
        ].filter(Boolean);
        
        const formattedAddress = addressParts.join(', ');
        
        // Add the company data to the supplier object
        supplier.company = {
          name: entity.legalName.name,
          lei: record.id,
          address: formattedAddress,
          jurisdiction: entity.legalJurisdiction,
          status: attributes.registration.status,
          parentLei: entity.headquarters?.lei || undefined,
          legalForm: entity.legalForm?.name,
          registrationAuthority: attributes.registration.managingLou,
          nextRenewalDate: attributes.registration.nextRenewalDate,
          initialRegistrationDate: attributes.registration.initialRegistrationDate,
          lastUpdateDate: attributes.registration.lastUpdateDate,
          entityCategory: entity.category?.name
        };
        
        // Update the loading toast to success (replacing it)
        toast.success(`Successfully matched ${supplier.name}`, {
          id: toastId,
        });
      } else {
        // Mark as unmatched
        supplier.company = null;
        // Update the loading toast to error (replacing it)
        toast.error(`No match found for ${supplier.name}`, {
          id: toastId,
        });
      }
      
      // Force a re-render by creating a new suppliers array
      setFilteredSuppliers([...filteredSuppliers]);
      
    } catch (error) {
      console.error(`Error matching supplier ${supplier.name}:`, error);
      supplier.company = null;
      // Show error toast
      toast.error(`Error matching ${supplier.name}`);
      setFilteredSuppliers([...filteredSuppliers]);
    } finally {
      // Remove supplier from pending matches when done
      setPendingMatches(prev => {
        const newSet = new Set(prev);
        newSet.delete(supplier.name);
        return newSet;
      });
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border/50 bg-background">
      <div className="p-4 flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search suppliers..."
              className="w-full md:w-60 pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative inline-flex items-center">
            <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <select
              className="h-10 rounded-md border border-input bg-background px-8 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All suppliers</option>
              <option value="matched">Matched</option>
              <option value="not-matched">Not matched</option>
              <option value="not-attempted">Not attempted</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium mr-2">
            Success rate: <span className="text-green-500">{successRate}%</span> ({matchedCount}/{attemptedCount})
          </div>
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
      </div>
      <Table>
        <TableCaption>
          {filteredSuppliers.length} suppliers shown (from total of {suppliers.length})
        </TableCaption>
        <TableHeader>
          <TableRow className="h-10">
            <TableHead className="w-[180px]">Original Name</TableHead>
            <TableHead className="w-[140px]">Match Result</TableHead>
            <TableHead className="w-[180px]">Official Company Name</TableHead>
            <TableHead className="w-[140px]">LEI</TableHead>
            <TableHead className="w-[180px]">Address</TableHead>
            <TableHead className="w-[100px]">Jurisdiction</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSuppliers.map((supplier, index) => (
            <React.Fragment key={index}>
              <TableRow className={`h-10 ${supplier.company ? "" : "opacity-75"}`}>
                <TableCell className="font-medium py-2">
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="max-w-[140px] truncate inline-block">
                            {supplier.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{supplier.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-2">
                    {supplier.company === undefined ? (
                      <>
                        <span className="text-muted-foreground text-xs">Not attempted</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => refetchSupplier(supplier, index)}
                          disabled={pendingMatches.has(supplier.name)}
                        >
                          <RefreshCcw className={`h-3 w-3 ${pendingMatches.has(supplier.name) ? 'animate-spin' : ''}`} />
                        </Button>
                      </>
                    ) : supplier.company === null ? (
                      <>
                        <span className="text-red-500 text-xs flex items-center gap-1">
                          <X className="h-3 w-3" />
                          No match
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => refetchSupplier(supplier, index)}
                          disabled={pendingMatches.has(supplier.name)}
                        >
                          <RefreshCcw className={`h-3 w-3 ${pendingMatches.has(supplier.name) ? 'animate-spin' : ''}`} />
                        </Button>
                      </>
                    ) : (
                      <span className="text-green-500 text-xs">Matched</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="max-w-[140px] truncate inline-block">
                          {supplier.company?.name || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>
                      </TooltipTrigger>
                      {supplier.company?.name && (
                        <TooltipContent>
                          <p>{supplier.company.name}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="py-2 font-mono text-xs">
                  {supplier.company?.lei || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="max-w-[140px] truncate inline-block">
                          {supplier.company?.address || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>
                      </TooltipTrigger>
                      {supplier.company?.address && (
                        <TooltipContent>
                          <p>{supplier.company.address}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="py-2">
                  {supplier.company?.jurisdiction || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  {supplier.company?.status || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right py-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onShowDetails(supplier)}
                    disabled={!supplier.company}
                    className="h-7 px-2 text-xs"
                  >
                    Details
                  </Button>
                </TableCell>
              </TableRow>
              {expandedRows.has(index) && supplier.company && (
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={8} className="p-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium mb-2 text-xs">Additional Information</h4>
                        <dl className="grid grid-cols-[100px_1fr] gap-1 text-xs">
                          <dt className="text-muted-foreground">Legal Form:</dt>
                          <dd>{supplier.company.legalForm || "—"}</dd>
                          
                          <dt className="text-muted-foreground">Entity Category:</dt>
                          <dd>{supplier.company.entityCategory || "—"}</dd>
                          
                          <dt className="text-muted-foreground">Registration:</dt>
                          <dd>{supplier.company.registrationAuthority || "—"}</dd>
                        </dl>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2 text-xs">Registration Dates</h4>
                        <dl className="grid grid-cols-[100px_1fr] gap-1 text-xs">
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
