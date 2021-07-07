import { Trip } from "../database/models/trip";
import { TripDal } from "../database/tripdal";

export class TripLogic {

  private _tripDal = new TripDal();
  private isApi;
  constructor(isApi = false) {
    this.isApi = isApi;
  }

  async GetTrip(tripNumber : number, planningNumber: string, originalCompany: string) : Promise<Trip> {
    try {
      return await this._tripDal.GetTrip(tripNumber, planningNumber, originalCompany);
    } catch(err) {
      console.error(err);
      if(this.isApi) throw err;
    }
  }

  async TripExists(tripNumber : number, planningNumber: string, originalCompany: string) : Promise<boolean> {
    try {
      return await this._tripDal.TripExists(tripNumber, planningNumber, originalCompany);
    } catch(err) {
      console.error(err);
      if(this.isApi) throw err;
    }
  }

}