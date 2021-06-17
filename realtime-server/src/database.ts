import { Connection, Model, Mongoose, FilterQuery, Schema } from 'mongoose';
import { Trip } from './types/Trip';
import { VehicleData, vehicleState } from './types/VehicleData';
import * as fs from 'fs';
import { resolve } from 'path';
import { Route } from './types/Route';
const streamToMongoDB = require('stream-to-mongo-db').streamToMongoDB;
const split = require('split');
export class Database {
  
  private static instance : Database;
  
  private db : Connection;
  private mongoose : Mongoose;
  private vehicleSchema : Schema;
  private tripsSchema : Schema;
  private routesSchema : Schema;
  private vehicleModel : typeof Model;
  private tripModel : typeof Model;
  private routesModel : typeof Model;
  private outputDBConfig;

  public static getInstance(): Database {
    if(!Database.instance)
      Database.instance = new Database();

    return Database.instance;
  }

  public async Init() {
    const url : string = process.env.DATABASE_URL;
    const name : string = process.env.DATABASE_NAME;

    this.mongoose = new Mongoose();
    
    this.mongoose.set('useFindAndModify', false)

    if(!url && !name) throw (`Invalid URL or name given, received: \n Name: ${name} \n URL: ${url}`)

    console.log(`Connecting to database with name: ${name} at url: ${url}`)
    this.mongoose.connect(`${url}/${name}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      poolSize: 120
    })

    this.db = this.mongoose.connection;

    this.outputDBConfig = { dbURL : `${url}/${name}`, collection : 'trips' };

    this.db.on('error', error => {
      throw new error(`Error connecting to database. ${error}`);
    })

    await this.DatabaseListener();

    return this;
  }

  public GetDatabase() : Connection {
    return this.db;
  }

  public async DatabaseListener () : Promise<void> {
      return new Promise((res, rej) => {
        this.db.once("open", () => {
          console.log("Connection to database established.")

          this.vehicleSchema = new this.mongoose.Schema({
            company: String,
            planningNumber: String,
            journeyNumber: Number,
            timestamp: Number,
            vehicleNumber: Number,
            position: [Number, Number],
            status: String,
            lineNumber: String,
            punctuality: Array,
            createdAt: Number,
            updatedAt: Number,
            updatedTimes: Array
          });
          
          this.tripsSchema = new this.mongoose.Schema({
            company: String,
            routeId: Number,
            serviceId: Number,
            tripId: Number,
            tripNumber: Number,
            tripPlanningNumber: String,
            tripHeadsign: String,
            tripName: String,
            directionId: Number,
            shapeId: Number,
            wheelchairAccessible: Number
          })

          this.routesSchema = new this.mongoose.Schema({
            routeId: Number,
            company: String,
            subCompany: String,
            routeShortName: String,
            routeLongName: String,
            routeDescription: String,
            routeType: Number,
          })

          this.tripsSchema.index({ tripNumber: -1, tripPlanningNumber: -1 })

          this.vehicleModel = this.mongoose.model("VehiclePositions", this.vehicleSchema);
          this.tripModel = this.mongoose.model("trips", this.tripsSchema);
          this.routesModel = this.mongoose.model("routes", this.routesSchema);

          this.tripModel.createIndexes();
          
          res();
        });
      })
  }

  public async GetAllVehicles (args = {}) : Promise<Array<VehicleData>> {
    return await this.vehicleModel.find({...args}, { punctuality: 0, updatedTimes: 0, __v : 0 });
  }

  public async GetVehicle (vehicleNumber, transporter, firstOnly : boolean = false) : Promise<VehicleData> {
    return { 
      ...await this.vehicleModel.findOne({
        vehicleNumber : vehicleNumber,
        company: transporter
      })
    };
  }

  public async VehicleExists(vehicleNumber, transporter) : Promise<boolean> {
    return await this.GetVehicle(vehicleNumber, transporter) !== null;
  }

  public async UpdateVehicle (vehicleToUpdate : any, updatedVehicleData : VehicleData, positionChecks : boolean = false) : Promise<void> {
    if(!vehicleToUpdate["_doc"]) return

    vehicleToUpdate = vehicleToUpdate["_doc"];
    
    //Merge the punctualities of the old vehicleData with the new one.
    updatedVehicleData.punctuality = vehicleToUpdate.punctuality.concat(updatedVehicleData.punctuality);

    //Merge the updated times of the old vehicleData with the new one.
    updatedVehicleData.updatedTimes = vehicleToUpdate.updatedTimes.concat(updatedVehicleData.updatedTimes);

    if(positionChecks && updatedVehicleData.status !== vehicleState.ONROUTE)
      updatedVehicleData.position = vehicleToUpdate.position;

    if(updatedVehicleData.status === vehicleState.INIT || updatedVehicleData.status === vehicleState.END) {
      updatedVehicleData.punctuality = [];
      updatedVehicleData.updatedTimes = [];
    }

    updatedVehicleData.updatedAt = Date.now();  

    await this.vehicleModel.findOneAndUpdate(vehicleToUpdate, updatedVehicleData);
  }

  public async AddVehicle (vehicle : VehicleData, onlyAddWhileOnRoute : boolean) : Promise<void> {
    if(onlyAddWhileOnRoute && vehicle.status !== vehicleState.ONROUTE) return;
    new this.vehicleModel({
      ...vehicle,
      punctuality : vehicle.punctuality
    }).save(error => {
      if(error) console.error(`Something went wrong while trying to add vehicle: ${vehicle.vehicleNumber}. Error: ${error}`)
    })
  }
  
  public async RemoveVehicle (vehicle : VehicleData) : Promise<void> {
    if(!vehicle["_doc"]) return

    this.vehicleModel.findOneAndDelete(vehicle)
  }

  public async RemoveVehiclesWhere( params : object, doLogging : boolean = false) : Promise<Array<VehicleData>> {
    const removedVehicles : Array<VehicleData> = await this.GetAllVehicles(params);
    this.vehicleModel.deleteMany(params).then(response => {
      if(doLogging) console.log(`Deleted ${response.deletedCount} vehicles.`);
      
    });
    return removedVehicles;
  }

  public async GetTrips(params : object = {}) : Promise<Array<Trip>> {
    return await this.tripModel.find(params)
  }

  public async GetTrip(tripNumber : number, tripPlanningNumber : string) {

    const response = await this.tripModel.findOne({
      tripNumber : tripNumber,
      tripPlanningNumber: tripPlanningNumber
    });

    return response !== null ? response : {};
  }

  public async RemoveTrip(params : object = {}, doLogging : boolean = false) : Promise<void> {
    await this.tripModel.deleteMany(params).then(response => {
      if(doLogging) console.log(`Deleted ${response.deletedCount} trips`);
    })
  }
  /**
   * Inserts many trips at once into the database.
   * @param trips The trips to add.
   */
  public async InsertManyTrips(trips) : Promise<void> {
   await this.tripModel.insertMany(trips, { ordered: false });
  }

  /**
   * Initializes the "Koppelvlak 7 and 8 turbo" files to database.
   */
  public async InsertTrip(trip : Trip) : Promise<void> {
    new this.tripModel(trip).save(error => {
      if(error) console.error(`Something went wrong while trying to add trip: ${trip.tripHeadsign}. Error: ${error}`)
    })
  }

  public async DropTripsCollection(): Promise<void> {
    if(process.env.APP_DO_CONVERTION_LOGGING == "true") console.log("Dropping trips collection");
    await this.tripModel.remove({});
    if(process.env.APP_DO_CONVERTION_LOGGING == "true") console.log("Dropped trips collection");
  }
  public async DropRoutesCollection(): Promise<void> {
    if(process.env.APP_DO_CONVERTION_LOGGING == "true") console.log("Dropping routes collection");
    await this.routesModel.remove({});
    if(process.env.APP_DO_CONVERTION_LOGGING == "true") console.log("Dropped routes collection");
  }

  public async GetRoute(routeId : number) : Promise<Route> {
    const response = await this.routesModel.findOne({
      routeId : routeId,
    });

    return response !== null ? response : {};
  }

  // public async AddRoute()

}
