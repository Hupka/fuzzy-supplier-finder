
import React, { useState } from "react";
import FileUploader from "@/components/FileUploader";
import SupplierTable from "@/components/SupplierTable";
import EntityTree from "@/components/EntityTree";
import CompanyDetails from "@/components/CompanyDetails";
import { fetchCompanyByLei } from "@/utils/companyUtils";
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
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface Supplier {
  [key: string]: string | any;
  company?: any | null;
}

const Index = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [isLoadingEntity, setIsLoadingEntity] = useState(false);

  const handleFileLoaded = (parsedSuppliers: Supplier[]) => {
    setSuppliers(parsedSuppliers);
    setIsLoaded(true);
    setShowTable(true);
    
    window.suppliers = parsedSuppliers;
    console.log("Parsed suppliers with company matches:", parsedSuppliers);
  };

  const showCompanyDetails = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDetailsDialogOpen(true);
    setActiveTab("details");
  };

  const navigateToCompany = async (lei: string) => {
    if (selectedSupplier?.company?.lei === lei) {
      return; // Already looking at this company
    }
    
    setIsLoadingEntity(true);
    
    try {
      const companyData = await fetchCompanyByLei(lei);
      
      if (companyData) {
        const syntheticSupplier: Supplier = {
          name: companyData.name,
          company: companyData
        };
        
        setSelectedSupplier(syntheticSupplier);
      } else {
        toast.error("Could not find company with the provided LEI");
      }
    } catch (error) {
      console.error("Error navigating to company:", error);
      toast.error("Error loading company details");
    } finally {
      setIsLoadingEntity(false);
    }
  };

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
                          <CompanyDetails company={selectedSupplier.company} />
                        </TabsContent>
                        
                        <TabsContent value="hierarchy" className="mt-4">
                          <Card>
                            <CardContent className="pt-6">
                              {isLoadingEntity ? (
                                <div className="flex items-center justify-center h-48 w-full">
                                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                                </div>
                              ) : (
                                <EntityTree 
                                  company={selectedSupplier.company}
                                  onSelectEntity={navigateToCompany}
                                />
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
