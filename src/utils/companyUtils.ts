/**
 * Utility functions for company data handling
 */

export const getStatusDescription = (status: string): string => {
  const statusMap: Record<string, string> = {
    "ISSUED": "Active and in good standing",
    "LAPSED": "Registration has lapsed but can be renewed",
    "MERGED": "Entity has been merged into another entity",
    "RETIRED": "Entity is no longer operating",
    "ANNULLED": "Registration has been invalidated",
    "DUPLICATE": "This is a duplicate entry",
    "TRANSFERRED": "Entity has been transferred to another jurisdiction",
    "PENDING_ARCHIVAL": "Entity is pending removal from the database",
    "PENDING_VALIDATION": "Entity is awaiting validation",
    "ACTIVE": "Entity is active and operational"
  };
  
  return statusMap[status] || status;
};

export const getLegalFormDescription = (id: string): string => {
  const legalFormMap: Record<string, string> = {
    "8Z6G": "Limited Partnership (Kommanditgesellschaft - KG)",
    "FIBV": "Public Limited Company (Aktiengesellschaft - AG)",
    "570L": "Private Limited Company (GmbH)",
    "ZSJG": "Public Limited Company (SE)",
    "LJK9": "Registered Association (e.V.)",
    "54GR": "Public Limited Partnership (KGaA)",
    "7P3S": "Public Institution (Anstalt des öffentlichen Rechts)",
    "V6XX": "General Partnership (Offene Handelsgesellschaft - OHG)",
    "WDYE": "Cooperative (Genossenschaft)",
    "5Z1V": "Sole Proprietorship",
    "2HBR": "Private Limited Company (GmbH)",
    "AXSB": "Private Limited Company (GmbH)"
  };
  
  return legalFormMap[id] || id;
};

/**
 * Get the description for a parent reporting exception reason
 */
export const getReportingExceptionDescription = (reason: string): string => {
  const reasonMap: Record<string, string> = {
    "NO_KNOWN_PERSON": "No known person controls the entity",
    "NO_LEI": "The parent does not have an LEI",
    "NON_CONSOLIDATING": "The entity is not included in consolidated financial statements",
    "NATURAL_PERSONS": "The entity is controlled by natural person(s) without an LEI",
    "LEGAL_OBSTACLES": "Legal obstacles prevent providing parent information",
    "CONSENT_NOT_OBTAINED": "Consent to publish parent information was not obtained",
    "BINDING_LEGAL_COMMITMENTS": "Binding legal commitments prevent providing parent information",
    "DETRIMENT_NOT_EXCLUDED": "Detriment to the entity or parent not excluded"
  };
  
  return reasonMap[reason] || reason;
};

/**
 * Extract entity from GLEIF API response
 */
export const parseCompanyFromGLEIF = (data: any): any => {
  if (!data || !data.attributes) return null;
  
  const attributes = data.attributes;
  const entity = attributes.entity;
  const legalAddress = entity.legalAddress;
  
  // Format address from components
  const addressParts = [
    legalAddress.addressLines?.join(', '),
    legalAddress.city,
    legalAddress.region,
    legalAddress.country,
    legalAddress.postalCode
  ].filter(Boolean);
  
  const formattedAddress = addressParts.join(', ');
  
  // Extract relationship links and determine relationship types
  const relationships: Record<string, any> = {};
  
  if (data.relationships) {
    // Direct parent - check for both types of links
    if (data.relationships["direct-parent"]?.links) {
      relationships.directParent = {
        // Handle both regular relationship and reporting exception
        relationshipRecord: data.relationships["direct-parent"].links["relationship-record"],
        leiRecord: data.relationships["direct-parent"].links["lei-record"],
        reportingException: data.relationships["direct-parent"].links["reporting-exception"]
      };
    }
    
    // Ultimate parent - check for both types of links
    if (data.relationships["ultimate-parent"]?.links) {
      relationships.ultimateParent = {
        relationshipRecord: data.relationships["ultimate-parent"].links["relationship-record"],
        leiRecord: data.relationships["ultimate-parent"].links["lei-record"],
        reportingException: data.relationships["ultimate-parent"].links["reporting-exception"]
      };
    }
    
    // Direct children
    if (data.relationships["direct-children"]?.links) {
      relationships.directChildren = {
        relationshipRecords: data.relationships["direct-children"].links["relationship-records"],
        related: data.relationships["direct-children"].links["related"]
      };
    }
  }
  
  // Determine relationship availability - check for either relationship record or exception
  const hasDirectParent = !!(
    relationships.directParent?.leiRecord || 
    relationships.directParent?.reportingException
  );
  
  const hasUltimateParent = !!(
    relationships.ultimateParent?.leiRecord || 
    relationships.ultimateParent?.reportingException
  );
  
  const hasChildren = !!(relationships.directChildren?.related);
  
  // Create full legal form string if available
  const legalFormString = entity.legalForm && entity.legalForm.id
    ? `${entity.legalForm.id}${entity.legalForm.other ? ` - ${entity.legalForm.other}` : ''}`
    : undefined;
  
  // Create entity category string
  const entityCategoryString = entity.category || undefined;
  
  return {
    name: entity.legalName.name,
    lei: data.id,
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
    relationships,
    bic: attributes.bic || [],
    headquartersAddress: entity.headquartersAddress ? [
      entity.headquartersAddress.addressLines?.join(', '),
      entity.headquartersAddress.city,
      entity.headquartersAddress.region,
      entity.headquartersAddress.country,
      entity.headquartersAddress.postalCode
    ].filter(Boolean).join(', ') : null
  };
};

