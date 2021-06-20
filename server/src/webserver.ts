import { Database } from "./database";
import { SearchHandler } from "./searchhandler";

export class WebServer {

  private app;
  private database : Database;
  private searchHandler : SearchHandler;
  constructor(app, database : Database) {
    this.app = app;
    this.database = database;
    this.searchHandler = new SearchHandler(database);
    this.Initialize();
  }

  Initialize() {
    this.app.get("/", (req, res) => res.send("This is the API endpoint for the TAIOVA application."));

    this.app.get("/busses", async (req, res) => res.send(
      await this.database.GetAllVehiclesSmall()
    ))

    this.app.get("/busses/:company/:number", async (req, res) => {
      
      try {
        const result = await this.database.GetVehicle(req.params.number, req.params.company, true);
        if(Object.keys(result).length > 0) 
          res.send(result["_doc"]);
        else 
          res.send({})  
      }
      catch(error) { res.send(error.message) }

     })
    

    this.app.get("/trip/:company/:planningnumber/:tripnumber", async(req, res) => {
      
      try { res.send(await this.database.GetTrip(req.params.tripnumber, req.params.planningnumber, req.params.company)); }
      catch(error) { res.send(error.message) }

    })

    this.app.get("/route/:routenumber", async(req, res) => {
      

      try { res.send(await this.database.GetRoute(req.params.routenumber)); }
      catch(error) { res.send(error.message) }

    })

    this.app.get("/shape/:shapenumber", async(req, res) => {
      
      try { res.send(await this.database.GetShape(req.params.shapenumber)); }
      catch(error) { res.send(error.message) }

    })

    this.app.get("/tripdata/:company/:tripId", async(req, res) => {
      try { 
        const response = await this.database.GetTripPositions(req.params.tripId, req.params.company);
        const sortedPositions = response.positions.sort((a, b) => Math.sqrt(a[0] + a[1]) - Math.sqrt(a[0] + b[1]))
        response.positions = sortedPositions;
        res.send(response); }
      catch(error) { res.send(error.message) }      
    })

    this.app.get("/search/:query", async(req, res) => {
      try {
        res.send(await this.searchHandler.SearchForEverything(req.params.query));
      } catch(error) { res.send(error.message) }
    })
  }
}