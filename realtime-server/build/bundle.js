/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/buslogic.ts":
/*!*************************!*\
  !*** ./src/buslogic.ts ***!
  \*************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BusLogic = void 0;
const VehicleData_1 = __webpack_require__(/*! ./types/VehicleData */ "./src/types/VehicleData.ts");
const path_1 = __webpack_require__(/*! path */ "path");
const fs = __importStar(__webpack_require__(/*! fs */ "fs"));
const child_process_1 = __webpack_require__(/*! child_process */ "child_process");
class BusLogic {
    constructor(database, doInit = false) {
        this.database = database;
        if (doInit)
            this.Initialize();
    }
    async Initialize() {
        await this.ClearBusses();
        setInterval(async () => {
            await this.ClearBusses();
        }, parseInt(process.env.APP_CLEANUP_DELAY));
    }
    /**
     * Updates or creates a new bus depending on if it already exists or not.
     * @param busses The list of busses to update.
     */
    async UpdateBusses(busses) {
        await Promise.all(busses.map(async (bus) => {
            const foundTrip = await this.database.GetTrip(bus.journeyNumber, bus.planningNumber, bus.company);
            const foundRoute = await this.database.GetRoute(foundTrip.routeId);
            if (foundRoute.company !== undefined)
                bus.company = foundRoute.company;
            if (foundRoute !== undefined)
                bus.lineNumber = foundRoute.routeShortName;
            const foundVehicle = await this.database.GetVehicle(bus.vehicleNumber, bus.company);
            if (Object.keys(foundVehicle).length !== 0) {
                if (process.env.APP_DO_UPDATE_LOGGING == "true")
                    console.log(`Updating vehicle ${bus.vehicleNumber} from ${bus.company}`);
                await this.database.UpdateVehicle(foundVehicle, bus, true);
            }
            else {
                if (process.env.APP_DO_CREATE_LOGGING == "true")
                    console.log(`creating new vehicle ${bus.vehicleNumber} from ${bus.company}`);
                if (bus.status === VehicleData_1.vehicleState.ONROUTE)
                    await this.database.AddVehicle(bus, true);
            }
        }));
    }
    /**
     * Clears busses every X amount of minutes specified in .env file.
     */
    async ClearBusses() {
        if (process.env.APP_DO_CLEANUP_LOGGING == "true")
            console.log("Clearing busses");
        const currentTime = Date.now();
        const fifteenMinutesAgo = currentTime - (60 * parseInt(process.env.APP_CLEANUP_VEHICLE_AGE_REQUIREMENT) * 1000);
        const RemovedVehicles = await this.database.RemoveVehiclesWhere({ updatedAt: { $lt: fifteenMinutesAgo } }, process.env.APP_DO_CLEANUP_LOGGING == "true");
    }
    /**
     * Initializes the "Koppelvlak 7 and 8 turbo" files to database.
     */
    InitKV78() {
        this.InitTripsNew();
    }
    /**
     * Initializes the trips from the specified URL in the .env , or "../GTFS/extracted/trips.json" to the database.
     */
    InitTripsNew() {
        const tripsPath = path_1.resolve("GTFS\\extracted\\trips.txt.json");
        const outputPath = path_1.resolve("GTFS\\converted\\trips.json");
        fs.readFile(tripsPath, 'utf8', async (error, data) => {
            if (error)
                console.error(error);
            if (data && process.env.APP_DO_CONVERTION_LOGGING == "true")
                console.log("Loaded trips file into memory.");
            data = data.trim();
            const lines = data.split("\n");
            const writeStream = fs.createWriteStream(outputPath);
            const convertedTrips = [];
            for (let line of lines) {
                const tripJSON = JSON.parse(line);
                const realTimeTripId = tripJSON.realtime_trip_id.split(":");
                const company = realTimeTripId[0];
                const planningNumber = realTimeTripId[1];
                const tripNumber = realTimeTripId[2];
                const trip = {
                    company: company,
                    routeId: parseInt(tripJSON.route_id),
                    serviceId: parseInt(tripJSON.service_id),
                    tripId: parseInt(tripJSON.trip_id),
                    tripNumber: parseInt(tripNumber),
                    tripPlanningNumber: planningNumber,
                    tripHeadsign: tripJSON.trip_headsign,
                    tripName: tripJSON.trip_long_name,
                    directionId: parseInt(tripJSON.direction_id),
                    shapeId: parseInt(tripJSON.shape_id),
                    wheelchairAccessible: parseInt(tripJSON.wheelchair_accessible)
                };
                writeStream.write(JSON.stringify(trip) + "\n");
            }
            writeStream.end(() => {
                if (process.env.APP_DO_CONVERTION_LOGGING == "true")
                    console.log("Finished writing trips file, importing to database.");
                this.ImportTrips();
            });
        });
    }
    async ImportTrips() {
        await this.database.DropTripsCollection();
        if (process.env.APP_DO_CONVERTION_LOGGING == "true")
            console.log("Importing trips to mongodb");
        await child_process_1.exec("mongoimport --db taiova --collection trips --file .\\GTFS\\converted\\trips.json", (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }
            if (process.env.APP_DO_CONVERTION_LOGGING == "true")
                console.log(`stdout: ${stdout}`);
        });
    }
}
exports.BusLogic = BusLogic;


/***/ }),

/***/ "./src/converter.ts":
/*!**************************!*\
  !*** ./src/converter.ts ***!
  \**************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Converter = void 0;
const VehicleData_1 = __webpack_require__(/*! ./types/VehicleData */ "./src/types/VehicleData.ts");
class Converter {
    decode(data, isKeolis = false) {
        let newData = data;
        if (JSON.stringify(data).includes('tmi8:'))
            newData = this.removeTmi8(data);
        if (!isKeolis)
            return this.convertKV6ToJson(newData);
        return this.convertKV6ToJsonKeolis(newData);
    }
    convertKV6ToJsonKeolis(data) {
        const array = [];
        const kv6posinfo = data.VV_TM_PUSH.KV6posinfo;
        if (kv6posinfo.length !== undefined) {
            kv6posinfo.forEach(statusWithBus => {
                const vehiclePosData = statusWithBus[Object.keys(statusWithBus)[0]];
                array.push({
                    company: vehiclePosData.dataownercode,
                    originalCompany: vehiclePosData.dataownercode,
                    planningNumber: vehiclePosData.lineplanningnumber.toString(),
                    journeyNumber: vehiclePosData.journeynumber,
                    timestamp: Date.parse(vehiclePosData.timestamp),
                    vehicleNumber: vehiclePosData.vehiclenumber,
                    lineNumber: "Onbekend",
                    position: this.rdToLatLong(vehiclePosData['rd-x'], vehiclePosData['rd-y']),
                    punctuality: [vehiclePosData.punctuality],
                    status: VehicleData_1.vehicleState[Object.keys(statusWithBus)[0]],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    updatedTimes: [Date.now()]
                });
            });
        }
        else {
            const vehiclePosData = kv6posinfo[Object.keys(kv6posinfo)[0]];
            array.push({
                company: vehiclePosData.dataownercode,
                originalCompany: vehiclePosData.dataownercode,
                planningNumber: vehiclePosData.lineplanningnumber.toString(),
                journeyNumber: vehiclePosData.journeynumber,
                timestamp: Date.parse(vehiclePosData.timestamp),
                vehicleNumber: vehiclePosData.vehiclenumber,
                lineNumber: "Onbekend",
                position: this.rdToLatLong(vehiclePosData['rd-x'], vehiclePosData['rd-y']),
                punctuality: [vehiclePosData.punctuality],
                status: VehicleData_1.vehicleState[Object.keys(kv6posinfo)[0]],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                updatedTimes: [Date.now()]
            });
        }
        return array;
    }
    convertKV6ToJson(data) {
        let kv6posinfo = data.VV_TM_PUSH.KV6posinfo;
        const array = [];
        if (kv6posinfo != undefined) {
            Object.entries(kv6posinfo).forEach(([key, value]) => {
                //If true, the received data is just one object instead of array. Typeof VehiclePosData
                if (value.hasOwnProperty("dataownercode")) {
                    const vehiclePosData = kv6posinfo[key];
                    if (!(!parseInt(vehiclePosData['rd-x'] + "") || !parseInt(vehiclePosData['rd-y'] + ""))) {
                        array.push({
                            company: vehiclePosData.dataownercode,
                            originalCompany: vehiclePosData.dataownercode,
                            planningNumber: vehiclePosData.lineplanningnumber.toString(),
                            journeyNumber: vehiclePosData.journeynumber,
                            timestamp: Date.parse(vehiclePosData.timestamp),
                            vehicleNumber: vehiclePosData.vehiclenumber,
                            lineNumber: "Onbekend",
                            position: this.rdToLatLong(vehiclePosData['rd-x'], vehiclePosData['rd-y']),
                            punctuality: [vehiclePosData.punctuality],
                            status: VehicleData_1.vehicleState[key],
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                            updatedTimes: [Date.now()]
                        });
                    }
                    //If this is true, the received data is an array of objects.  Typeof VehiclePosData[]
                }
                else if (value[Object.keys(value)[0]] !== undefined) {
                    for (let j = 0; j < kv6posinfo[key].length; j++) {
                        const vehiclePosData = kv6posinfo[key][j];
                        if (!parseInt(vehiclePosData['rd-x'] + "") || !parseInt(vehiclePosData['rd-y'] + ""))
                            continue;
                        array.push({
                            company: vehiclePosData.dataownercode,
                            originalCompany: vehiclePosData.dataownercode,
                            planningNumber: vehiclePosData.lineplanningnumber.toString(),
                            journeyNumber: vehiclePosData.journeynumber,
                            timestamp: Date.parse(vehiclePosData.timestamp),
                            vehicleNumber: vehiclePosData.vehiclenumber,
                            lineNumber: "Onbekend",
                            position: this.rdToLatLong(vehiclePosData['rd-x'], vehiclePosData['rd-y']),
                            punctuality: [vehiclePosData.punctuality],
                            status: VehicleData_1.vehicleState[key],
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                            updatedTimes: [Date.now()]
                        });
                    }
                }
            });
        }
        return array;
    }
    removeTmi8(data) {
        let dataString = JSON.stringify(data);
        dataString = dataString.replace(/tmi8:/g, "");
        return JSON.parse(dataString);
    }
    rdToLatLong(x, y) {
        if (x === undefined || y === undefined)
            return [0, 0];
        const dX = (x - 155000) * Math.pow(10, -5);
        const dY = (y - 463000) * Math.pow(10, -5);
        const SomN = (3235.65389 * dY) + (-32.58297 * Math.pow(dX, 2)) + (-0.2475 *
            Math.pow(dY, 2)) + (-0.84978 * Math.pow(dX, 2) *
            dY) + (-0.0655 * Math.pow(dY, 3)) + (-0.01709 *
            Math.pow(dX, 2) * Math.pow(dY, 2)) + (-0.00738 *
            dX) + (0.0053 * Math.pow(dX, 4)) + (-0.00039 *
            Math.pow(dX, 2) * Math.pow(dY, 3)) + (0.00033 * Math.pow(dX, 4) * dY) + (-0.00012 *
            dX * dY);
        const SomE = (5260.52916 * dX) + (105.94684 * dX * dY) + (2.45656 *
            dX * Math.pow(dY, 2)) + (-0.81885 * Math.pow(dX, 3)) + (0.05594 *
            dX * Math.pow(dY, 3)) + (-0.05607 * Math.pow(dX, 3) * dY) + (0.01199 *
            dY) + (-0.00256 * Math.pow(dX, 3) * Math.pow(dY, 2)) + (0.00128 *
            dX * Math.pow(dY, 4)) + (0.00022 * Math.pow(dY, 2)) + (-0.00022 * Math.pow(dX, 2)) + (0.00026 *
            Math.pow(dX, 5));
        const Latitude = 52.15517 + (SomN / 3600);
        const Longitude = 5.387206 + (SomE / 3600);
        return [Longitude, Latitude];
    }
}
exports.Converter = Converter;


/***/ }),