/**
 * Parse reporting exception data from GLEIF API response
 */
export const parseReportingExceptionFromGLEIF = (data: any): any => {
  if (!data || !data.attributes) return null;
  
  const attributes = data.attributes;
  
  return {
    lei: attributes.lei,
    category: attributes.category,
    reason: attributes.reason,
    validFrom: attributes.validFrom,
    validTo: attributes.validTo,
    reference: attributes.reference,
    relationshipType: attributes.category.includes('DIRECT') ? 'direct-parent' : 'ultimate-parent',
    entityUrl: data.relationships?.["lei-record"]?.links?.related
  };
};

/**
 * Helper to follow a link and get the LEI record or parse the exception
 */
async function followRelationshipLink(linkUrl: string): Promise<{type: string; data: any} | null> {
  try {
    const response = await fetch(linkUrl);
    const result = await response.json();
    
    // Check the type of response
    if (result.data) {
      // Check if this is a reporting exception
      if (result.data.type === "reporting-exceptions") {
        return { 
          type: "exception", 
          data: parseReportingExceptionFromGLEIF(result.data) 
        };
      }
      // Check if this is a relationship record that has a link to an LEI record
      else if (result.data.relationships?.["lei-record"]?.links?.related) {
        // Follow the link to get the actual LEI record
        const leiResponse = await fetch(result.data.relationships["lei-record"].links.related);
        const leiData = await leiResponse.json();
        
        if (leiData.data) {
          return { 
            type: "lei-record", 
            data: parseCompanyFromGLEIF(leiData.data) 
          };
        }
      }
      // If it's already an LEI record
      else if (result.data.type === "lei-records") {
        return { 
          type: "lei-record", 
          data: parseCompanyFromGLEIF(result.data) 
          };
      }
    }
    
    console.error("Unhandled API response format:", result);
    return null;
  } catch (error) {
    console.error("Error following relationship link:", error);
    return null;
  }
}

/**
 * Fetch company by LEI
 */
export const fetchCompanyByLei = async (lei: string): Promise<any | null> => {
  try {
    const response = await fetch(`https://api.gleif.org/api/v1/lei-records/${lei}`);
    const data = await response.json();
    
    if (data.data) {
      return parseCompanyFromGLEIF(data.data);
    }
  } catch (error) {
    console.error("Error fetching company by LEI:", error);
  }
  
  return null;
};

/**
 * Fetch direct children of a company using the provided URL or construct one
 */
export const fetchDirectChildren = async (lei: string, directChildrenUrl?: string): Promise<any[]> => {
  const children: any[] = [];
  
  try {
    const url = directChildrenUrl || `https://api.gleif.org/api/v1/lei-records?filter[entity.parent.lei]=${lei}&page[size]=10`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      // Process direct LEI records
      for (const child of data.data) {
        const parsedChild = parseCompanyFromGLEIF(child);
        if (parsedChild) {
          children.push(parsedChild);
        }
      }
    }
  } catch (error) {
    console.error("Error fetching child companies:", error);
  }
  
  return children;
};

/**
 * Fetch parent company data, handling both direct LEI records and reporting exceptions
 */
export const fetchParentCompany = async (company: any): Promise<{ 
  parentEntity: any | null; 
  parentException: any | null;
} | null> => {
  if (!company || !company.relationships?.directParent) {
    return { parentEntity: null, parentException: null };
  }
  
  try {
    const relationships = company.relationships.directParent;
    
    // Check for direct LEI record link - use this first if available
    if (relationships.leiRecord) {
      console.log("Fetching parent directly using lei-record link:", relationships.leiRecord);
      const response = await fetch(relationships.leiRecord);
      const leiData = await response.json();
      
      if (leiData.data) {
        const parentEntity = parseCompanyFromGLEIF(leiData.data);
        console.log("Found parent entity:", parentEntity.name);
        return { 
          parentEntity, 
          parentException: null 
        };
      }
    }
    
    // Check for reporting exception
    if (relationships.reportingException) {
      console.log("Processing parent reporting exception:", relationships.reportingException);
      const exceptionResult = await followRelationshipLink(relationships.reportingException);
      
      if (exceptionResult && exceptionResult.type === "exception") {
        return { 
          parentEntity: null, 
          parentException: exceptionResult.data 
        };
      }
    }
    
    // If no direct link or exception, try the relationship record
    if (relationships.relationshipRecord) {
      console.log("Following parent relationship record:", relationships.relationshipRecord);
      const recordResult = await followRelationshipLink(relationships.relationshipRecord);
      
      if (recordResult && recordResult.type === "lei-record") {
        return { 
          parentEntity: recordResult.data, 
          parentException: null 
        };
      }
    }
  } catch (error) {
    console.error("Error fetching parent company:", error);
  }
  
  return { parentEntity: null, parentException: null };
};

