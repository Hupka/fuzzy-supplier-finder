
import React, { useState, useRef } from "react";
import { toast } from "sonner";

interface CompanyRelationships {
  directParent?: {
    reportingException?: string;
    related?: string;
    reason?: string;
  };
  ultimateParent?: {
    reportingException?: string;
    related?: string;
    reason?: string;
  };
  directChildren?: {
    related?: string;
  };
}

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
  hasDirectParent: boolean;
  hasUltimateParent: boolean;
  hasChildren: boolean;
  relationships?: CompanyRelationships;
}

interface Supplier {
  [key: string]: string | any;
  company?: Company | null;
}

interface FileUploaderProps {
  onFileLoaded: (suppliers: Supplier[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

    setLoading(true);
    setProcessingStatus('Parsing CSV file...');
    
    if (typeof window.Papa === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js';
      script.async = true;
      script.onload = () => parseCSV(file);
      document.body.appendChild(script);
    } else {
      parseCSV(file);
    }
  };

  const parseCSV = (file: File) => {
    window.Papa.parse(file, {
      header: true,
      complete: async (results: { data: Supplier[], errors: any[], meta: any }) => {
        console.log("Raw CSV data:", results.data); 
        
        const suppliers = results.data
          .filter(supplier => {
            return Object.keys(supplier).length > 0 && 
                  Object.values(supplier).some(value => value.trim() !== "");
          })
          .map(supplier => {
            const normalizedSupplier: Supplier = {
              id: supplier["ID (Lieferanten Nr)"] || supplier["ID"] || "",
              name: supplier["Lieferant (Name)"] || supplier["Name"] || "",
              organisation: supplier["Organisation"] || "",
              relationship: supplier["Beziehung"] || "",
              status: supplier["Lieferanten-Status"] || supplier["Status"] || ""
            };
            
            return { ...supplier, ...normalizedSupplier };
          });
        
        console.log("Processed suppliers:", suppliers);
        
        if (suppliers.length === 0) {
          toast.error("No valid supplier data found in CSV");
          setLoading(false);
          return;
        }

        await matchSuppliersWithGLEIF(suppliers);
        
        onFileLoaded(suppliers);
        setLoading(false);
        toast.success(`Successfully loaded ${suppliers.length} suppliers`);
      },
      error: (error: any) => {
        console.error("Error parsing CSV:", error);
        toast.error("Error parsing CSV file");
        setLoading(false);
      }
    });
  };

  const matchSuppliersWithGLEIF = async (suppliers: Supplier[]) => {
    let matchedCount = 0;
    
    let suppliersToProcess = [...suppliers];
    const isDevelopment = process.env.NODE_ENV === 'development' || true;
    
    if (isDevelopment && suppliersToProcess.length > 40) {
      const sampleSize = 40;
      suppliersToProcess = suppliersToProcess
        .sort(() => 0.5 - Math.random())
        .slice(0, sampleSize);
      
      console.log(`Development mode: Processing ${sampleSize} random suppliers out of ${suppliers.length}`);
    }
    
    setProcessingStatus(`Matching suppliers with GLEIF API... (0/${suppliersToProcess.length})`);
    
    for (let i = 0; i < suppliersToProcess.length; i++) {
      const supplier = suppliersToProcess[i];
      setProcessingStatus(`Matching suppliers with GLEIF API... (${i+1}/${suppliersToProcess.length})`);
      
      try {
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
          
          // Extract relationship links with improved handling
          const relationships: CompanyRelationships = {};
          
          // Check for direct parent relationship
          let hasDirectParent = false;
          if (record.relationships?.["direct-parent"]) {
            const directParentLinks = record.relationships["direct-parent"].links || {};
            
            // Check for both relationship record and exception
            if (directParentLinks["relationship-record"]) {
              relationships.directParent = {
                related: directParentLinks["relationship-record"]
              };
              hasDirectParent = true;
            } else if (directParentLinks["reporting-exception"]) {
              relationships.directParent = {
                reportingException: directParentLinks["reporting-exception"],
                reason: "EXCEPTION" // Will be replaced with actual reason later
              };
              hasDirectParent = true;
            } else if (directParentLinks["lei-record"]) {
              relationships.directParent = {
                related: directParentLinks["lei-record"]
              };
              hasDirectParent = true;
            }
          }
          
          // Check for ultimate parent relationship
          let hasUltimateParent = false;
          if (record.relationships?.["ultimate-parent"]) {
            const ultimateParentLinks = record.relationships["ultimate-parent"].links || {};
            
            // Check for both relationship record and exception
            if (ultimateParentLinks["relationship-record"]) {
              relationships.ultimateParent = {
                related: ultimateParentLinks["relationship-record"]
              };
              hasUltimateParent = true;
            } else if (ultimateParentLinks["reporting-exception"]) {
              relationships.ultimateParent = {
                reportingException: ultimateParentLinks["reporting-exception"],
                reason: "EXCEPTION" // Will be replaced with actual reason later
              };
              hasUltimateParent = true;
            } else if (ultimateParentLinks["lei-record"]) {
              relationships.ultimateParent = {
                related: ultimateParentLinks["lei-record"]
              };
              hasUltimateParent = true;
            }
          }
          
          // Check for direct children
          let hasChildren = false;
          if (record.relationships?.["direct-children"]) {
            const directChildrenLinks = record.relationships["direct-children"].links || {};
            
            if (directChildrenLinks["related"]) {
              relationships.directChildren = {
                related: directChildrenLinks["related"]
              };
              hasChildren = true;
            }
          }
          
          // Create full legal form string if available
          const legalFormString = entity.legalForm && entity.legalForm.id
            ? `${entity.legalForm.id}${entity.legalForm.other ? ` - ${entity.legalForm.other}` : ''}`
            : undefined;
          
          // Create full entity category string if available
          const entityCategoryString = entity.category
            ? entity.category
            : undefined;
          
          supplier.company = {
            name: entity.legalName.name,
            lei: record.id,
            address: formattedAddress,
            jurisdiction: entity.jurisdiction,
            status: attributes.registration.status,
            parentLei: entity.associatedEntity?.lei || undefined,
            legalForm: legalFormString,
            registrationAuthority: attributes.registration.managingLou,
            nextRenewalDate: attributes.registration.nextRenewalDate,
            initialRegistrationDate: attributes.registration.initialRegistrationDate,
            lastUpdateDate: attributes.registration.lastUpdateDate,
            entityCategory: entityCategoryString,
            hasDirectParent: hasDirectParent,
            hasUltimateParent: hasUltimateParent,
            hasChildren: hasChildren,
            relationships: relationships
          };
          
          matchedCount++;
          
          // If we found relationships, try to get more details for the first few entities
          if ((hasDirectParent || hasUltimateParent) && i < 10) {
            // Fetch exception details for direct parent if it exists
            if (hasDirectParent && relationships.directParent?.reportingException) {
              try {
                const exceptionResponse = await fetch(relationships.directParent.reportingException);
                const exceptionData = await exceptionResponse.json();
                
                if (exceptionData.data && exceptionData.data.attributes) {
                  relationships.directParent.reason = exceptionData.data.attributes.reason;
                }
              } catch (error) {
                console.error("Error fetching direct parent exception details:", error);
              }
            }
            
            // Fetch exception details for ultimate parent if it exists
            if (hasUltimateParent && relationships.ultimateParent?.reportingException) {
              try {
                const exceptionResponse = await fetch(relationships.ultimateParent.reportingException);
                const exceptionData = await exceptionResponse.json();
                
                if (exceptionData.data && exceptionData.data.attributes) {
                  relationships.ultimateParent.reason = exceptionData.data.attributes.reason;
                }
              } catch (error) {
                console.error("Error fetching ultimate parent exception details:", error);
              }
            }
          }
        } else {
          supplier.company = null;
        }
        
        await new Promise(resolve => setTimeout(resolve, 250));
      } catch (error) {
        console.error(`Error matching supplier ${supplier.name}:`, error);
        supplier.company = null;
      }
    }
    
    if (isDevelopment && suppliers.length > suppliersToProcess.length) {
      const processedSupplierNames = suppliersToProcess.map(s => s.name);
      
      suppliers.forEach(supplier => {
        if (!processedSupplierNames.includes(supplier.name)) {
          supplier.company = undefined;
        }
      });
    }
    
    setProcessingStatus(`Completed matching: ${matchedCount} of ${suppliersToProcess.length} suppliers matched`);
    return matchedCount;
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className={`file-upload-zone flex flex-col items-center justify-center cursor-pointer transition-all ${
        isDragging ? 'border-primary bg-primary/10' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleButtonClick}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv" 
        className="hidden" 
      />
      
      <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-secondary text-primary">
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="animate-slide-down"
        >
          <path 
            d="M8 16H16M12 12V20M20 8L14.5 2.5C14.1 2.1 13.5 2 13 2H7C5.9 2 5 2.9 5 4V20C5 21.1 5.9 22 7 22H17C18.1 22 19 21.1 19 20V9C19 8.5 18.9 7.9 18.5 7.5L18 7" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium mb-2 text-center">
        {loading ? processingStatus || "Processing..." : "Upload Supplier CSV"}
      </h3>
      
      <p className="text-muted-foreground text-sm text-center max-w-md">
        Drag and drop your CSV file here, or click to browse
      </p>
    </div>
  );
};

declare global {
  interface Window {
    Papa: any;
    suppliers: any[];
  }
}

export default FileUploader;
