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
const cors = require("cors");
/* --------------------
    CUSTOM IMPORTS
----------------------*/

import { Database } from './database';
import { Websocket } from './socket';
import { OVData } from './realtime';
import { WebServer } from './webserver';
import { BusLogic } from './buslogic';
import { Downloader } from './downloader';

/* --------------------
      SSL CONFIG
----------------------*/
const privateKey = fs.readFileSync("./certificate/key.key").toString();
const certificate = fs.readFileSync("./certificate/cert.crt").toString();
const ca = fs.readFileSync("./certificate/key-ca.crt").toString();

const AppInit = async () => {
  const db = await Database.getInstance().Init().then();
  
  
  
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
  

  //THIS IS NOT SAFE

  const corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200
  }

  app.use(cors(corsOptions))
  app.options('*', cors())


  const socket = new Websocket(server, db);
  const ov = new OVData(db, socket);
  new WebServer(app, db);
  new BusLogic(db, true);
  // new Downloader();

  server.listen(port, () => console.log(`Listening at http://localhost:${port}`));

}

AppInit();
