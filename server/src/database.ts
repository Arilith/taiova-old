import { Connection, Model, Mongoose, FilterQuery } from 'mongoose';
import { VehicleData, vehicleState } from './types/VehicleData';

export class Database {
  
  private static instance : Database;
  
  private db : Connection;
  private mongoose : Mongoose;
  private vehicleSchema : any;
  private vehicleModel : typeof Model;

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
      useUnifiedTopology: true
    })

    this.db = this.mongoose.connection;

    this.db.on('error', error => {
      throw new error(`Error connecting to database. ${error}`);
    })

    await this.DatabaseListener();

    return this;
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
              punctuality: Array,
              createdAt: Number,
              updatedAt: Number,
              updatedTimes: Array
          });
          
          this.vehicleModel = this.mongoose.model("VehiclePositions", this.vehicleSchema);

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

  // public async AddRoute()

}
