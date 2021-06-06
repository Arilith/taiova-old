import { Database } from "./database";
import { VehicleData, vehicleState } from "./types/VehicleData";

export class BusLogic {

  private database : Database;

  constructor(database, doInit : boolean = false) {
    this.database = database;

    if(doInit) this.Initialize();
  }

  async Initialize() {
    await this.ClearBusses();

    setInterval(async () => {
      await this.ClearBusses();
    }, parseInt(process.env.APP_CLEANUP_DELAY))
  }

  async UpdateBusses(busses : Array<VehicleData>) : Promise<void> {
    
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

  async ClearBusses() : Promise<void> {
    if(process.env.APP_DO_CLEANUP_LOGGING == "true") console.log("Clearing busses")
    const currentTime = Date.now();
    const fifteenMinutesAgo = currentTime - (60 * parseInt(process.env.APP_CLEANUP_VEHICLE_AGE_REQUIREMENT) * 1000);
    const RemovedVehicles = await this.database.RemoveVehiclesWhere({ updatedAt: { $lt: fifteenMinutesAgo } }, process.env.APP_DO_CLEANUP_LOGGING == "true");

  }
}