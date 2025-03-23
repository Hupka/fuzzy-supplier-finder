
import React from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Building2, ArrowRight } from "lucide-react";

export interface CompanyNode {
  lei: string;
  name: string;
  relationship: string;
  jurisdiction?: string;
  status?: string;
  entityCategory?: string;
}

interface CompanyHierarchyProps {
  currentCompany: CompanyNode;
  parentCompany: CompanyNode | null;
  childCompanies: CompanyNode[];
  onSelectCompany: (lei: string) => void;
  isLoading: boolean;
}

const CompanyHierarchy: React.FC<CompanyHierarchyProps> = ({
  currentCompany,
  parentCompany,
  childCompanies,
  onSelectCompany,
  isLoading
}) => {
  return (
    <div className="flex flex-col items-center w-full py-6 space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center h-48 w-full">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          {/* Parent company node */}
          {parentCompany && (
            <div className="flex flex-col items-center">
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex flex-col h-auto py-3 px-4 border-dashed border-2"
                    onClick={() => onSelectCompany(parentCompany.lei)}
                  >
                    <ChevronUp className="h-5 w-5 mb-1 text-muted-foreground" />
                    <span className="text-sm font-medium">{parentCompany.name}</span>
                    <span className="text-xs text-muted-foreground mt-1">{parentCompany.relationship}</span>
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">{parentCompany.name}</h4>
                    <div className="text-xs space-y-1">
                      <div><span className="font-medium">LEI:</span> {parentCompany.lei}</div>
                      {parentCompany.jurisdiction && (
                        <div><span className="font-medium">Jurisdiction:</span> {parentCompany.jurisdiction}</div>
                      )}
                      {parentCompany.status && (
                        <div><span className="font-medium">Status:</span> {parentCompany.status}</div>
                      )}
                      {parentCompany.entityCategory && (
                        <div><span className="font-medium">Entity Type:</span> {parentCompany.entityCategory}</div>
                      )}
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
              <div className="h-6 w-px bg-border"></div>
            </div>
          )}

          {/* Current company node */}
          <div className="relative">
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button
                  variant="default"
                  className="flex flex-col h-auto py-3 px-8 relative z-10 animate-pulse"
                >
                  <Building2 className="h-6 w-6 mb-1" />
                  <span className="text-sm font-medium">{currentCompany.name}</span>
                  <span className="text-xs mt-1">Currently viewing</span>
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium">{currentCompany.name}</h4>
                  <div className="text-xs space-y-1">
                    <div><span className="font-medium">LEI:</span> {currentCompany.lei}</div>
                    {currentCompany.jurisdiction && (
                      <div><span className="font-medium">Jurisdiction:</span> {currentCompany.jurisdiction}</div>
                    )}
                    {currentCompany.status && (
                      <div><span className="font-medium">Status:</span> {currentCompany.status}</div>
                    )}
                    {currentCompany.entityCategory && (
                      <div><span className="font-medium">Entity Type:</span> {currentCompany.entityCategory}</div>
                    )}
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>

            {/* Connection lines for children */}
            {childCompanies.length > 0 && (
              <div className="h-6 w-px bg-border absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full"></div>
            )}
          </div>

          {/* Child companies */}
          {childCompanies.length > 0 && (
            <>
              {childCompanies.length > 1 && (
                <div className="h-px bg-border w-full max-w-sm"></div>
              )}
              
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {childCompanies.map((child) => (
                  <div key={child.lei} className="flex flex-col items-center">
                    {childCompanies.length === 1 && <div className="h-6 w-px bg-border"></div>}
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex flex-col h-auto py-3 px-4"
                          onClick={() => onSelectCompany(child.lei)}
                        >
                          <ChevronDown className="h-5 w-5 mb-1 text-muted-foreground" />
                          <span className="text-sm font-medium">{child.name}</span>
                          <span className="text-xs text-muted-foreground mt-1">{child.relationship || "Subsidiary"}</span>
                        </Button>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-medium">{child.name}</h4>
                          <div className="text-xs space-y-1">
                            <div><span className="font-medium">LEI:</span> {child.lei}</div>
                            {child.jurisdiction && (
                              <div><span className="font-medium">Jurisdiction:</span> {child.jurisdiction}</div>
                            )}
                            {child.status && (
                              <div><span className="font-medium">Status:</span> {child.status}</div>
                            )}
                            {child.entityCategory && (
                              <div><span className="font-medium">Entity Type:</span> {child.entityCategory}</div>
                            )}
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* No relationships message */}
          {!parentCompany && childCompanies.length === 0 && (
            <div className="text-sm text-muted-foreground mt-4">
              No parent or subsidiary relationships found for this company.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CompanyHierarchy;
