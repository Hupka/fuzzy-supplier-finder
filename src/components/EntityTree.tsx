
import React, { useState, useEffect } from "react";
import { fetchCorporateHierarchy } from "@/utils/companyUtils";
import { Network, Share2, GitBranch } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface EntityNode {
  lei: string;
  name: string;
  jurisdiction?: string;
  status?: string;
  relationship?: string;
}

interface EntityTreeProps {
  company: any;
  onSelectEntity?: (lei: string) => void;
}

const EntityTree: React.FC<EntityTreeProps> = ({ company, onSelectEntity }) => {
  const [hierarchyData, setHierarchyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHierarchy = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const hierarchy = await fetchCorporateHierarchy(company);
        setHierarchyData(hierarchy);
      } catch (err) {
        console.error("Error loading entity hierarchy:", err);
        setError("Failed to load the corporate hierarchy");
        toast.error("Failed to load the corporate hierarchy");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (company) {
      loadHierarchy();
    }
  }, [company]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-60 w-full">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-3 text-sm text-muted-foreground">Loading entity hierarchy...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (!hierarchyData) {
    return (
      <div className="p-4 border rounded-md">
        <p className="text-sm text-muted-foreground">No hierarchy data available</p>
      </div>
    );
  }

  // If there's no parent or children, display a message
  const hasNoRelationships = 
    !hierarchyData.directParent && 
    !hierarchyData.ultimateParent && 
    (!hierarchyData.children || hierarchyData.children.length === 0);

  if (hasNoRelationships) {
    return (
      <div className="p-4 border rounded-md flex items-center justify-center">
        <Network className="h-5 w-5 text-muted-foreground mr-2" />
        <p className="text-sm text-muted-foreground">This entity has no parent or child relationships</p>
      </div>
    );
  }

  const handleEntityClick = (lei: string) => {
    if (onSelectEntity) {
      onSelectEntity(lei);
    }
  };

  return (
    <div className="entity-tree p-2">
      {/* Ultimate Parent if available */}
      {hierarchyData.ultimateParent && (
        <div className="ultimate-parent mb-4">
          <div className="flex items-center justify-center mb-1">
            <div className="w-0.5 h-6 bg-gray-300"></div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  className="ultimate-parent-node border-blue-400 bg-blue-50 mb-2 cursor-pointer" 
                  onClick={() => handleEntityClick(hierarchyData.ultimateParent.lei)}
                >
                  <CardContent className="p-3 flex items-center">
                    <Share2 className="h-4 w-4 mr-2 text-blue-500" />
                    <div>
                      <div className="font-medium text-sm">{hierarchyData.ultimateParent.name}</div>
                      <div className="text-xs text-muted-foreground">Ultimate Parent</div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <div className="p-2">
                  <p className="font-medium">{hierarchyData.ultimateParent.name}</p>
                  <p className="text-xs mt-1">LEI: {hierarchyData.ultimateParent.lei}</p>
                  <p className="text-xs">Status: {hierarchyData.ultimateParent.registrationStatus}</p>
                  <p className="text-xs">Jurisdiction: {hierarchyData.ultimateParent.jurisdiction}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center justify-center mb-1">
            <div className="w-0.5 h-6 bg-gray-300"></div>
          </div>
        </div>
      )}

      {/* Direct Parent if available (and different from ultimate parent) */}
      {hierarchyData.directParent && 
       (!hierarchyData.ultimateParent || 
        hierarchyData.directParent.lei !== hierarchyData.ultimateParent.lei) && (
        <div className="direct-parent mb-4">
          <div className="flex items-center justify-center mb-1">
            <div className="w-0.5 h-6 bg-gray-300"></div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  className="direct-parent-node border-indigo-400 bg-indigo-50 mb-2 cursor-pointer" 
                  onClick={() => handleEntityClick(hierarchyData.directParent.lei)}
                >
                  <CardContent className="p-3 flex items-center">
                    <GitBranch className="h-4 w-4 mr-2 text-indigo-500" />
                    <div>
                      <div className="font-medium text-sm">{hierarchyData.directParent.name}</div>
                      <div className="text-xs text-muted-foreground">Direct Parent</div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <div className="p-2">
                  <p className="font-medium">{hierarchyData.directParent.name}</p>
                  <p className="text-xs mt-1">LEI: {hierarchyData.directParent.lei}</p>
                  <p className="text-xs">Status: {hierarchyData.directParent.registrationStatus}</p>
                  <p className="text-xs">Jurisdiction: {hierarchyData.directParent.jurisdiction}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center justify-center mb-1">
            <div className="w-0.5 h-6 bg-gray-300"></div>
          </div>
        </div>
      )}

      {/* Current Entity */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="current-entity-node border-green-400 bg-green-50 mb-4">
              <CardContent className="p-3 flex items-center">
                <Network className="h-4 w-4 mr-2 text-green-500" />
                <div>
                  <div className="font-medium text-sm">{hierarchyData.current.name}</div>
                  <div className="text-xs text-muted-foreground">Current Entity</div>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <div className="p-2">
              <p className="font-medium">{hierarchyData.current.name}</p>
              <p className="text-xs mt-1">LEI: {hierarchyData.current.lei}</p>
              <p className="text-xs">Status: {hierarchyData.current.registrationStatus}</p>
              <p className="text-xs">Jurisdiction: {hierarchyData.current.jurisdiction}</p>
              <p className="text-xs">Legal Form: {hierarchyData.current.legalForm || 'N/A'}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Children if available */}
      {hierarchyData.children && hierarchyData.children.length > 0 && (
        <>
          <div className="flex items-center justify-center mb-1">
            <div className="w-0.5 h-6 bg-gray-300"></div>
          </div>
          <div className="children">
            {hierarchyData.children.map((child: any) => (
              <TooltipProvider key={child.lei}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card 
                      className="child-node border-amber-400 bg-amber-50 mb-2 cursor-pointer" 
                      onClick={() => handleEntityClick(child.lei)}
                    >
                      <CardContent className="p-3 flex items-center">
                        <GitBranch className="h-4 w-4 mr-2 text-amber-500" />
                        <div>
                          <div className="font-medium text-sm">{child.name}</div>
                          <div className="text-xs text-muted-foreground">Subsidiary</div>
                        </div>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="p-2">
                      <p className="font-medium">{child.name}</p>
                      <p className="text-xs mt-1">LEI: {child.lei}</p>
                      <p className="text-xs">Status: {child.registrationStatus}</p>
                      <p className="text-xs">Jurisdiction: {child.jurisdiction}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default EntityTree;
