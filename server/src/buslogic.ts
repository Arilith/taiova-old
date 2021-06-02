import { Database } from "./database";
import { VehicleData } from "./types/VehicleData";

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
      if(foundVehicle[0] != undefined)
        await this.database.UpdateVehicle(foundVehicle, bus);
      else
      await this.database.AddVehicle(bus)
    })

  }
}