/***/ "./src/database.ts":
/*!*************************!*\
  !*** ./src/database.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Database = void 0;
const mongoose_1 = __webpack_require__(/*! mongoose */ "mongoose");
const VehicleData_1 = __webpack_require__(/*! ./types/VehicleData */ "./src/types/VehicleData.ts");
const streamToMongoDB = __webpack_require__(/*! stream-to-mongo-db */ "stream-to-mongo-db").streamToMongoDB;
const split = __webpack_require__(/*! split */ "split");
class Database {
    static getInstance() {
        if (!Database.instance)
            Database.instance = new Database();
        return Database.instance;
    }
    async Init() {
        const url = process.env.DATABASE_URL;
        const name = process.env.DATABASE_NAME;
        this.mongoose = new mongoose_1.Mongoose();
        this.mongoose.set('useFindAndModify', false);
        if (!url && !name)
            throw (`Invalid URL or name given, received: \n Name: ${name} \n URL: ${url}`);
        console.log(`Connecting to database with name: ${name} at url: ${url}`);
        this.mongoose.connect(`${url}/${name}`, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            poolSize: 120
        });
        this.db = this.mongoose.connection;
        this.outputDBConfig = { dbURL: `${url}/${name}`, collection: 'trips' };
        this.db.on('error', error => {
            throw new error(`Error connecting to database. ${error}`);
        });
        await this.DatabaseListener();
        return this;
    }
    GetDatabase() {
        return this.db;
    }
    async DatabaseListener() {
        return new Promise((res, rej) => {
            this.db.once("open", () => {
                console.log("Connection to database established.");
                this.vehicleSchema = new this.mongoose.Schema({
                    company: String,
                    originalCompany: String,
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
                });
                this.routesSchema = new this.mongoose.Schema({
                    routeId: Number,
                    company: String,
                    subCompany: String,
                    routeShortName: String,
                    routeLongName: String,
                    routeDescription: String,
                    routeType: Number,
                });
                this.tripsSchema.index({ tripNumber: -1, tripPlanningNumber: -1, company: -1 });
                this.vehicleModel = this.mongoose.model("VehiclePositions", this.vehicleSchema);
                this.tripModel = this.mongoose.model("trips", this.tripsSchema);
                this.routesModel = this.mongoose.model("routes", this.routesSchema);
                this.tripModel.createIndexes();
                res();
            });
        });
    }
    async GetAllVehicles(args = {}) {
        return await this.vehicleModel.find({ ...args }, { punctuality: 0, updatedTimes: 0, __v: 0 });
    }
    async GetVehicle(vehicleNumber, transporter, firstOnly = false) {
        return {
            ...await this.vehicleModel.findOne({
                vehicleNumber: vehicleNumber,
                company: transporter
            })
        };
    }
    async VehicleExists(vehicleNumber, transporter) {
        return await this.GetVehicle(vehicleNumber, transporter) !== null;
    }
    async UpdateVehicle(vehicleToUpdate, updatedVehicleData, positionChecks = false) {
        if (!vehicleToUpdate["_doc"])
            return;
        vehicleToUpdate = vehicleToUpdate["_doc"];
        //Merge the punctualities of the old vehicleData with the new one.
        updatedVehicleData.punctuality = vehicleToUpdate.punctuality.concat(updatedVehicleData.punctuality);
        //Merge the updated times of the old vehicleData with the new one.
        updatedVehicleData.updatedTimes = vehicleToUpdate.updatedTimes.concat(updatedVehicleData.updatedTimes);
        if (positionChecks && updatedVehicleData.status !== VehicleData_1.vehicleState.ONROUTE)
            updatedVehicleData.position = vehicleToUpdate.position;
        if (updatedVehicleData.status === VehicleData_1.vehicleState.INIT || updatedVehicleData.status === VehicleData_1.vehicleState.END) {
            updatedVehicleData.punctuality = [];
            updatedVehicleData.updatedTimes = [];
        }
        updatedVehicleData.updatedAt = Date.now();
        await this.vehicleModel.findOneAndUpdate(vehicleToUpdate, updatedVehicleData);
    }
    async AddVehicle(vehicle, onlyAddWhileOnRoute) {
        if (onlyAddWhileOnRoute && vehicle.status !== VehicleData_1.vehicleState.ONROUTE)
            return;
        new this.vehicleModel({
            ...vehicle,
            punctuality: vehicle.punctuality
        }).save(error => {
            if (error)
                console.error(`Something went wrong while trying to add vehicle: ${vehicle.vehicleNumber}. Error: ${error}`);
        });
    }
    async RemoveVehicle(vehicle) {
        if (!vehicle["_doc"])
            return;
        this.vehicleModel.findOneAndDelete(vehicle);
    }
    async RemoveVehiclesWhere(params, doLogging = false) {
        const removedVehicles = await this.GetAllVehicles(params);
        this.vehicleModel.deleteMany(params).then(response => {
            if (doLogging)
                console.log(`Deleted ${response.deletedCount} vehicles.`);
        });
        return removedVehicles;
    }
    async GetTrips(params = {}) {
        return await this.tripModel.find(params);
    }
    async GetTrip(tripNumber, tripPlanningNumber, company) {
        const response = await this.tripModel.findOne({
            company: company,
            tripNumber: tripNumber,
            tripPlanningNumber: tripPlanningNumber
        });
        return response !== null ? response : {};
    }
    async RemoveTrip(params = {}, doLogging = false) {
        await this.tripModel.deleteMany(params).then(response => {
            if (doLogging)
                console.log(`Deleted ${response.deletedCount} trips`);
        });
    }
    /**
     * Inserts many trips at once into the database.
     * @param trips The trips to add.
     */
    async InsertManyTrips(trips) {
        await this.tripModel.insertMany(trips, { ordered: false });
    }
    /**
     * Initializes the "Koppelvlak 7 and 8 turbo" files to database.
     */
    async InsertTrip(trip) {
        new this.tripModel(trip).save(error => {
            if (error)
                console.error(`Something went wrong while trying to add trip: ${trip.tripHeadsign}. Error: ${error}`);
        });
    }
    async DropTripsCollection() {
        if (process.env.APP_DO_CONVERTION_LOGGING == "true")
            console.log("Dropping trips collection");
        await this.tripModel.remove({});
        if (process.env.APP_DO_CONVERTION_LOGGING == "true")
            console.log("Dropped trips collection");
    }
    async DropRoutesCollection() {
        if (process.env.APP_DO_CONVERTION_LOGGING == "true")
            console.log("Dropping routes collection");
        await this.routesModel.remove({});
        if (process.env.APP_DO_CONVERTION_LOGGING == "true")
            console.log("Dropped routes collection");
    }
    async GetRoute(routeId) {
        const response = await this.routesModel.findOne({
            routeId: routeId,
        });
        return response !== null ? response : {};
    }
}
exports.Database = Database;


/***/ }),

/***/ "./src/main.ts":
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/***/ (function(module, exports, __webpack_require__) {


/* --------------------
      APP CONFIG
----------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const dotenv = __importStar(__webpack_require__(/*! dotenv */ "dotenv"));
dotenv.config();
const port = process.env.PORT || 3002;
/* --------------------
      YARN IMPORTS
----------------------*/
const https = __importStar(__webpack_require__(/*! https */ "https"));
const fs = __importStar(__webpack_require__(/*! fs */ "fs"));
const express = __webpack_require__(/*! express */ "express");
const cors = __webpack_require__(/*! cors */ "cors");
/* --------------------
    CUSTOM IMPORTS
----------------------*/
const database_1 = __webpack_require__(/*! ./database */ "./src/database.ts");
const socket_1 = __webpack_require__(/*! ./socket */ "./src/socket.ts");
const realtime_1 = __webpack_require__(/*! ./realtime */ "./src/realtime.ts");
/* --------------------
      SSL CONFIG
----------------------*/
const privateKey = fs.readFileSync("./certificate/key.key").toString();
const certificate = fs.readFileSync("./certificate/cert.crt").toString();
const ca = fs.readFileSync("./certificate/key-ca.crt").toString();
const AppInit = async () => {
    const db = await database_1.Database.getInstance().Init().then();
    const app = (module.exports = express());
    const server = https.createServer({
        key: privateKey,
        cert: certificate,
        ca: ca,
        requestCert: true,
        rejectUnauthorized: false,
    }, app);
    //THIS IS NOT SAFE
    const corsOptions = {
        origin: '*',
        optionsSuccessStatus: 200
    };
    app.use(cors(corsOptions));
    app.options('*', cors());
    const socket = new socket_1.Websocket(server, db);
    const ov = new realtime_1.OVData(db, socket);
    //busLogic.InitKV78();
    server.listen(port, () => console.log(`Listening at http://localhost:${port}`));
};
AppInit();


/***/ }),

/***/ "./src/realtime.ts":
/*!*************************!*\
  !*** ./src/realtime.ts ***!
  \*************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OVData = void 0;
const zlib_1 = __webpack_require__(/*! zlib */ "zlib");
const converter_1 = __webpack_require__(/*! ./converter */ "./src/converter.ts");
const buslogic_1 = __webpack_require__(/*! ./buslogic */ "./src/buslogic.ts");
const xml = __importStar(__webpack_require__(/*! fast-xml-parser */ "fast-xml-parser"));
const zmq = __webpack_require__(/*! zeromq */ "zeromq");
const doLogging = process.env.APP_DO_LOGGING == "true" ? true : false;
class OVData {
    constructor(database, socket) {
        this.websocket = socket;
        this.Init();
        this.busLogic = new buslogic_1.BusLogic(database, false);
    }
    Init() {
        const converter = new converter_1.Converter();
        this.sock = zmq.socket("sub");
        this.sock.connect("tcp://pubsub.ndovloket.nl:7658");
        this.sock.subscribe("/ARR/KV6posinfo");
        this.sock.subscribe("/CXX/KV6posinfo");
        this.sock.subscribe("/EBS/KV6posinfo");
        this.sock.subscribe("/QBUZZ/KV6posinfo");
        this.sock.subscribe("/RIG/KV6posinfo");
        this.sock.subscribe("/KEOLIS/KV6posinfo");
        this.sock.subscribe("/SYNTUS/KV6posinfo");
        this.sock.subscribe("/OPENOV/KV6posinfo");
        this.sock.subscribe("/GVB/KV6posinfo");
        this.sock.subscribe("/DITP/KV6posinfo");
        this.sock.on("message", (opCode, ...content) => {
            const contents = Buffer.concat(content);
            const operator = opCode.toString();
            zlib_1.gunzip(contents, async (error, buffer) => {
                if (error)
                    return console.error(`Something went wrong while trying to unzip. ${error}`);
                const encodedXML = buffer.toString();
                const decoded = xml.parse(encodedXML);
                let vehicleData;
                if (operator !== "/KEOLIS/KV6posinfo" || operator !== "/GVB/KV6posinfo")
                    vehicleData = converter.decode(decoded);
                else
                    vehicleData = converter.decode(decoded, true);
                await this.busLogic.UpdateBusses(vehicleData);
            });
        });
        setInterval(() => {
            this.websocket.Emit();
        }, parseInt(process.env.APP_BUS_UPDATE_DELAY));
        // this.kv78socket = zmq.socket("sub");
        // this.kv78socket.connect("tcp://pubsub.ndovloket.nl:7817");
        // this.kv78socket.subscribe("/")
        // this.kv78socket.on("message", (opCode, ...content) => {
        //   const contents = Buffer.concat(content);
        //   gunzip(contents, async(error, buffer) => { 
        //     console.log(buffer.toString('utf8'))
        //   });
        // });
    }
}
exports.OVData = OVData;


/***/ }),

/***/ "./src/socket.ts":
/*!***********************!*\
  !*** ./src/socket.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Websocket = void 0;
const bus_update_rate = parseInt(process.env.APP_BUS_UPDATE_DELAY);
class Websocket {
    constructor(server, db) {
        this.SocketInit(server);
        this.db = db;
    }
    async SocketInit(server) {
        console.log(`Initalizing websocket`);
        this.io = __webpack_require__(/*! socket.io */ "socket.io")(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
        });
        this.io.on("connection", socket => {
            this.Socket(socket);
        });
    }
    Socket(socket) {
        this.activeSocket = socket;
        console.log("New client connected.");
        // const interval = setInterval(() => {
        //       //console.log("Emitting new data.");
        //       this.db.GetAllVehicles().then((vehicles) => {
        //         socket.emit("ovdata", vehicles);
        //       })
        // }, bus_update_rate);
        socket.on("disconnect", () => {
            console.log("Client disconnected");
            //clearInterval(interval);
        });
    }
    SendDeletedVehicles(vehicles) {
        this.io.emit("deletedVehicles", vehicles);
    }
    Emit() {
        //Small delay to make sure the server catches up.
        setTimeout(() => {
            this.db.GetAllVehicles().then((vehicles) => {
                this.io.emit("ovdata", vehicles);
            });
        }, 100);
    }
}
exports.Websocket = Websocket;


