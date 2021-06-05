import { Database } from "./database";

export class WebServer {

  private app;
  private database : Database;

  constructor(app, database : Database) {
    this.app = app;
    this.database = database;
    this.Initialize();
  }

  Initialize() {
    this.app.get("/", (req, res) => res.send("This is the API endpoint for the TAIOVA application."));

    this.app.get("/busses", async (req, res) => res.send(
      await this.database.GetAllVehicles()
    ))

    this.app.get("/busses/:company/:number", async (req, res) => {
      
      const result = await this.database.GetVehicle(req.params.number, req.params.company, true);
      if(Object.keys(result).length > 0) res.send(result["_doc"]);
      else res.send({})
     })
    
  }
}