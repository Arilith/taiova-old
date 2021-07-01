import { Connection, Model, Mongoose, FilterQuery, Schema } from 'mongoose';
import { Trip } from './types/Trip';
import { VehicleData, vehicleState } from './types/VehicleData';
import * as fs from 'fs';
import { resolve } from 'path';
import { Route } from './types/Route';
import { TripPositionData } from './types/TripPositionData';
import { WebsocketVehicleData } from './types/WebsocketVehicleData';
const streamToMongoDB = require('stream-to-mongo-db').streamToMongoDB;
const split = require('split');
export class BikeDal {
  
  private db : Connection;
  private mongoose : Mongoose;
  private bikeSchema : Schema;
  private bike : typeof Model;

  constructor (db) { 
    this.db = db;
    this.Init();
  }

  public async Init() {
    await this.DatabaseListener();
  }
  public async DatabaseListener () : Promise<void> {
    this.bikeSchema = new this.mongoose.Schema({
      name: String,
    });
    
    //this.bikeSchema.index({ tripNumber: -1, tripPlanningNumber: -1, company: -1 })

    this.bike = this.mongoose.model("Bikes", this.bikeSchema);
    this.AddBike("Test")
  }

  public async AddBike(name) {
    return await new this.bike({
      name: name
    }).save(error => {
      if(error) console.error(`Something went wrong while trying to add bike with name ${name}. Error: ${error}`)
    })
  }


}