/***/ }),

/***/ "./src/types/VehicleData.ts":
/*!**********************************!*\
  !*** ./src/types/VehicleData.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.vehicleState = void 0;
var vehicleState;
(function (vehicleState) {
    vehicleState["ONROUTE"] = "ONROUTE";
    vehicleState["OFFROUTE"] = "OFFROUTE";
    vehicleState["END"] = "END";
    vehicleState["DEPARTURE"] = "DEPARTURE";
    vehicleState["INIT"] = "INIT";
    vehicleState["DELAY"] = "DELAY";
    vehicleState["ONSTOP"] = "ONSTOP";
    vehicleState["ARRIVAL"] = "ARRIVAL";
})(vehicleState = exports.vehicleState || (exports.vehicleState = {}));


/***/ }),

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

module.exports = require("child_process");;

/***/ }),

/***/ "cors":
/*!***********************!*\
  !*** external "cors" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("cors");;

/***/ }),

/***/ "dotenv":
/*!*************************!*\
  !*** external "dotenv" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("dotenv");;

/***/ }),

/***/ "express":
/*!**************************!*\
  !*** external "express" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("express");;

/***/ }),

/***/ "fast-xml-parser":
/*!**********************************!*\
  !*** external "fast-xml-parser" ***!
  \**********************************/
/***/ ((module) => {

module.exports = require("fast-xml-parser");;

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");;

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");;

/***/ }),

/***/ "mongoose":
/*!***************************!*\
  !*** external "mongoose" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("mongoose");;

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");;

/***/ }),

/***/ "socket.io":
/*!****************************!*\
  !*** external "socket.io" ***!
  \****************************/
/***/ ((module) => {

module.exports = require("socket.io");;

/***/ }),

/***/ "split":
/*!************************!*\
  !*** external "split" ***!
  \************************/
/***/ ((module) => {

module.exports = require("split");;

/***/ }),

/***/ "stream-to-mongo-db":
/*!*************************************!*\
  !*** external "stream-to-mongo-db" ***!
  \*************************************/
/***/ ((module) => {

module.exports = require("stream-to-mongo-db");;

/***/ }),

