import {createDb, migrate} from "postgres-migrations"
import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config()
export const PerformMigrations = async () => {

  createDb("taiova", {
    defaultDatabase: "postgres", // optional, default: "postgres"
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT)
  })
  .then(() => {
    return migrate({
      database: "taiova",
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT)
    }, "src/database/migrations/")
  })

}