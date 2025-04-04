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
  X,
  Network,
  GitBranch,
  Share2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getStatusDescription } from "@/utils/companyUtils";

interface CompanyRelationships {
  directParent?: {
    reportingException?: string;
    related?: string;
    reason?: string;
    leiRecord?: string;
    relationshipRecord?: string;
  };
  ultimateParent?: {
    reportingException?: string;
    related?: string;
    reason?: string;
    leiRecord?: string;
    relationshipRecord?: string;
  };
  directChildren?: {
    related?: string;
    relationshipRecords?: string;
  };
}

interface Company {
  name: string;
  lei: string;
  address: string;
  jurisdiction: string;
  entityStatus: string;
  registrationStatus: string;
  parentLei?: string;
  legalForm?: string;
  legalFormId?: string;
  registrationAuthority?: string;
  nextRenewalDate?: string;
  initialRegistrationDate?: string;
  lastUpdateDate?: string;
  entityCategory?: string;
  hasDirectParent: boolean;
  hasUltimateParent: boolean;
  hasChildren: boolean;
  directParentException?: boolean;
  ultimateParentException?: boolean;
  relationships?: CompanyRelationships;
  bic?: string[];
  headquartersAddress?: string | null;
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

  const attemptedCount = suppliers.filter(
    (supplier) => supplier.company !== undefined
  ).length;
  const matchedCount = suppliers.filter(
    (supplier) => supplier.company !== null && supplier.company !== undefined
  ).length;
  const successRate = attemptedCount > 0 ? Math.round((matchedCount / attemptedCount) * 100) : 0;

