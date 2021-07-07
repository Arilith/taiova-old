import { query as db, QueryBuilder, QueryTypes } from '../database/database'
import { Trip } from './models/trip';

export class TripDal {

  /**
   * Retrieves all the trips from the database, with all possible information.
   * @returns Array of trips
   */
  async GetAllTrips() {
    const { trips } = await db("SELECT * FROM trips");

    return trips;
  }
  
   /**
   * Retrieves a single trip from the database, with all possible information.
   * @returns Trip
   */
  async GetTrip(tripNumber : number, planningNumber: string, originalCompany: string) : Promise<Trip> {
    const res = await db(`SELECT * FROM trips WHERE "company" = '${originalCompany}' AND "tripPlanningNumber" = '${planningNumber}' AND "tripNumber"='${tripNumber}' LIMIT 1`);
    return res.rows ? res.rows[0] : null;
  }

  /**
   * Looks in the database for a specific trip and returns true if found.
   * @returns boolean
   */
  async TripExists(tripNumber : number, planningNumber: string, originalCompany: string) : Promise<boolean> {
    const res = await db(`SELECT EXISTS(SELECT 1 FROM trips WHERE "company" = '${originalCompany}' AND "tripPlanningNumber" = '${planningNumber}' AND "tripNumber"='${tripNumber}')`)

    return res.rows[0].exists;
  }

}