import { Database } from "./database";
import { VehicleData, vehicleState } from "./types/VehicleData";

export class BusLogic {

  private database : Database;

  constructor(database) {
    this.database = database;
    this.Initialize();
  }

  async Initialize() {
    
  }

  UpdateBusses(busses : Array<VehicleData>) : void {
    
    busses.forEach(async (bus, index) => {
      const foundVehicle = await this.database.GetVehicle(bus.vehicleNumber, bus.company)
      if(Object.keys(foundVehicle).length !== 0) {
        console.log(`Updating vehicle ${bus.vehicleNumber} from ${bus.company}`)
        await this.database.UpdateVehicle(foundVehicle, bus, true);
      } else {
        console.log(`creating new vehicle ${bus.vehicleNumber} from ${bus.company}`)
        if(bus.status === vehicleState.ONROUTE) await this.database.AddVehicle(bus, true)
      }
              
    })

  }
}