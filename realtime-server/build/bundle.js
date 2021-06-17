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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9idXNsb2dpYy50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9jb252ZXJ0ZXIudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvZGF0YWJhc2UudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvbWFpbi50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9yZWFsdGltZS50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9zb2NrZXQudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvdHlwZXMvVmVoaWNsZURhdGEudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJjaGlsZF9wcm9jZXNzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJjb3JzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJkb3RlbnZcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcImV4cHJlc3NcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcImZhc3QteG1sLXBhcnNlclwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiZnNcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcImh0dHBzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJtb25nb29zZVwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwicGF0aFwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwic29ja2V0LmlvXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJzcGxpdFwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwic3RyZWFtLXRvLW1vbmdvLWRiXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJ6ZXJvbXFcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcInpsaWJcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci93ZWJwYWNrL3N0YXJ0dXAiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxtR0FBZ0U7QUFDaEUsdURBQStCO0FBQy9CLDZEQUF5QjtBQUd6QixrRkFBcUM7QUFHckMsTUFBYSxRQUFRO0lBSW5CLFlBQVksUUFBUSxFQUFFLFNBQW1CLEtBQUs7UUFDNUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFFekIsSUFBRyxNQUFNO1lBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFFTyxLQUFLLENBQUMsVUFBVTtRQUN0QixNQUFNLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUV6QixXQUFXLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDckIsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDM0IsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVEOzs7T0FHRztJQUNLLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBMkI7UUFHcEQsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEdB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Q0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUMvRCxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQzVDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUNsQixFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQzVDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU87WUFDdkIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUM1QyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU87WUFDbEIsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQzlDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUMxQixFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU87WUFDbEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVuQixNQUFNLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDMUMsTUFBTSxTQUFTLEdBQUcsUUFBUSxHQUFHLENBQUMsSUFB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bUM7Ozs7Ozs7Ozs7QUNBQSxnRDs7Ozs7Ozs7OztBQ0FBLG9DOzs7Ozs7Ozs7O0FDQUEsa0M7Ozs7OztVQ0FBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7VUN0QkE7VUFDQTtVQUNBO1VBQ0EiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tIFwiLi9kYXRhYmFzZVwiO1xyXG5pbXBvcnQgeyBWZWhpY2xlRGF0YSwgdmVoaWNsZVN0YXRlIH0gZnJvbSBcIi4vdHlwZXMvVmVoaWNsZURhdGFcIjtcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCB7IFRyaXAgfSBmcm9tIFwiLi90eXBlcy9UcmlwXCI7XHJcbmltcG9ydCB7IEFwaVRyaXAgfSBmcm9tIFwiLi90eXBlcy9BcGlUcmlwXCI7XHJcbmltcG9ydCB7IGV4ZWMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcclxuaW1wb3J0IHsgUm91dGUgfSBmcm9tIFwiLi90eXBlcy9Sb3V0ZVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEJ1c0xvZ2ljIHtcclxuXHJcbiAgcHJpdmF0ZSBkYXRhYmFzZSA6IERhdGFiYXNlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihkYXRhYmFzZSwgZG9Jbml0IDogYm9vbGVhbiA9IGZhbHNlKSB7XHJcbiAgICB0aGlzLmRhdGFiYXNlID0gZGF0YWJhc2U7XHJcblxyXG4gICAgaWYoZG9Jbml0KSB0aGlzLkluaXRpYWxpemUoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgSW5pdGlhbGl6ZSgpIHtcclxuICAgIGF3YWl0IHRoaXMuQ2xlYXJCdXNzZXMoKTtcclxuXHJcbiAgICBzZXRJbnRlcnZhbChhc3luYyAoKSA9PiB7XHJcbiAgICAgIGF3YWl0IHRoaXMuQ2xlYXJCdXNzZXMoKTtcclxuICAgIH0sIHBhcnNlSW50KHByb2Nlc3MuZW52LkFQUF9DTEVBTlVQX0RFTEFZKSlcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFVwZGF0ZXMgb3IgY3JlYXRlcyBhIG5ldyBidXMgZGVwZW5kaW5nIG9uIGlmIGl0IGFscmVhZHkgZXhpc3RzIG9yIG5vdC5cclxuICAgKiBAcGFyYW0gYnVzc2VzIFRoZSBsaXN0IG9mIGJ1c3NlcyB0byB1cGRhdGUuXHJcbiAgICovXHJcbiAgIHB1YmxpYyBhc3luYyBVcGRhdGVCdXNzZXMoYnVzc2VzIDogQXJyYXk8VmVoaWNsZURhdGE+KSA6IFByb21pc2U8dm9pZD4ge1xyXG5cclxuXHJcbiAgICBhd2FpdCBQcm9taXNlLmFsbChidXNzZXMubWFwKGFzeW5jIChidXMpID0+IHtcclxuICAgICAgY29uc3QgZm91bmRUcmlwIDogVHJpcCA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0VHJpcChidXMuam91cm5leU51bWJlciwgYnVzLnBsYW5uaW5nTnVtYmVyLCBidXMuY29tcGFueSk7XHJcbiAgICAgIGNvbnN0IGZvdW5kUm91dGUgOiBSb3V0ZSA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0Um91dGUoZm91bmRUcmlwLnJvdXRlSWQpO1xyXG5cclxuICAgICAgaWYoZm91bmRSb3V0ZS5jb21wYW55ICE9PSB1bmRlZmluZWQpIGJ1cy5jb21wYW55ID0gZm91bmRSb3V0ZS5jb21wYW55O1xyXG4gICAgICBpZihmb3VuZFJvdXRlICE9PSB1bmRlZmluZWQpIGJ1cy5saW5lTnVtYmVyID0gZm91bmRSb3V0ZS5yb3V0ZVNob3J0TmFtZTtcclxuXHJcbiAgICAgIGNvbnN0IGZvdW5kVmVoaWNsZSA6IFZlaGljbGVEYXRhID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRWZWhpY2xlKGJ1cy52ZWhpY2xlTnVtYmVyLCBidXMuY29tcGFueSk7XHJcbiAgICAgICAgICBcclxuICAgICAgaWYoT2JqZWN0LmtleXMoZm91bmRWZWhpY2xlKS5sZW5ndGggIT09IDApIHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fVVBEQVRFX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBVcGRhdGluZyB2ZWhpY2xlICR7YnVzLnZlaGljbGVOdW1iZXJ9IGZyb20gJHtidXMuY29tcGFueX1gKVxyXG4gICAgICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuVXBkYXRlVmVoaWNsZShmb3VuZFZlaGljbGUsIGJ1cywgdHJ1ZSlcclxuICAgICAgICBcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ1JFQVRFX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBjcmVhdGluZyBuZXcgdmVoaWNsZSAke2J1cy52ZWhpY2xlTnVtYmVyfSBmcm9tICR7YnVzLmNvbXBhbnl9YClcclxuICAgICAgICBpZihidXMuc3RhdHVzID09PSB2ZWhpY2xlU3RhdGUuT05ST1VURSkgYXdhaXQgdGhpcy5kYXRhYmFzZS5BZGRWZWhpY2xlKGJ1cywgdHJ1ZSlcclxuICAgICAgfVxyXG4gICAgfSkpXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDbGVhcnMgYnVzc2VzIGV2ZXJ5IFggYW1vdW50IG9mIG1pbnV0ZXMgc3BlY2lmaWVkIGluIC5lbnYgZmlsZS5cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgQ2xlYXJCdXNzZXMoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NMRUFOVVBfTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJDbGVhcmluZyBidXNzZXNcIilcclxuICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnN0IGZpZnRlZW5NaW51dGVzQWdvID0gY3VycmVudFRpbWUgLSAoNjAgKiBwYXJzZUludChwcm9jZXNzLmVudi5BUFBfQ0xFQU5VUF9WRUhJQ0xFX0FHRV9SRVFVSVJFTUVOVCkgKiAxMDAwKTtcclxuICAgIGNvbnN0IFJlbW92ZWRWZWhpY2xlcyA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuUmVtb3ZlVmVoaWNsZXNXaGVyZSh7IHVwZGF0ZWRBdDogeyAkbHQ6IGZpZnRlZW5NaW51dGVzQWdvIH0gfSwgcHJvY2Vzcy5lbnYuQVBQX0RPX0NMRUFOVVBfTE9HR0lORyA9PSBcInRydWVcIik7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgXCJLb3BwZWx2bGFrIDcgYW5kIDggdHVyYm9cIiBmaWxlcyB0byBkYXRhYmFzZS5cclxuICAgKi9cclxuICBwdWJsaWMgSW5pdEtWNzgoKSA6IHZvaWQge1xyXG4gICAgdGhpcy5Jbml0VHJpcHNOZXcoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSB0cmlwcyBmcm9tIHRoZSBzcGVjaWZpZWQgVVJMIGluIHRoZSAuZW52ICwgb3IgXCIuLi9HVEZTL2V4dHJhY3RlZC90cmlwcy5qc29uXCIgdG8gdGhlIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gIHByaXZhdGUgSW5pdFRyaXBzTmV3KCkgOiB2b2lkIHsgXHJcbiAgICBjb25zdCB0cmlwc1BhdGggPSByZXNvbHZlKFwiR1RGU1xcXFxleHRyYWN0ZWRcXFxcdHJpcHMudHh0Lmpzb25cIik7XHJcbiAgICBjb25zdCBvdXRwdXRQYXRoID0gcmVzb2x2ZShcIkdURlNcXFxcY29udmVydGVkXFxcXHRyaXBzLmpzb25cIik7XHJcbiAgICBmcy5yZWFkRmlsZSh0cmlwc1BhdGgsICd1dGY4JywgYXN5bmMoZXJyb3IsIGRhdGEpID0+IHsgXHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgaWYoZGF0YSAmJiBwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkxvYWRlZCB0cmlwcyBmaWxlIGludG8gbWVtb3J5LlwiKTtcclxuICAgICAgZGF0YSA9IGRhdGEudHJpbSgpO1xyXG4gICAgICBjb25zdCBsaW5lcyA9IGRhdGEuc3BsaXQoXCJcXG5cIik7XHJcbiAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3V0cHV0UGF0aClcclxuICAgICAgY29uc3QgY29udmVydGVkVHJpcHMgPSBbXTtcclxuXHJcbiAgICAgIGZvcihsZXQgbGluZSBvZiBsaW5lcykge1xyXG4gICAgICAgIGNvbnN0IHRyaXBKU09OIDogQXBpVHJpcCA9IEpTT04ucGFyc2UobGluZSk7XHJcbiAgICAgICAgY29uc3QgcmVhbFRpbWVUcmlwSWQgPSB0cmlwSlNPTi5yZWFsdGltZV90cmlwX2lkLnNwbGl0KFwiOlwiKTtcclxuICAgICAgICBjb25zdCBjb21wYW55ID0gcmVhbFRpbWVUcmlwSWRbMF07XHJcbiAgICAgICAgY29uc3QgcGxhbm5pbmdOdW1iZXIgPSByZWFsVGltZVRyaXBJZFsxXTtcclxuICAgICAgICBjb25zdCB0cmlwTnVtYmVyID0gcmVhbFRpbWVUcmlwSWRbMl07XHJcblxyXG4gICAgICAgIGNvbnN0IHRyaXAgOiBUcmlwID0ge1xyXG4gICAgICAgICAgY29tcGFueTogY29tcGFueSxcclxuICAgICAgICAgIHJvdXRlSWQ6IHBhcnNlSW50KHRyaXBKU09OLnJvdXRlX2lkKSxcclxuICAgICAgICAgIHNlcnZpY2VJZDogcGFyc2VJbnQodHJpcEpTT04uc2VydmljZV9pZCksXHJcbiAgICAgICAgICB0cmlwSWQ6IHBhcnNlSW50KHRyaXBKU09OLnRyaXBfaWQpLFxyXG4gICAgICAgICAgdHJpcE51bWJlcjogcGFyc2VJbnQodHJpcE51bWJlciksXHJcbiAgICAgICAgICB0cmlwUGxhbm5pbmdOdW1iZXI6IHBsYW5uaW5nTnVtYmVyLFxyXG4gICAgICAgICAgdHJpcEhlYWRzaWduOiB0cmlwSlNPTi50cmlwX2hlYWRzaWduLFxyXG4gICAgICAgICAgdHJpcE5hbWU6IHRyaXBKU09OLnRyaXBfbG9uZ19uYW1lLFxyXG4gICAgICAgICAgZGlyZWN0aW9uSWQ6IHBhcnNlSW50KHRyaXBKU09OLmRpcmVjdGlvbl9pZCksXHJcbiAgICAgICAgICBzaGFwZUlkOiBwYXJzZUludCh0cmlwSlNPTi5zaGFwZV9pZCksXHJcbiAgICAgICAgICB3aGVlbGNoYWlyQWNjZXNzaWJsZTogcGFyc2VJbnQodHJpcEpTT04ud2hlZWxjaGFpcl9hY2Nlc3NpYmxlKVxyXG4gICAgICAgIH1cclxuICAgICAgICB3cml0ZVN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh0cmlwKSArIFwiXFxuXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB3cml0ZVN0cmVhbS5lbmQoKCkgPT4ge1xyXG4gICAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRmluaXNoZWQgd3JpdGluZyB0cmlwcyBmaWxlLCBpbXBvcnRpbmcgdG8gZGF0YWJhc2UuXCIpO1xyXG4gICAgICAgIHRoaXMuSW1wb3J0VHJpcHMoKTtcclxuICAgICAgfSlcclxuICAgIH0pO1xyXG4gICBcclxuICAgIFxyXG4gIH1cclxuXHJcbiAgYXN5bmMgSW1wb3J0VHJpcHMoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5kYXRhYmFzZS5Ecm9wVHJpcHNDb2xsZWN0aW9uKCk7XHJcblxyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJJbXBvcnRpbmcgdHJpcHMgdG8gbW9uZ29kYlwiKTtcclxuXHJcbiAgICBhd2FpdCBleGVjKFwibW9uZ29pbXBvcnQgLS1kYiB0YWlvdmEgLS1jb2xsZWN0aW9uIHRyaXBzIC0tZmlsZSAuXFxcXEdURlNcXFxcY29udmVydGVkXFxcXHRyaXBzLmpzb25cIiwgKGVycm9yLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzdGRlcnIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgc3RkZXJyOiAke3N0ZGVycn1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBzdGRvdXQ6ICR7c3Rkb3V0fWApO1xyXG4gICAgfSk7XHJcblxyXG4gIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBWZWhpY2xlRGF0YSwgdmVoaWNsZVN0YXRlIH0gZnJvbSAnLi90eXBlcy9WZWhpY2xlRGF0YSdcclxuaW1wb3J0IHsgVmVoaWNsZUFwaURhdGEsIFZlaGljbGVQb3NEYXRhLCBWZWhpY2xlQXBpRGF0YUtlb2xpcyB9IGZyb20gJy4vdHlwZXMvVmVoaWNsZUFwaURhdGEnXHJcbmV4cG9ydCBjbGFzcyBDb252ZXJ0ZXIge1xyXG5cclxuICBkZWNvZGUoZGF0YTogVmVoaWNsZUFwaURhdGEsIGlzS2VvbGlzIDogYm9vbGVhbiA9IGZhbHNlKSA6IGFueSB7XHJcbiAgICBcclxuICAgIGxldCBuZXdEYXRhIDogYW55ID0gZGF0YTtcclxuXHJcbiAgICBpZihKU09OLnN0cmluZ2lmeShkYXRhKS5pbmNsdWRlcygndG1pODonKSlcclxuICAgICAgbmV3RGF0YSA9IHRoaXMucmVtb3ZlVG1pOChkYXRhKTsgXHJcblxyXG4gICAgaWYoIWlzS2VvbGlzKVxyXG4gICAgICByZXR1cm4gdGhpcy5jb252ZXJ0S1Y2VG9Kc29uKG5ld0RhdGEpO1xyXG5cclxuICAgIHJldHVybiB0aGlzLmNvbnZlcnRLVjZUb0pzb25LZW9saXMobmV3RGF0YSk7XHJcbiAgfSBcclxuXHJcbiAgY29udmVydEtWNlRvSnNvbktlb2xpcyhkYXRhOiBhbnkpIDogYW55IHtcclxuICAgIGNvbnN0IGFycmF5IDogQXJyYXk8VmVoaWNsZURhdGE+ID0gW107XHJcbiAgICBjb25zdCBrdjZwb3NpbmZvID0gZGF0YS5WVl9UTV9QVVNILktWNnBvc2luZm87XHJcbiAgICBcclxuICAgIGlmKGt2NnBvc2luZm8ubGVuZ3RoICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAga3Y2cG9zaW5mby5mb3JFYWNoKHN0YXR1c1dpdGhCdXMgPT4ge1xyXG4gICAgICAgIGNvbnN0IHZlaGljbGVQb3NEYXRhIDogVmVoaWNsZVBvc0RhdGEgPSBzdGF0dXNXaXRoQnVzW09iamVjdC5rZXlzKHN0YXR1c1dpdGhCdXMpWzBdXTtcclxuICAgICAgICAgIGFycmF5LnB1c2goe1xyXG4gICAgICAgICAgICBjb21wYW55OiB2ZWhpY2xlUG9zRGF0YS5kYXRhb3duZXJjb2RlLFxyXG4gICAgICAgICAgICBwbGFubmluZ051bWJlcjogdmVoaWNsZVBvc0RhdGEubGluZXBsYW5uaW5nbnVtYmVyLnRvU3RyaW5nKCksXHJcbiAgICAgICAgICAgIGpvdXJuZXlOdW1iZXI6IHZlaGljbGVQb3NEYXRhLmpvdXJuZXludW1iZXIsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5wYXJzZSh2ZWhpY2xlUG9zRGF0YS50aW1lc3RhbXApLFxyXG4gICAgICAgICAgICB2ZWhpY2xlTnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS52ZWhpY2xlbnVtYmVyLFxyXG4gICAgICAgICAgICBsaW5lTnVtYmVyOiBcIk9uYmVrZW5kXCIsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnJkVG9MYXRMb25nKHZlaGljbGVQb3NEYXRhWydyZC14J10sIHZlaGljbGVQb3NEYXRhWydyZC15J10pLFxyXG4gICAgICAgICAgICBwdW5jdHVhbGl0eTogW3ZlaGljbGVQb3NEYXRhLnB1bmN0dWFsaXR5XSxcclxuICAgICAgICAgICAgc3RhdHVzOiB2ZWhpY2xlU3RhdGVbT2JqZWN0LmtleXMoc3RhdHVzV2l0aEJ1cylbMF1dLFxyXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgIHVwZGF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgICAgdXBkYXRlZFRpbWVzOiBbRGF0ZS5ub3coKV1cclxuICAgICAgICAgIH0pXHJcbiAgICAgIH0pXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zdCB2ZWhpY2xlUG9zRGF0YSA6IFZlaGljbGVQb3NEYXRhID0ga3Y2cG9zaW5mb1tPYmplY3Qua2V5cyhrdjZwb3NpbmZvKVswXV07XHJcbiAgICAgIGFycmF5LnB1c2goe1xyXG4gICAgICAgIGNvbXBhbnk6IHZlaGljbGVQb3NEYXRhLmRhdGFvd25lcmNvZGUsXHJcbiAgICAgICAgcGxhbm5pbmdOdW1iZXI6IHZlaGljbGVQb3NEYXRhLmxpbmVwbGFubmluZ251bWJlci50b1N0cmluZygpLFxyXG4gICAgICAgIGpvdXJuZXlOdW1iZXI6IHZlaGljbGVQb3NEYXRhLmpvdXJuZXludW1iZXIsXHJcbiAgICAgICAgdGltZXN0YW1wOiBEYXRlLnBhcnNlKHZlaGljbGVQb3NEYXRhLnRpbWVzdGFtcCksXHJcbiAgICAgICAgdmVoaWNsZU51bWJlcjogdmVoaWNsZVBvc0RhdGEudmVoaWNsZW51bWJlcixcclxuICAgICAgICBsaW5lTnVtYmVyOiBcIk9uYmVrZW5kXCIsXHJcbiAgICAgICAgcG9zaXRpb246IHRoaXMucmRUb0xhdExvbmcodmVoaWNsZVBvc0RhdGFbJ3JkLXgnXSwgdmVoaWNsZVBvc0RhdGFbJ3JkLXknXSksXHJcbiAgICAgICAgcHVuY3R1YWxpdHk6IFt2ZWhpY2xlUG9zRGF0YS5wdW5jdHVhbGl0eV0sXHJcbiAgICAgICAgc3RhdHVzOiB2ZWhpY2xlU3RhdGVbT2JqZWN0LmtleXMoa3Y2cG9zaW5mbylbMF1dLFxyXG4gICAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICB1cGRhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgdXBkYXRlZFRpbWVzOiBbRGF0ZS5ub3coKV1cclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIFxyXG5cclxuICAgIHJldHVybiBhcnJheTtcclxuICB9XHJcblxyXG4gIGNvbnZlcnRLVjZUb0pzb24gKGRhdGEgOiBWZWhpY2xlQXBpRGF0YSkgOiBhbnkge1xyXG5cclxuICAgIGxldCBrdjZwb3NpbmZvID0gZGF0YS5WVl9UTV9QVVNILktWNnBvc2luZm87XHJcbiAgICBjb25zdCBhcnJheSA6IEFycmF5PFZlaGljbGVEYXRhPiA9IFtdO1xyXG5cclxuICAgIGlmKGt2NnBvc2luZm8gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIE9iamVjdC5lbnRyaWVzKGt2NnBvc2luZm8pLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xyXG4gICAgICAgIC8vSWYgdHJ1ZSwgdGhlIHJlY2VpdmVkIGRhdGEgaXMganVzdCBvbmUgb2JqZWN0IGluc3RlYWQgb2YgYXJyYXkuIFR5cGVvZiBWZWhpY2xlUG9zRGF0YVxyXG4gICAgICAgIGlmKHZhbHVlLmhhc093blByb3BlcnR5KFwiZGF0YW93bmVyY29kZVwiKSkgeyBcclxuXHJcbiAgICAgICAgICBjb25zdCB2ZWhpY2xlUG9zRGF0YSA6IFZlaGljbGVQb3NEYXRhID0ga3Y2cG9zaW5mb1trZXldO1xyXG4gICAgICAgICAgaWYoISghcGFyc2VJbnQodmVoaWNsZVBvc0RhdGFbJ3JkLXgnXSArIFwiXCIpIHx8ICFwYXJzZUludCh2ZWhpY2xlUG9zRGF0YVsncmQteSddICsgXCJcIikpKSB7XHJcbiAgICAgICAgICAgIGFycmF5LnB1c2goXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgY29tcGFueTogdmVoaWNsZVBvc0RhdGEuZGF0YW93bmVyY29kZSxcclxuICAgICAgICAgICAgICAgIHBsYW5uaW5nTnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS5saW5lcGxhbm5pbmdudW1iZXIudG9TdHJpbmcoKSxcclxuICAgICAgICAgICAgICAgIGpvdXJuZXlOdW1iZXI6IHZlaGljbGVQb3NEYXRhLmpvdXJuZXludW1iZXIsXHJcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUucGFyc2UodmVoaWNsZVBvc0RhdGEudGltZXN0YW1wKSxcclxuICAgICAgICAgICAgICAgIHZlaGljbGVOdW1iZXI6IHZlaGljbGVQb3NEYXRhLnZlaGljbGVudW1iZXIsXHJcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBcIk9uYmVrZW5kXCIsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5yZFRvTGF0TG9uZyh2ZWhpY2xlUG9zRGF0YVsncmQteCddLCB2ZWhpY2xlUG9zRGF0YVsncmQteSddKSxcclxuICAgICAgICAgICAgICAgIHB1bmN0dWFsaXR5OiBbdmVoaWNsZVBvc0RhdGEucHVuY3R1YWxpdHldLFxyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiB2ZWhpY2xlU3RhdGVba2V5XSxcclxuICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgICAgICAgIHVwZGF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgICAgICAgIHVwZGF0ZWRUaW1lczogW0RhdGUubm93KCldXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICB9ICBcclxuICAgICAgICAvL0lmIHRoaXMgaXMgdHJ1ZSwgdGhlIHJlY2VpdmVkIGRhdGEgaXMgYW4gYXJyYXkgb2Ygb2JqZWN0cy4gIFR5cGVvZiBWZWhpY2xlUG9zRGF0YVtdXHJcbiAgICAgICAgfSBlbHNlIGlmKHZhbHVlW09iamVjdC5rZXlzKHZhbHVlKVswXV0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgZm9yKGxldCBqID0wOyBqIDwga3Y2cG9zaW5mb1trZXldLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHZlaGljbGVQb3NEYXRhIDogVmVoaWNsZVBvc0RhdGEgPSBrdjZwb3NpbmZvW2tleV1bal07XHJcbiAgICAgICAgICAgIGlmKCFwYXJzZUludCh2ZWhpY2xlUG9zRGF0YVsncmQteCddICsgXCJcIikgfHwgIXBhcnNlSW50KHZlaGljbGVQb3NEYXRhWydyZC15J10gKyBcIlwiKSkgY29udGludWU7IFxyXG4gICAgICAgICAgICBhcnJheS5wdXNoKFxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGNvbXBhbnk6IHZlaGljbGVQb3NEYXRhLmRhdGFvd25lcmNvZGUsXHJcbiAgICAgICAgICAgICAgICBwbGFubmluZ051bWJlcjogdmVoaWNsZVBvc0RhdGEubGluZXBsYW5uaW5nbnVtYmVyLnRvU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICBqb3VybmV5TnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS5qb3VybmV5bnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLnBhcnNlKHZlaGljbGVQb3NEYXRhLnRpbWVzdGFtcCksXHJcbiAgICAgICAgICAgICAgICB2ZWhpY2xlTnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS52ZWhpY2xlbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogXCJPbmJla2VuZFwiLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMucmRUb0xhdExvbmcodmVoaWNsZVBvc0RhdGFbJ3JkLXgnXSwgdmVoaWNsZVBvc0RhdGFbJ3JkLXknXSksXHJcbiAgICAgICAgICAgICAgICBwdW5jdHVhbGl0eTogW3ZlaGljbGVQb3NEYXRhLnB1bmN0dWFsaXR5XSxcclxuICAgICAgICAgICAgICAgIHN0YXR1czogdmVoaWNsZVN0YXRlW2tleV0sXHJcbiAgICAgICAgICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgICAgICB1cGRhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgICAgICB1cGRhdGVkVGltZXM6IFtEYXRlLm5vdygpXVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhcnJheTtcclxuXHJcbiAgfVxyXG5cclxuICByZW1vdmVUbWk4IChkYXRhIDogVmVoaWNsZUFwaURhdGEpIDogVmVoaWNsZUFwaURhdGEge1xyXG4gICAgbGV0IGRhdGFTdHJpbmcgOiBzdHJpbmcgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcclxuICAgIGRhdGFTdHJpbmcgPSBkYXRhU3RyaW5nLnJlcGxhY2UoL3RtaTg6L2csIFwiXCIpO1xyXG4gICAgcmV0dXJuIEpTT04ucGFyc2UoZGF0YVN0cmluZyk7XHJcbiAgfVxyXG5cclxuICByZFRvTGF0TG9uZyAoeCwgeSkgOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgIGlmKHggPT09IHVuZGVmaW5lZCB8fCB5ID09PSB1bmRlZmluZWQpIHJldHVybiBbMCwgMF07XHJcblxyXG4gICAgY29uc3QgZFggPSAoeCAtIDE1NTAwMCkgKiBNYXRoLnBvdygxMCwgLTUpO1xyXG4gICAgY29uc3QgZFkgPSAoeSAtIDQ2MzAwMCkgKiBNYXRoLnBvdygxMCwgLTUpO1xyXG4gICAgY29uc3QgU29tTiA9ICgzMjM1LjY1Mzg5ICogZFkpICsgKC0zMi41ODI5NyAqIE1hdGgucG93KGRYLCAyKSkgKyAoLTAuMjQ3NSAqXHJcbiAgICAgIE1hdGgucG93KGRZLCAyKSkgKyAoLTAuODQ5NzggKiBNYXRoLnBvdyhkWCwgMikgKlxyXG4gICAgICBkWSkgKyAoLTAuMDY1NSAqIE1hdGgucG93KGRZLCAzKSkgKyAoLTAuMDE3MDkgKlxyXG4gICAgICBNYXRoLnBvdyhkWCwgMikgKiBNYXRoLnBvdyhkWSwgMikpICsgKC0wLjAwNzM4ICpcclxuICAgICAgZFgpICsgKDAuMDA1MyAqIE1hdGgucG93KGRYLCA0KSkgKyAoLTAuMDAwMzkgKlxyXG4gICAgICBNYXRoLnBvdyhkWCwgMikgKiBNYXRoLnBvdyhkWSwgMykpICsgKDAuMDAwMzMgKiBNYXRoLnBvdyhcclxuICAgICAgZFgsIDQpICogZFkpICsgKC0wLjAwMDEyICpcclxuICAgICAgZFggKiBkWSk7XHJcbiAgICBjb25zdCBTb21FID0gKDUyNjAuNTI5MTYgKiBkWCkgKyAoMTA1Ljk0Njg0ICogZFggKiBkWSkgKyAoMi40NTY1NiAqXHJcbiAgICAgIGRYICogTWF0aC5wb3coZFksIDIpKSArICgtMC44MTg4NSAqIE1hdGgucG93KFxyXG4gICAgICBkWCwgMykpICsgKDAuMDU1OTQgKlxyXG4gICAgICBkWCAqIE1hdGgucG93KGRZLCAzKSkgKyAoLTAuMDU2MDcgKiBNYXRoLnBvdyhcclxuICAgICAgZFgsIDMpICogZFkpICsgKDAuMDExOTkgKlxyXG4gICAgICBkWSkgKyAoLTAuMDAyNTYgKiBNYXRoLnBvdyhkWCwgMykgKiBNYXRoLnBvdyhcclxuICAgICAgZFksIDIpKSArICgwLjAwMTI4ICpcclxuICAgICAgZFggKiBNYXRoLnBvdyhkWSwgNCkpICsgKDAuMDAwMjIgKiBNYXRoLnBvdyhkWSxcclxuICAgICAgMikpICsgKC0wLjAwMDIyICogTWF0aC5wb3coXHJcbiAgICAgIGRYLCAyKSkgKyAoMC4wMDAyNiAqXHJcbiAgICAgIE1hdGgucG93KGRYLCA1KSk7XHJcbiAgICBcclxuICAgIGNvbnN0IExhdGl0dWRlID0gNTIuMTU1MTcgKyAoU29tTiAvIDM2MDApO1xyXG4gICAgY29uc3QgTG9uZ2l0dWRlID0gNS4zODcyMDYgKyAoU29tRSAvIDM2MDApO1xyXG4gICAgXHJcbiAgICByZXR1cm4gW0xvbmdpdHVkZSwgTGF0aXR1ZGVdXHJcbiAgfVxyXG5cclxufSIsImltcG9ydCB7IENvbm5lY3Rpb24sIE1vZGVsLCBNb25nb29zZSwgRmlsdGVyUXVlcnksIFNjaGVtYSB9IGZyb20gJ21vbmdvb3NlJztcclxuaW1wb3J0IHsgVHJpcCB9IGZyb20gJy4vdHlwZXMvVHJpcCc7XHJcbmltcG9ydCB7IFZlaGljbGVEYXRhLCB2ZWhpY2xlU3RhdGUgfSBmcm9tICcuL3R5cGVzL1ZlaGljbGVEYXRhJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IFJvdXRlIH0gZnJvbSAnLi90eXBlcy9Sb3V0ZSc7XHJcbmNvbnN0IHN0cmVhbVRvTW9uZ29EQiA9IHJlcXVpcmUoJ3N0cmVhbS10by1tb25nby1kYicpLnN0cmVhbVRvTW9uZ29EQjtcclxuY29uc3Qgc3BsaXQgPSByZXF1aXJlKCdzcGxpdCcpO1xyXG5leHBvcnQgY2xhc3MgRGF0YWJhc2Uge1xyXG4gIFxyXG4gIHByaXZhdGUgc3RhdGljIGluc3RhbmNlIDogRGF0YWJhc2U7XHJcbiAgXHJcbiAgcHJpdmF0ZSBkYiA6IENvbm5lY3Rpb247XHJcbiAgcHJpdmF0ZSBtb25nb29zZSA6IE1vbmdvb3NlO1xyXG4gIHByaXZhdGUgdmVoaWNsZVNjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIHRyaXBzU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgcm91dGVzU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgdmVoaWNsZU1vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgdHJpcE1vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgcm91dGVzTW9kZWwgOiB0eXBlb2YgTW9kZWw7XHJcbiAgcHJpdmF0ZSBvdXRwdXREQkNvbmZpZztcclxuXHJcbiAgcHVibGljIHN0YXRpYyBnZXRJbnN0YW5jZSgpOiBEYXRhYmFzZSB7XHJcbiAgICBpZighRGF0YWJhc2UuaW5zdGFuY2UpXHJcbiAgICAgIERhdGFiYXNlLmluc3RhbmNlID0gbmV3IERhdGFiYXNlKCk7XHJcblxyXG4gICAgcmV0dXJuIERhdGFiYXNlLmluc3RhbmNlO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEluaXQoKSB7XHJcbiAgICBjb25zdCB1cmwgOiBzdHJpbmcgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkw7XHJcbiAgICBjb25zdCBuYW1lIDogc3RyaW5nID0gcHJvY2Vzcy5lbnYuREFUQUJBU0VfTkFNRTtcclxuXHJcbiAgICB0aGlzLm1vbmdvb3NlID0gbmV3IE1vbmdvb3NlKCk7XHJcbiAgICBcclxuICAgIHRoaXMubW9uZ29vc2Uuc2V0KCd1c2VGaW5kQW5kTW9kaWZ5JywgZmFsc2UpXHJcblxyXG4gICAgaWYoIXVybCAmJiAhbmFtZSkgdGhyb3cgKGBJbnZhbGlkIFVSTCBvciBuYW1lIGdpdmVuLCByZWNlaXZlZDogXFxuIE5hbWU6ICR7bmFtZX0gXFxuIFVSTDogJHt1cmx9YClcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgQ29ubmVjdGluZyB0byBkYXRhYmFzZSB3aXRoIG5hbWU6ICR7bmFtZX0gYXQgdXJsOiAke3VybH1gKVxyXG4gICAgdGhpcy5tb25nb29zZS5jb25uZWN0KGAke3VybH0vJHtuYW1lfWAsIHtcclxuICAgICAgdXNlTmV3VXJsUGFyc2VyOiB0cnVlLFxyXG4gICAgICB1c2VVbmlmaWVkVG9wb2xvZ3k6IHRydWUsXHJcbiAgICAgIHBvb2xTaXplOiAxMjBcclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy5kYiA9IHRoaXMubW9uZ29vc2UuY29ubmVjdGlvbjtcclxuXHJcbiAgICB0aGlzLm91dHB1dERCQ29uZmlnID0geyBkYlVSTCA6IGAke3VybH0vJHtuYW1lfWAsIGNvbGxlY3Rpb24gOiAndHJpcHMnIH07XHJcblxyXG4gICAgdGhpcy5kYi5vbignZXJyb3InLCBlcnJvciA9PiB7XHJcbiAgICAgIHRocm93IG5ldyBlcnJvcihgRXJyb3IgY29ubmVjdGluZyB0byBkYXRhYmFzZS4gJHtlcnJvcn1gKTtcclxuICAgIH0pXHJcblxyXG4gICAgYXdhaXQgdGhpcy5EYXRhYmFzZUxpc3RlbmVyKCk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgR2V0RGF0YWJhc2UoKSA6IENvbm5lY3Rpb24ge1xyXG4gICAgcmV0dXJuIHRoaXMuZGI7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgRGF0YWJhc2VMaXN0ZW5lciAoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XHJcbiAgICAgICAgdGhpcy5kYi5vbmNlKFwib3BlblwiLCAoKSA9PiB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvbm5lY3Rpb24gdG8gZGF0YWJhc2UgZXN0YWJsaXNoZWQuXCIpXHJcblxyXG4gICAgICAgICAgdGhpcy52ZWhpY2xlU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgY29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICBwbGFubmluZ051bWJlcjogU3RyaW5nLFxyXG4gICAgICAgICAgICBqb3VybmV5TnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogTnVtYmVyLFxyXG4gICAgICAgICAgICB2ZWhpY2xlTnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBbTnVtYmVyLCBOdW1iZXJdLFxyXG4gICAgICAgICAgICBzdGF0dXM6IFN0cmluZyxcclxuICAgICAgICAgICAgbGluZU51bWJlcjogU3RyaW5nLFxyXG4gICAgICAgICAgICBwdW5jdHVhbGl0eTogQXJyYXksXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogTnVtYmVyLFxyXG4gICAgICAgICAgICB1cGRhdGVkQXQ6IE51bWJlcixcclxuICAgICAgICAgICAgdXBkYXRlZFRpbWVzOiBBcnJheVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHRoaXMudHJpcHNTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgc2VydmljZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRyaXBJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB0cmlwTnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRyaXBQbGFubmluZ051bWJlcjogU3RyaW5nLFxyXG4gICAgICAgICAgICB0cmlwSGVhZHNpZ246IFN0cmluZyxcclxuICAgICAgICAgICAgdHJpcE5hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgZGlyZWN0aW9uSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgc2hhcGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB3aGVlbGNoYWlyQWNjZXNzaWJsZTogTnVtYmVyXHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIHRoaXMucm91dGVzU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgcm91dGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHN1YkNvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVTaG9ydE5hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVMb25nTmFtZTogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZURlc2NyaXB0aW9uOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlVHlwZTogTnVtYmVyLFxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLnRyaXBzU2NoZW1hLmluZGV4KHsgdHJpcE51bWJlcjogLTEsIHRyaXBQbGFubmluZ051bWJlcjogLTEsIGNvbXBhbnk6IC0xIH0pXHJcblxyXG4gICAgICAgICAgdGhpcy52ZWhpY2xlTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwiVmVoaWNsZVBvc2l0aW9uc1wiLCB0aGlzLnZlaGljbGVTY2hlbWEpO1xyXG4gICAgICAgICAgdGhpcy50cmlwTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwidHJpcHNcIiwgdGhpcy50cmlwc1NjaGVtYSk7XHJcbiAgICAgICAgICB0aGlzLnJvdXRlc01vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcInJvdXRlc1wiLCB0aGlzLnJvdXRlc1NjaGVtYSk7XHJcblxyXG4gICAgICAgICAgdGhpcy50cmlwTW9kZWwuY3JlYXRlSW5kZXhlcygpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZXMoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSlcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRBbGxWZWhpY2xlcyAoYXJncyA9IHt9KSA6IFByb21pc2U8QXJyYXk8VmVoaWNsZURhdGE+PiB7XHJcbiAgICByZXR1cm4gYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZCh7Li4uYXJnc30sIHsgcHVuY3R1YWxpdHk6IDAsIHVwZGF0ZWRUaW1lczogMCwgX192IDogMCB9KTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRWZWhpY2xlICh2ZWhpY2xlTnVtYmVyLCB0cmFuc3BvcnRlciwgZmlyc3RPbmx5IDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8VmVoaWNsZURhdGE+IHtcclxuICAgIHJldHVybiB7IFxyXG4gICAgICAuLi5hd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kT25lKHtcclxuICAgICAgICB2ZWhpY2xlTnVtYmVyIDogdmVoaWNsZU51bWJlcixcclxuICAgICAgICBjb21wYW55OiB0cmFuc3BvcnRlclxyXG4gICAgICB9KVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBWZWhpY2xlRXhpc3RzKHZlaGljbGVOdW1iZXIsIHRyYW5zcG9ydGVyKSA6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuR2V0VmVoaWNsZSh2ZWhpY2xlTnVtYmVyLCB0cmFuc3BvcnRlcikgIT09IG51bGw7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgVXBkYXRlVmVoaWNsZSAodmVoaWNsZVRvVXBkYXRlIDogYW55LCB1cGRhdGVkVmVoaWNsZURhdGEgOiBWZWhpY2xlRGF0YSwgcG9zaXRpb25DaGVja3MgOiBib29sZWFuID0gZmFsc2UpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZighdmVoaWNsZVRvVXBkYXRlW1wiX2RvY1wiXSkgcmV0dXJuXHJcblxyXG4gICAgdmVoaWNsZVRvVXBkYXRlID0gdmVoaWNsZVRvVXBkYXRlW1wiX2RvY1wiXTtcclxuICAgIFxyXG4gICAgLy9NZXJnZSB0aGUgcHVuY3R1YWxpdGllcyBvZiB0aGUgb2xkIHZlaGljbGVEYXRhIHdpdGggdGhlIG5ldyBvbmUuXHJcbiAgICB1cGRhdGVkVmVoaWNsZURhdGEucHVuY3R1YWxpdHkgPSB2ZWhpY2xlVG9VcGRhdGUucHVuY3R1YWxpdHkuY29uY2F0KHVwZGF0ZWRWZWhpY2xlRGF0YS5wdW5jdHVhbGl0eSk7XHJcblxyXG4gICAgLy9NZXJnZSB0aGUgdXBkYXRlZCB0aW1lcyBvZiB0aGUgb2xkIHZlaGljbGVEYXRhIHdpdGggdGhlIG5ldyBvbmUuXHJcbiAgICB1cGRhdGVkVmVoaWNsZURhdGEudXBkYXRlZFRpbWVzID0gdmVoaWNsZVRvVXBkYXRlLnVwZGF0ZWRUaW1lcy5jb25jYXQodXBkYXRlZFZlaGljbGVEYXRhLnVwZGF0ZWRUaW1lcyk7XHJcblxyXG4gICAgaWYocG9zaXRpb25DaGVja3MgJiYgdXBkYXRlZFZlaGljbGVEYXRhLnN0YXR1cyAhPT0gdmVoaWNsZVN0YXRlLk9OUk9VVEUpXHJcbiAgICAgIHVwZGF0ZWRWZWhpY2xlRGF0YS5wb3NpdGlvbiA9IHZlaGljbGVUb1VwZGF0ZS5wb3NpdGlvbjtcclxuXHJcbiAgICBpZih1cGRhdGVkVmVoaWNsZURhdGEuc3RhdHVzID09PSB2ZWhpY2xlU3RhdGUuSU5JVCB8fCB1cGRhdGVkVmVoaWNsZURhdGEuc3RhdHVzID09PSB2ZWhpY2xlU3RhdGUuRU5EKSB7XHJcbiAgICAgIHVwZGF0ZWRWZWhpY2xlRGF0YS5wdW5jdHVhbGl0eSA9IFtdO1xyXG4gICAgICB1cGRhdGVkVmVoaWNsZURhdGEudXBkYXRlZFRpbWVzID0gW107XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlZFZlaGljbGVEYXRhLnVwZGF0ZWRBdCA9IERhdGUubm93KCk7ICBcclxuXHJcbiAgICBhd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kT25lQW5kVXBkYXRlKHZlaGljbGVUb1VwZGF0ZSwgdXBkYXRlZFZlaGljbGVEYXRhKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBBZGRWZWhpY2xlICh2ZWhpY2xlIDogVmVoaWNsZURhdGEsIG9ubHlBZGRXaGlsZU9uUm91dGUgOiBib29sZWFuKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYob25seUFkZFdoaWxlT25Sb3V0ZSAmJiB2ZWhpY2xlLnN0YXR1cyAhPT0gdmVoaWNsZVN0YXRlLk9OUk9VVEUpIHJldHVybjtcclxuICAgIG5ldyB0aGlzLnZlaGljbGVNb2RlbCh7XHJcbiAgICAgIC4uLnZlaGljbGUsXHJcbiAgICAgIHB1bmN0dWFsaXR5IDogdmVoaWNsZS5wdW5jdHVhbGl0eVxyXG4gICAgfSkuc2F2ZShlcnJvciA9PiB7XHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGBTb21ldGhpbmcgd2VudCB3cm9uZyB3aGlsZSB0cnlpbmcgdG8gYWRkIHZlaGljbGU6ICR7dmVoaWNsZS52ZWhpY2xlTnVtYmVyfS4gRXJyb3I6ICR7ZXJyb3J9YClcclxuICAgIH0pXHJcbiAgfVxyXG4gIFxyXG4gIHB1YmxpYyBhc3luYyBSZW1vdmVWZWhpY2xlICh2ZWhpY2xlIDogVmVoaWNsZURhdGEpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZighdmVoaWNsZVtcIl9kb2NcIl0pIHJldHVyblxyXG5cclxuICAgIHRoaXMudmVoaWNsZU1vZGVsLmZpbmRPbmVBbmREZWxldGUodmVoaWNsZSlcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBSZW1vdmVWZWhpY2xlc1doZXJlKCBwYXJhbXMgOiBvYmplY3QsIGRvTG9nZ2luZyA6IGJvb2xlYW4gPSBmYWxzZSkgOiBQcm9taXNlPEFycmF5PFZlaGljbGVEYXRhPj4ge1xyXG4gICAgY29uc3QgcmVtb3ZlZFZlaGljbGVzIDogQXJyYXk8VmVoaWNsZURhdGE+ID0gYXdhaXQgdGhpcy5HZXRBbGxWZWhpY2xlcyhwYXJhbXMpO1xyXG4gICAgdGhpcy52ZWhpY2xlTW9kZWwuZGVsZXRlTWFueShwYXJhbXMpLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICBpZihkb0xvZ2dpbmcpIGNvbnNvbGUubG9nKGBEZWxldGVkICR7cmVzcG9uc2UuZGVsZXRlZENvdW50fSB2ZWhpY2xlcy5gKTtcclxuICAgICAgXHJcbiAgICB9KTtcclxuICAgIHJldHVybiByZW1vdmVkVmVoaWNsZXM7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0VHJpcHMocGFyYW1zIDogb2JqZWN0ID0ge30pIDogUHJvbWlzZTxBcnJheTxUcmlwPj4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMudHJpcE1vZGVsLmZpbmQocGFyYW1zKVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFRyaXAodHJpcE51bWJlciA6IG51bWJlciwgdHJpcFBsYW5uaW5nTnVtYmVyIDogc3RyaW5nLCBjb21wYW55IDogc3RyaW5nKSB7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnRyaXBNb2RlbC5maW5kT25lKHtcclxuICAgICAgY29tcGFueTogY29tcGFueSxcclxuICAgICAgdHJpcE51bWJlciA6IHRyaXBOdW1iZXIsXHJcbiAgICAgIHRyaXBQbGFubmluZ051bWJlcjogdHJpcFBsYW5uaW5nTnVtYmVyXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcmVzcG9uc2UgIT09IG51bGwgPyByZXNwb25zZSA6IHt9O1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFJlbW92ZVRyaXAocGFyYW1zIDogb2JqZWN0ID0ge30sIGRvTG9nZ2luZyA6IGJvb2xlYW4gPSBmYWxzZSkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMudHJpcE1vZGVsLmRlbGV0ZU1hbnkocGFyYW1zKS50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgaWYoZG9Mb2dnaW5nKSBjb25zb2xlLmxvZyhgRGVsZXRlZCAke3Jlc3BvbnNlLmRlbGV0ZWRDb3VudH0gdHJpcHNgKTtcclxuICAgIH0pXHJcbiAgfVxyXG4gIC8qKlxyXG4gICAqIEluc2VydHMgbWFueSB0cmlwcyBhdCBvbmNlIGludG8gdGhlIGRhdGFiYXNlLlxyXG4gICAqIEBwYXJhbSB0cmlwcyBUaGUgdHJpcHMgdG8gYWRkLlxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBJbnNlcnRNYW55VHJpcHModHJpcHMpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgIGF3YWl0IHRoaXMudHJpcE1vZGVsLmluc2VydE1hbnkodHJpcHMsIHsgb3JkZXJlZDogZmFsc2UgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgXCJLb3BwZWx2bGFrIDcgYW5kIDggdHVyYm9cIiBmaWxlcyB0byBkYXRhYmFzZS5cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgSW5zZXJ0VHJpcCh0cmlwIDogVHJpcCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIG5ldyB0aGlzLnRyaXBNb2RlbCh0cmlwKS5zYXZlKGVycm9yID0+IHtcclxuICAgICAgaWYoZXJyb3IpIGNvbnNvbGUuZXJyb3IoYFNvbWV0aGluZyB3ZW50IHdyb25nIHdoaWxlIHRyeWluZyB0byBhZGQgdHJpcDogJHt0cmlwLnRyaXBIZWFkc2lnbn0uIEVycm9yOiAke2Vycm9yfWApXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIERyb3BUcmlwc0NvbGxlY3Rpb24oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwaW5nIHRyaXBzIGNvbGxlY3Rpb25cIik7XHJcbiAgICBhd2FpdCB0aGlzLnRyaXBNb2RlbC5yZW1vdmUoe30pO1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGVkIHRyaXBzIGNvbGxlY3Rpb25cIik7XHJcbiAgfVxyXG4gIHB1YmxpYyBhc3luYyBEcm9wUm91dGVzQ29sbGVjdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBpbmcgcm91dGVzIGNvbGxlY3Rpb25cIik7XHJcbiAgICBhd2FpdCB0aGlzLnJvdXRlc01vZGVsLnJlbW92ZSh7fSk7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwZWQgcm91dGVzIGNvbGxlY3Rpb25cIik7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0Um91dGUocm91dGVJZCA6IG51bWJlcikgOiBQcm9taXNlPFJvdXRlPiB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMucm91dGVzTW9kZWwuZmluZE9uZSh7XHJcbiAgICAgIHJvdXRlSWQgOiByb3V0ZUlkLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3BvbnNlICE9PSBudWxsID8gcmVzcG9uc2UgOiB7fTtcclxuICB9XHJcblxyXG4gIC8vIHB1YmxpYyBhc3luYyBBZGRSb3V0ZSgpXHJcblxyXG59XHJcbiIsIi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAgIEFQUCBDT05GSUdcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcblxyXG5pbXBvcnQgKiBhcyBkb3RlbnYgZnJvbSAnZG90ZW52JztcclxuZG90ZW52LmNvbmZpZygpO1xyXG5cclxuY29uc3QgcG9ydCA9IHByb2Nlc3MuZW52LlBPUlQgfHwgMzAwMjtcclxuXHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAgIFlBUk4gSU1QT1JUU1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuaW1wb3J0ICogYXMgaHR0cHMgZnJvbSAnaHR0cHMnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcblxyXG5jb25zdCBleHByZXNzID0gcmVxdWlyZShcImV4cHJlc3NcIik7XHJcbmNvbnN0IGNvcnMgPSByZXF1aXJlKFwiY29yc1wiKTtcclxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIENVU1RPTSBJTVBPUlRTXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5cclxuaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tICcuL2RhdGFiYXNlJztcclxuaW1wb3J0IHsgV2Vic29ja2V0IH0gZnJvbSAnLi9zb2NrZXQnO1xyXG5pbXBvcnQgeyBPVkRhdGEgfSBmcm9tICcuL3JlYWx0aW1lJztcclxuXHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAgIFNTTCBDT05GSUdcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcbmNvbnN0IHByaXZhdGVLZXkgPSBmcy5yZWFkRmlsZVN5bmMoXCIuL2NlcnRpZmljYXRlL2tleS5rZXlcIikudG9TdHJpbmcoKTtcclxuY29uc3QgY2VydGlmaWNhdGUgPSBmcy5yZWFkRmlsZVN5bmMoXCIuL2NlcnRpZmljYXRlL2NlcnQuY3J0XCIpLnRvU3RyaW5nKCk7XHJcbmNvbnN0IGNhID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9rZXktY2EuY3J0XCIpLnRvU3RyaW5nKCk7XHJcblxyXG5jb25zdCBBcHBJbml0ID0gYXN5bmMgKCkgPT4ge1xyXG4gIGNvbnN0IGRiID0gYXdhaXQgRGF0YWJhc2UuZ2V0SW5zdGFuY2UoKS5Jbml0KCkudGhlbigpO1xyXG4gIFxyXG4gIGNvbnN0IGFwcCA9IChtb2R1bGUuZXhwb3J0cyA9IGV4cHJlc3MoKSk7XHJcblxyXG4gIGNvbnN0IHNlcnZlciA9IGh0dHBzLmNyZWF0ZVNlcnZlcihcclxuICAgIHtcclxuICAgICAga2V5OiBwcml2YXRlS2V5LFxyXG4gICAgICBjZXJ0OiBjZXJ0aWZpY2F0ZSxcclxuICAgICAgY2E6IGNhLFxyXG4gICAgICByZXF1ZXN0Q2VydDogdHJ1ZSxcclxuICAgICAgcmVqZWN0VW5hdXRob3JpemVkOiBmYWxzZSxcclxuICAgIH0sXHJcbiAgICBhcHBcclxuICApO1xyXG4gIFxyXG5cclxuICAvL1RISVMgSVMgTk9UIFNBRkVcclxuXHJcbiAgY29uc3QgY29yc09wdGlvbnMgPSB7XHJcbiAgICBvcmlnaW46ICcqJyxcclxuICAgIG9wdGlvbnNTdWNjZXNzU3RhdHVzOiAyMDBcclxuICB9XHJcblxyXG4gIGFwcC51c2UoY29ycyhjb3JzT3B0aW9ucykpXHJcbiAgYXBwLm9wdGlvbnMoJyonLCBjb3JzKCkpXHJcblxyXG5cclxuICBjb25zdCBzb2NrZXQgPSBuZXcgV2Vic29ja2V0KHNlcnZlciwgZGIpO1xyXG4gIGNvbnN0IG92ID0gbmV3IE9WRGF0YShkYiwgc29ja2V0KTtcclxuICAvL2J1c0xvZ2ljLkluaXRLVjc4KCk7XHJcbiAgXHJcbiAgc2VydmVyLmxpc3Rlbihwb3J0LCAoKSA9PiBjb25zb2xlLmxvZyhgTGlzdGVuaW5nIGF0IGh0dHA6Ly9sb2NhbGhvc3Q6JHtwb3J0fWApKTtcclxuXHJcbn1cclxuXHJcbkFwcEluaXQoKTtcclxuIiwiaW1wb3J0IHsgVmVoaWNsZURhdGEgfSBmcm9tIFwiLi90eXBlcy9WZWhpY2xlRGF0YVwiO1xyXG5pbXBvcnQgeyBndW56aXAgfSBmcm9tICd6bGliJztcclxuaW1wb3J0IHsgQ29udmVydGVyIH0gZnJvbSAnLi9jb252ZXJ0ZXInO1xyXG5pbXBvcnQgeyBCdXNMb2dpYyB9IGZyb20gXCIuL2J1c2xvZ2ljXCI7XHJcblxyXG5pbXBvcnQgKiBhcyB4bWwgZnJvbSAnZmFzdC14bWwtcGFyc2VyJztcclxuaW1wb3J0IHsgV2Vic29ja2V0IH0gZnJvbSBcIi4vc29ja2V0XCI7XHJcblxyXG5jb25zdCB6bXEgPSByZXF1aXJlKCd6ZXJvbXEnKTtcclxuY29uc3QgZG9Mb2dnaW5nID0gcHJvY2Vzcy5lbnYuQVBQX0RPX0xPR0dJTkcgPT0gXCJ0cnVlXCIgPyB0cnVlIDogZmFsc2U7XHJcbmV4cG9ydCBjbGFzcyBPVkRhdGEge1xyXG4gIFxyXG4gIHByaXZhdGUgc29jaztcclxuICBwcml2YXRlIGt2Nzhzb2NrZXQ7XHJcbiAgcHJpdmF0ZSBidXNMb2dpYyA6IEJ1c0xvZ2ljO1xyXG4gIHByaXZhdGUgd2Vic29ja2V0IDogV2Vic29ja2V0O1xyXG5cclxuICBjb25zdHJ1Y3RvcihkYXRhYmFzZSwgc29ja2V0IDogV2Vic29ja2V0KSB7XHJcbiAgICB0aGlzLndlYnNvY2tldCA9IHNvY2tldDtcclxuICAgIHRoaXMuSW5pdCgpO1xyXG4gICAgdGhpcy5idXNMb2dpYyA9IG5ldyBCdXNMb2dpYyhkYXRhYmFzZSwgZmFsc2UpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIEluaXQoKSB7XHJcblxyXG4gICAgY29uc3QgY29udmVydGVyID0gbmV3IENvbnZlcnRlcigpO1xyXG5cclxuICAgIHRoaXMuc29jayA9IHptcS5zb2NrZXQoXCJzdWJcIik7XHJcblxyXG4gICAgdGhpcy5zb2NrLmNvbm5lY3QoXCJ0Y3A6Ly9wdWJzdWIubmRvdmxva2V0Lm5sOjc2NThcIik7XHJcbiAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL0FSUi9LVjZwb3NpbmZvXCIpO1xyXG4gICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9DWFgvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvRUJTL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL1FCVVpaL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL1JJRy9LVjZwb3NpbmZvXCIpO1xyXG4gICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9LRU9MSVMvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvU1lOVFVTL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL09QRU5PVi9LVjZwb3NpbmZvXCIpO1xyXG4gICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9HVkIvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvRElUUC9LVjZwb3NpbmZvXCIpO1xyXG5cclxuICAgIHRoaXMuc29jay5vbihcIm1lc3NhZ2VcIiwgKG9wQ29kZSwgLi4uY29udGVudCkgPT4ge1xyXG4gICAgICBjb25zdCBjb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoY29udGVudCk7XHJcbiAgICAgIGNvbnN0IG9wZXJhdG9yID0gb3BDb2RlLnRvU3RyaW5nKCk7XHJcbiAgICAgIGd1bnppcChjb250ZW50cywgYXN5bmMoZXJyb3IsIGJ1ZmZlcikgPT4ge1xyXG4gICAgICAgIGlmKGVycm9yKSByZXR1cm4gY29uc29sZS5lcnJvcihgU29tZXRoaW5nIHdlbnQgd3Jvbmcgd2hpbGUgdHJ5aW5nIHRvIHVuemlwLiAke2Vycm9yfWApXHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgZW5jb2RlZFhNTCA9IGJ1ZmZlci50b1N0cmluZygpO1xyXG4gICAgICAgIGNvbnN0IGRlY29kZWQgPSB4bWwucGFyc2UoZW5jb2RlZFhNTCk7XHJcbiAgICAgICAgbGV0IHZlaGljbGVEYXRhO1xyXG5cclxuICAgICAgICBcclxuXHJcbiAgICAgICAgaWYob3BlcmF0b3IgIT09IFwiL0tFT0xJUy9LVjZwb3NpbmZvXCIgfHwgb3BlcmF0b3IgIT09IFwiL0dWQi9LVjZwb3NpbmZvXCIpIFxyXG4gICAgICAgICAgdmVoaWNsZURhdGEgPSBjb252ZXJ0ZXIuZGVjb2RlKGRlY29kZWQpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHZlaGljbGVEYXRhID0gY29udmVydGVyLmRlY29kZShkZWNvZGVkLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICBcclxuICAgICAgICBhd2FpdCB0aGlzLmJ1c0xvZ2ljLlVwZGF0ZUJ1c3Nlcyh2ZWhpY2xlRGF0YSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgfSlcclxuXHJcbiAgICB9KVxyXG4gICAgXHJcbiAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgIHRoaXMud2Vic29ja2V0LkVtaXQoKTtcclxuICAgIH0sIHBhcnNlSW50KHByb2Nlc3MuZW52LkFQUF9CVVNfVVBEQVRFX0RFTEFZKSlcclxuICAgIFxyXG4gICAgLy8gdGhpcy5rdjc4c29ja2V0ID0gem1xLnNvY2tldChcInN1YlwiKTtcclxuICAgIC8vIHRoaXMua3Y3OHNvY2tldC5jb25uZWN0KFwidGNwOi8vcHVic3ViLm5kb3Zsb2tldC5ubDo3ODE3XCIpO1xyXG4gICAgLy8gdGhpcy5rdjc4c29ja2V0LnN1YnNjcmliZShcIi9cIilcclxuICAgIC8vIHRoaXMua3Y3OHNvY2tldC5vbihcIm1lc3NhZ2VcIiwgKG9wQ29kZSwgLi4uY29udGVudCkgPT4ge1xyXG4gICAgLy8gICBjb25zdCBjb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoY29udGVudCk7XHJcbiAgICAvLyAgIGd1bnppcChjb250ZW50cywgYXN5bmMoZXJyb3IsIGJ1ZmZlcikgPT4geyBcclxuICAgIC8vICAgICBjb25zb2xlLmxvZyhidWZmZXIudG9TdHJpbmcoJ3V0ZjgnKSlcclxuICAgIC8vICAgfSk7XHJcbiAgICAvLyB9KTtcclxuICB9XHJcblxyXG4gIFxyXG59IiwiaW1wb3J0IHsgVmVoaWNsZURhdGEgfSBmcm9tIFwiLi90eXBlcy9WZWhpY2xlRGF0YVwiO1xyXG5pbXBvcnQgeyBTZXJ2ZXIgfSBmcm9tICdodHRwcyc7XHJcbmltcG9ydCB7IFNvY2tldCB9IGZyb20gJ3NvY2tldC5pbyc7XHJcbmltcG9ydCB7IERhdGFiYXNlIH0gZnJvbSAnLi9kYXRhYmFzZSc7XHJcblxyXG5jb25zdCBidXNfdXBkYXRlX3JhdGUgPSBwYXJzZUludChwcm9jZXNzLmVudi5BUFBfQlVTX1VQREFURV9ERUxBWSk7XHJcblxyXG5leHBvcnQgY2xhc3MgV2Vic29ja2V0IHtcclxuICBcclxuICBwcml2YXRlIGlvIDogU29ja2V0O1xyXG4gIHByaXZhdGUgYWN0aXZlU29ja2V0IDogU29ja2V0O1xyXG4gIHByaXZhdGUgZGIgOiBEYXRhYmFzZTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2VydmVyIDogU2VydmVyLCBkYiA6IERhdGFiYXNlKSB7XHJcbiAgICB0aGlzLlNvY2tldEluaXQoc2VydmVyKTtcclxuICAgIHRoaXMuZGIgPSBkYjtcclxuICB9XHJcblxyXG4gIGFzeW5jIFNvY2tldEluaXQoc2VydmVyIDogU2VydmVyKSB7XHJcbiAgICBjb25zb2xlLmxvZyhgSW5pdGFsaXppbmcgd2Vic29ja2V0YClcclxuXHJcbiAgICB0aGlzLmlvID0gcmVxdWlyZShcInNvY2tldC5pb1wiKShzZXJ2ZXIsIHtcclxuICAgICAgY29yczoge1xyXG4gICAgICAgIG9yaWdpbjogXCIqXCIsXHJcbiAgICAgICAgbWV0aG9kczogW1wiR0VUXCIsIFwiUE9TVFwiXSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuaW8ub24oXCJjb25uZWN0aW9uXCIsIHNvY2tldCA9PiB7XHJcbiAgICAgIHRoaXMuU29ja2V0KHNvY2tldCk7XHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgU29ja2V0KHNvY2tldCA6IFNvY2tldCkge1xyXG4gICAgdGhpcy5hY3RpdmVTb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICBjb25zb2xlLmxvZyhcIk5ldyBjbGllbnQgY29ubmVjdGVkLlwiKTtcclxuXHJcbiAgICAvLyBjb25zdCBpbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcclxuICAgIC8vICAgICAgIC8vY29uc29sZS5sb2coXCJFbWl0dGluZyBuZXcgZGF0YS5cIik7XHJcbiAgICAvLyAgICAgICB0aGlzLmRiLkdldEFsbFZlaGljbGVzKCkudGhlbigodmVoaWNsZXMpID0+IHtcclxuICAgIC8vICAgICAgICAgc29ja2V0LmVtaXQoXCJvdmRhdGFcIiwgdmVoaWNsZXMpO1xyXG4gICAgLy8gICAgICAgfSlcclxuICAgIC8vIH0sIGJ1c191cGRhdGVfcmF0ZSk7XHJcblxyXG4gICAgc29ja2V0Lm9uKFwiZGlzY29ubmVjdFwiLCAoKSA9PiB7XHJcbiAgICAgIGNvbnNvbGUubG9nKFwiQ2xpZW50IGRpc2Nvbm5lY3RlZFwiKTtcclxuICAgICAgLy9jbGVhckludGVydmFsKGludGVydmFsKTtcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBTZW5kRGVsZXRlZFZlaGljbGVzKHZlaGljbGVzIDogQXJyYXk8VmVoaWNsZURhdGE+KSA6IHZvaWQge1xyXG4gICAgdGhpcy5pby5lbWl0KFwiZGVsZXRlZFZlaGljbGVzXCIsIHZlaGljbGVzKTtcclxuICB9XHJcblxyXG4gIEVtaXQoKSB7XHJcbiAgICAvL1NtYWxsIGRlbGF5IHRvIG1ha2Ugc3VyZSB0aGUgc2VydmVyIGNhdGNoZXMgdXAuXHJcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgdGhpcy5kYi5HZXRBbGxWZWhpY2xlcygpLnRoZW4oKHZlaGljbGVzKSA9PiB7XHJcbiAgICAgICAgdGhpcy5pby5lbWl0KFwib3ZkYXRhXCIsIHZlaGljbGVzKTtcclxuICAgICAgfSlcclxuICAgIH0sIDEwMClcclxuICB9XHJcblxyXG59IiwiZXhwb3J0IGVudW0gdmVoaWNsZVN0YXRlIHtcclxuICBPTlJPVVRFID0gJ09OUk9VVEUnLFxyXG4gIE9GRlJPVVRFID0gJ09GRlJPVVRFJyxcclxuICBFTkQgPSBcIkVORFwiLFxyXG4gIERFUEFSVFVSRSA9ICdERVBBUlRVUkUnLFxyXG4gIElOSVQgPSAnSU5JVCcsXHJcbiAgREVMQVkgPSAnREVMQVknLFxyXG4gIE9OU1RPUCA9ICdPTlNUT1AnLFxyXG4gIEFSUklWQUwgPSAnQVJSSVZBTCdcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBWZWhpY2xlRGF0YSB7XHJcbiAgY29tcGFueTogc3RyaW5nLFxyXG4gIHBsYW5uaW5nTnVtYmVyOiBzdHJpbmcsXHJcbiAgam91cm5leU51bWJlcjogbnVtYmVyLFxyXG4gIGxpbmVOdW1iZXIgOiBzdHJpbmcsXHJcbiAgdGltZXN0YW1wOiBudW1iZXIsXHJcbiAgdmVoaWNsZU51bWJlcjogbnVtYmVyLFxyXG4gIHBvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdLFxyXG4gIHN0YXR1czogdmVoaWNsZVN0YXRlLFxyXG4gIGNyZWF0ZWRBdDogbnVtYmVyLFxyXG4gIHVwZGF0ZWRBdDogbnVtYmVyLFxyXG4gIHB1bmN0dWFsaXR5OiBBcnJheTxudW1iZXI+LFxyXG4gIHVwZGF0ZWRUaW1lczogQXJyYXk8bnVtYmVyPlxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImNoaWxkX3Byb2Nlc3NcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImNvcnNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImRvdGVudlwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZXhwcmVzc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZmFzdC14bWwtcGFyc2VyXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJmc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiaHR0cHNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIm1vbmdvb3NlXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJwYXRoXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzb2NrZXQuaW9cIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInNwbGl0XCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzdHJlYW0tdG8tbW9uZ28tZGJcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInplcm9tcVwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiemxpYlwiKTs7IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIHN0YXJ0dXBcbi8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuLy8gVGhpcyBlbnRyeSBtb2R1bGUgaXMgcmVmZXJlbmNlZCBieSBvdGhlciBtb2R1bGVzIHNvIGl0IGNhbid0IGJlIGlubGluZWRcbnZhciBfX3dlYnBhY2tfZXhwb3J0c19fID0gX193ZWJwYWNrX3JlcXVpcmVfXyhcIi4vc3JjL21haW4udHNcIik7XG4iXSwic291cmNlUm9vdCI6IiJ9