  useEffect(() => {
    let result = [...suppliers];
    
    if (searchTerm) {
      result = result.filter(
        (supplier) => 
          supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (supplier.company?.name && 
            supplier.company.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
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
    if (pendingMatches.has(supplier.name)) {
      return;
    }

    try {
      setPendingMatches(prev => new Set(prev).add(supplier.name));
      
      const toastId = toast.loading(`Attempting to match ${supplier.name}...`);
      
      const encodedName = encodeURIComponent(supplier.name);
      const url = `https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=${encodedName}&page[size]=1`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const record = data.data[0];
        const attributes = record.attributes;
        const entity = attributes.entity;
        const legalAddress = entity.legalAddress;
        
        const addressParts = [
          legalAddress.addressLines?.join(', '),
          legalAddress.city,
          legalAddress.region,
          legalAddress.postalCode,
          legalAddress.country
        ].filter(Boolean);
        
        const formattedAddress = addressParts.join(', ');
        
        const headquartersAddress = entity.headquartersAddress ? [
          entity.headquartersAddress.addressLines?.join(', '),
          entity.headquartersAddress.city,
          entity.headquartersAddress.region,
          entity.headquartersAddress.postalCode,
          entity.headquartersAddress.country
        ].filter(Boolean).join(', ') : null;
        
        const relationships: CompanyRelationships = {};
        
        let hasDirectParent = false;
        let directParentException = false;

        if (record.relationships?.["direct-parent"]) {
          const directParentLinks = record.relationships["direct-parent"].links || {};
          
          relationships.directParent = {};
          
          if (directParentLinks["lei-record"]) {
            relationships.directParent.leiRecord = directParentLinks["lei-record"];
            hasDirectParent = true;
          }
          
          if (directParentLinks["relationship-record"]) {
            relationships.directParent.relationshipRecord = directParentLinks["relationship-record"];
            hasDirectParent = directParentLinks["lei-record"] ? hasDirectParent : false;
          }
          
          if (directParentLinks["reporting-exception"]) {
            relationships.directParent.reportingException = directParentLinks["reporting-exception"];
            directParentException = true;
            hasDirectParent = false;
          }
          
          if (directParentLinks["related"]) {
            relationships.directParent.related = directParentLinks["related"];
            hasDirectParent = directParentLinks["lei-record"] ? hasDirectParent : false;
          }
        }
        
        let hasUltimateParent = false;
        let ultimateParentException = false;

        if (record.relationships?.["ultimate-parent"]) {
          const ultimateParentLinks = record.relationships["ultimate-parent"].links || {};
          
          relationships.ultimateParent = {};
          
          if (ultimateParentLinks["lei-record"]) {
            relationships.ultimateParent.leiRecord = ultimateParentLinks["lei-record"];
            hasUltimateParent = true;
          }
          
          if (ultimateParentLinks["relationship-record"]) {
            relationships.ultimateParent.relationshipRecord = ultimateParentLinks["relationship-record"];
            hasUltimateParent = ultimateParentLinks["lei-record"] ? hasUltimateParent : false;
          }
          
          if (ultimateParentLinks["reporting-exception"]) {
            relationships.ultimateParent.reportingException = ultimateParentLinks["reporting-exception"];
            ultimateParentException = true;
            hasUltimateParent = false;
          }
          
          if (ultimateParentLinks["related"]) {
            relationships.ultimateParent.related = ultimateParentLinks["related"];
            hasUltimateParent = ultimateParentLinks["lei-record"] ? hasUltimateParent : false;
          }
        }
        
        let hasChildren = false;
        if (record.relationships?.["direct-children"]) {
          const directChildrenLinks = record.relationships["direct-children"].links || {};
          
          relationships.directChildren = {};
          
          if (directChildrenLinks["related"]) {
            relationships.directChildren.related = directChildrenLinks["related"];
            hasChildren = true;
          }
          
          if (directChildrenLinks["relationship-records"]) {
            relationships.directChildren.relationshipRecords = directChildrenLinks["relationship-records"];
          }
        }
        
        const legalFormString = entity.legalForm && entity.legalForm.id
          ? `${entity.legalForm.id}${entity.legalForm.other ? ` - ${entity.legalForm.other}` : ''}`
          : undefined;
        
        const entityCategoryString = entity.category
          ? entity.category
          : undefined;
        
        supplier.company = {
          name: entity.legalName.name,
          lei: record.id,
          address: formattedAddress,
          jurisdiction: entity.jurisdiction,
          entityStatus: entity.status,
          registrationStatus: attributes.registration.status,
          parentLei: entity.associatedEntity?.lei || undefined,
          legalForm: legalFormString,
          legalFormId: entity.legalForm?.id,
          registrationAuthority: attributes.registration.managingLou,
          nextRenewalDate: attributes.registration.nextRenewalDate,
          initialRegistrationDate: attributes.registration.initialRegistrationDate,
          lastUpdateDate: attributes.registration.lastUpdateDate,
          entityCategory: entityCategoryString,
          hasDirectParent,
          hasUltimateParent,
          hasChildren,
          directParentException,
          ultimateParentException,
          relationships: relationships,
          bic: attributes.bic || [],
          headquartersAddress: headquartersAddress
        };
        
        try {
          const childrenUrl = `https://api.gleif.org/api/v1/lei-records?filter[entity.parent.lei]=${record.id}&page[size]=1`;
          const childrenResponse = await fetch(childrenUrl);
          const childrenData = await childrenResponse.json();
          
          const hasChildren = !!(childrenData.data && childrenData.data.length > 0);
          supplier.company.hasChildren = hasChildren;
          
        } catch (error) {
          console.error("Error checking for children:", error);
          supplier.company.hasChildren = false;
        }
        
        toast.success(`Successfully matched ${supplier.name}`, {
          id: toastId,
        });
      } else {
        supplier.company = null;
        toast.error(`No match found for ${supplier.name}`, {
          id: toastId,
        });
      }
      
      setFilteredSuppliers([...filteredSuppliers]);
      
    } catch (error) {
      console.error(`Error matching supplier ${supplier.name}:`, error);
      supplier.company = null;
      toast.error(`Error matching ${supplier.name}`);
      setFilteredSuppliers([...filteredSuppliers]);
    } finally {
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
            <TableHead className="w-[420px]">Company Information</TableHead>
            <TableHead className="w-[160px]">Match Result</TableHead>
            <TableHead className="w-[180px]">Address</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[120px]">Relationships</TableHead>
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
                    
                    <div className="flex flex-col">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {supplier.company ? (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 justify-start font-medium text-sm text-left hover:no-underline group"
                                onClick={() => onShowDetails(supplier)}
                              >
                                <span className="max-w-[220px] truncate group-hover:text-primary">
                                  {supplier.name}
                                </span>
                              </Button>
                            ) : (
                              <span className="max-w-[220px] truncate inline-block">
                                {supplier.name}
                              </span>
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{supplier.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {supplier.company && (
                        <div className="text-xs font-mono text-muted-foreground mt-1">
                          {supplier.company.lei}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-2">
                    {supplier.company === undefined ? (
                      <>
                        <span className="text-muted-foreground text-xs whitespace-nowrap">Not attempted</span>
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
                  {supplier.company?.registrationStatus ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`px-2 py-0.5 rounded-full text-xs inline-flex items-center
                            ${supplier.company.registrationStatus === 'ISSUED' 
                              ? 'bg-green-100 text-green-800' 
                              : supplier.company.registrationStatus === 'LAPSED' 
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-800'}`}
                          >
                            {supplier.company.registrationStatus}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{getStatusDescription(supplier.company.registrationStatus)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  {supplier.company ? (
                    <div className="flex gap-2">
                      {supplier.company.hasDirectParent && !supplier.company.directParentException && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center text-blue-500">
                                <GitBranch className="h-4 w-4" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Has direct parent</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {supplier.company.directParentException && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center text-amber-500">
                                <AlertCircle className="h-4 w-4" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Direct parent exception</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {supplier.company.hasUltimateParent && !supplier.company.ultimateParentException && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center text-indigo-500">
                                <Share2 className="h-4 w-4" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Has ultimate parent</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {supplier.company.ultimateParentException && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center text-amber-500">
                                <AlertCircle className="h-4 w-4" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ultimate parent exception</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {supplier.company.hasChildren && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center text-green-500">
                                <ChevronDown className="h-4 w-4" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Has subsidiaries</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {!supplier.company.hasDirectParent && 
                       !supplier.company.hasUltimateParent && 
                       !supplier.company.hasChildren &&
                       !supplier.company.directParentException &&
                       !supplier.company.ultimateParentException && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center text-gray-400">
                                <Network className="h-4 w-4" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>No parent or subsidiary relationships</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
              {expandedRows.has(index) && supplier.company && (
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={5} className="p-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium mb-2 text-xs">Additional Information</h4>
                        <dl className="grid grid-cols-[120px_1fr] gap-1 text-xs">
                          <dt className="text-muted-foreground">Legal Form:</dt>
                          <dd>{supplier.company.legalForm || "Not available"}</dd>
                          
                          <dt className="text-muted-foreground">Entity Category:</dt>
                          <dd>{supplier.company.entityCategory || "Not available"}</dd>
                          
                          <dt className="text-muted-foreground">Registration:</dt>
                          <dd>{supplier.company.registrationAuthority || "Not available"}</dd>
                        </dl>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2 text-xs">Registration Dates</h4>
                        <dl className="grid grid-cols-[120px_1fr] gap-1 text-xs">
                          <dt className="text-muted-foreground">Initial:</dt>
                          <dd>{supplier.company.initialRegistrationDate ? 
                            new Date(supplier.company.initialRegistrationDate).toLocaleDateString() : "Not available"}</dd>
                          
                          <dt className="text-muted-foreground">Last Update:</dt>
                          <dd>{supplier.company.lastUpdateDate ? 
                            new Date(supplier.company.lastUpdateDate).toLocaleDateString() : "Not available"}</dd>
                          
                          <dt className="text-muted-foreground">Next Renewal:</dt>
                          <dd>{supplier.company.nextRenewalDate ? 
                            new Date(supplier.company.nextRenewalDate).toLocaleDateString() : "Not available"}</dd>
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
