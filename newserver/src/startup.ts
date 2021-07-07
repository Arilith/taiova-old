import * as dotenv from 'dotenv';

import { WebServer } from './web/webserver';
import { PerformMigrations } from './database/migrator'
import { BusSocket } from './realtime/BusSocket';
import { Websocket } from './realtime/socket';
dotenv.config()
export class Startup {
  private WebServer : WebServer;
  private WebSocket : Websocket;
  private BusSocket : BusSocket;
  constructor() {
    
    PerformMigrations();

    this.WebServer = new WebServer();
    this.WebSocket = new Websocket(this.WebServer.server);
    this.BusSocket = new BusSocket(this.WebSocket);

    //new BusQueue();

  }

}

new Startup();