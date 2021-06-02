const mongoose = require('mongoose');


class Database {

  constructor(url, databaseName) {
    this.url = url;
    this.databaseName = databaseName;

    if(!this.url && !this.databaseName) 
      throw new Error(`No database url or name specified. Specified values: \n URL: ${this.url} \n Database Name: ${this.databaseName}`);
      
  }

  InitializeDatabase = async () => {
    console.log(`Connecting to database with name: ${this.databaseName} at url: ${this.url}`);

    mongoose.connect(`${this.url}/${this.databaseName}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    this.db = mongoose.connection;

    this.db.on("error", error => {
      throw new error(error);
    });

    await this.DatabaseListener();
  }

  DatabaseListener = () => {
    return new Promise((res, rej) => {
      this.db.once("open", () => {
        console.log("Connection to database established.");
    
        this.vehicleSchema = new mongoose.Schema({
          vehicleId: Number,
          vehicleData: Object,
          type: String,
        });
    
        this.vehicleModel = mongoose.model("VehiclePositions", this.vehicleSchema);
  
        res();
      });
    })
    
  }

  AddVehicle = (vehicle) => {
    new this.vehicleModel({
      vehicleData: vehicle,
      vehicleId: vehicle.vehicleNumber,
      type: vehicle.status
    }).save(error => {
      console.error(`Something went wrong while trying to add vehicle: ${vehicleId}. Error: ${error}`);
    });
  }

  FindVehicle = async (vehicleId, company) => {
    return await this.vehicleModel.find({
      vehicleId: vehicleId,
      "vehicleData.company": company
    });
  }

  VehicleExists = async (vehicleId, company) => {
    return await this.vehicleModel.find({
      vehicleId: vehicleId,
      "vehicleData.company": company
    }) !== null;
  }
  
  GetAllVehicles = async (args = {}) => {
    return await this.vehicleModel.find(args);
  }

  updateVehicle = (vehicleToUpdate, updatedVehicleData) => {
    const oldPos = vehicleToUpdate.vehicleData.position;

    vehicleToUpdate.vehicleData = updatedVehicleData;
    vehicleToUpdate.type = updatedVehicleData.status;
    
    if (vehicleToUpdate.vehicleData.status != "ONROUTE")
      vehicleToUpdate.vehicleData.position = oldPos;
    
    vehicleToUpdate.save().then((savedDoc) => {
      vehicleToUpdate === savedDoc ? null : console.error(`Error updating vehicle ${vehicleToUpdate.vehicleData.journeyNumber}`);
    });
  };

}

module.exports = { 
  Database
}



