
import React, { useState, useEffect, useCallback } from "react";
import { fetchCorporateHierarchy, getReportingExceptionDescription } from "@/utils/companyUtils";
import { Network, Share2, GitBranch, AlertCircle, ZoomIn, ZoomOut } from "lucide-react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Position
} from "reactflow";
import "reactflow/dist/style.css";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface EntityNode {
  lei: string;
  name: string;
  jurisdiction?: string;
  status?: string;
  relationship?: string;
  registrationStatus?: string;
}

interface EntityTreeProps {
  company: any;
  onSelectEntity?: (lei: string) => void;
}

// Custom node styles
const nodeStyles = {
  current: { border: "1px solid rgb(74, 222, 128)", background: "rgb(240, 253, 244)" },
  ultimateParent: { border: "1px solid rgb(96, 165, 250)", background: "rgb(239, 246, 255)" },
  directParent: { border: "1px solid rgb(129, 140, 248)", background: "rgb(238, 242, 255)" },
  child: { border: "1px solid rgb(251, 191, 36)", background: "rgb(255, 251, 235)" },
  exception: { border: "1px solid rgb(251, 191, 36)", background: "rgb(255, 251, 235)" }
};

// Default node dimensions
const nodeWidth = 200;
const nodeHeight = 80;

const EntityTree: React.FC<EntityTreeProps> = ({ company, onSelectEntity }) => {
  const [hierarchyData, setHierarchyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback((params: any) => 
    setEdges((eds) => addEdge({ ...params, animated: true }, eds)), 
  [setEdges]);

  useEffect(() => {
    const loadHierarchy = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log("Loading hierarchy for company:", company?.name);
        const hierarchy = await fetchCorporateHierarchy(company);
        console.log("Hierarchy loaded:", hierarchy);
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

  useEffect(() => {
    if (!hierarchyData) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    let nodeId = 1;

    // Function to create nodes
    const createNode = (entity: EntityNode, type: string, x: number, y: number): string => {
      const id = `node-${nodeId++}`;
      const entityInfo = entity.name ? 
        `${entity.name}${entity.lei ? `\nLEI: ${entity.lei}` : ''}` : 
        'No name available';
      
      newNodes.push({
        id,
        type: 'default',
        position: { x, y },
        data: { 
          label: (
            <div className="p-1 text-center">
              <div className="font-medium text-sm truncate" title={entity.name}>{entity.name}</div>
              <div className="text-xs text-muted-foreground">{type}</div>
              {entity.lei && <div className="text-xs font-mono mt-1">{entity.lei}</div>}
            </div>
          ),
          onClick: entity.lei && onSelectEntity ? () => onSelectEntity(entity.lei) : undefined
        },
        style: { 
          ...nodeStyles[type as keyof typeof nodeStyles],
          width: nodeWidth,
          height: nodeHeight,
          cursor: entity.lei && onSelectEntity ? 'pointer' : 'default'
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
      return id;
    };

    // Create exception node
    const createExceptionNode = (exception: any, type: string, x: number, y: number): string => {
      const id = `node-${nodeId++}`;
      newNodes.push({
        id,
        type: 'default',
        position: { x, y },
        data: { 
          label: (
            <div className="p-1 text-center">
              <div className="font-medium text-sm">{`${type} Exception`}</div>
              <div className="text-xs text-muted-foreground truncate">
                {getReportingExceptionDescription(exception.reason)}
              </div>
            </div>
          )
        },
        style: { 
          ...nodeStyles.exception,
          width: nodeWidth,
          height: nodeHeight
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
      return id;
    };
    
    // Center position for layout
    const centerX = 200;
    let currentY = 300;
    const ySpacing = 150;
    
    // Add ultimate parent if available
    let ultimateParentId = null;
    if (hierarchyData.ultimateParent) {
      ultimateParentId = createNode(hierarchyData.ultimateParent, 'ultimateParent', centerX, currentY);
      currentY += ySpacing;
    } else if (hierarchyData.ultimateParentException) {
      ultimateParentId = createExceptionNode(hierarchyData.ultimateParentException, 'Ultimate Parent', centerX, currentY);
      currentY += ySpacing;
    }
    
    // Add direct parent if available and different from ultimate parent
    let directParentId = null;
    const directParentExists = hierarchyData.directParent && 
      (!hierarchyData.ultimateParent || 
       hierarchyData.directParent.lei !== hierarchyData.ultimateParent.lei);
    
    if (directParentExists) {
      directParentId = createNode(hierarchyData.directParent, 'directParent', centerX, currentY);
      currentY += ySpacing;
      
      // Connect ultimate parent to direct parent if both exist
      if (ultimateParentId && directParentId) {
        newEdges.push({
          id: `edge-${ultimateParentId}-${directParentId}`,
          source: ultimateParentId,
          target: directParentId,
          animated: true,
        });
      }
    } else if (!directParentExists && hierarchyData.directParentException) {
      directParentId = createExceptionNode(hierarchyData.directParentException, 'Direct Parent', centerX, currentY);
      currentY += ySpacing;
      
      // Connect ultimate parent to direct parent exception if ultimate parent exists
      if (ultimateParentId && directParentId) {
        newEdges.push({
          id: `edge-${ultimateParentId}-${directParentId}`,
          source: ultimateParentId,
          target: directParentId,
          animated: true,
        });
      }
    }
    
    // Add current entity
    const currentId = createNode(hierarchyData.current, 'current', centerX, currentY);
    
    // Connect parent nodes to current
    if (directParentId) {
      newEdges.push({
        id: `edge-${directParentId}-${currentId}`,
        source: directParentId,
        target: currentId,
        animated: true,
      });
    } else if (ultimateParentId && !directParentId) {
      newEdges.push({
        id: `edge-${ultimateParentId}-${currentId}`,
        source: ultimateParentId,
        target: currentId,
        animated: true,
      });
    }
    
    // Add children if available
    if (hierarchyData.children && hierarchyData.children.length > 0) {
      const childrenCount = hierarchyData.children.length;
      const startX = centerX - ((childrenCount - 1) * 250) / 2;
      
      hierarchyData.children.forEach((child: any, index: number) => {
        const childX = startX + index * 250;
        const childY = currentY + ySpacing;
        const childId = createNode(child, 'child', childX, childY);
        
        newEdges.push({
          id: `edge-${currentId}-${childId}`,
          source: currentId,
          target: childId,
          animated: true,
        });
      });
    }
    
    setNodes(newNodes);
    setEdges(newEdges);
  }, [hierarchyData, onSelectEntity]);

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

  // Check if there are any real relationships or only exceptions
  const hasActualRelationships = 
    hierarchyData?.directParent || 
    hierarchyData?.ultimateParent || 
    (hierarchyData?.children && hierarchyData?.children.length > 0);
  
  const hasExceptions =
    hierarchyData?.directParentException ||
    hierarchyData?.ultimateParentException;
  
  // If there are no actual relationships and no exceptions, display no relationships message
  const hasNoHierarchyData = !hierarchyData || (!hasActualRelationships && !hasExceptions);

  if (hasNoHierarchyData) {
    return (
      <div className="p-4 border rounded-md flex items-center justify-center">
        <Network className="h-5 w-5 text-muted-foreground mr-2" />
        <p className="text-sm text-muted-foreground">This entity has no parent or child relationships</p>
      </div>
    );
  }

  // If we have hierarchy data but no nodes (could happen in edge cases), show a message
  if (nodes.length === 0) {
    return (
      <div className="p-4 border rounded-md flex items-center justify-center">
        <AlertCircle className="h-5 w-5 text-muted-foreground mr-2" />
        <p className="text-sm text-muted-foreground">Unable to visualize hierarchy data</p>
      </div>
    );
  }

  return (
    <div className="entity-tree border rounded-lg overflow-hidden w-full h-[500px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        attributionPosition="bottom-right"
        minZoom={0.2}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Controls showInteractive={false} />
        <MiniMap />
        <Background color="#aaa" gap={16} />
      </ReactFlow>
    </div>
  );
};

export default EntityTree;
