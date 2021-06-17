import { Database } from "./database";
import { VehicleData, vehicleState } from "./types/VehicleData";
import { resolve } from 'path';
import * as fs from 'fs';
import { Trip } from "./types/Trip";
import { ApiTrip } from "./types/ApiTrip";
import { exec } from 'child_process';
import { Route } from "./types/Route";
import { ApiRoute } from "./types/ApiRoute";
import { ApiShape } from "./types/ApiShape";
import { Shape } from "./types/Shape";

export class BusLogic {

  private database : Database;

  constructor(database, doInit : boolean = false) {
    this.database = database;

    if(doInit) this.Initialize();
  }

  private async Initialize() {
    await this.ClearBusses();

    setInterval(async () => {
      await this.ClearBusses();
    }, parseInt(process.env.APP_CLEANUP_DELAY))
  }

  /**
   * Clears busses every X amount of minutes specified in .env file.
   */
  public async ClearBusses() : Promise<void> {
    if(process.env.APP_DO_CLEANUP_LOGGING == "true") console.log("Clearing busses")
    const currentTime = Date.now();
    const fifteenMinutesAgo = currentTime - (60 * parseInt(process.env.APP_CLEANUP_VEHICLE_AGE_REQUIREMENT) * 1000);
    const RemovedVehicles = await this.database.RemoveVehiclesWhere({ updatedAt: { $lt: fifteenMinutesAgo } }, process.env.APP_DO_CLEANUP_LOGGING == "true");
  }

  /**
   * Initializes the "Koppelvlak 7 and 8 turbo" files to database.
   */
  public async InitKV78() : Promise<void> {
    this.InitTripsNew();
    this.InitRoutes();
    this.InitShapes();
  }

  /**
   * Initializes the trips from the specified URL in the .env , or "../GTFS/extracted/trips.json" to the database.
   */
  private InitTripsNew() : void { 
    const tripsPath = resolve("GTFS/extracted/trips.txt.json");
    const outputPath = resolve("GTFS/converted/trips.json");
    fs.readFile(tripsPath, 'utf8', async(error, data) => { 
      if(error) console.error(error);
      if(data && process.env.APP_DO_CONVERTION_LOGGING == "true") console.log("Loaded trips file into memory.");
      data = data.trim();
      const lines = data.split("\n");
      const writeStream = fs.createWriteStream(outputPath)
      const convertedTrips = [];

      for(let line of lines) {
        const tripJSON : ApiTrip = JSON.parse(line);
        const realTimeTripId = tripJSON.realtime_trip_id.split(":");
        const company = realTimeTripId[0];
        const planningNumber = realTimeTripId[1];
        const tripNumber = realTimeTripId[2];

        const trip : Trip = {
          company: company,
          routeId: parseInt(tripJSON.route_id),
          serviceId: parseInt(tripJSON.service_id),
          tripId: parseInt(tripJSON.trip_id),
          tripNumber: parseInt(tripNumber),
          tripPlanningNumber: planningNumber,
          tripHeadsign: tripJSON.trip_headsign,
          tripName: tripJSON.trip_long_name,
          directionId: parseInt(tripJSON.direction_id),
          shapeId: parseInt(tripJSON.shape_id),
          wheelchairAccessible: parseInt(tripJSON.wheelchair_accessible)
        }
        writeStream.write(JSON.stringify(trip) + "\n");
      }
      
      writeStream.end(async () => {
        if(process.env.APP_DO_CONVERTION_LOGGING == "true") console.log("Finished writing trips file, importing to database.");
        await this.ImportTrips();
      })
    });
   
    
  }

