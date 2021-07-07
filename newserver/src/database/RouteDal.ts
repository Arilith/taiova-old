import { query as db, QueryBuilder, QueryTypes } from '../database/database'
import { Route } from './models/route';

export class RouteDal {

  /**
   * Retrieves all the routes from the database, with all possible information.
   * @returns Array of routes
   */
  async GetAllroutes() {
    const { routes } = await db("SELECT * FROM routes");

    return routes;
  }
  
   /**
   * Retrieves a single trip from the database, with all possible information.
   * @returns Trip
   */
  async GetRoute(routeId : number) : Promise<Route> {
    const res = await db(`SELECT * FROM routes WHERE "routeId"='${routeId}' LIMIT 1`);
    return res.rows ? res.rows[0] : null;
  }

  /**
   * Looks in the database for a specific trip and returns true if found.
   * @returns boolean
   */
  async RouteExists(routeId: number) : Promise<boolean> {
    const res = await db(`SELECT EXISTS(SELECT 1 FROM routes WHERE "routeId"='${routeId}')`)

    return res.rows[0].exists;
  }

}