
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
    "5Z1V": "Sole Proprietorship"
  };
  
  return legalFormMap[id] || id;
};

export const fetchDirectChildren = async (lei: string): Promise<any[]> => {
  try {
    const response = await fetch(`https://api.gleif.org/api/v1/lei-records?filter[entity.parent.lei]=${lei}&page[size]=10`);
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return data.data;
    }
  } catch (error) {
    console.error("Error fetching child companies:", error);
  }
  
  return [];
};

export const fetchParentCompany = async (parentLei: string): Promise<any | null> => {
  try {
    const response = await fetch(`https://api.gleif.org/api/v1/lei-records/${parentLei}`);
    const data = await response.json();
    
    if (data.data) {
      return data.data;
    }
  } catch (error) {
    console.error("Error fetching parent company:", error);
  }
  
  return null;
};

export const fetchCompanyByLei = async (lei: string): Promise<any | null> => {
  try {
    const response = await fetch(`https://api.gleif.org/api/v1/lei-records/${lei}`);
    const data = await response.json();
    
    if (data.data) {
      return data.data;
    }
  } catch (error) {
    console.error("Error fetching company by LEI:", error);
  }
  
  return null;
};
