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

    this.app.get("/busses/:company/:number/", (req, res) => {
      res.send(JSON.stringify(req.params));
    });
  }
}