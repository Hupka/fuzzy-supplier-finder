
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
    "2HBR": "Private Limited Company (GmbH)"
  };
  
  return legalFormMap[id] || id;
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
  
  // Extract relationship links
  const relationships: Record<string, any> = {};
  
  if (data.relationships) {
    // Direct parent
    if (data.relationships["direct-parent"]?.links) {
      relationships.directParent = {
        relationshipRecord: data.relationships["direct-parent"].links["relationship-record"],
        leiRecord: data.relationships["direct-parent"].links["lei-record"],
        reportingException: data.relationships["direct-parent"].links["reporting-exception"]
      };
    }
    
    // Ultimate parent
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
  
  // Check for parent relationships based on links
  const hasDirectParent = !!(relationships.directParent?.leiRecord);
  const hasUltimateParent = !!(relationships.ultimateParent?.leiRecord);
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
 * Fetch direct children of a company using the provided URL or construct one
 */
export const fetchDirectChildren = async (lei: string, directChildrenUrl?: string): Promise<any[]> => {
  try {
    const url = directChildrenUrl || `https://api.gleif.org/api/v1/lei-records?filter[entity.parent.lei]=${lei}&page[size]=10`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data.map(child => parseCompanyFromGLEIF(child));
    }
  } catch (error) {
    console.error("Error fetching child companies:", error);
  }
  
  return [];
};

/**
 * Fetch parent company using the provided direct parent URL
 */
export const fetchParentCompany = async (directParentUrl?: string, parentLei?: string): Promise<any | null> => {
  if (!directParentUrl && !parentLei) return null;
  
  try {
    const url = directParentUrl || `https://api.gleif.org/api/v1/lei-records/${parentLei}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.data) {
      return parseCompanyFromGLEIF(data.data);
    }
  } catch (error) {
    console.error("Error fetching parent company:", error);
  }
  
  return null;
};

/**
 * Fetch ultimate parent company using the provided ultimate parent URL
 */
export const fetchUltimateParentCompany = async (ultimateParentUrl?: string): Promise<any | null> => {
  if (!ultimateParentUrl) return null;
  
  try {
    const response = await fetch(ultimateParentUrl);
    const data = await response.json();
    
    if (data.data) {
      return parseCompanyFromGLEIF(data.data);
    }
  } catch (error) {
    console.error("Error fetching ultimate parent company:", error);
  }
  
  return null;
};

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
 * Fetch the full corporate hierarchy (parents and children)
 */
export const fetchCorporateHierarchy = async (company: any) => {
  if (!company) return null;
  
  // Initialize the hierarchy data
  const hierarchyData = {
    current: company,
    directParent: null,
    ultimateParent: null,
    children: [],
    loading: true,
    error: null
  };
  
  try {
    // Fetch direct parent if available
    if (company.hasDirectParent && company.relationships?.directParent?.leiRecord) {
      hierarchyData.directParent = await fetchParentCompany(
        company.relationships.directParent.leiRecord
      );
    }
    
    // Fetch ultimate parent if available
    if (company.hasUltimateParent && company.relationships?.ultimateParent?.leiRecord) {
      hierarchyData.ultimateParent = await fetchUltimateParentCompany(
        company.relationships.ultimateParent.leiRecord
      );
    }
    
    // Fetch children if available
    if (company.hasChildren && company.relationships?.directChildren?.related) {
      hierarchyData.children = await fetchDirectChildren(
        company.lei, 
        company.relationships.directChildren.related
      );
    }
    
  } catch (error) {
    console.error("Error fetching corporate hierarchy:", error);
    hierarchyData.error = "Failed to load the complete corporate hierarchy";
  } finally {
    hierarchyData.loading = false;
  }
  
  return hierarchyData;
};

