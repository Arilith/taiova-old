import { Database } from "./database";
import { Route } from "./types/Route";
import { VehicleData } from "./types/VehicleData";

export class SearchHandler {

  private database: Database;
  constructor(db : Database) {
    this.Init();
    this.database = db;
  }

  async Init() {
    
  }

  public async SearchForEverything(searchString : string, limit : number) : Promise<any> {

    // const priorities = {
    //   ROUTE : 10,
    //   TRIP : 5,
    //   COMPANY: 1
    // }

    const seperateTerms = searchString.split(" ");
    const firstTerm = seperateTerms[0];

    const foundRoutesByFirstTerm : Array<Route> = await this.GetRoutes(firstTerm);

    const foundRoutesByTerms : Array<Route> = [];
    foundRoutesByFirstTerm.forEach(route => {
      
      let foundTerms = 0;
      seperateTerms.forEach(term => {
        if(route.routeLongName.toLowerCase().includes(term.toLowerCase()) || route.routeShortName.toLowerCase().includes(term.toLowerCase()) || route.subCompany.toLowerCase().includes(term.toLowerCase()) || route.company.toLowerCase().includes(term.toLowerCase()))
          foundTerms++;
      })

      if(foundTerms == seperateTerms.length) foundRoutesByTerms.push(route);

    }) 
           
    
    return foundRoutesByTerms.slice(0, limit);
  }

  public async GetRoutes (searchString: string) : Promise<Array<Route>>  {
    const foundRoutes = await this.database.GetRoutesByString(searchString);
    return foundRoutes;
  }

  public SearchForTripSign (searchString: string) : any {

  }

  public async SearchForVehicleByRoute (routeId : number) {
    return this.database.GetVehiclesByRouteId(routeId);
  }

}