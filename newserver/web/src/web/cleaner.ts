import { BusDal } from "../database/busdal";

export class Cleaner {

  private cleanupTimer : number;
  private maxBusAge : number;
  private _busDal = new BusDal();
  constructor() {
    this.cleanupTimer = parseInt(process.env.CLEANUP_TIME_SECONDS) * 1000; 
    this.maxBusAge = parseInt(process.env.MAX_BUS_AGE_MINUTES) * 60 * 1000; 

    this.Clean();
    this.SetCleanupTimer();
  }

  SetCleanupTimer() {

    setInterval(async () => {
      await this.Clean();
    }, this.cleanupTimer);

  }

  async Clean() {
    const currentTime = new Date().getTime();
    const timeLimit = currentTime - this.maxBusAge;
    const deletedBusses = await this._busDal.DeleteBus("updatedAt", "<", timeLimit.toString());
    console.log(`Deleted ${deletedBusses} busses that were older than ${process.env.MAX_BUS_AGE_MINUTES} minutes.`)
  }

}