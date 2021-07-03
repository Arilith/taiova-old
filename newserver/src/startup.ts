import * as dotenv from 'dotenv';

import { WebServer } from './web/webserver';
import { Migrator } from './database/migrator'
import { BusLogic } from './logic/BusLogic';
export class Startup {
  private WebServer : WebServer;
  constructor() {
    dotenv.config()
    new WebServer();
    Migrator();
    new BusLogic().UpdateBus();

  }
}

new Startup();