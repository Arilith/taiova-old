import { BusDal } from "../database/busdal";
import { DatabaseBus } from "../database/models/bus";
import { Bus, BusState } from "../types/Bus";
import { SmallBus } from "../types/socket/Bus";

export class BusLogic {

  private _busDal = new BusDal();
  private isApi;

  constructor(isApi = false) {
    this.isApi = isApi;
  }

  public async GetAllBusses() : Promise<Array<Bus>> {
    try {
      return this._busDal.GetAllBusses();
    } catch (err) {
      console.error(err.message);
      if(this.isApi) throw err;
    }
  }

  public async GetAllBussesSmall() : Promise<Array<SmallBus>> {
    try {
      return this._busDal.GetAllBussesSmall();
    } catch (err) {
      console.error(err.message)
      if(this.isApi) throw err;
    }
  }

  public async AddBus(busToAdd : DatabaseBus = null) : Promise<void> {
    try  {
      const test = await this._busDal.AddBus({
        company: "ARR",
        originalCompany: "BRAVO",
        planningNumber: "32132",
        journeyNumber: 2312,
        timestamp: 312312312,
        vehicleNumber: 3211,
        lat: 3.444412,
        long: 34.322323,
        status: BusState.ONROUTE,
        createdAt: 321312313,
        updatedAt: 231231231,
        routeId: 31212,
        tripId: 21234,
        lineNumber: "311"
      });

      console.log(test)
    } catch(err) {
      console.error(err.message);
      if(this.isApi) throw err;
    }
  }

  public async UpdateBus() : Promise<void> {
    try {
      const test = await this._busDal.UpdateBus(1, {
        company: "CXX",
        originalCompany: "BRAVO",
        planningNumber: "32132",
        journeyNumber: 2312,
        timestamp: 312312312,
        vehicleNumber: 3211,
        lat: 3.444412,
        long: 34.322323,
        status: BusState.ONROUTE,
        createdAt: 321312313,
        updatedAt: 231231231,
        routeId: 31212,
        tripId: 21234,
        lineNumber: "311"
      });

      console.log(test)
    } catch(err) {
      console.error(err.message);
      if(this.isApi) throw err;
    }
  }
}