  async ImportTrips() : Promise<void> {
    await this.database.DropTripsCollection();

    if(process.env.APP_DO_CONVERTION_LOGGING == "true") console.log("Importing trips to mongodb");

    await exec("mongoimport --db taiova --collection trips --file ./GTFS/converted/trips.json", (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }

      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }

      if(process.env.APP_DO_CONVERTION_LOGGING == "true") console.log(`stdout: ${stdout}`);
    });

  }

  /**
   * Initializes the routes from the specified URL in the .env , or "../GTFS/extracted/routes.json" to the database.
   */
  private InitRoutes () {
    const routesPath = resolve("GTFS/extracted/routes.txt.json");
    const outputPath = resolve("GTFS/converted/routes.json");
    fs.readFile(routesPath, 'utf8', async(error, data) => { 
      if(error) console.error(error);
      if(data && process.env.APP_DO_CONVERTION_LOGGING == "true") console.log("Loaded routes file into memory.");
      data = data.trim();
      const lines = data.split("\n");
      const writeStream = fs.createWriteStream(outputPath)

      for(let line of lines) {
        const routeJson : ApiRoute = JSON.parse(line);
        const companySplit = routeJson.agency_id.split(':');
        const route : Route = {
          routeId: parseInt(routeJson.route_id),
          company: companySplit[0],
          subCompany: companySplit[1] ? companySplit[1] : "None",
          routeShortName: routeJson.route_short_name,
          routeLongName: routeJson.route_long_name,
          routeDescription: routeJson.route_desc,
          routeType: parseInt(routeJson.route_type)
        }

        writeStream.write(JSON.stringify(route) + "\n");
      }
      
      writeStream.end(() => {
        if(process.env.APP_DO_CONVERTION_LOGGING == "true") console.log("Finished writing routes file, importing to database.");
        this.ImportRoutes();
      })
    });
  }

  async ImportRoutes() : Promise<void> {
    await this.database.DropRoutesCollection();

    if(process.env.APP_DO_CONVERTION_LOGGING == "true") console.log("Importing routes to mongodb");

    await exec("mongoimport --db taiova --collection routes --file ./GTFS/converted/routes.json", (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }

      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }

      if(process.env.APP_DO_CONVERTION_LOGGING == "true") console.log(`stdout: ${stdout}`);
    });

  }

  /**
   * Initializes the shapes from the specified URL in the .env , or "../GTFS/extracted/routes.json" to the database.
   */
   private InitShapes () {
    const routesPath = resolve("GTFS/extracted/shapes.txt.json");
    const outputPath = resolve("GTFS/converted/shapes.json");
    fs.readFile(routesPath, 'utf8', async(error, data) => { 
      if(error) console.error(error);
      if(data && process.env.APP_DO_CONVERTION_LOGGING == "true") console.log("Loaded shapes file into memory.");
      data = data.trim();
      const lines = data.split("\n");
      const writeStream = fs.createWriteStream(outputPath)

      for(let line of lines) {
        const shapeJson : ApiShape = JSON.parse(line);
        const shape : Shape = {
          shapeId: parseInt(shapeJson.shape_id),
          shapeSequenceNumber: parseInt(shapeJson.shape_pt_sequence),
          Position: [parseFloat(shapeJson.shape_pt_lat), parseFloat(shapeJson.shape_pt_lon)],
          DistanceSinceLastPoint: parseInt(shapeJson.shape_dist_traveled)
        }

        writeStream.write(JSON.stringify(shape) + "\n");
      }
      
      writeStream.end(() => {
        if(process.env.APP_DO_CONVERTION_LOGGING == "true") console.log("Finished writing shapes file, importing to database.");
        this.ImportShapes();
      })
    });
  }

  async ImportShapes() : Promise<void> {
    await this.database.DropShapesCollection();

    if(process.env.APP_DO_CONVERTION_LOGGING == "true") console.log("Importing shapes to mongodb");

    await exec("mongoimport --db taiova --collection shapes --file ./GTFS/converted/shapes.json", (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }

      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }

      if(process.env.APP_DO_CONVERTION_LOGGING == "true") console.log(`stdout: ${stdout}`);
    });

  }
}