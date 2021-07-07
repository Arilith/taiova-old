import { BusDal } from "../database/busdal";
import { DatabaseBus } from "../database/models/bus";
import { Route } from "../database/models/route";
import { Trip } from "../database/models/trip";
import { RouteDal } from "../database/RouteDal";
import { TripDal } from "../database/tripdal";
import { Bus, BusState } from "../types/Bus";
import { ConvertToSmallBusses, SmallBus } from "../types/socket/Bus";

export class BusLogic {

  private _busDal = new BusDal();
  private _tripDal = new TripDal();
  private _routeDal = new RouteDal();
  private isApi;

  constructor(isApi = false) {
    this.isApi = isApi;
  }

  public async CheckBusses(busses : Array<DatabaseBus>) : Promise<void> {
    const StartTime = new Date().getTime();
    for(const bus of busses) {
      const foundBus : any = await this.GetBus(bus.originalCompany, bus.vehicleNumber.toString()); //eslint-disable
      //Todo: Eventually this should be moved to a message queue, so that the trips don't have to be looked up for every bus.
      if(foundBus) await this.UpdateBusLocal(foundBus, bus);
      else await this.AddBusLocal(bus);      
    }

    const EndTime = new Date().getTime();
   // console.log(`Checking ${busses.length} busses took ${EndTime - StartTime} ms`)
  }

  private async UpdateBusLocal(busToUpdate : DatabaseBus, busToUpdateWith : DatabaseBus) {
    //Todo: Add .env vars
    // console.log(`Updating vehicle ${busToUpdate.vehicleNumber} from ${busToUpdate.originalCompany}`)

    let foundRoute : Route = null;
    const hasLocation : boolean = busToUpdateWith.status === BusState.ONROUTE || busToUpdateWith.status === BusState.OFFROUTE;
    const foundTrip : Trip = await this._tripDal.GetTrip(busToUpdateWith.journeyNumber, busToUpdateWith.planningNumber, busToUpdateWith.originalCompany);
    if(foundTrip)
      foundRoute = await this._routeDal.GetRoute(foundTrip?.routeId);
    const updatedBus : DatabaseBus = {
      ...busToUpdate,
      lat : hasLocation ? busToUpdateWith.lat : busToUpdate.lat,
      long: hasLocation ? busToUpdateWith.long : busToUpdate.long,
      status: busToUpdateWith.status,
      tripId: foundTrip?.tripId,
      routeId : foundTrip?.routeId,
      lineNumber: foundRoute?.routeShortName
    }

    //Todo: fix this, why the heck is the company empty? 
    if(!busToUpdateWith.originalCompany || !busToUpdateWith.company) return;
    await this.UpdateBus(busToUpdate.id, updatedBus);
  }

  private async AddBusLocal(newBus : DatabaseBus) {
    //Todo: Add .env vars
    // console.log(`Adding vehicle ${newBus.vehicleNumber} from ${newBus.originalCompany}`)
    let foundRoute : Route = null;
    if(newBus.status !== BusState.ONROUTE && newBus.status !== BusState.OFFROUTE) return;
    const foundTrip : Trip = await this._tripDal.GetTrip(newBus.journeyNumber, newBus.planningNumber, newBus.originalCompany);
    if(foundTrip)
      foundRoute = await this._routeDal.GetRoute(foundTrip.routeId);

    const newDatabaseBus : DatabaseBus = {
      ...newBus,
      lat : newBus.lat,
      long: newBus.long,
      tripId: foundTrip?.tripId,
      routeId: foundTrip?.routeId,
      lineNumber: foundRoute?.routeShortName,
      company: foundRoute?.company
    };

    //Todo: fix this, why the heck is the company empty? 
    if(!newDatabaseBus.originalCompany || !newDatabaseBus.company) return;

    if(newDatabaseBus.lat !== 0)
      await this.AddBus(newDatabaseBus);

  }

  public async GetBus(company : string, vehicleNumber: string, small = false) {
    try { 
      if(small)
        return await this._busDal.GetBusSmall(company, vehicleNumber);
      
      return await this._busDal.GetBus(company, vehicleNumber); 
    } catch (err) {
      console.error(err.message);
      if(this.isApi) throw err;
    }
  }

  public async BusExists(originalCompany : string, vehicleNumber: string) : Promise<boolean> {
    try { 
      return await this._busDal.BusExists(originalCompany, vehicleNumber); 
    } catch (err) {
      console.error(err.message);
      if(this.isApi) throw err;
    }
  }

  public async GetAllBusses(small = false) : Promise<Array<Bus> | Array<SmallBus>> {
    try {
      if(small)
        return ConvertToSmallBusses(await this._busDal.GetAllBussesSmall());

      return this._busDal.GetAllBusses();

    } catch (err) {
      console.error(err.message);
      if(this.isApi) throw err;
    }
  }


  public async AddBus(busToAdd : DatabaseBus) : Promise<DatabaseBus> {
    try  {
      return await this._busDal.AddBus(busToAdd);
    } catch(err) {
      console.error(err.message);
      if(this.isApi) throw err;
    }
  }

  public async UpdateBus(busToUpdateId : number, updatedBus : DatabaseBus) : Promise<DatabaseBus> {
    try {
      return await this._busDal.UpdateBus(busToUpdateId, updatedBus);
    } catch(err) {
      console.error(err.message);
      if(this.isApi) throw err;
    }
  }
}