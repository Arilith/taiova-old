import { Database } from "./database";
import { VehicleData, vehicleState } from "./types/VehicleData";
import { resolve } from 'path';
import * as fs from 'fs';
import { Trip } from "./types/Trip";
import { ApiTrip } from "./types/ApiTrip";

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
   * Updates or creates a new bus depending on if it already exists or not.
   * @param busses The list of busses to update.
   */
   public async UpdateBusses(busses : Array<VehicleData>) : Promise<void> {
    
    await busses.forEach(async (bus, index) => {
      const foundVehicle = await this.database.GetVehicle(bus.vehicleNumber, bus.company)
      if(Object.keys(foundVehicle).length !== 0) {
        if(process.env.APP_DO_UPDATE_LOGGING == "true") console.log(`Updating vehicle ${bus.vehicleNumber} from ${bus.company}`)
        await this.database.UpdateVehicle(foundVehicle, bus, true);
      } else {
        if(process.env.APP_DO_CREATE_LOGGING == "true") console.log(`creating new vehicle ${bus.vehicleNumber} from ${bus.company}`)
        if(bus.status === vehicleState.ONROUTE) await this.database.AddVehicle(bus, true)
      }
              
    })
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
  public InitKV78() : void {
    this.InitTripsNew();
  }

  /**
   * Initializes the trips from the specified URL in the .env , or "../GTFS/extracted/trips.json" to the database.
   */
  private InitTripsNew() : void { 
    const tripsPath = resolve("GTFS\\extracted\\trips.txt.json");
    const testPath = resolve("GTFS\\extracted\\trips.stripped.json");
    const tripsFile = fs.readFile(tripsPath, 'utf8', async(error, data) => { 
      if(data) console.log("Loading done.");
      data = data.trim();
      const lines = data.split("\n");
      
      const convertedTrips = [];

      for(let line of lines) {
        const tripJSON : ApiTrip = JSON.parse(line);
        const realTimeTripId = tripJSON.realtime_trip_id.split(":");
        const company = realTimeTripId[0];
        const planningNumber = realTimeTripId[1];
        const tripNumber = realTimeTripId[2];

        const trip = {
          company: company,
          routeId: tripJSON.route_id,
          serviceId: tripJSON.service_id,
          tripId: tripJSON.trip_id,
          tripNumber: tripNumber,
          tripPlanningNumber: planningNumber,
          tripHeadsign: tripJSON.trip_headsign,
          tripName: tripJSON.trip_long_name,
          directionId: tripJSON.direction_id,
          shapeId: tripJSON.shape_id,
          wheelchairAccessible: tripJSON.wheelchair_accessible
        }
        
        convertedTrips.push(trip);
        
      }   
      await this.database.InsertManyTrips(convertedTrips.slice(0, 20000));
    });
   
    
  }

}