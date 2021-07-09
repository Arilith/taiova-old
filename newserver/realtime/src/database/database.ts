/* eslint-disable @typescript-eslint/no-explicit-any */
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config()
export const pool : Pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  max: 25
});

export const QueryTypes = {
  CREATE : "CREATE",
  UPDATE : "UPDATE",
  ALL : "ALL"
}

export const query : any = async (text, params = []) => {
  const client = await pool.connect();
  const res = await client.query(text, params)
  await client.release();
  return res
}

export const QueryBuilder = (type : string, table : string, object : any = null) => {
  if(type === QueryTypes.CREATE) {
    let query = `INSERT INTO ${table} (`;
    Object.keys(object).forEach((key, index) => {
      if(index !== Object.keys(object).length - 1)
        query += `"${key}",`;
      else
        query += `"${key}"`
    })

    query += `) VALUES (`

    Object.values(object).forEach((value, index) => {
      if(index !== Object.keys(object).length - 1)
        query += `'${value}',`
      else
      query += `'${value}'`
    })

    query += ') RETURNING *'

   return query;
  }

  if(type === QueryTypes.UPDATE) {
    let query = `UPDATE ${table} SET `;
    Object.entries(object).forEach(([key, value], index) => {
      if(index !== Object.keys(object).length - 1 )
        query += `"${key}"='${value}', `;
      else
        query += `"${key}"='${value}'`
    })

    query += ` WHERE "id" = ${object.id} RETURNING *`

    return query;
  }

  if(type === QueryTypes.ALL)
    return `SELECT * FROM ${table}`

}