/**
 * Fetch ultimate parent company data, handling both direct LEI records and reporting exceptions
 */
export const fetchUltimateParentCompany = async (company: any): Promise<{ 
  parentEntity: any | null; 
  parentException: any | null;
} | null> => {
  if (!company || !company.relationships?.ultimateParent) {
    return { parentEntity: null, parentException: null };
  }
  
  try {
    const relationships = company.relationships.ultimateParent;
    
    // Check for direct LEI record link - use this first if available
    if (relationships.leiRecord) {
      console.log("Fetching ultimate parent directly using lei-record link:", relationships.leiRecord);
      const response = await fetch(relationships.leiRecord);
      const leiData = await response.json();
      
      if (leiData.data) {
        const parentEntity = parseCompanyFromGLEIF(leiData.data);
        console.log("Found ultimate parent entity:", parentEntity.name);
        return { 
          parentEntity, 
          parentException: null 
        };
      }
    }
    
    // Check for reporting exception
    if (relationships.reportingException) {
      console.log("Processing ultimate parent reporting exception:", relationships.reportingException);
      const exceptionResult = await followRelationshipLink(relationships.reportingException);
      
      if (exceptionResult && exceptionResult.type === "exception") {
        return { 
          parentEntity: null, 
          parentException: exceptionResult.data 
        };
      }
    }
    
    // If no direct link or exception, try the relationship record
    if (relationships.relationshipRecord) {
      console.log("Following ultimate parent relationship record:", relationships.relationshipRecord);
      const recordResult = await followRelationshipLink(relationships.relationshipRecord);
      
      if (recordResult && recordResult.type === "lei-record") {
        return { 
          parentEntity: recordResult.data, 
          parentException: null 
        };
      }
    }
  } catch (error) {
    console.error("Error fetching ultimate parent company:", error);
  }
  
  return { parentEntity: null, parentException: null };
};

/**
 * Fetch the full corporate hierarchy including parents, exceptions, and children
 */
export const fetchCorporateHierarchy = async (company: any) => {
  if (!company) return null;
  
  // Initialize the hierarchy data
  const hierarchyData = {
    current: company,
    directParent: null,
    directParentException: null,
    ultimateParent: null,
    ultimateParentException: null,
    children: [],
    loading: true,
    error: null
  };
  
  try {
    console.log("Fetching hierarchy for company:", company.name, company.lei);
    
    // Fetch direct parent if available
    if (company.hasDirectParent) {
      console.log("Fetching direct parent...");
      const parentResult = await fetchParentCompany(company);
      hierarchyData.directParent = parentResult?.parentEntity || null;
      hierarchyData.directParentException = parentResult?.parentException || null;
      
      if (hierarchyData.directParent) {
        console.log("Direct parent found:", hierarchyData.directParent.name);
      } else if (hierarchyData.directParentException) {
        console.log("Direct parent exception:", hierarchyData.directParentException.reason);
      } else {
        console.log("No direct parent information could be retrieved");
      }
    }
    
    // Fetch ultimate parent if available
    if (company.hasUltimateParent) {
      console.log("Fetching ultimate parent...");
      const ultimateResult = await fetchUltimateParentCompany(company);
      hierarchyData.ultimateParent = ultimateResult?.parentEntity || null;
      hierarchyData.ultimateParentException = ultimateResult?.parentException || null;
      
      if (hierarchyData.ultimateParent) {
        console.log("Ultimate parent found:", hierarchyData.ultimateParent.name);
      } else if (hierarchyData.ultimateParentException) {
        console.log("Ultimate parent exception:", hierarchyData.ultimateParentException.reason);
      } else {
        console.log("No ultimate parent information could be retrieved");
      }
    }
    
    // Fetch children if available
    if (company.hasChildren && company.relationships?.directChildren?.related) {
      console.log("Fetching children...");
      hierarchyData.children = await fetchDirectChildren(
        company.lei, 
        company.relationships.directChildren.related
      );
      console.log(`Found ${hierarchyData.children.length} children`);
    }
    
  } catch (error) {
    console.error("Error fetching corporate hierarchy:", error);
    hierarchyData.error = "Failed to load the complete corporate hierarchy";
  } finally {
    hierarchyData.loading = false;
  }
  
  console.log("Hierarchy loaded:", hierarchyData);
  return hierarchyData;
};
