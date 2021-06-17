export const CompanyName = company => {
  
  switch (company) {
    case "ARR":
      return "Arriva";
    case "CXX":
      return "Connexxion";
    case "EBS":
      return "EBS";
    case "BRENG":
      return "Breng";
    case "QBUZZ":
      return "QBUZZ";
    case "UOV":
      return "UOV";
    case "RET":
      return "RET Rotterdam";
    case "BRAVO":
      return "Bravo";
    case "OVREGIOY":
      return "OV Regio Flevoland";
    case "SYNTUS":
      return "Syntus Utrecht";
    case "KEOLIS":
      return "Keolis";
    case "WATERBUS":
      return "Waterbus";
    case "ALLGO":
      return "allGo";
    case "TWENTS":
      return "Syntus Twente";
    case "GVB":
      return "GVB Amsterdam";
    case "OVERAL":
      return "Overal";
    default:
      return company;
  }
    
}

export const CompanyNameFromArray = arrayOfCompanies => {
  const newCompanies = [];
  arrayOfCompanies.forEach(company => newCompanies.push(CompanyName(company)))
  return newCompanies; 
}