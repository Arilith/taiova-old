/* --------------------
      APP CONFIG
----------------------*/

import * as dotenv from 'dotenv';
dotenv.config();

const port = process.env.PORT || 3001;

/* --------------------
      YARN IMPORTS
----------------------*/
import * as https from 'https';
import * as fs from 'fs';

const express = require("express");

/* --------------------
    CUSTOM IMPORTS
----------------------*/

import { Database } from './database';
import { Websocket } from './socket';
import { OVData } from './realtime';

/* --------------------
      SSL CONFIG
----------------------*/
const privateKey = fs.readFileSync("./certificate/key.key").toString();
const certificate = fs.readFileSync("./certificate/cert.crt").toString();
const ca = fs.readFileSync("./certificate/key-ca.crt").toString();


const AppInit = async () => {
  const db = await Database.getInstance().Init();
  const ov = OVData.getInstance();
  
  const app = (module.exports = express());

  const server = https.createServer(
    {
      key: privateKey,
      cert: certificate,
      ca: ca,
      requestCert: true,
      rejectUnauthorized: false,
    },
    app
  );

  new Websocket(server);

  app.get("/", (req, res) => res.send("This is the API endpoint for the TAIOVA application."));

  app.get("/busses", async (req, res) => res.send(
    await db.GetAllVehicles()
  ))

  app.get("/busses/:company/:number/", (req, res) => {
    res.send(JSON.stringify(req.params));
  });

  server.listen(port, () => console.log(`Listening at http://localhost:${port}`));

}

AppInit();
