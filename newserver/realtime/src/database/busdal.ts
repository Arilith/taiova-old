import { query as db, QueryBuilder, QueryTypes } from '../database/database'
import { SmallBus } from '../types/socket/Bus';
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
    const res = await db(`SELECT "company", "vehicleNumber", "lat", "long", "lineNumber" FROM busses`);
    return res.rows;
  }

  /**
   * Inserts a bus with all required information into the database.
   * @param busToAdd The bus to add to the database, in the databaseBus format.
   * @returns The added bus
   */
  async AddBus(busToAdd : DatabaseBus) : Promise<DatabaseBus> {
    const res = await db(QueryBuilder(QueryTypes.CREATE, "busses", busToAdd))
    return res.rows[0];
  }

    /**
   * Inserts a bus with all required information into the database.
   * @param busToUpdate The the id of the bus to add to the database.
   * @param updatedBus The full updated bus object.
   * @returns The added bus
   */
  async UpdateBus(busToUpdate : number, updatedBus : DatabaseBus) : Promise<DatabaseBus> {
    updatedBus["id"] = busToUpdate;
    const res = await db(QueryBuilder(QueryTypes.UPDATE, "busses", updatedBus))
    return res.rows ? res.rows[0] : null;
  }

  async GetBus(originalCompany, vehicleNumber) : Promise<DatabaseBus> {
    const res = await db(`SELECT * FROM busses WHERE "originalCompany" = '${originalCompany}' AND "vehicleNumber" = '${vehicleNumber}' LIMIT 1`);
    return res.rows ? res.rows[0] : null;
  }

  async GetBusSmall(originalCompany, vehicleNumber) : Promise<SmallBus> {
    const res = await db(`SELECT "lineNumber", "lat", "long" FROM busses WHERE "originalCompany" = '${originalCompany}' AND "vehicleNumber" = '${vehicleNumber}' LIMIT 1`);
    return res.rows ? res.rows[0] : null;
  }

  async GetBusBySubCompany(company, vehicleNumber) : Promise<DatabaseBus> {
    const res = await db(`SELECT * FROM busses WHERE "company" = '${company}' AND "vehicleNumber" = '${vehicleNumber}' LIMIT 1`);
    return res.rows ? res.rows[0] : null;
  }

  async BusExists(originalCompany, vehicleNumber) : Promise<boolean> {
    const res = await db(`SELECT EXISTS(SELECT 1 FROM busses WHERE "originalCompany" = '${originalCompany}' AND "vehicleNumber" = '${vehicleNumber}')`)

    return res.rows[0].exists;
  }

  async DeleteBus(column, operator, columnValue) : Promise<void> {
    const res = await db(`DELETE FROM busses WHERE "${column}" ${operator} '${columnValue}'`);
    return res.rowCount;
  }

}