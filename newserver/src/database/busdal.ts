import { query as db, QueryBuilder, QueryTypes } from '../database/database'
import { DatabaseBus } from './models/bus';
export class BusDal {

  /**
   * Retrieves all the busses from the database, with all possible information.
   * @returns Array of busses
   */
  async GetAllBusses() {
    const { busses } = await db("SELECT * FROM busses");

    return busses;
  }
  
  /**
   * Retrieves all the busses from the database, in a compact format optimized for data saving.
   * @returns Array of busses with only required information. 
   */
  async GetAllBussesSmall()  {
    const { busses } = await db("SELECT company, vehicleNumber, lat, long FROM busses");
    return busses;
  }

  /**
   * Inserts a bus with all required information into the database.
   * @param busToAdd The bus to add to the database, in the databaseBus format.
   * @returns The added bus
   */
  async AddBus(busToAdd : DatabaseBus) : Promise<Array<DatabaseBus>> {
    const res = await db(QueryBuilder(QueryTypes.CREATE, "busses", busToAdd))
    return res.rows;
  }

    /**
   * Inserts a bus with all required information into the database.
   * @param busToUpdate The the id of the bus to add to the database.
   * @param updatedBus The full updated bus object.
   * @returns The added bus
   */
  async UpdateBus(busToUpdate : number, updatedBus : DatabaseBus) : Promise<Array<DatabaseBus>> {
    updatedBus["id"] = busToUpdate;
    const res = await db(QueryBuilder(QueryTypes.UPDATE, "busses", updatedBus))
    return res.rows;
  }


}