/***/ "zeromq":
/*!*************************!*\
  !*** external "zeromq" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("zeromq");;

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/main.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9idXNsb2dpYy50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9jb252ZXJ0ZXIudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvZGF0YWJhc2UudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvbWFpbi50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9yZWFsdGltZS50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9zb2NrZXQudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvdHlwZXMvVmVoaWNsZURhdGEudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJjaGlsZF9wcm9jZXNzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJjb3JzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJkb3RlbnZcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcImV4cHJlc3NcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcImZhc3QteG1sLXBhcnNlclwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiZnNcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcImh0dHBzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJtb25nb29zZVwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwicGF0aFwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwic29ja2V0LmlvXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJzcGxpdFwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwic3RyZWFtLXRvLW1vbmdvLWRiXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJ6ZXJvbXFcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcInpsaWJcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci93ZWJwYWNrL3N0YXJ0dXAiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxtR0FBZ0U7QUFDaEUsdURBQStCO0FBQy9CLDZEQUF5QjtBQUd6QixrRkFBcUM7QUFHckMsTUFBYSxRQUFRO0lBSW5CLFlBQVksUUFBUSxFQUFFLFNBQW1CLEtBQUs7UUFDNUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFFekIsSUFBRyxNQUFNO1lBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFFTyxLQUFLLENBQUMsVUFBVTtRQUN0QixNQUFNLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUV6QixXQUFXLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDckIsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDM0IsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVEOzs7T0FHRztJQUNLLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBMkI7UUFHcEQsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEdB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QUMsQ0FBQztRQUVyRCxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxJQUFJLEdBQUcsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNO1lBQ3ZFLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDOUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPO1lBQzdDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU87WUFDOUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTztZQUM1QyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQ3hELEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTztZQUN4QixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDWCxNQUFNLElBQUksR0FBRyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPO1lBQy9ELEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDNUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPO1lBQ2xCLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDNUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUN2QixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQzVDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUNsQixFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFDOUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQzFCLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUNsQixJQUFJLENBQUMsR0FBRyxDQUFDLEVB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Ozs7Ozs7Ozs7QUNBQSxvQzs7Ozs7Ozs7OztBQ0FBLHFDOzs7Ozs7Ozs7O0FDQUEsNkM7Ozs7Ozs7Ozs7QUNBQSxnQzs7Ozs7Ozs7OztBQ0FBLG1DOzs7Ozs7Ozs7O0FDQUEsc0M7Ozs7Ozs7Ozs7QUNBQSxrQzs7Ozs7Ozs7OztBQ0FBLHVDOzs7Ozs7Ozs7O0FDQUEsbUM7Ozs7Ozs7Ozs7QUNBQSxnRDs7Ozs7Ozs7OztBQ0FBLG9DOzs7Ozs7Ozs7O0FDQUEsa0M7Ozs7OztVQ0FBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7VUN0QkE7VUFDQTtVQUNBO1VBQ0EiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tIFwiLi9kYXRhYmFzZVwiO1xyXG5pbXBvcnQgeyBWZWhpY2xlRGF0YSwgdmVoaWNsZVN0YXRlIH0gZnJvbSBcIi4vdHlwZXMvVmVoaWNsZURhdGFcIjtcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCB7IFRyaXAgfSBmcm9tIFwiLi90eXBlcy9UcmlwXCI7XHJcbmltcG9ydCB7IEFwaVRyaXAgfSBmcm9tIFwiLi90eXBlcy9BcGlUcmlwXCI7XHJcbmltcG9ydCB7IGV4ZWMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcclxuaW1wb3J0IHsgUm91dGUgfSBmcm9tIFwiLi90eXBlcy9Sb3V0ZVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEJ1c0xvZ2ljIHtcclxuXHJcbiAgcHJpdmF0ZSBkYXRhYmFzZSA6IERhdGFiYXNlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihkYXRhYmFzZSwgZG9Jbml0IDogYm9vbGVhbiA9IGZhbHNlKSB7XHJcbiAgICB0aGlzLmRhdGFiYXNlID0gZGF0YWJhc2U7XHJcblxyXG4gICAgaWYoZG9Jbml0KSB0aGlzLkluaXRpYWxpemUoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgSW5pdGlhbGl6ZSgpIHtcclxuICAgIGF3YWl0IHRoaXMuQ2xlYXJCdXNzZXMoKTtcclxuXHJcbiAgICBzZXRJbnRlcnZhbChhc3luYyAoKSA9PiB7XHJcbiAgICAgIGF3YWl0IHRoaXMuQ2xlYXJCdXNzZXMoKTtcclxuICAgIH0sIHBhcnNlSW50KHByb2Nlc3MuZW52LkFQUF9DTEVBTlVQX0RFTEFZKSlcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFVwZGF0ZXMgb3IgY3JlYXRlcyBhIG5ldyBidXMgZGVwZW5kaW5nIG9uIGlmIGl0IGFscmVhZHkgZXhpc3RzIG9yIG5vdC5cclxuICAgKiBAcGFyYW0gYnVzc2VzIFRoZSBsaXN0IG9mIGJ1c3NlcyB0byB1cGRhdGUuXHJcbiAgICovXHJcbiAgIHB1YmxpYyBhc3luYyBVcGRhdGVCdXNzZXMoYnVzc2VzIDogQXJyYXk8VmVoaWNsZURhdGE+KSA6IFByb21pc2U8dm9pZD4ge1xyXG5cclxuXHJcbiAgICBhd2FpdCBQcm9taXNlLmFsbChidXNzZXMubWFwKGFzeW5jIChidXMpID0+IHtcclxuICAgICAgY29uc3QgZm91bmRUcmlwIDogVHJpcCA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0VHJpcChidXMuam91cm5leU51bWJlciwgYnVzLnBsYW5uaW5nTnVtYmVyLCBidXMuY29tcGFueSk7XHJcbiAgICAgIGNvbnN0IGZvdW5kUm91dGUgOiBSb3V0ZSA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0Um91dGUoZm91bmRUcmlwLnJvdXRlSWQpO1xyXG5cclxuICAgICAgaWYoZm91bmRSb3V0ZS5jb21wYW55ICE9PSB1bmRlZmluZWQpIGJ1cy5jb21wYW55ID0gZm91bmRSb3V0ZS5jb21wYW55O1xyXG4gICAgICBpZihmb3VuZFJvdXRlICE9PSB1bmRlZmluZWQpIGJ1cy5saW5lTnVtYmVyID0gZm91bmRSb3V0ZS5yb3V0ZVNob3J0TmFtZTtcclxuXHJcbiAgICAgIGNvbnN0IGZvdW5kVmVoaWNsZSA6IFZlaGljbGVEYXRhID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRWZWhpY2xlKGJ1cy52ZWhpY2xlTnVtYmVyLCBidXMuY29tcGFueSk7XHJcbiAgICAgICAgICBcclxuICAgICAgaWYoT2JqZWN0LmtleXMoZm91bmRWZWhpY2xlKS5sZW5ndGggIT09IDApIHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fVVBEQVRFX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBVcGRhdGluZyB2ZWhpY2xlICR7YnVzLnZlaGljbGVOdW1iZXJ9IGZyb20gJHtidXMuY29tcGFueX1gKVxyXG4gICAgICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuVXBkYXRlVmVoaWNsZShmb3VuZFZlaGljbGUsIGJ1cywgdHJ1ZSlcclxuICAgICAgICBcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ1JFQVRFX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBjcmVhdGluZyBuZXcgdmVoaWNsZSAke2J1cy52ZWhpY2xlTnVtYmVyfSBmcm9tICR7YnVzLmNvbXBhbnl9YClcclxuICAgICAgICBpZihidXMuc3RhdHVzID09PSB2ZWhpY2xlU3RhdGUuT05ST1VURSkgYXdhaXQgdGhpcy5kYXRhYmFzZS5BZGRWZWhpY2xlKGJ1cywgdHJ1ZSlcclxuICAgICAgfVxyXG4gICAgfSkpXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDbGVhcnMgYnVzc2VzIGV2ZXJ5IFggYW1vdW50IG9mIG1pbnV0ZXMgc3BlY2lmaWVkIGluIC5lbnYgZmlsZS5cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgQ2xlYXJCdXNzZXMoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NMRUFOVVBfTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJDbGVhcmluZyBidXNzZXNcIilcclxuICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnN0IGZpZnRlZW5NaW51dGVzQWdvID0gY3VycmVudFRpbWUgLSAoNjAgKiBwYXJzZUludChwcm9jZXNzLmVudi5BUFBfQ0xFQU5VUF9WRUhJQ0xFX0FHRV9SRVFVSVJFTUVOVCkgKiAxMDAwKTtcclxuICAgIGNvbnN0IFJlbW92ZWRWZWhpY2xlcyA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuUmVtb3ZlVmVoaWNsZXNXaGVyZSh7IHVwZGF0ZWRBdDogeyAkbHQ6IGZpZnRlZW5NaW51dGVzQWdvIH0gfSwgcHJvY2Vzcy5lbnYuQVBQX0RPX0NMRUFOVVBfTE9HR0lORyA9PSBcInRydWVcIik7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgXCJLb3BwZWx2bGFrIDcgYW5kIDggdHVyYm9cIiBmaWxlcyB0byBkYXRhYmFzZS5cclxuICAgKi9cclxuICBwdWJsaWMgSW5pdEtWNzgoKSA6IHZvaWQge1xyXG4gICAgdGhpcy5Jbml0VHJpcHNOZXcoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSB0cmlwcyBmcm9tIHRoZSBzcGVjaWZpZWQgVVJMIGluIHRoZSAuZW52ICwgb3IgXCIuLi9HVEZTL2V4dHJhY3RlZC90cmlwcy5qc29uXCIgdG8gdGhlIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gIHByaXZhdGUgSW5pdFRyaXBzTmV3KCkgOiB2b2lkIHsgXHJcbiAgICBjb25zdCB0cmlwc1BhdGggPSByZXNvbHZlKFwiR1RGU1xcXFxleHRyYWN0ZWRcXFxcdHJpcHMudHh0Lmpzb25cIik7XHJcbiAgICBjb25zdCBvdXRwdXRQYXRoID0gcmVzb2x2ZShcIkdURlNcXFxcY29udmVydGVkXFxcXHRyaXBzLmpzb25cIik7XHJcbiAgICBmcy5yZWFkRmlsZSh0cmlwc1BhdGgsICd1dGY4JywgYXN5bmMoZXJyb3IsIGRhdGEpID0+IHsgXHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgaWYoZGF0YSAmJiBwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkxvYWRlZCB0cmlwcyBmaWxlIGludG8gbWVtb3J5LlwiKTtcclxuICAgICAgZGF0YSA9IGRhdGEudHJpbSgpO1xyXG4gICAgICBjb25zdCBsaW5lcyA9IGRhdGEuc3BsaXQoXCJcXG5cIik7XHJcbiAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3V0cHV0UGF0aClcclxuICAgICAgY29uc3QgY29udmVydGVkVHJpcHMgPSBbXTtcclxuXHJcbiAgICAgIGZvcihsZXQgbGluZSBvZiBsaW5lcykge1xyXG4gICAgICAgIGNvbnN0IHRyaXBKU09OIDogQXBpVHJpcCA9IEpTT04ucGFyc2UobGluZSk7XHJcbiAgICAgICAgY29uc3QgcmVhbFRpbWVUcmlwSWQgPSB0cmlwSlNPTi5yZWFsdGltZV90cmlwX2lkLnNwbGl0KFwiOlwiKTtcclxuICAgICAgICBjb25zdCBjb21wYW55ID0gcmVhbFRpbWVUcmlwSWRbMF07XHJcbiAgICAgICAgY29uc3QgcGxhbm5pbmdOdW1iZXIgPSByZWFsVGltZVRyaXBJZFsxXTtcclxuICAgICAgICBjb25zdCB0cmlwTnVtYmVyID0gcmVhbFRpbWVUcmlwSWRbMl07XHJcblxyXG4gICAgICAgIGNvbnN0IHRyaXAgOiBUcmlwID0ge1xyXG4gICAgICAgICAgY29tcGFueTogY29tcGFueSxcclxuICAgICAgICAgIHJvdXRlSWQ6IHBhcnNlSW50KHRyaXBKU09OLnJvdXRlX2lkKSxcclxuICAgICAgICAgIHNlcnZpY2VJZDogcGFyc2VJbnQodHJpcEpTT04uc2VydmljZV9pZCksXHJcbiAgICAgICAgICB0cmlwSWQ6IHBhcnNlSW50KHRyaXBKU09OLnRyaXBfaWQpLFxyXG4gICAgICAgICAgdHJpcE51bWJlcjogcGFyc2VJbnQodHJpcE51bWJlciksXHJcbiAgICAgICAgICB0cmlwUGxhbm5pbmdOdW1iZXI6IHBsYW5uaW5nTnVtYmVyLFxyXG4gICAgICAgICAgdHJpcEhlYWRzaWduOiB0cmlwSlNPTi50cmlwX2hlYWRzaWduLFxyXG4gICAgICAgICAgdHJpcE5hbWU6IHRyaXBKU09OLnRyaXBfbG9uZ19uYW1lLFxyXG4gICAgICAgICAgZGlyZWN0aW9uSWQ6IHBhcnNlSW50KHRyaXBKU09OLmRpcmVjdGlvbl9pZCksXHJcbiAgICAgICAgICBzaGFwZUlkOiBwYXJzZUludCh0cmlwSlNPTi5zaGFwZV9pZCksXHJcbiAgICAgICAgICB3aGVlbGNoYWlyQWNjZXNzaWJsZTogcGFyc2VJbnQodHJpcEpTT04ud2hlZWxjaGFpcl9hY2Nlc3NpYmxlKVxyXG4gICAgICAgIH1cclxuICAgICAgICB3cml0ZVN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh0cmlwKSArIFwiXFxuXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB3cml0ZVN0cmVhbS5lbmQoKCkgPT4ge1xyXG4gICAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRmluaXNoZWQgd3JpdGluZyB0cmlwcyBmaWxlLCBpbXBvcnRpbmcgdG8gZGF0YWJhc2UuXCIpO1xyXG4gICAgICAgIHRoaXMuSW1wb3J0VHJpcHMoKTtcclxuICAgICAgfSlcclxuICAgIH0pO1xyXG4gICBcclxuICAgIFxyXG4gIH1cclxuXHJcbiAgYXN5bmMgSW1wb3J0VHJpcHMoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5kYXRhYmFzZS5Ecm9wVHJpcHNDb2xsZWN0aW9uKCk7XHJcblxyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJJbXBvcnRpbmcgdHJpcHMgdG8gbW9uZ29kYlwiKTtcclxuXHJcbiAgICBhd2FpdCBleGVjKFwibW9uZ29pbXBvcnQgLS1kYiB0YWlvdmEgLS1jb2xsZWN0aW9uIHRyaXBzIC0tZmlsZSAuXFxcXEdURlNcXFxcY29udmVydGVkXFxcXHRyaXBzLmpzb25cIiwgKGVycm9yLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzdGRlcnIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgc3RkZXJyOiAke3N0ZGVycn1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBzdGRvdXQ6ICR7c3Rkb3V0fWApO1xyXG4gICAgfSk7XHJcblxyXG4gIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBWZWhpY2xlRGF0YSwgdmVoaWNsZVN0YXRlIH0gZnJvbSAnLi90eXBlcy9WZWhpY2xlRGF0YSdcclxuaW1wb3J0IHsgVmVoaWNsZUFwaURhdGEsIFZlaGljbGVQb3NEYXRhLCBWZWhpY2xlQXBpRGF0YUtlb2xpcyB9IGZyb20gJy4vdHlwZXMvVmVoaWNsZUFwaURhdGEnXHJcbmV4cG9ydCBjbGFzcyBDb252ZXJ0ZXIge1xyXG5cclxuICBkZWNvZGUoZGF0YTogVmVoaWNsZUFwaURhdGEsIGlzS2VvbGlzIDogYm9vbGVhbiA9IGZhbHNlKSA6IGFueSB7XHJcbiAgICBcclxuICAgIGxldCBuZXdEYXRhIDogYW55ID0gZGF0YTtcclxuXHJcbiAgICBpZihKU09OLnN0cmluZ2lmeShkYXRhKS5pbmNsdWRlcygndG1pODonKSlcclxuICAgICAgbmV3RGF0YSA9IHRoaXMucmVtb3ZlVG1pOChkYXRhKTsgXHJcblxyXG4gICAgaWYoIWlzS2VvbGlzKVxyXG4gICAgICByZXR1cm4gdGhpcy5jb252ZXJ0S1Y2VG9Kc29uKG5ld0RhdGEpO1xyXG5cclxuICAgIHJldHVybiB0aGlzLmNvbnZlcnRLVjZUb0pzb25LZW9saXMobmV3RGF0YSk7XHJcbiAgfSBcclxuXHJcbiAgY29udmVydEtWNlRvSnNvbktlb2xpcyhkYXRhOiBhbnkpIDogYW55IHtcclxuICAgIGNvbnN0IGFycmF5IDogQXJyYXk8VmVoaWNsZURhdGE+ID0gW107XHJcbiAgICBjb25zdCBrdjZwb3NpbmZvID0gZGF0YS5WVl9UTV9QVVNILktWNnBvc2luZm87XHJcbiAgICBcclxuICAgIGlmKGt2NnBvc2luZm8ubGVuZ3RoICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAga3Y2cG9zaW5mby5mb3JFYWNoKHN0YXR1c1dpdGhCdXMgPT4ge1xyXG4gICAgICAgIGNvbnN0IHZlaGljbGVQb3NEYXRhIDogVmVoaWNsZVBvc0RhdGEgPSBzdGF0dXNXaXRoQnVzW09iamVjdC5rZXlzKHN0YXR1c1dpdGhCdXMpWzBdXTtcclxuICAgICAgICAgIGFycmF5LnB1c2goe1xyXG4gICAgICAgICAgICBjb21wYW55OiB2ZWhpY2xlUG9zRGF0YS5kYXRhb3duZXJjb2RlLFxyXG4gICAgICAgICAgICBvcmlnaW5hbENvbXBhbnk6IHZlaGljbGVQb3NEYXRhLmRhdGFvd25lcmNvZGUsXHJcbiAgICAgICAgICAgIHBsYW5uaW5nTnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS5saW5lcGxhbm5pbmdudW1iZXIudG9TdHJpbmcoKSxcclxuICAgICAgICAgICAgam91cm5leU51bWJlcjogdmVoaWNsZVBvc0RhdGEuam91cm5leW51bWJlcixcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLnBhcnNlKHZlaGljbGVQb3NEYXRhLnRpbWVzdGFtcCksXHJcbiAgICAgICAgICAgIHZlaGljbGVOdW1iZXI6IHZlaGljbGVQb3NEYXRhLnZlaGljbGVudW1iZXIsXHJcbiAgICAgICAgICAgIGxpbmVOdW1iZXI6IFwiT25iZWtlbmRcIixcclxuICAgICAgICAgICAgcG9zaXRpb246IHRoaXMucmRUb0xhdExvbmcodmVoaWNsZVBvc0RhdGFbJ3JkLXgnXSwgdmVoaWNsZVBvc0RhdGFbJ3JkLXknXSksXHJcbiAgICAgICAgICAgIHB1bmN0dWFsaXR5OiBbdmVoaWNsZVBvc0RhdGEucHVuY3R1YWxpdHldLFxyXG4gICAgICAgICAgICBzdGF0dXM6IHZlaGljbGVTdGF0ZVtPYmplY3Qua2V5cyhzdGF0dXNXaXRoQnVzKVswXV0sXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICB1cGRhdGVkVGltZXM6IFtEYXRlLm5vdygpXVxyXG4gICAgICAgICAgfSlcclxuICAgICAgfSlcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnN0IHZlaGljbGVQb3NEYXRhIDogVmVoaWNsZVBvc0RhdGEgPSBrdjZwb3NpbmZvW09iamVjdC5rZXlzKGt2NnBvc2luZm8pWzBdXTtcclxuICAgICAgYXJyYXkucHVzaCh7XHJcbiAgICAgICAgY29tcGFueTogdmVoaWNsZVBvc0RhdGEuZGF0YW93bmVyY29kZSxcclxuICAgICAgICBvcmlnaW5hbENvbXBhbnk6IHZlaGljbGVQb3NEYXRhLmRhdGFvd25lcmNvZGUsXHJcbiAgICAgICAgcGxhbm5pbmdOdW1iZXI6IHZlaGljbGVQb3NEYXRhLmxpbmVwbGFubmluZ251bWJlci50b1N0cmluZygpLFxyXG4gICAgICAgIGpvdXJuZXlOdW1iZXI6IHZlaGljbGVQb3NEYXRhLmpvdXJuZXludW1iZXIsXHJcbiAgICAgICAgdGltZXN0YW1wOiBEYXRlLnBhcnNlKHZlaGljbGVQb3NEYXRhLnRpbWVzdGFtcCksXHJcbiAgICAgICAgdmVoaWNsZU51bWJlcjogdmVoaWNsZVBvc0RhdGEudmVoaWNsZW51bWJlcixcclxuICAgICAgICBsaW5lTnVtYmVyOiBcIk9uYmVrZW5kXCIsXHJcbiAgICAgICAgcG9zaXRpb246IHRoaXMucmRUb0xhdExvbmcodmVoaWNsZVBvc0RhdGFbJ3JkLXgnXSwgdmVoaWNsZVBvc0RhdGFbJ3JkLXknXSksXHJcbiAgICAgICAgcHVuY3R1YWxpdHk6IFt2ZWhpY2xlUG9zRGF0YS5wdW5jdHVhbGl0eV0sXHJcbiAgICAgICAgc3RhdHVzOiB2ZWhpY2xlU3RhdGVbT2JqZWN0LmtleXMoa3Y2cG9zaW5mbylbMF1dLFxyXG4gICAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICB1cGRhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgdXBkYXRlZFRpbWVzOiBbRGF0ZS5ub3coKV1cclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIFxyXG5cclxuICAgIHJldHVybiBhcnJheTtcclxuICB9XHJcblxyXG4gIGNvbnZlcnRLVjZUb0pzb24gKGRhdGEgOiBWZWhpY2xlQXBpRGF0YSkgOiBhbnkge1xyXG5cclxuICAgIGxldCBrdjZwb3NpbmZvID0gZGF0YS5WVl9UTV9QVVNILktWNnBvc2luZm87XHJcbiAgICBjb25zdCBhcnJheSA6IEFycmF5PFZlaGljbGVEYXRhPiA9IFtdO1xyXG5cclxuICAgIGlmKGt2NnBvc2luZm8gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIE9iamVjdC5lbnRyaWVzKGt2NnBvc2luZm8pLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xyXG4gICAgICAgIC8vSWYgdHJ1ZSwgdGhlIHJlY2VpdmVkIGRhdGEgaXMganVzdCBvbmUgb2JqZWN0IGluc3RlYWQgb2YgYXJyYXkuIFR5cGVvZiBWZWhpY2xlUG9zRGF0YVxyXG4gICAgICAgIGlmKHZhbHVlLmhhc093blByb3BlcnR5KFwiZGF0YW93bmVyY29kZVwiKSkgeyBcclxuXHJcbiAgICAgICAgICBjb25zdCB2ZWhpY2xlUG9zRGF0YSA6IFZlaGljbGVQb3NEYXRhID0ga3Y2cG9zaW5mb1trZXldO1xyXG4gICAgICAgICAgaWYoISghcGFyc2VJbnQodmVoaWNsZVBvc0RhdGFbJ3JkLXgnXSArIFwiXCIpIHx8ICFwYXJzZUludCh2ZWhpY2xlUG9zRGF0YVsncmQteSddICsgXCJcIikpKSB7XHJcbiAgICAgICAgICAgIGFycmF5LnB1c2goXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgY29tcGFueTogdmVoaWNsZVBvc0RhdGEuZGF0YW93bmVyY29kZSxcclxuICAgICAgICAgICAgICAgIG9yaWdpbmFsQ29tcGFueTogdmVoaWNsZVBvc0RhdGEuZGF0YW93bmVyY29kZSxcclxuICAgICAgICAgICAgICAgIHBsYW5uaW5nTnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS5saW5lcGxhbm5pbmdudW1iZXIudG9TdHJpbmcoKSxcclxuICAgICAgICAgICAgICAgIGpvdXJuZXlOdW1iZXI6IHZlaGljbGVQb3NEYXRhLmpvdXJuZXludW1iZXIsXHJcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUucGFyc2UodmVoaWNsZVBvc0RhdGEudGltZXN0YW1wKSxcclxuICAgICAgICAgICAgICAgIHZlaGljbGVOdW1iZXI6IHZlaGljbGVQb3NEYXRhLnZlaGljbGVudW1iZXIsXHJcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBcIk9uYmVrZW5kXCIsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5yZFRvTGF0TG9uZyh2ZWhpY2xlUG9zRGF0YVsncmQteCddLCB2ZWhpY2xlUG9zRGF0YVsncmQteSddKSxcclxuICAgICAgICAgICAgICAgIHB1bmN0dWFsaXR5OiBbdmVoaWNsZVBvc0RhdGEucHVuY3R1YWxpdHldLFxyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiB2ZWhpY2xlU3RhdGVba2V5XSxcclxuICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgICAgICAgIHVwZGF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgICAgICAgIHVwZGF0ZWRUaW1lczogW0RhdGUubm93KCldXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICB9ICBcclxuICAgICAgICAvL0lmIHRoaXMgaXMgdHJ1ZSwgdGhlIHJlY2VpdmVkIGRhdGEgaXMgYW4gYXJyYXkgb2Ygb2JqZWN0cy4gIFR5cGVvZiBWZWhpY2xlUG9zRGF0YVtdXHJcbiAgICAgICAgfSBlbHNlIGlmKHZhbHVlW09iamVjdC5rZXlzKHZhbHVlKVswXV0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgZm9yKGxldCBqID0wOyBqIDwga3Y2cG9zaW5mb1trZXldLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHZlaGljbGVQb3NEYXRhIDogVmVoaWNsZVBvc0RhdGEgPSBrdjZwb3NpbmZvW2tleV1bal07XHJcbiAgICAgICAgICAgIGlmKCFwYXJzZUludCh2ZWhpY2xlUG9zRGF0YVsncmQteCddICsgXCJcIikgfHwgIXBhcnNlSW50KHZlaGljbGVQb3NEYXRhWydyZC15J10gKyBcIlwiKSkgY29udGludWU7IFxyXG4gICAgICAgICAgICBhcnJheS5wdXNoKFxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGNvbXBhbnk6IHZlaGljbGVQb3NEYXRhLmRhdGFvd25lcmNvZGUsXHJcbiAgICAgICAgICAgICAgICBvcmlnaW5hbENvbXBhbnk6IHZlaGljbGVQb3NEYXRhLmRhdGFvd25lcmNvZGUsXHJcbiAgICAgICAgICAgICAgICBwbGFubmluZ051bWJlcjogdmVoaWNsZVBvc0RhdGEubGluZXBsYW5uaW5nbnVtYmVyLnRvU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICBqb3VybmV5TnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS5qb3VybmV5bnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLnBhcnNlKHZlaGljbGVQb3NEYXRhLnRpbWVzdGFtcCksXHJcbiAgICAgICAgICAgICAgICB2ZWhpY2xlTnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS52ZWhpY2xlbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogXCJPbmJla2VuZFwiLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMucmRUb0xhdExvbmcodmVoaWNsZVBvc0RhdGFbJ3JkLXgnXSwgdmVoaWNsZVBvc0RhdGFbJ3JkLXknXSksXHJcbiAgICAgICAgICAgICAgICBwdW5jdHVhbGl0eTogW3ZlaGljbGVQb3NEYXRhLnB1bmN0dWFsaXR5XSxcclxuICAgICAgICAgICAgICAgIHN0YXR1czogdmVoaWNsZVN0YXRlW2tleV0sXHJcbiAgICAgICAgICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgICAgICB1cGRhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgICAgICB1cGRhdGVkVGltZXM6IFtEYXRlLm5vdygpXVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhcnJheTtcclxuXHJcbiAgfVxyXG5cclxuICByZW1vdmVUbWk4IChkYXRhIDogVmVoaWNsZUFwaURhdGEpIDogVmVoaWNsZUFwaURhdGEge1xyXG4gICAgbGV0IGRhdGFTdHJpbmcgOiBzdHJpbmcgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcclxuICAgIGRhdGFTdHJpbmcgPSBkYXRhU3RyaW5nLnJlcGxhY2UoL3RtaTg6L2csIFwiXCIpO1xyXG4gICAgcmV0dXJuIEpTT04ucGFyc2UoZGF0YVN0cmluZyk7XHJcbiAgfVxyXG5cclxuICByZFRvTGF0TG9uZyAoeCwgeSkgOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgIGlmKHggPT09IHVuZGVmaW5lZCB8fCB5ID09PSB1bmRlZmluZWQpIHJldHVybiBbMCwgMF07XHJcblxyXG4gICAgY29uc3QgZFggPSAoeCAtIDE1NTAwMCkgKiBNYXRoLnBvdygxMCwgLTUpO1xyXG4gICAgY29uc3QgZFkgPSAoeSAtIDQ2MzAwMCkgKiBNYXRoLnBvdygxMCwgLTUpO1xyXG4gICAgY29uc3QgU29tTiA9ICgzMjM1LjY1Mzg5ICogZFkpICsgKC0zMi41ODI5NyAqIE1hdGgucG93KGRYLCAyKSkgKyAoLTAuMjQ3NSAqXHJcbiAgICAgIE1hdGgucG93KGRZLCAyKSkgKyAoLTAuODQ5NzggKiBNYXRoLnBvdyhkWCwgMikgKlxyXG4gICAgICBkWSkgKyAoLTAuMDY1NSAqIE1hdGgucG93KGRZLCAzKSkgKyAoLTAuMDE3MDkgKlxyXG4gICAgICBNYXRoLnBvdyhkWCwgMikgKiBNYXRoLnBvdyhkWSwgMikpICsgKC0wLjAwNzM4ICpcclxuICAgICAgZFgpICsgKDAuMDA1MyAqIE1hdGgucG93KGRYLCA0KSkgKyAoLTAuMDAwMzkgKlxyXG4gICAgICBNYXRoLnBvdyhkWCwgMikgKiBNYXRoLnBvdyhkWSwgMykpICsgKDAuMDAwMzMgKiBNYXRoLnBvdyhcclxuICAgICAgZFgsIDQpICogZFkpICsgKC0wLjAwMDEyICpcclxuICAgICAgZFggKiBkWSk7XHJcbiAgICBjb25zdCBTb21FID0gKDUyNjAuNTI5MTYgKiBkWCkgKyAoMTA1Ljk0Njg0ICogZFggKiBkWSkgKyAoMi40NTY1NiAqXHJcbiAgICAgIGRYICogTWF0aC5wb3coZFksIDIpKSArICgtMC44MTg4NSAqIE1hdGgucG93KFxyXG4gICAgICBkWCwgMykpICsgKDAuMDU1OTQgKlxyXG4gICAgICBkWCAqIE1hdGgucG93KGRZLCAzKSkgKyAoLTAuMDU2MDcgKiBNYXRoLnBvdyhcclxuICAgICAgZFgsIDMpICogZFkpICsgKDAuMDExOTkgKlxyXG4gICAgICBkWSkgKyAoLTAuMDAyNTYgKiBNYXRoLnBvdyhkWCwgMykgKiBNYXRoLnBvdyhcclxuICAgICAgZFksIDIpKSArICgwLjAwMTI4ICpcclxuICAgICAgZFggKiBNYXRoLnBvdyhkWSwgNCkpICsgKDAuMDAwMjIgKiBNYXRoLnBvdyhkWSxcclxuICAgICAgMikpICsgKC0wLjAwMDIyICogTWF0aC5wb3coXHJcbiAgICAgIGRYLCAyKSkgKyAoMC4wMDAyNiAqXHJcbiAgICAgIE1hdGgucG93KGRYLCA1KSk7XHJcbiAgICBcclxuICAgIGNvbnN0IExhdGl0dWRlID0gNTIuMTU1MTcgKyAoU29tTiAvIDM2MDApO1xyXG4gICAgY29uc3QgTG9uZ2l0dWRlID0gNS4zODcyMDYgKyAoU29tRSAvIDM2MDApO1xyXG4gICAgXHJcbiAgICByZXR1cm4gW0xvbmdpdHVkZSwgTGF0aXR1ZGVdXHJcbiAgfVxyXG5cclxufSIsImltcG9ydCB7IENvbm5lY3Rpb24sIE1vZGVsLCBNb25nb29zZSwgRmlsdGVyUXVlcnksIFNjaGVtYSB9IGZyb20gJ21vbmdvb3NlJztcclxuaW1wb3J0IHsgVHJpcCB9IGZyb20gJy4vdHlwZXMvVHJpcCc7XHJcbmltcG9ydCB7IFZlaGljbGVEYXRhLCB2ZWhpY2xlU3RhdGUgfSBmcm9tICcuL3R5cGVzL1ZlaGljbGVEYXRhJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IFJvdXRlIH0gZnJvbSAnLi90eXBlcy9Sb3V0ZSc7XHJcbmNvbnN0IHN0cmVhbVRvTW9uZ29EQiA9IHJlcXVpcmUoJ3N0cmVhbS10by1tb25nby1kYicpLnN0cmVhbVRvTW9uZ29EQjtcclxuY29uc3Qgc3BsaXQgPSByZXF1aXJlKCdzcGxpdCcpO1xyXG5leHBvcnQgY2xhc3MgRGF0YWJhc2Uge1xyXG4gIFxyXG4gIHByaXZhdGUgc3RhdGljIGluc3RhbmNlIDogRGF0YWJhc2U7XHJcbiAgXHJcbiAgcHJpdmF0ZSBkYiA6IENvbm5lY3Rpb247XHJcbiAgcHJpdmF0ZSBtb25nb29zZSA6IE1vbmdvb3NlO1xyXG4gIHByaXZhdGUgdmVoaWNsZVNjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIHRyaXBzU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgcm91dGVzU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgdmVoaWNsZU1vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgdHJpcE1vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgcm91dGVzTW9kZWwgOiB0eXBlb2YgTW9kZWw7XHJcbiAgcHJpdmF0ZSBvdXRwdXREQkNvbmZpZztcclxuXHJcbiAgcHVibGljIHN0YXRpYyBnZXRJbnN0YW5jZSgpOiBEYXRhYmFzZSB7XHJcbiAgICBpZighRGF0YWJhc2UuaW5zdGFuY2UpXHJcbiAgICAgIERhdGFiYXNlLmluc3RhbmNlID0gbmV3IERhdGFiYXNlKCk7XHJcblxyXG4gICAgcmV0dXJuIERhdGFiYXNlLmluc3RhbmNlO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEluaXQoKSB7XHJcbiAgICBjb25zdCB1cmwgOiBzdHJpbmcgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkw7XHJcbiAgICBjb25zdCBuYW1lIDogc3RyaW5nID0gcHJvY2Vzcy5lbnYuREFUQUJBU0VfTkFNRTtcclxuXHJcbiAgICB0aGlzLm1vbmdvb3NlID0gbmV3IE1vbmdvb3NlKCk7XHJcbiAgICBcclxuICAgIHRoaXMubW9uZ29vc2Uuc2V0KCd1c2VGaW5kQW5kTW9kaWZ5JywgZmFsc2UpXHJcblxyXG4gICAgaWYoIXVybCAmJiAhbmFtZSkgdGhyb3cgKGBJbnZhbGlkIFVSTCBvciBuYW1lIGdpdmVuLCByZWNlaXZlZDogXFxuIE5hbWU6ICR7bmFtZX0gXFxuIFVSTDogJHt1cmx9YClcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgQ29ubmVjdGluZyB0byBkYXRhYmFzZSB3aXRoIG5hbWU6ICR7bmFtZX0gYXQgdXJsOiAke3VybH1gKVxyXG4gICAgdGhpcy5tb25nb29zZS5jb25uZWN0KGAke3VybH0vJHtuYW1lfWAsIHtcclxuICAgICAgdXNlTmV3VXJsUGFyc2VyOiB0cnVlLFxyXG4gICAgICB1c2VVbmlmaWVkVG9wb2xvZ3k6IHRydWUsXHJcbiAgICAgIHBvb2xTaXplOiAxMjBcclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy5kYiA9IHRoaXMubW9uZ29vc2UuY29ubmVjdGlvbjtcclxuXHJcbiAgICB0aGlzLm91dHB1dERCQ29uZmlnID0geyBkYlVSTCA6IGAke3VybH0vJHtuYW1lfWAsIGNvbGxlY3Rpb24gOiAndHJpcHMnIH07XHJcblxyXG4gICAgdGhpcy5kYi5vbignZXJyb3InLCBlcnJvciA9PiB7XHJcbiAgICAgIHRocm93IG5ldyBlcnJvcihgRXJyb3IgY29ubmVjdGluZyB0byBkYXRhYmFzZS4gJHtlcnJvcn1gKTtcclxuICAgIH0pXHJcblxyXG4gICAgYXdhaXQgdGhpcy5EYXRhYmFzZUxpc3RlbmVyKCk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgR2V0RGF0YWJhc2UoKSA6IENvbm5lY3Rpb24ge1xyXG4gICAgcmV0dXJuIHRoaXMuZGI7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgRGF0YWJhc2VMaXN0ZW5lciAoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XHJcbiAgICAgICAgdGhpcy5kYi5vbmNlKFwib3BlblwiLCAoKSA9PiB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvbm5lY3Rpb24gdG8gZGF0YWJhc2UgZXN0YWJsaXNoZWQuXCIpXHJcblxyXG4gICAgICAgICAgdGhpcy52ZWhpY2xlU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgY29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICBvcmlnaW5hbENvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgcGxhbm5pbmdOdW1iZXI6IFN0cmluZyxcclxuICAgICAgICAgICAgam91cm5leU51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IE51bWJlcixcclxuICAgICAgICAgICAgdmVoaWNsZU51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogW051bWJlciwgTnVtYmVyXSxcclxuICAgICAgICAgICAgc3RhdHVzOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIGxpbmVOdW1iZXI6IFN0cmluZyxcclxuICAgICAgICAgICAgcHVuY3R1YWxpdHk6IEFycmF5LFxyXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IE51bWJlcixcclxuICAgICAgICAgICAgdXBkYXRlZEF0OiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHVwZGF0ZWRUaW1lczogQXJyYXlcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICB0aGlzLnRyaXBzU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgY29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHNlcnZpY2VJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB0cmlwSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgdHJpcE51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICB0cmlwUGxhbm5pbmdOdW1iZXI6IFN0cmluZyxcclxuICAgICAgICAgICAgdHJpcEhlYWRzaWduOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHRyaXBOYW1lOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIGRpcmVjdGlvbklkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHNoYXBlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgd2hlZWxjaGFpckFjY2Vzc2libGU6IE51bWJlclxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLnJvdXRlc1NjaGVtYSA9IG5ldyB0aGlzLm1vbmdvb3NlLlNjaGVtYSh7XHJcbiAgICAgICAgICAgIHJvdXRlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgY29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICBzdWJDb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlU2hvcnROYW1lOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlTG9uZ05hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVEZXNjcmlwdGlvbjogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZVR5cGU6IE51bWJlcixcclxuICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgdGhpcy50cmlwc1NjaGVtYS5pbmRleCh7IHRyaXBOdW1iZXI6IC0xLCB0cmlwUGxhbm5pbmdOdW1iZXI6IC0xLCBjb21wYW55OiAtMSB9KVxyXG5cclxuICAgICAgICAgIHRoaXMudmVoaWNsZU1vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcIlZlaGljbGVQb3NpdGlvbnNcIiwgdGhpcy52ZWhpY2xlU2NoZW1hKTtcclxuICAgICAgICAgIHRoaXMudHJpcE1vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcInRyaXBzXCIsIHRoaXMudHJpcHNTY2hlbWEpO1xyXG4gICAgICAgICAgdGhpcy5yb3V0ZXNNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJyb3V0ZXNcIiwgdGhpcy5yb3V0ZXNTY2hlbWEpO1xyXG5cclxuICAgICAgICAgIHRoaXMudHJpcE1vZGVsLmNyZWF0ZUluZGV4ZXMoKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgcmVzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0QWxsVmVoaWNsZXMgKGFyZ3MgPSB7fSkgOiBQcm9taXNlPEFycmF5PFZlaGljbGVEYXRhPj4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmQoey4uLmFyZ3N9LCB7IHB1bmN0dWFsaXR5OiAwLCB1cGRhdGVkVGltZXM6IDAsIF9fdiA6IDAgfSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0VmVoaWNsZSAodmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIsIGZpcnN0T25seSA6IGJvb2xlYW4gPSBmYWxzZSkgOiBQcm9taXNlPFZlaGljbGVEYXRhPiB7XHJcbiAgICByZXR1cm4geyBcclxuICAgICAgLi4uYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZSh7XHJcbiAgICAgICAgdmVoaWNsZU51bWJlciA6IHZlaGljbGVOdW1iZXIsXHJcbiAgICAgICAgY29tcGFueTogdHJhbnNwb3J0ZXJcclxuICAgICAgfSlcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgVmVoaWNsZUV4aXN0cyh2ZWhpY2xlTnVtYmVyLCB0cmFuc3BvcnRlcikgOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIHJldHVybiBhd2FpdCB0aGlzLkdldFZlaGljbGUodmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIpICE9PSBudWxsO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFVwZGF0ZVZlaGljbGUgKHZlaGljbGVUb1VwZGF0ZSA6IGFueSwgdXBkYXRlZFZlaGljbGVEYXRhIDogVmVoaWNsZURhdGEsIHBvc2l0aW9uQ2hlY2tzIDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYoIXZlaGljbGVUb1VwZGF0ZVtcIl9kb2NcIl0pIHJldHVyblxyXG5cclxuICAgIHZlaGljbGVUb1VwZGF0ZSA9IHZlaGljbGVUb1VwZGF0ZVtcIl9kb2NcIl07XHJcbiAgICBcclxuICAgIC8vTWVyZ2UgdGhlIHB1bmN0dWFsaXRpZXMgb2YgdGhlIG9sZCB2ZWhpY2xlRGF0YSB3aXRoIHRoZSBuZXcgb25lLlxyXG4gICAgdXBkYXRlZFZlaGljbGVEYXRhLnB1bmN0dWFsaXR5ID0gdmVoaWNsZVRvVXBkYXRlLnB1bmN0dWFsaXR5LmNvbmNhdCh1cGRhdGVkVmVoaWNsZURhdGEucHVuY3R1YWxpdHkpO1xyXG5cclxuICAgIC8vTWVyZ2UgdGhlIHVwZGF0ZWQgdGltZXMgb2YgdGhlIG9sZCB2ZWhpY2xlRGF0YSB3aXRoIHRoZSBuZXcgb25lLlxyXG4gICAgdXBkYXRlZFZlaGljbGVEYXRhLnVwZGF0ZWRUaW1lcyA9IHZlaGljbGVUb1VwZGF0ZS51cGRhdGVkVGltZXMuY29uY2F0KHVwZGF0ZWRWZWhpY2xlRGF0YS51cGRhdGVkVGltZXMpO1xyXG5cclxuICAgIGlmKHBvc2l0aW9uQ2hlY2tzICYmIHVwZGF0ZWRWZWhpY2xlRGF0YS5zdGF0dXMgIT09IHZlaGljbGVTdGF0ZS5PTlJPVVRFKVxyXG4gICAgICB1cGRhdGVkVmVoaWNsZURhdGEucG9zaXRpb24gPSB2ZWhpY2xlVG9VcGRhdGUucG9zaXRpb247XHJcblxyXG4gICAgaWYodXBkYXRlZFZlaGljbGVEYXRhLnN0YXR1cyA9PT0gdmVoaWNsZVN0YXRlLklOSVQgfHwgdXBkYXRlZFZlaGljbGVEYXRhLnN0YXR1cyA9PT0gdmVoaWNsZVN0YXRlLkVORCkge1xyXG4gICAgICB1cGRhdGVkVmVoaWNsZURhdGEucHVuY3R1YWxpdHkgPSBbXTtcclxuICAgICAgdXBkYXRlZFZlaGljbGVEYXRhLnVwZGF0ZWRUaW1lcyA9IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZWRWZWhpY2xlRGF0YS51cGRhdGVkQXQgPSBEYXRlLm5vdygpOyAgXHJcblxyXG4gICAgYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZUFuZFVwZGF0ZSh2ZWhpY2xlVG9VcGRhdGUsIHVwZGF0ZWRWZWhpY2xlRGF0YSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgQWRkVmVoaWNsZSAodmVoaWNsZSA6IFZlaGljbGVEYXRhLCBvbmx5QWRkV2hpbGVPblJvdXRlIDogYm9vbGVhbikgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKG9ubHlBZGRXaGlsZU9uUm91dGUgJiYgdmVoaWNsZS5zdGF0dXMgIT09IHZlaGljbGVTdGF0ZS5PTlJPVVRFKSByZXR1cm47XHJcbiAgICBuZXcgdGhpcy52ZWhpY2xlTW9kZWwoe1xyXG4gICAgICAuLi52ZWhpY2xlLFxyXG4gICAgICBwdW5jdHVhbGl0eSA6IHZlaGljbGUucHVuY3R1YWxpdHlcclxuICAgIH0pLnNhdmUoZXJyb3IgPT4ge1xyXG4gICAgICBpZihlcnJvcikgY29uc29sZS5lcnJvcihgU29tZXRoaW5nIHdlbnQgd3Jvbmcgd2hpbGUgdHJ5aW5nIHRvIGFkZCB2ZWhpY2xlOiAke3ZlaGljbGUudmVoaWNsZU51bWJlcn0uIEVycm9yOiAke2Vycm9yfWApXHJcbiAgICB9KVxyXG4gIH1cclxuICBcclxuICBwdWJsaWMgYXN5bmMgUmVtb3ZlVmVoaWNsZSAodmVoaWNsZSA6IFZlaGljbGVEYXRhKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYoIXZlaGljbGVbXCJfZG9jXCJdKSByZXR1cm5cclxuXHJcbiAgICB0aGlzLnZlaGljbGVNb2RlbC5maW5kT25lQW5kRGVsZXRlKHZlaGljbGUpXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgUmVtb3ZlVmVoaWNsZXNXaGVyZSggcGFyYW1zIDogb2JqZWN0LCBkb0xvZ2dpbmcgOiBib29sZWFuID0gZmFsc2UpIDogUHJvbWlzZTxBcnJheTxWZWhpY2xlRGF0YT4+IHtcclxuICAgIGNvbnN0IHJlbW92ZWRWZWhpY2xlcyA6IEFycmF5PFZlaGljbGVEYXRhPiA9IGF3YWl0IHRoaXMuR2V0QWxsVmVoaWNsZXMocGFyYW1zKTtcclxuICAgIHRoaXMudmVoaWNsZU1vZGVsLmRlbGV0ZU1hbnkocGFyYW1zKS50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgaWYoZG9Mb2dnaW5nKSBjb25zb2xlLmxvZyhgRGVsZXRlZCAke3Jlc3BvbnNlLmRlbGV0ZWRDb3VudH0gdmVoaWNsZXMuYCk7XHJcbiAgICAgIFxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gcmVtb3ZlZFZlaGljbGVzO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFRyaXBzKHBhcmFtcyA6IG9iamVjdCA9IHt9KSA6IFByb21pc2U8QXJyYXk8VHJpcD4+IHtcclxuICAgIHJldHVybiBhd2FpdCB0aGlzLnRyaXBNb2RlbC5maW5kKHBhcmFtcylcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRUcmlwKHRyaXBOdW1iZXIgOiBudW1iZXIsIHRyaXBQbGFubmluZ051bWJlciA6IHN0cmluZywgY29tcGFueSA6IHN0cmluZykge1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy50cmlwTW9kZWwuZmluZE9uZSh7XHJcbiAgICAgIGNvbXBhbnk6IGNvbXBhbnksXHJcbiAgICAgIHRyaXBOdW1iZXIgOiB0cmlwTnVtYmVyLFxyXG4gICAgICB0cmlwUGxhbm5pbmdOdW1iZXI6IHRyaXBQbGFubmluZ051bWJlclxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3BvbnNlICE9PSBudWxsID8gcmVzcG9uc2UgOiB7fTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBSZW1vdmVUcmlwKHBhcmFtcyA6IG9iamVjdCA9IHt9LCBkb0xvZ2dpbmcgOiBib29sZWFuID0gZmFsc2UpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLnRyaXBNb2RlbC5kZWxldGVNYW55KHBhcmFtcykudGhlbihyZXNwb25zZSA9PiB7XHJcbiAgICAgIGlmKGRvTG9nZ2luZykgY29uc29sZS5sb2coYERlbGV0ZWQgJHtyZXNwb25zZS5kZWxldGVkQ291bnR9IHRyaXBzYCk7XHJcbiAgICB9KVxyXG4gIH1cclxuICAvKipcclxuICAgKiBJbnNlcnRzIG1hbnkgdHJpcHMgYXQgb25jZSBpbnRvIHRoZSBkYXRhYmFzZS5cclxuICAgKiBAcGFyYW0gdHJpcHMgVGhlIHRyaXBzIHRvIGFkZC5cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgSW5zZXJ0TWFueVRyaXBzKHRyaXBzKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICBhd2FpdCB0aGlzLnRyaXBNb2RlbC5pbnNlcnRNYW55KHRyaXBzLCB7IG9yZGVyZWQ6IGZhbHNlIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIFwiS29wcGVsdmxhayA3IGFuZCA4IHR1cmJvXCIgZmlsZXMgdG8gZGF0YWJhc2UuXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIEluc2VydFRyaXAodHJpcCA6IFRyaXApIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBuZXcgdGhpcy50cmlwTW9kZWwodHJpcCkuc2F2ZShlcnJvciA9PiB7XHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGBTb21ldGhpbmcgd2VudCB3cm9uZyB3aGlsZSB0cnlpbmcgdG8gYWRkIHRyaXA6ICR7dHJpcC50cmlwSGVhZHNpZ259LiBFcnJvcjogJHtlcnJvcn1gKVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBEcm9wVHJpcHNDb2xsZWN0aW9uKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGluZyB0cmlwcyBjb2xsZWN0aW9uXCIpO1xyXG4gICAgYXdhaXQgdGhpcy50cmlwTW9kZWwucmVtb3ZlKHt9KTtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBlZCB0cmlwcyBjb2xsZWN0aW9uXCIpO1xyXG4gIH1cclxuICBwdWJsaWMgYXN5bmMgRHJvcFJvdXRlc0NvbGxlY3Rpb24oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwaW5nIHJvdXRlcyBjb2xsZWN0aW9uXCIpO1xyXG4gICAgYXdhaXQgdGhpcy5yb3V0ZXNNb2RlbC5yZW1vdmUoe30pO1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGVkIHJvdXRlcyBjb2xsZWN0aW9uXCIpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFJvdXRlKHJvdXRlSWQgOiBudW1iZXIpIDogUHJvbWlzZTxSb3V0ZT4ge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnJvdXRlc01vZGVsLmZpbmRPbmUoe1xyXG4gICAgICByb3V0ZUlkIDogcm91dGVJZCxcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiByZXNwb25zZSAhPT0gbnVsbCA/IHJlc3BvbnNlIDoge307XHJcbiAgfVxyXG5cclxuICAvLyBwdWJsaWMgYXN5bmMgQWRkUm91dGUoKVxyXG5cclxufVxyXG4iLCIvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBBUFAgQ09ORklHXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5cclxuaW1wb3J0ICogYXMgZG90ZW52IGZyb20gJ2RvdGVudic7XHJcbmRvdGVudi5jb25maWcoKTtcclxuXHJcbmNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDMwMDI7XHJcblxyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBZQVJOIElNUE9SVFNcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcbmltcG9ydCAqIGFzIGh0dHBzIGZyb20gJ2h0dHBzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5cclxuY29uc3QgZXhwcmVzcyA9IHJlcXVpcmUoXCJleHByZXNzXCIpO1xyXG5jb25zdCBjb3JzID0gcmVxdWlyZShcImNvcnNcIik7XHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICBDVVNUT00gSU1QT1JUU1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuXHJcbmltcG9ydCB7IERhdGFiYXNlIH0gZnJvbSAnLi9kYXRhYmFzZSc7XHJcbmltcG9ydCB7IFdlYnNvY2tldCB9IGZyb20gJy4vc29ja2V0JztcclxuaW1wb3J0IHsgT1ZEYXRhIH0gZnJvbSAnLi9yZWFsdGltZSc7XHJcblxyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBTU0wgQ09ORklHXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5jb25zdCBwcml2YXRlS2V5ID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9rZXkua2V5XCIpLnRvU3RyaW5nKCk7XHJcbmNvbnN0IGNlcnRpZmljYXRlID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9jZXJ0LmNydFwiKS50b1N0cmluZygpO1xyXG5jb25zdCBjYSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUva2V5LWNhLmNydFwiKS50b1N0cmluZygpO1xyXG5cclxuY29uc3QgQXBwSW5pdCA9IGFzeW5jICgpID0+IHtcclxuICBjb25zdCBkYiA9IGF3YWl0IERhdGFiYXNlLmdldEluc3RhbmNlKCkuSW5pdCgpLnRoZW4oKTtcclxuICBcclxuICBjb25zdCBhcHAgPSAobW9kdWxlLmV4cG9ydHMgPSBleHByZXNzKCkpO1xyXG5cclxuICBjb25zdCBzZXJ2ZXIgPSBodHRwcy5jcmVhdGVTZXJ2ZXIoXHJcbiAgICB7XHJcbiAgICAgIGtleTogcHJpdmF0ZUtleSxcclxuICAgICAgY2VydDogY2VydGlmaWNhdGUsXHJcbiAgICAgIGNhOiBjYSxcclxuICAgICAgcmVxdWVzdENlcnQ6IHRydWUsXHJcbiAgICAgIHJlamVjdFVuYXV0aG9yaXplZDogZmFsc2UsXHJcbiAgICB9LFxyXG4gICAgYXBwXHJcbiAgKTtcclxuICBcclxuXHJcbiAgLy9USElTIElTIE5PVCBTQUZFXHJcblxyXG4gIGNvbnN0IGNvcnNPcHRpb25zID0ge1xyXG4gICAgb3JpZ2luOiAnKicsXHJcbiAgICBvcHRpb25zU3VjY2Vzc1N0YXR1czogMjAwXHJcbiAgfVxyXG5cclxuICBhcHAudXNlKGNvcnMoY29yc09wdGlvbnMpKVxyXG4gIGFwcC5vcHRpb25zKCcqJywgY29ycygpKVxyXG5cclxuXHJcbiAgY29uc3Qgc29ja2V0ID0gbmV3IFdlYnNvY2tldChzZXJ2ZXIsIGRiKTtcclxuICBjb25zdCBvdiA9IG5ldyBPVkRhdGEoZGIsIHNvY2tldCk7XHJcbiAgLy9idXNMb2dpYy5Jbml0S1Y3OCgpO1xyXG4gIFxyXG4gIHNlcnZlci5saXN0ZW4ocG9ydCwgKCkgPT4gY29uc29sZS5sb2coYExpc3RlbmluZyBhdCBodHRwOi8vbG9jYWxob3N0OiR7cG9ydH1gKSk7XHJcblxyXG59XHJcblxyXG5BcHBJbml0KCk7XHJcbiIsImltcG9ydCB7IFZlaGljbGVEYXRhIH0gZnJvbSBcIi4vdHlwZXMvVmVoaWNsZURhdGFcIjtcclxuaW1wb3J0IHsgZ3VuemlwIH0gZnJvbSAnemxpYic7XHJcbmltcG9ydCB7IENvbnZlcnRlciB9IGZyb20gJy4vY29udmVydGVyJztcclxuaW1wb3J0IHsgQnVzTG9naWMgfSBmcm9tIFwiLi9idXNsb2dpY1wiO1xyXG5cclxuaW1wb3J0ICogYXMgeG1sIGZyb20gJ2Zhc3QteG1sLXBhcnNlcic7XHJcbmltcG9ydCB7IFdlYnNvY2tldCB9IGZyb20gXCIuL3NvY2tldFwiO1xyXG5cclxuY29uc3Qgem1xID0gcmVxdWlyZSgnemVyb21xJyk7XHJcbmNvbnN0IGRvTG9nZ2luZyA9IHByb2Nlc3MuZW52LkFQUF9ET19MT0dHSU5HID09IFwidHJ1ZVwiID8gdHJ1ZSA6IGZhbHNlO1xyXG5leHBvcnQgY2xhc3MgT1ZEYXRhIHtcclxuICBcclxuICBwcml2YXRlIHNvY2s7XHJcbiAgcHJpdmF0ZSBrdjc4c29ja2V0O1xyXG4gIHByaXZhdGUgYnVzTG9naWMgOiBCdXNMb2dpYztcclxuICBwcml2YXRlIHdlYnNvY2tldCA6IFdlYnNvY2tldDtcclxuXHJcbiAgY29uc3RydWN0b3IoZGF0YWJhc2UsIHNvY2tldCA6IFdlYnNvY2tldCkge1xyXG4gICAgdGhpcy53ZWJzb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICB0aGlzLkluaXQoKTtcclxuICAgIHRoaXMuYnVzTG9naWMgPSBuZXcgQnVzTG9naWMoZGF0YWJhc2UsIGZhbHNlKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBJbml0KCkge1xyXG5cclxuICAgIGNvbnN0IGNvbnZlcnRlciA9IG5ldyBDb252ZXJ0ZXIoKTtcclxuXHJcbiAgICB0aGlzLnNvY2sgPSB6bXEuc29ja2V0KFwic3ViXCIpO1xyXG5cclxuICAgIHRoaXMuc29jay5jb25uZWN0KFwidGNwOi8vcHVic3ViLm5kb3Zsb2tldC5ubDo3NjU4XCIpO1xyXG4gICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9BUlIvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvQ1hYL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL0VCUy9LVjZwb3NpbmZvXCIpO1xyXG4gICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9RQlVaWi9LVjZwb3NpbmZvXCIpO1xyXG4gICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9SSUcvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvS0VPTElTL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL1NZTlRVUy9LVjZwb3NpbmZvXCIpO1xyXG4gICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9PUEVOT1YvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvR1ZCL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL0RJVFAvS1Y2cG9zaW5mb1wiKTtcclxuXHJcbiAgICB0aGlzLnNvY2sub24oXCJtZXNzYWdlXCIsIChvcENvZGUsIC4uLmNvbnRlbnQpID0+IHtcclxuICAgICAgY29uc3QgY29udGVudHMgPSBCdWZmZXIuY29uY2F0KGNvbnRlbnQpO1xyXG4gICAgICBjb25zdCBvcGVyYXRvciA9IG9wQ29kZS50b1N0cmluZygpO1xyXG4gICAgICBndW56aXAoY29udGVudHMsIGFzeW5jKGVycm9yLCBidWZmZXIpID0+IHtcclxuICAgICAgICBpZihlcnJvcikgcmV0dXJuIGNvbnNvbGUuZXJyb3IoYFNvbWV0aGluZyB3ZW50IHdyb25nIHdoaWxlIHRyeWluZyB0byB1bnppcC4gJHtlcnJvcn1gKVxyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGVuY29kZWRYTUwgPSBidWZmZXIudG9TdHJpbmcoKTtcclxuICAgICAgICBjb25zdCBkZWNvZGVkID0geG1sLnBhcnNlKGVuY29kZWRYTUwpO1xyXG4gICAgICAgIGxldCB2ZWhpY2xlRGF0YTtcclxuXHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIGlmKG9wZXJhdG9yICE9PSBcIi9LRU9MSVMvS1Y2cG9zaW5mb1wiIHx8IG9wZXJhdG9yICE9PSBcIi9HVkIvS1Y2cG9zaW5mb1wiKSBcclxuICAgICAgICAgIHZlaGljbGVEYXRhID0gY29udmVydGVyLmRlY29kZShkZWNvZGVkKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICB2ZWhpY2xlRGF0YSA9IGNvbnZlcnRlci5kZWNvZGUoZGVjb2RlZCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgYXdhaXQgdGhpcy5idXNMb2dpYy5VcGRhdGVCdXNzZXModmVoaWNsZURhdGEpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgIH0pXHJcblxyXG4gICAgfSlcclxuICAgIFxyXG4gICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xyXG4gICAgICB0aGlzLndlYnNvY2tldC5FbWl0KCk7XHJcbiAgICB9LCBwYXJzZUludChwcm9jZXNzLmVudi5BUFBfQlVTX1VQREFURV9ERUxBWSkpXHJcbiAgICBcclxuICAgIC8vIHRoaXMua3Y3OHNvY2tldCA9IHptcS5zb2NrZXQoXCJzdWJcIik7XHJcbiAgICAvLyB0aGlzLmt2Nzhzb2NrZXQuY29ubmVjdChcInRjcDovL3B1YnN1Yi5uZG92bG9rZXQubmw6NzgxN1wiKTtcclxuICAgIC8vIHRoaXMua3Y3OHNvY2tldC5zdWJzY3JpYmUoXCIvXCIpXHJcbiAgICAvLyB0aGlzLmt2Nzhzb2NrZXQub24oXCJtZXNzYWdlXCIsIChvcENvZGUsIC4uLmNvbnRlbnQpID0+IHtcclxuICAgIC8vICAgY29uc3QgY29udGVudHMgPSBCdWZmZXIuY29uY2F0KGNvbnRlbnQpO1xyXG4gICAgLy8gICBndW56aXAoY29udGVudHMsIGFzeW5jKGVycm9yLCBidWZmZXIpID0+IHsgXHJcbiAgICAvLyAgICAgY29uc29sZS5sb2coYnVmZmVyLnRvU3RyaW5nKCd1dGY4JykpXHJcbiAgICAvLyAgIH0pO1xyXG4gICAgLy8gfSk7XHJcbiAgfVxyXG5cclxuICBcclxufSIsImltcG9ydCB7IFZlaGljbGVEYXRhIH0gZnJvbSBcIi4vdHlwZXMvVmVoaWNsZURhdGFcIjtcclxuaW1wb3J0IHsgU2VydmVyIH0gZnJvbSAnaHR0cHMnO1xyXG5pbXBvcnQgeyBTb2NrZXQgfSBmcm9tICdzb2NrZXQuaW8nO1xyXG5pbXBvcnQgeyBEYXRhYmFzZSB9IGZyb20gJy4vZGF0YWJhc2UnO1xyXG5cclxuY29uc3QgYnVzX3VwZGF0ZV9yYXRlID0gcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0JVU19VUERBVEVfREVMQVkpO1xyXG5cclxuZXhwb3J0IGNsYXNzIFdlYnNvY2tldCB7XHJcbiAgXHJcbiAgcHJpdmF0ZSBpbyA6IFNvY2tldDtcclxuICBwcml2YXRlIGFjdGl2ZVNvY2tldCA6IFNvY2tldDtcclxuICBwcml2YXRlIGRiIDogRGF0YWJhc2U7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNlcnZlciA6IFNlcnZlciwgZGIgOiBEYXRhYmFzZSkge1xyXG4gICAgdGhpcy5Tb2NrZXRJbml0KHNlcnZlcik7XHJcbiAgICB0aGlzLmRiID0gZGI7XHJcbiAgfVxyXG5cclxuICBhc3luYyBTb2NrZXRJbml0KHNlcnZlciA6IFNlcnZlcikge1xyXG4gICAgY29uc29sZS5sb2coYEluaXRhbGl6aW5nIHdlYnNvY2tldGApXHJcblxyXG4gICAgdGhpcy5pbyA9IHJlcXVpcmUoXCJzb2NrZXQuaW9cIikoc2VydmVyLCB7XHJcbiAgICAgIGNvcnM6IHtcclxuICAgICAgICBvcmlnaW46IFwiKlwiLFxyXG4gICAgICAgIG1ldGhvZHM6IFtcIkdFVFwiLCBcIlBPU1RcIl0sXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmlvLm9uKFwiY29ubmVjdGlvblwiLCBzb2NrZXQgPT4ge1xyXG4gICAgICB0aGlzLlNvY2tldChzb2NrZXQpO1xyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIFNvY2tldChzb2NrZXQgOiBTb2NrZXQpIHtcclxuICAgIHRoaXMuYWN0aXZlU29ja2V0ID0gc29ja2V0O1xyXG4gICAgY29uc29sZS5sb2coXCJOZXcgY2xpZW50IGNvbm5lY3RlZC5cIik7XHJcblxyXG4gICAgLy8gY29uc3QgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAvLyAgICAgICAvL2NvbnNvbGUubG9nKFwiRW1pdHRpbmcgbmV3IGRhdGEuXCIpO1xyXG4gICAgLy8gICAgICAgdGhpcy5kYi5HZXRBbGxWZWhpY2xlcygpLnRoZW4oKHZlaGljbGVzKSA9PiB7XHJcbiAgICAvLyAgICAgICAgIHNvY2tldC5lbWl0KFwib3ZkYXRhXCIsIHZlaGljbGVzKTtcclxuICAgIC8vICAgICAgIH0pXHJcbiAgICAvLyB9LCBidXNfdXBkYXRlX3JhdGUpO1xyXG5cclxuICAgIHNvY2tldC5vbihcImRpc2Nvbm5lY3RcIiwgKCkgPT4ge1xyXG4gICAgICBjb25zb2xlLmxvZyhcIkNsaWVudCBkaXNjb25uZWN0ZWRcIik7XHJcbiAgICAgIC8vY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgU2VuZERlbGV0ZWRWZWhpY2xlcyh2ZWhpY2xlcyA6IEFycmF5PFZlaGljbGVEYXRhPikgOiB2b2lkIHtcclxuICAgIHRoaXMuaW8uZW1pdChcImRlbGV0ZWRWZWhpY2xlc1wiLCB2ZWhpY2xlcyk7XHJcbiAgfVxyXG5cclxuICBFbWl0KCkge1xyXG4gICAgLy9TbWFsbCBkZWxheSB0byBtYWtlIHN1cmUgdGhlIHNlcnZlciBjYXRjaGVzIHVwLlxyXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgIHRoaXMuZGIuR2V0QWxsVmVoaWNsZXMoKS50aGVuKCh2ZWhpY2xlcykgPT4ge1xyXG4gICAgICAgIHRoaXMuaW8uZW1pdChcIm92ZGF0YVwiLCB2ZWhpY2xlcyk7XHJcbiAgICAgIH0pXHJcbiAgICB9LCAxMDApXHJcbiAgfVxyXG5cclxufSIsImV4cG9ydCBlbnVtIHZlaGljbGVTdGF0ZSB7XHJcbiAgT05ST1VURSA9ICdPTlJPVVRFJyxcclxuICBPRkZST1VURSA9ICdPRkZST1VURScsXHJcbiAgRU5EID0gXCJFTkRcIixcclxuICBERVBBUlRVUkUgPSAnREVQQVJUVVJFJyxcclxuICBJTklUID0gJ0lOSVQnLFxyXG4gIERFTEFZID0gJ0RFTEFZJyxcclxuICBPTlNUT1AgPSAnT05TVE9QJyxcclxuICBBUlJJVkFMID0gJ0FSUklWQUwnXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVmVoaWNsZURhdGEge1xyXG4gIGNvbXBhbnk6IHN0cmluZyxcclxuICBvcmlnaW5hbENvbXBhbnk6IHN0cmluZyxcclxuICBwbGFubmluZ051bWJlcjogc3RyaW5nLFxyXG4gIGpvdXJuZXlOdW1iZXI6IG51bWJlcixcclxuICBsaW5lTnVtYmVyIDogc3RyaW5nLFxyXG4gIHRpbWVzdGFtcDogbnVtYmVyLFxyXG4gIHZlaGljbGVOdW1iZXI6IG51bWJlcixcclxuICBwb3NpdGlvbjogW251bWJlciwgbnVtYmVyXSxcclxuICBzdGF0dXM6IHZlaGljbGVTdGF0ZSxcclxuICBjcmVhdGVkQXQ6IG51bWJlcixcclxuICB1cGRhdGVkQXQ6IG51bWJlcixcclxuICBwdW5jdHVhbGl0eTogQXJyYXk8bnVtYmVyPixcclxuICB1cGRhdGVkVGltZXM6IEFycmF5PG51bWJlcj5cclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJjaGlsZF9wcm9jZXNzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJjb3JzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJkb3RlbnZcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImV4cHJlc3NcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImZhc3QteG1sLXBhcnNlclwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZnNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImh0dHBzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJtb25nb29zZVwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwicGF0aFwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwic29ja2V0LmlvXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzcGxpdFwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwic3RyZWFtLXRvLW1vbmdvLWRiXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJ6ZXJvbXFcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInpsaWJcIik7OyIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBzdGFydHVwXG4vLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbi8vIFRoaXMgZW50cnkgbW9kdWxlIGlzIHJlZmVyZW5jZWQgYnkgb3RoZXIgbW9kdWxlcyBzbyBpdCBjYW4ndCBiZSBpbmxpbmVkXG52YXIgX193ZWJwYWNrX2V4cG9ydHNfXyA9IF9fd2VicGFja19yZXF1aXJlX18oXCIuL3NyYy9tYWluLnRzXCIpO1xuIl0sInNvdXJjZVJvb3QiOiIifQ==