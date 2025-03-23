
import React, { useState } from "react";
import FileUploader from "@/components/FileUploader";
import { Separator } from "@/components/ui/separator";

interface Supplier {
  [key: string]: string;
}

const Index = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleFileLoaded = (parsedSuppliers: Supplier[]) => {
    setSuppliers(parsedSuppliers);
    setIsLoaded(true);
    
    // Store in global variable as requested
    window.suppliers = parsedSuppliers;
    
    // Log to console to confirm data is parsed
    console.log("Parsed suppliers:", parsedSuppliers);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 animate-fade-in">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10 space-y-2">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2 animate-slide-down">
            Supplier Management
          </div>
          <h1 className="text-4xl font-medium tracking-tight animate-slide-down">
            Fuzzy Supplier Finder
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto animate-slide-down">
            Upload your CSV file with supplier information to match with real company data.
          </p>
        </div>

        <div className="glass p-8 rounded-2xl shadow-sm border border-border/40 animate-slide-up">
          <FileUploader onFileLoaded={handleFileLoaded} />
          
          {isLoaded && (
            <div className="mt-8 animate-fade-in">
              <Separator className="my-6" />
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium mb-2">
                  Success
                </div>
                <h3 className="text-xl font-medium mb-2">
                  Loaded {suppliers.length} suppliers
                </h3>
                <p className="text-muted-foreground text-sm">
                  Your suppliers have been successfully loaded and are ready for processing.
                </p>
              </div>
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
