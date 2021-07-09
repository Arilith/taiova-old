import * as dotenv from 'dotenv';

import { WebServer } from './web/webserver';
import { PerformMigrations } from './database/migrator'
import { BusSocket } from './realtime/BusSocket';
import { Websocket } from './realtime/socket';
import { Cleaner } from './web/cleaner';
dotenv.config()
export class Startup {
  private WebServer : WebServer;
  private WebSocket : Websocket;
  private BusSocket : BusSocket;
  private Cleaner : Cleaner;
  constructor() {
    if(process.env.IS_REALTIME == "true") this.InitRealtime();
    else this.InitWeb();
  }

  InitRealtime() {
    this.Cleaner = new Cleaner();
    this.WebServer = new WebServer();
    this.WebSocket = new Websocket(this.WebServer.server);
    this.BusSocket = new BusSocket(this.WebSocket);
  }

  InitWeb() {
    PerformMigrations();
    this.WebServer = new WebServer();
  }

}

new Startup();