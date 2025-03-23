
import React from "react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { getLegalFormDescription, getStatusDescription, getReportingExceptionDescription } from "@/utils/companyUtils";
import { Network, Building2, Calendar, Globe, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface CompanyDetailsProps {
  company: any;
}

const CompanyDetails: React.FC<CompanyDetailsProps> = ({ company }) => {
  if (!company) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">{company.name}</h2>
        <p className="text-sm text-muted-foreground">
          Legal Entity Identifier (LEI): {company.lei}
        </p>
        
        {company.entityCategory && (
          <Badge variant="outline" className="text-xs">
            {company.entityCategory}
          </Badge>
        )}
      </div>
      
      <Separator />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <Building2 className="h-4 w-4 mr-2" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm pb-4">
            <div className="grid grid-cols-[120px_1fr] gap-1">
              <span className="text-muted-foreground">Legal Form:</span>
              <span>{company.legalFormId ? getLegalFormDescription(company.legalFormId) : "Not available"}</span>
              
              <span className="text-muted-foreground">Entity Status:</span>
              <span>{company.entityStatus || "Not available"}</span>
              
              <span className="text-muted-foreground">Registration:</span>
              <span className={`px-2 py-0.5 rounded-full text-xs inline-flex items-center
                ${company.registrationStatus === 'ISSUED' 
                  ? 'bg-green-100 text-green-800' 
                  : company.registrationStatus === 'LAPSED' 
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-800'}`}
              >
                {company.registrationStatus} - {getStatusDescription(company.registrationStatus)}
              </span>
              
              <span className="text-muted-foreground">Registration Authority:</span>
              <span>{company.registrationAuthority || "Not available"}</span>
              
              {company.bic && company.bic.length > 0 && (
                <>
                  <span className="text-muted-foreground">BIC:</span>
                  <span>{company.bic.join(", ")}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Address Information */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <Globe className="h-4 w-4 mr-2" />
              Address Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm pb-4">
            <div className="grid grid-cols-[120px_1fr] gap-1">
              <span className="text-muted-foreground">Legal Address:</span>
              <span className="whitespace-pre-line">{company.address || "Not available"}</span>
              
              {company.headquartersAddress && (
                <>
                  <span className="text-muted-foreground">Headquarters:</span>
                  <span className="whitespace-pre-line">{company.headquartersAddress}</span>
                </>
              )}
              
              <span className="text-muted-foreground">Jurisdiction:</span>
              <span>{company.jurisdiction || "Not available"}</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Registration Dates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Registration Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm pb-4">
            <div className="grid grid-cols-[150px_1fr] gap-1">
              <span className="text-muted-foreground">Initial Registration:</span>
              <span>
                {company.initialRegistrationDate 
                  ? new Date(company.initialRegistrationDate).toLocaleDateString() 
                  : "Not available"}
              </span>
              
              <span className="text-muted-foreground">Last Update:</span>
              <span>
                {company.lastUpdateDate 
                  ? new Date(company.lastUpdateDate).toLocaleDateString() 
                  : "Not available"}
              </span>
              
              <span className="text-muted-foreground">Next Renewal:</span>
              <span>
                {company.nextRenewalDate 
                  ? new Date(company.nextRenewalDate).toLocaleDateString() 
                  : "Not available"}
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Corporate Structure */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <Network className="h-4 w-4 mr-2" />
              Corporate Structure
            </CardTitle>
            <CardDescription className="text-xs">
              Relationships with other entities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm pb-4">
            <div className="grid grid-cols-[120px_1fr] gap-1">
              <span className="text-muted-foreground">Direct Parent:</span>
              <span>
                {company.hasDirectParent 
                  ? (company.relationships?.directParent?.reportingException
                     ? `Exception: ${getReportingExceptionDescription(company.relationships.directParent.reason || "NATURAL_PERSONS")}`
                     : "Available in Corporate Hierarchy")
                  : "No direct parent"}
              </span>
              
              <span className="text-muted-foreground">Ultimate Parent:</span>
              <span>
                {company.hasUltimateParent 
                  ? (company.relationships?.ultimateParent?.reportingException
                     ? `Exception: ${getReportingExceptionDescription(company.relationships.ultimateParent.reason || "NATURAL_PERSONS")}`
                     : "Available in Corporate Hierarchy")
                  : "No ultimate parent"}
              </span>
              
              <span className="text-muted-foreground">Subsidiaries:</span>
              <span>
                {company.hasChildren 
                  ? "Available in Corporate Hierarchy" 
                  : "No subsidiaries"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompanyDetails;
