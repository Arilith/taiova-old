export class WebServer {

  private app;

  constructor(app) {
    this.app = app;
  }

  Initialize() {
    this.app.get("/", (req, res) => res.send("This is the API endpoint for the TAIOVA application."));

    this.app.get("/busses", async (req, res) => res.send(
      //await db.GetAllVehicles()
    ))

    this.app.get("/busses/:company/:number/", (req, res) => {
      res.send(JSON.stringify(req.params));
    });
  }
}