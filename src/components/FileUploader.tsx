
import React, { useState, useRef } from "react";
import { toast } from "sonner";

interface Supplier {
  [key: string]: string;
}

interface FileUploaderProps {
  onFileLoaded: (suppliers: Supplier[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
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
    
    // We need to include Papa Parse via CDN
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
      complete: (results: { data: Supplier[], errors: any[], meta: any }) => {
        const suppliers = results.data.filter(supplier => {
          // Filter out empty rows and ensure the supplier has a name
          return Object.keys(supplier).length > 0 && 
                 (supplier.Name || supplier.name || supplier.SUPPLIER_NAME || 
                  supplier.SupplierName || supplier["Supplier Name"] || supplier.COMPANY);
        });
        
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
        {loading ? "Processing..." : "Upload Supplier CSV"}
      </h3>
      
      <p className="text-muted-foreground text-sm text-center max-w-md">
        Drag and drop your CSV file here, or click to browse
      </p>
    </div>
  );
};

// For TypeScript global declaration
declare global {
  interface Window {
    Papa: any;
    suppliers: any[];
  }
}

export default FileUploader;
