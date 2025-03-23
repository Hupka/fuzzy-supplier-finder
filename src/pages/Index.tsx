
import React, { useState } from "react";
import FileUploader from "@/components/FileUploader";
import SupplierTable from "@/components/SupplierTable";
import CompanyHierarchy, { CompanyNode } from "@/components/CompanyHierarchy";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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

interface HierarchyData {
  currentCompany: CompanyNode;
  parentCompany: CompanyNode | null;
  childCompanies: CompanyNode[];
}

const Index = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [hierarchyData, setHierarchyData] = useState<HierarchyData | null>(null);
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const handleFileLoaded = (parsedSuppliers: Supplier[]) => {
    setSuppliers(parsedSuppliers);
    setIsLoaded(true);
    setShowTable(true);
    
    // Store in global variable as requested
    window.suppliers = parsedSuppliers;
    
    // Log to console to confirm data is parsed
    console.log("Parsed suppliers with company matches:", parsedSuppliers);
  };

  const fetchCompanyHierarchy = async (company: Company) => {
    if (!company || !company.lei) return;
    
    setIsLoadingHierarchy(true);
    
    try {
      // Create the current company node
      const currentNode: CompanyNode = {
        lei: company.lei,
        name: company.name,
        relationship: company.entityCategory || "Current Company",
        jurisdiction: company.jurisdiction,
        status: company.status,
        entityCategory: company.entityCategory
      };
      
      let parentNode: CompanyNode | null = null;
      const childNodes: CompanyNode[] = [];
      
      // Fetch parent company if parentLei exists
      if (company.parentLei) {
        try {
          const parentResponse = await fetch(`https://api.gleif.org/api/v1/lei-records/${company.parentLei}`);
          const parentData = await parentResponse.json();
          
          if (parentData.data) {
            const parentAttributes = parentData.data.attributes;
            const parentEntity = parentAttributes.entity;
            
            parentNode = {
              lei: company.parentLei,
              name: parentEntity.legalName.name,
              relationship: parentEntity.category?.name || "Parent Company",
              jurisdiction: parentEntity.legalJurisdiction,
              status: parentAttributes.registration.status,
              entityCategory: parentEntity.category?.name
            };
          }
        } catch (error) {
          console.error("Error fetching parent company:", error);
          toast.error("Error fetching parent company information");
        }
      }
      
      // Fetch child companies
      try {
        const childrenResponse = await fetch(`https://api.gleif.org/api/v1/lei-records?filter[entity.parent.lei]=${company.lei}&page[size]=10`);
        const childrenData = await childrenResponse.json();
        
        if (childrenData.data && childrenData.data.length > 0) {
          childrenData.data.forEach((child: any) => {
            const childAttributes = child.attributes;
            const childEntity = childAttributes.entity;
            
            childNodes.push({
              lei: child.id,
              name: childEntity.legalName.name,
              relationship: childEntity.category?.name || "Subsidiary",
              jurisdiction: childEntity.legalJurisdiction,
              status: childAttributes.registration.status,
              entityCategory: childEntity.category?.name
            });
          });
        }
      } catch (error) {
        console.error("Error fetching child companies:", error);
        toast.error("Error fetching subsidiary information");
      }
      
      // Set the hierarchy data
      setHierarchyData({
        currentCompany: currentNode,
        parentCompany: parentNode,
        childCompanies: childNodes
      });
      
      // Switch to the hierarchy tab
      setActiveTab("hierarchy");
    } catch (error) {
      console.error("Error fetching company hierarchy:", error);
      toast.error("Error fetching company hierarchy");
    } finally {
      setIsLoadingHierarchy(false);
    }
  };

  const showCompanyDetails = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDetailsDialogOpen(true);
    
    // Reset hierarchy data
    setHierarchyData(null);
    setActiveTab("details");
    
    // Fetch hierarchy data if company exists
    if (supplier.company) {
      await fetchCompanyHierarchy(supplier.company);
    }
  };

  const navigateToCompany = async (lei: string) => {
    setIsLoadingHierarchy(true);
    
    try {
      // Fetch the company details by LEI
      const response = await fetch(`https://api.gleif.org/api/v1/lei-records/${lei}`);
      const data = await response.json();
      
      if (data.data) {
        const attributes = data.data.attributes;
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
        
        // Create a new company object
        const company: Company = {
          name: entity.legalName.name,
          lei: data.data.id,
          address: formattedAddress,
          jurisdiction: entity.legalJurisdiction,
          status: attributes.registration.status,
          parentLei: entity.headquarters?.lei || entity.parent?.lei,
          legalForm: entity.legalForm?.name,
          registrationAuthority: attributes.registration.managingLou,
          nextRenewalDate: attributes.registration.nextRenewalDate,
          initialRegistrationDate: attributes.registration.initialRegistrationDate,
          lastUpdateDate: attributes.registration.lastUpdateDate,
          entityCategory: entity.category?.name
        };
        
        // Create a synthetic supplier with this company
        const syntheticSupplier: Supplier = {
          name: company.name,
          company: company
        };
        
        // Update the selected supplier
        setSelectedSupplier(syntheticSupplier);
        
        // Fetch the hierarchy for this company
        await fetchCompanyHierarchy(company);
      } else {
        toast.error("Could not find company with the provided LEI");
      }
    } catch (error) {
      console.error("Error navigating to company:", error);
      toast.error("Error navigating to company");
    } finally {
      setIsLoadingHierarchy(false);
    }
  };

  // Calculate how many suppliers were matched
  const matchedCount = suppliers.filter(supplier => supplier.company !== null && supplier.company !== undefined).length;
  const attemptedCount = suppliers.filter(supplier => supplier.company !== undefined).length;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 animate-fade-in">
      <Toaster position="top-right" />
      <div className="w-full max-w-6xl">
        <div className="text-center mb-10 space-y-2">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2 animate-slide-down">
            Supplier Management
          </div>
          <h1 className="text-4xl font-medium tracking-tight animate-slide-down">
            Fuzzy Supplier Finder
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto animate-slide-down">
            Upload your CSV file with supplier information to match with real company data using GLEIF API.
          </p>
        </div>

        <div className="glass p-8 rounded-2xl shadow-sm border border-border/40 animate-slide-up">
          {!isLoaded && <FileUploader onFileLoaded={handleFileLoaded} />}
          
          {isLoaded && (
            <div className="mt-8 animate-fade-in">
              <Separator className="my-6" />
              
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium mb-2">
                  Success
                </div>
                <h3 className="text-xl font-medium mb-2">
                  Loaded {suppliers.length} suppliers
                </h3>
                
                <Alert className="mt-4 bg-blue-50 border-blue-200">
                  <AlertTitle>GLEIF API Results</AlertTitle>
                  <AlertDescription>
                    Successfully matched {matchedCount} out of {attemptedCount} attempted suppliers 
                    ({Math.round((matchedCount / (attemptedCount || 1)) * 100)}% success rate).
                  </AlertDescription>
                </Alert>
                
                <p className="text-muted-foreground text-sm mt-4 mb-6">
                  Your suppliers have been successfully loaded and matched with GLEIF LEI data.
                </p>
                
                {!showTable ? (
                  <Button 
                    onClick={() => setShowTable(true)}
                    className="mt-4"
                  >
                    View Supplier Table
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setShowTable(false)}
                    variant="outline"
                    className="mt-4"
                  >
                    Hide Table
                  </Button>
                )}
              </div>
              
              {showTable && (
                <div className="overflow-x-auto">
                  <SupplierTable 
                    suppliers={suppliers} 
                    onShowDetails={showCompanyDetails} 
                  />
                </div>
              )}
              
              {/* Company Details Dialog */}
              <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  {selectedSupplier?.company && (
                    <>
                      <DialogHeader>
                        <DialogTitle className="text-xl">
                          {selectedSupplier.company.name}
                        </DialogTitle>
                        <DialogDescription>
                          LEI: {selectedSupplier.company.lei}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="details">Company Details</TabsTrigger>
                          <TabsTrigger value="hierarchy">Corporate Hierarchy</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="details" className="mt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">Basic Information</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2 text-sm">
                                <div>
                                  <span className="font-medium">Legal Form:</span> {selectedSupplier.company.legalForm || "Not available"}
                                </div>
                                <div>
                                  <span className="font-medium">Entity Category:</span> {selectedSupplier.company.entityCategory || "Not available"}
                                </div>
                                <div>
                                  <span className="font-medium">Jurisdiction:</span> {selectedSupplier.company.jurisdiction}
                                </div>
                                <div>
                                  <span className="font-medium">Status:</span> {selectedSupplier.company.status}
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">Address Information</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2 text-sm">
                                <div>
                                  <span className="font-medium">Complete Address:</span><br />
                                  {selectedSupplier.company.address}
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">Registration Details</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2 text-sm">
                                <div>
                                  <span className="font-medium">Registration Authority:</span> {selectedSupplier.company.registrationAuthority || "Not available"}
                                </div>
                                <div>
                                  <span className="font-medium">Initial Registration:</span> {selectedSupplier.company.initialRegistrationDate 
                                    ? new Date(selectedSupplier.company.initialRegistrationDate).toLocaleDateString() 
                                    : "Not available"}
                                </div>
                                <div>
                                  <span className="font-medium">Last Update:</span> {selectedSupplier.company.lastUpdateDate 
                                    ? new Date(selectedSupplier.company.lastUpdateDate).toLocaleDateString() 
                                    : "Not available"}
                                </div>
                                <div>
                                  <span className="font-medium">Next Renewal:</span> {selectedSupplier.company.nextRenewalDate 
                                    ? new Date(selectedSupplier.company.nextRenewalDate).toLocaleDateString() 
                                    : "Not available"}
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">Corporate Structure</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2 text-sm">
                                <div>
                                  <span className="font-medium">Parent LEI:</span> {selectedSupplier.company.parentLei || "No parent company information"}
                                </div>
                                {selectedSupplier.company.parentLei && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="mt-2"
                                    onClick={() => {
                                      setActiveTab("hierarchy");
                                    }}
                                  >
                                    View Corporate Hierarchy
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="hierarchy" className="mt-4">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Corporate Hierarchy</CardTitle>
                              <CardDescription>
                                Explore parent companies and subsidiaries
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              {hierarchyData ? (
                                <CompanyHierarchy
                                  currentCompany={hierarchyData.currentCompany}
                                  parentCompany={hierarchyData.parentCompany}
                                  childCompanies={hierarchyData.childCompanies}
                                  onSelectCompany={navigateToCompany}
                                  isLoading={isLoadingHierarchy}
                                />
                              ) : (
                                <div className="flex items-center justify-center h-48 w-full">
                                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </Tabs>
                      
                      <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                          Close
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-6">
          Data remains in-browser and is not sent to any server.
        </p>
      </div>
    </div>
  );
};

export default Index;
