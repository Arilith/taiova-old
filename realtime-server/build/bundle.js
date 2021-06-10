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
        await busses.forEach(async (bus, index) => {
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
        });
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
                this.tripsSchema.index({ tripNumber: -1, tripPlanningNumber: -1 });
                this.vehicleModel = this.mongoose.model("VehiclePositions", this.vehicleSchema);
                this.tripModel = this.mongoose.model("trips", this.tripsSchema);
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
    async GetTrip(tripNumber, tripPlanningNumber) {
        const response = await this.tripModel.findOne({
            tripNumber: tripNumber,
            tripPlanningNumber: tripPlanningNumber.toString()
        });
        return response["_doc"];
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
        //TODO: Fix this to be only the new vehicles instead of all vehicles.
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9idXNsb2dpYy50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9jb252ZXJ0ZXIudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvZGF0YWJhc2UudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvbWFpbi50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9yZWFsdGltZS50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9zb2NrZXQudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvdHlwZXMvVmVoaWNsZURhdGEudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJjaGlsZF9wcm9jZXNzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJjb3JzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJkb3RlbnZcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcImV4cHJlc3NcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcImZhc3QteG1sLXBhcnNlclwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiZnNcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcImh0dHBzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJtb25nb29zZVwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwicGF0aFwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwic29ja2V0LmlvXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJzcGxpdFwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwic3RyZWFtLXRvLW1vbmdvLWRiXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJ6ZXJvbXFcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcInpsaWJcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci93ZWJwYWNrL3N0YXJ0dXAiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxtR0FBZ0U7QUFDaEUsdURBQStCO0FBQy9CLDZEQUF5QjtBQUd6QixrRkFBcUM7QUFFckMsTUFBYSxRQUFRO0lBSW5CLFlBQVksUUFBUSxFQUFFLFNBQW1CLEtBQUs7UUFDNUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFFekIsSUFBRyxNQUFNO1lBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFFTyxLQUFLLENBQUMsVUFBVTtRQUN0QixNQUFNLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUV6QixXQUFXLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDckIsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDM0IsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVEOzs7T0FHRztJQUNLLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBMkI7UUFFcEQsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEVB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LENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU87WUFDOUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTztZQUM1QyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQ3hELEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTztZQUN4QixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDWCxNQUFNLElBQUksR0FBRyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPO1lBQy9ELEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDNUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPO1lBQ2xCLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDNUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUN2QixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMs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O0lBQ3ZCLDZCQUFhO0lBQ2IsK0JBQWU7SUFDZixpQ0FBaUI7SUFDakIsbUNBQW1CO0FBQ3JCLENBQUMsRUFUVyxZQUFZLEdBQVosb0JBQVksS0FBWixvQkFBWSxRQVN2Qjs7Ozs7Ozs7Ozs7QUNURCwyQzs7Ozs7Ozs7OztBQ0FBLGtDOzs7Ozs7Ozs7O0FDQUEsb0M7Ozs7Ozs7Ozs7QUNBQSxxQzs7Ozs7Ozs7OztBQ0FBLDZDOzs7Ozs7Ozs7O0FDQUEsZ0M7Ozs7Ozs7Ozs7QUNBQSxtQzs7Ozs7Ozs7OztBQ0FBLHNDOzs7Ozs7Ozs7O0FDQUEsa0M7Ozs7Ozs7Ozs7QUNBQSx1Qzs7Ozs7Ozs7OztBQ0FBLG1DOzs7Ozs7Ozs7O0FDQUEsZ0Q7Ozs7Ozs7Ozs7QUNBQSxvQzs7Ozs7Ozs7OztBQ0FBLGtDOzs7Ozs7VUNBQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBOztVQUVBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBOzs7O1VDdEJBO1VBQ0E7VUFDQTtVQUNBIiwiZmlsZSI6ImJ1bmRsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IERhdGFiYXNlIH0gZnJvbSBcIi4vZGF0YWJhc2VcIjtcclxuaW1wb3J0IHsgVmVoaWNsZURhdGEsIHZlaGljbGVTdGF0ZSB9IGZyb20gXCIuL3R5cGVzL1ZlaGljbGVEYXRhXCI7XHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgeyBUcmlwIH0gZnJvbSBcIi4vdHlwZXMvVHJpcFwiO1xyXG5pbXBvcnQgeyBBcGlUcmlwIH0gZnJvbSBcIi4vdHlwZXMvQXBpVHJpcFwiO1xyXG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgQnVzTG9naWMge1xyXG5cclxuICBwcml2YXRlIGRhdGFiYXNlIDogRGF0YWJhc2U7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGRhdGFiYXNlLCBkb0luaXQgOiBib29sZWFuID0gZmFsc2UpIHtcclxuICAgIHRoaXMuZGF0YWJhc2UgPSBkYXRhYmFzZTtcclxuXHJcbiAgICBpZihkb0luaXQpIHRoaXMuSW5pdGlhbGl6ZSgpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBJbml0aWFsaXplKCkge1xyXG4gICAgYXdhaXQgdGhpcy5DbGVhckJ1c3NlcygpO1xyXG5cclxuICAgIHNldEludGVydmFsKGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgdGhpcy5DbGVhckJ1c3NlcygpO1xyXG4gICAgfSwgcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0NMRUFOVVBfREVMQVkpKVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRlcyBvciBjcmVhdGVzIGEgbmV3IGJ1cyBkZXBlbmRpbmcgb24gaWYgaXQgYWxyZWFkeSBleGlzdHMgb3Igbm90LlxyXG4gICAqIEBwYXJhbSBidXNzZXMgVGhlIGxpc3Qgb2YgYnVzc2VzIHRvIHVwZGF0ZS5cclxuICAgKi9cclxuICAgcHVibGljIGFzeW5jIFVwZGF0ZUJ1c3NlcyhidXNzZXMgOiBBcnJheTxWZWhpY2xlRGF0YT4pIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBcclxuICAgIGF3YWl0IGJ1c3Nlcy5mb3JFYWNoKGFzeW5jIChidXMsIGluZGV4KSA9PiB7XHJcbiAgICAgIGNvbnN0IGZvdW5kVmVoaWNsZSA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0VmVoaWNsZShidXMudmVoaWNsZU51bWJlciwgYnVzLmNvbXBhbnkpXHJcbiAgICAgIGlmKE9iamVjdC5rZXlzKGZvdW5kVmVoaWNsZSkubGVuZ3RoICE9PSAwKSB7XHJcbiAgICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX1VQREFURV9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhgVXBkYXRpbmcgdmVoaWNsZSAke2J1cy52ZWhpY2xlTnVtYmVyfSBmcm9tICR7YnVzLmNvbXBhbnl9YClcclxuICAgICAgICBhd2FpdCB0aGlzLmRhdGFiYXNlLlVwZGF0ZVZlaGljbGUoZm91bmRWZWhpY2xlLCBidXMsIHRydWUpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DUkVBVEVfTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coYGNyZWF0aW5nIG5ldyB2ZWhpY2xlICR7YnVzLnZlaGljbGVOdW1iZXJ9IGZyb20gJHtidXMuY29tcGFueX1gKVxyXG4gICAgICAgIGlmKGJ1cy5zdGF0dXMgPT09IHZlaGljbGVTdGF0ZS5PTlJPVVRFKSBhd2FpdCB0aGlzLmRhdGFiYXNlLkFkZFZlaGljbGUoYnVzLCB0cnVlKVxyXG4gICAgICB9XHJcbiAgICAgICAgICAgICAgXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2xlYXJzIGJ1c3NlcyBldmVyeSBYIGFtb3VudCBvZiBtaW51dGVzIHNwZWNpZmllZCBpbiAuZW52IGZpbGUuXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIENsZWFyQnVzc2VzKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DTEVBTlVQX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiQ2xlYXJpbmcgYnVzc2VzXCIpXHJcbiAgICBjb25zdCBjdXJyZW50VGltZSA9IERhdGUubm93KCk7XHJcbiAgICBjb25zdCBmaWZ0ZWVuTWludXRlc0FnbyA9IGN1cnJlbnRUaW1lIC0gKDYwICogcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0NMRUFOVVBfVkVISUNMRV9BR0VfUkVRVUlSRU1FTlQpICogMTAwMCk7XHJcbiAgICBjb25zdCBSZW1vdmVkVmVoaWNsZXMgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLlJlbW92ZVZlaGljbGVzV2hlcmUoeyB1cGRhdGVkQXQ6IHsgJGx0OiBmaWZ0ZWVuTWludXRlc0FnbyB9IH0sIHByb2Nlc3MuZW52LkFQUF9ET19DTEVBTlVQX0xPR0dJTkcgPT0gXCJ0cnVlXCIpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIFwiS29wcGVsdmxhayA3IGFuZCA4IHR1cmJvXCIgZmlsZXMgdG8gZGF0YWJhc2UuXHJcbiAgICovXHJcbiAgcHVibGljIEluaXRLVjc4KCkgOiB2b2lkIHtcclxuICAgIHRoaXMuSW5pdFRyaXBzTmV3KCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgdHJpcHMgZnJvbSB0aGUgc3BlY2lmaWVkIFVSTCBpbiB0aGUgLmVudiAsIG9yIFwiLi4vR1RGUy9leHRyYWN0ZWQvdHJpcHMuanNvblwiIHRvIHRoZSBkYXRhYmFzZS5cclxuICAgKi9cclxuICBwcml2YXRlIEluaXRUcmlwc05ldygpIDogdm9pZCB7IFxyXG4gICAgY29uc3QgdHJpcHNQYXRoID0gcmVzb2x2ZShcIkdURlNcXFxcZXh0cmFjdGVkXFxcXHRyaXBzLnR4dC5qc29uXCIpO1xyXG4gICAgY29uc3Qgb3V0cHV0UGF0aCA9IHJlc29sdmUoXCJHVEZTXFxcXGNvbnZlcnRlZFxcXFx0cmlwcy5qc29uXCIpO1xyXG4gICAgZnMucmVhZEZpbGUodHJpcHNQYXRoLCAndXRmOCcsIGFzeW5jKGVycm9yLCBkYXRhKSA9PiB7IFxyXG4gICAgICBpZihlcnJvcikgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgIGlmKGRhdGEgJiYgcHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJMb2FkZWQgdHJpcHMgZmlsZSBpbnRvIG1lbW9yeS5cIik7XHJcbiAgICAgIGRhdGEgPSBkYXRhLnRyaW0oKTtcclxuICAgICAgY29uc3QgbGluZXMgPSBkYXRhLnNwbGl0KFwiXFxuXCIpO1xyXG4gICAgICBjb25zdCB3cml0ZVN0cmVhbSA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG91dHB1dFBhdGgpXHJcbiAgICAgIGNvbnN0IGNvbnZlcnRlZFRyaXBzID0gW107XHJcblxyXG4gICAgICBmb3IobGV0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgICAgICBjb25zdCB0cmlwSlNPTiA6IEFwaVRyaXAgPSBKU09OLnBhcnNlKGxpbmUpO1xyXG4gICAgICAgIGNvbnN0IHJlYWxUaW1lVHJpcElkID0gdHJpcEpTT04ucmVhbHRpbWVfdHJpcF9pZC5zcGxpdChcIjpcIik7XHJcbiAgICAgICAgY29uc3QgY29tcGFueSA9IHJlYWxUaW1lVHJpcElkWzBdO1xyXG4gICAgICAgIGNvbnN0IHBsYW5uaW5nTnVtYmVyID0gcmVhbFRpbWVUcmlwSWRbMV07XHJcbiAgICAgICAgY29uc3QgdHJpcE51bWJlciA9IHJlYWxUaW1lVHJpcElkWzJdO1xyXG5cclxuICAgICAgICBjb25zdCB0cmlwIDogVHJpcCA9IHtcclxuICAgICAgICAgIGNvbXBhbnk6IGNvbXBhbnksXHJcbiAgICAgICAgICByb3V0ZUlkOiBwYXJzZUludCh0cmlwSlNPTi5yb3V0ZV9pZCksXHJcbiAgICAgICAgICBzZXJ2aWNlSWQ6IHBhcnNlSW50KHRyaXBKU09OLnNlcnZpY2VfaWQpLFxyXG4gICAgICAgICAgdHJpcElkOiBwYXJzZUludCh0cmlwSlNPTi50cmlwX2lkKSxcclxuICAgICAgICAgIHRyaXBOdW1iZXI6IHBhcnNlSW50KHRyaXBOdW1iZXIpLFxyXG4gICAgICAgICAgdHJpcFBsYW5uaW5nTnVtYmVyOiBwbGFubmluZ051bWJlcixcclxuICAgICAgICAgIHRyaXBIZWFkc2lnbjogdHJpcEpTT04udHJpcF9oZWFkc2lnbixcclxuICAgICAgICAgIHRyaXBOYW1lOiB0cmlwSlNPTi50cmlwX2xvbmdfbmFtZSxcclxuICAgICAgICAgIGRpcmVjdGlvbklkOiBwYXJzZUludCh0cmlwSlNPTi5kaXJlY3Rpb25faWQpLFxyXG4gICAgICAgICAgc2hhcGVJZDogcGFyc2VJbnQodHJpcEpTT04uc2hhcGVfaWQpLFxyXG4gICAgICAgICAgd2hlZWxjaGFpckFjY2Vzc2libGU6IHBhcnNlSW50KHRyaXBKU09OLndoZWVsY2hhaXJfYWNjZXNzaWJsZSlcclxuICAgICAgICB9XHJcbiAgICAgICAgd3JpdGVTdHJlYW0ud3JpdGUoSlNPTi5zdHJpbmdpZnkodHJpcCkgKyBcIlxcblwiKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgd3JpdGVTdHJlYW0uZW5kKCgpID0+IHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkZpbmlzaGVkIHdyaXRpbmcgdHJpcHMgZmlsZSwgaW1wb3J0aW5nIHRvIGRhdGFiYXNlLlwiKTtcclxuICAgICAgICB0aGlzLkltcG9ydFRyaXBzKCk7XHJcbiAgICAgIH0pXHJcbiAgICB9KTtcclxuICAgXHJcbiAgICBcclxuICB9XHJcblxyXG4gIGFzeW5jIEltcG9ydFRyaXBzKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuRHJvcFRyaXBzQ29sbGVjdGlvbigpO1xyXG5cclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiSW1wb3J0aW5nIHRyaXBzIHRvIG1vbmdvZGJcIik7XHJcblxyXG4gICAgYXdhaXQgZXhlYyhcIm1vbmdvaW1wb3J0IC0tZGIgdGFpb3ZhIC0tY29sbGVjdGlvbiB0cmlwcyAtLWZpbGUgLlxcXFxHVEZTXFxcXGNvbnZlcnRlZFxcXFx0cmlwcy5qc29uXCIsIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc3RkZXJyKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYHN0ZGVycjogJHtzdGRlcnJ9YCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhgc3Rkb3V0OiAke3N0ZG91dH1gKTtcclxuICAgIH0pO1xyXG5cclxuICB9XHJcblxyXG59IiwiaW1wb3J0IHsgVmVoaWNsZURhdGEsIHZlaGljbGVTdGF0ZSB9IGZyb20gJy4vdHlwZXMvVmVoaWNsZURhdGEnXHJcbmltcG9ydCB7IFZlaGljbGVBcGlEYXRhLCBWZWhpY2xlUG9zRGF0YSwgVmVoaWNsZUFwaURhdGFLZW9saXMgfSBmcm9tICcuL3R5cGVzL1ZlaGljbGVBcGlEYXRhJ1xyXG5leHBvcnQgY2xhc3MgQ29udmVydGVyIHtcclxuXHJcbiAgZGVjb2RlKGRhdGE6IFZlaGljbGVBcGlEYXRhLCBpc0tlb2xpcyA6IGJvb2xlYW4gPSBmYWxzZSkgOiBhbnkge1xyXG4gICAgXHJcbiAgICBsZXQgbmV3RGF0YSA6IGFueSA9IGRhdGE7XHJcblxyXG4gICAgaWYoSlNPTi5zdHJpbmdpZnkoZGF0YSkuaW5jbHVkZXMoJ3RtaTg6JykpXHJcbiAgICAgIG5ld0RhdGEgPSB0aGlzLnJlbW92ZVRtaTgoZGF0YSk7IFxyXG5cclxuICAgIGlmKCFpc0tlb2xpcylcclxuICAgICAgcmV0dXJuIHRoaXMuY29udmVydEtWNlRvSnNvbihuZXdEYXRhKTtcclxuXHJcbiAgICByZXR1cm4gdGhpcy5jb252ZXJ0S1Y2VG9Kc29uS2VvbGlzKG5ld0RhdGEpO1xyXG4gIH0gXHJcblxyXG4gIGNvbnZlcnRLVjZUb0pzb25LZW9saXMoZGF0YTogYW55KSA6IGFueSB7XHJcbiAgICBjb25zdCBhcnJheSA6IEFycmF5PFZlaGljbGVEYXRhPiA9IFtdO1xyXG4gICAgY29uc3Qga3Y2cG9zaW5mbyA9IGRhdGEuVlZfVE1fUFVTSC5LVjZwb3NpbmZvO1xyXG4gICAgXHJcbiAgICBpZihrdjZwb3NpbmZvLmxlbmd0aCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIGt2NnBvc2luZm8uZm9yRWFjaChzdGF0dXNXaXRoQnVzID0+IHtcclxuICAgICAgICBjb25zdCB2ZWhpY2xlUG9zRGF0YSA6IFZlaGljbGVQb3NEYXRhID0gc3RhdHVzV2l0aEJ1c1tPYmplY3Qua2V5cyhzdGF0dXNXaXRoQnVzKVswXV07XHJcbiAgICAgICAgICBhcnJheS5wdXNoKHtcclxuICAgICAgICAgICAgY29tcGFueTogdmVoaWNsZVBvc0RhdGEuZGF0YW93bmVyY29kZSxcclxuICAgICAgICAgICAgcGxhbm5pbmdOdW1iZXI6IHZlaGljbGVQb3NEYXRhLmxpbmVwbGFubmluZ251bWJlci50b1N0cmluZygpLFxyXG4gICAgICAgICAgICBqb3VybmV5TnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS5qb3VybmV5bnVtYmVyLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUucGFyc2UodmVoaWNsZVBvc0RhdGEudGltZXN0YW1wKSxcclxuICAgICAgICAgICAgdmVoaWNsZU51bWJlcjogdmVoaWNsZVBvc0RhdGEudmVoaWNsZW51bWJlcixcclxuICAgICAgICAgICAgcG9zaXRpb246IHRoaXMucmRUb0xhdExvbmcodmVoaWNsZVBvc0RhdGFbJ3JkLXgnXSwgdmVoaWNsZVBvc0RhdGFbJ3JkLXknXSksXHJcbiAgICAgICAgICAgIHB1bmN0dWFsaXR5OiBbdmVoaWNsZVBvc0RhdGEucHVuY3R1YWxpdHldLFxyXG4gICAgICAgICAgICBzdGF0dXM6IHZlaGljbGVTdGF0ZVtPYmplY3Qua2V5cyhzdGF0dXNXaXRoQnVzKVswXV0sXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICB1cGRhdGVkVGltZXM6IFtEYXRlLm5vdygpXVxyXG4gICAgICAgICAgfSlcclxuICAgICAgfSlcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnN0IHZlaGljbGVQb3NEYXRhIDogVmVoaWNsZVBvc0RhdGEgPSBrdjZwb3NpbmZvW09iamVjdC5rZXlzKGt2NnBvc2luZm8pWzBdXTtcclxuICAgICAgYXJyYXkucHVzaCh7XHJcbiAgICAgICAgY29tcGFueTogdmVoaWNsZVBvc0RhdGEuZGF0YW93bmVyY29kZSxcclxuICAgICAgICBwbGFubmluZ051bWJlcjogdmVoaWNsZVBvc0RhdGEubGluZXBsYW5uaW5nbnVtYmVyLnRvU3RyaW5nKCksXHJcbiAgICAgICAgam91cm5leU51bWJlcjogdmVoaWNsZVBvc0RhdGEuam91cm5leW51bWJlcixcclxuICAgICAgICB0aW1lc3RhbXA6IERhdGUucGFyc2UodmVoaWNsZVBvc0RhdGEudGltZXN0YW1wKSxcclxuICAgICAgICB2ZWhpY2xlTnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS52ZWhpY2xlbnVtYmVyLFxyXG4gICAgICAgIHBvc2l0aW9uOiB0aGlzLnJkVG9MYXRMb25nKHZlaGljbGVQb3NEYXRhWydyZC14J10sIHZlaGljbGVQb3NEYXRhWydyZC15J10pLFxyXG4gICAgICAgIHB1bmN0dWFsaXR5OiBbdmVoaWNsZVBvc0RhdGEucHVuY3R1YWxpdHldLFxyXG4gICAgICAgIHN0YXR1czogdmVoaWNsZVN0YXRlW09iamVjdC5rZXlzKGt2NnBvc2luZm8pWzBdXSxcclxuICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgIHVwZGF0ZWRUaW1lczogW0RhdGUubm93KCldXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgICBcclxuXHJcbiAgICByZXR1cm4gYXJyYXk7XHJcbiAgfVxyXG5cclxuICBjb252ZXJ0S1Y2VG9Kc29uIChkYXRhIDogVmVoaWNsZUFwaURhdGEpIDogYW55IHtcclxuXHJcbiAgICBsZXQga3Y2cG9zaW5mbyA9IGRhdGEuVlZfVE1fUFVTSC5LVjZwb3NpbmZvO1xyXG4gICAgY29uc3QgYXJyYXkgOiBBcnJheTxWZWhpY2xlRGF0YT4gPSBbXTtcclxuXHJcbiAgICBpZihrdjZwb3NpbmZvICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICBPYmplY3QuZW50cmllcyhrdjZwb3NpbmZvKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcclxuICAgICAgICAvL0lmIHRydWUsIHRoZSByZWNlaXZlZCBkYXRhIGlzIGp1c3Qgb25lIG9iamVjdCBpbnN0ZWFkIG9mIGFycmF5LiBUeXBlb2YgVmVoaWNsZVBvc0RhdGFcclxuICAgICAgICBpZih2YWx1ZS5oYXNPd25Qcm9wZXJ0eShcImRhdGFvd25lcmNvZGVcIikpIHsgXHJcblxyXG4gICAgICAgICAgY29uc3QgdmVoaWNsZVBvc0RhdGEgOiBWZWhpY2xlUG9zRGF0YSA9IGt2NnBvc2luZm9ba2V5XTtcclxuICAgICAgICAgIGlmKCEoIXBhcnNlSW50KHZlaGljbGVQb3NEYXRhWydyZC14J10gKyBcIlwiKSB8fCAhcGFyc2VJbnQodmVoaWNsZVBvc0RhdGFbJ3JkLXknXSArIFwiXCIpKSkge1xyXG4gICAgICAgICAgICBhcnJheS5wdXNoKFxyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGNvbXBhbnk6IHZlaGljbGVQb3NEYXRhLmRhdGFvd25lcmNvZGUsXHJcbiAgICAgICAgICAgICAgICBwbGFubmluZ051bWJlcjogdmVoaWNsZVBvc0RhdGEubGluZXBsYW5uaW5nbnVtYmVyLnRvU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICBqb3VybmV5TnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS5qb3VybmV5bnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLnBhcnNlKHZlaGljbGVQb3NEYXRhLnRpbWVzdGFtcCksXHJcbiAgICAgICAgICAgICAgICB2ZWhpY2xlTnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS52ZWhpY2xlbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHRoaXMucmRUb0xhdExvbmcodmVoaWNsZVBvc0RhdGFbJ3JkLXgnXSwgdmVoaWNsZVBvc0RhdGFbJ3JkLXknXSksXHJcbiAgICAgICAgICAgICAgICBwdW5jdHVhbGl0eTogW3ZlaGljbGVQb3NEYXRhLnB1bmN0dWFsaXR5XSxcclxuICAgICAgICAgICAgICAgIHN0YXR1czogdmVoaWNsZVN0YXRlW2tleV0sXHJcbiAgICAgICAgICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgICAgICB1cGRhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgICAgICB1cGRhdGVkVGltZXM6IFtEYXRlLm5vdygpXVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgfSAgXHJcbiAgICAgICAgLy9JZiB0aGlzIGlzIHRydWUsIHRoZSByZWNlaXZlZCBkYXRhIGlzIGFuIGFycmF5IG9mIG9iamVjdHMuICBUeXBlb2YgVmVoaWNsZVBvc0RhdGFbXVxyXG4gICAgICAgIH0gZWxzZSBpZih2YWx1ZVtPYmplY3Qua2V5cyh2YWx1ZSlbMF1dICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIGZvcihsZXQgaiA9MDsgaiA8IGt2NnBvc2luZm9ba2V5XS5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICBjb25zdCB2ZWhpY2xlUG9zRGF0YSA6IFZlaGljbGVQb3NEYXRhID0ga3Y2cG9zaW5mb1trZXldW2pdO1xyXG4gICAgICAgICAgICBpZighcGFyc2VJbnQodmVoaWNsZVBvc0RhdGFbJ3JkLXgnXSArIFwiXCIpIHx8ICFwYXJzZUludCh2ZWhpY2xlUG9zRGF0YVsncmQteSddICsgXCJcIikpIGNvbnRpbnVlOyBcclxuICAgICAgICAgICAgYXJyYXkucHVzaChcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBjb21wYW55OiB2ZWhpY2xlUG9zRGF0YS5kYXRhb3duZXJjb2RlLFxyXG4gICAgICAgICAgICAgICAgcGxhbm5pbmdOdW1iZXI6IHZlaGljbGVQb3NEYXRhLmxpbmVwbGFubmluZ251bWJlci50b1N0cmluZygpLFxyXG4gICAgICAgICAgICAgICAgam91cm5leU51bWJlcjogdmVoaWNsZVBvc0RhdGEuam91cm5leW51bWJlcixcclxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5wYXJzZSh2ZWhpY2xlUG9zRGF0YS50aW1lc3RhbXApLFxyXG4gICAgICAgICAgICAgICAgdmVoaWNsZU51bWJlcjogdmVoaWNsZVBvc0RhdGEudmVoaWNsZW51bWJlcixcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnJkVG9MYXRMb25nKHZlaGljbGVQb3NEYXRhWydyZC14J10sIHZlaGljbGVQb3NEYXRhWydyZC15J10pLFxyXG4gICAgICAgICAgICAgICAgcHVuY3R1YWxpdHk6IFt2ZWhpY2xlUG9zRGF0YS5wdW5jdHVhbGl0eV0sXHJcbiAgICAgICAgICAgICAgICBzdGF0dXM6IHZlaGljbGVTdGF0ZVtrZXldLFxyXG4gICAgICAgICAgICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgdXBkYXRlZFRpbWVzOiBbRGF0ZS5ub3coKV1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYXJyYXk7XHJcblxyXG4gIH1cclxuXHJcbiAgcmVtb3ZlVG1pOCAoZGF0YSA6IFZlaGljbGVBcGlEYXRhKSA6IFZlaGljbGVBcGlEYXRhIHtcclxuICAgIGxldCBkYXRhU3RyaW5nIDogc3RyaW5nID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XHJcbiAgICBkYXRhU3RyaW5nID0gZGF0YVN0cmluZy5yZXBsYWNlKC90bWk4Oi9nLCBcIlwiKTtcclxuICAgIHJldHVybiBKU09OLnBhcnNlKGRhdGFTdHJpbmcpO1xyXG4gIH1cclxuXHJcbiAgcmRUb0xhdExvbmcgKHgsIHkpIDogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICBpZih4ID09PSB1bmRlZmluZWQgfHwgeSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gWzAsIDBdO1xyXG5cclxuICAgIGNvbnN0IGRYID0gKHggLSAxNTUwMDApICogTWF0aC5wb3coMTAsIC01KTtcclxuICAgIGNvbnN0IGRZID0gKHkgLSA0NjMwMDApICogTWF0aC5wb3coMTAsIC01KTtcclxuICAgIGNvbnN0IFNvbU4gPSAoMzIzNS42NTM4OSAqIGRZKSArICgtMzIuNTgyOTcgKiBNYXRoLnBvdyhkWCwgMikpICsgKC0wLjI0NzUgKlxyXG4gICAgICBNYXRoLnBvdyhkWSwgMikpICsgKC0wLjg0OTc4ICogTWF0aC5wb3coZFgsIDIpICpcclxuICAgICAgZFkpICsgKC0wLjA2NTUgKiBNYXRoLnBvdyhkWSwgMykpICsgKC0wLjAxNzA5ICpcclxuICAgICAgTWF0aC5wb3coZFgsIDIpICogTWF0aC5wb3coZFksIDIpKSArICgtMC4wMDczOCAqXHJcbiAgICAgIGRYKSArICgwLjAwNTMgKiBNYXRoLnBvdyhkWCwgNCkpICsgKC0wLjAwMDM5ICpcclxuICAgICAgTWF0aC5wb3coZFgsIDIpICogTWF0aC5wb3coZFksIDMpKSArICgwLjAwMDMzICogTWF0aC5wb3coXHJcbiAgICAgIGRYLCA0KSAqIGRZKSArICgtMC4wMDAxMiAqXHJcbiAgICAgIGRYICogZFkpO1xyXG4gICAgY29uc3QgU29tRSA9ICg1MjYwLjUyOTE2ICogZFgpICsgKDEwNS45NDY4NCAqIGRYICogZFkpICsgKDIuNDU2NTYgKlxyXG4gICAgICBkWCAqIE1hdGgucG93KGRZLCAyKSkgKyAoLTAuODE4ODUgKiBNYXRoLnBvdyhcclxuICAgICAgZFgsIDMpKSArICgwLjA1NTk0ICpcclxuICAgICAgZFggKiBNYXRoLnBvdyhkWSwgMykpICsgKC0wLjA1NjA3ICogTWF0aC5wb3coXHJcbiAgICAgIGRYLCAzKSAqIGRZKSArICgwLjAxMTk5ICpcclxuICAgICAgZFkpICsgKC0wLjAwMjU2ICogTWF0aC5wb3coZFgsIDMpICogTWF0aC5wb3coXHJcbiAgICAgIGRZLCAyKSkgKyAoMC4wMDEyOCAqXHJcbiAgICAgIGRYICogTWF0aC5wb3coZFksIDQpKSArICgwLjAwMDIyICogTWF0aC5wb3coZFksXHJcbiAgICAgIDIpKSArICgtMC4wMDAyMiAqIE1hdGgucG93KFxyXG4gICAgICBkWCwgMikpICsgKDAuMDAwMjYgKlxyXG4gICAgICBNYXRoLnBvdyhkWCwgNSkpO1xyXG4gICAgXHJcbiAgICBjb25zdCBMYXRpdHVkZSA9IDUyLjE1NTE3ICsgKFNvbU4gLyAzNjAwKTtcclxuICAgIGNvbnN0IExvbmdpdHVkZSA9IDUuMzg3MjA2ICsgKFNvbUUgLyAzNjAwKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIFtMb25naXR1ZGUsIExhdGl0dWRlXVxyXG4gIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBDb25uZWN0aW9uLCBNb2RlbCwgTW9uZ29vc2UsIEZpbHRlclF1ZXJ5LCBTY2hlbWEgfSBmcm9tICdtb25nb29zZSc7XHJcbmltcG9ydCB7IFRyaXAgfSBmcm9tICcuL3R5cGVzL1RyaXAnO1xyXG5pbXBvcnQgeyBWZWhpY2xlRGF0YSwgdmVoaWNsZVN0YXRlIH0gZnJvbSAnLi90eXBlcy9WZWhpY2xlRGF0YSc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xyXG5jb25zdCBzdHJlYW1Ub01vbmdvREIgPSByZXF1aXJlKCdzdHJlYW0tdG8tbW9uZ28tZGInKS5zdHJlYW1Ub01vbmdvREI7XHJcbmNvbnN0IHNwbGl0ID0gcmVxdWlyZSgnc3BsaXQnKTtcclxuZXhwb3J0IGNsYXNzIERhdGFiYXNlIHtcclxuICBcclxuICBwcml2YXRlIHN0YXRpYyBpbnN0YW5jZSA6IERhdGFiYXNlO1xyXG4gIFxyXG4gIHByaXZhdGUgZGIgOiBDb25uZWN0aW9uO1xyXG4gIHByaXZhdGUgbW9uZ29vc2UgOiBNb25nb29zZTtcclxuICBwcml2YXRlIHZlaGljbGVTY2hlbWEgOiBTY2hlbWE7XHJcbiAgcHJpdmF0ZSB0cmlwc1NjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIHZlaGljbGVNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIHRyaXBNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIG91dHB1dERCQ29uZmlnO1xyXG5cclxuICBwdWJsaWMgc3RhdGljIGdldEluc3RhbmNlKCk6IERhdGFiYXNlIHtcclxuICAgIGlmKCFEYXRhYmFzZS5pbnN0YW5jZSlcclxuICAgICAgRGF0YWJhc2UuaW5zdGFuY2UgPSBuZXcgRGF0YWJhc2UoKTtcclxuXHJcbiAgICByZXR1cm4gRGF0YWJhc2UuaW5zdGFuY2U7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgSW5pdCgpIHtcclxuICAgIGNvbnN0IHVybCA6IHN0cmluZyA9IHByb2Nlc3MuZW52LkRBVEFCQVNFX1VSTDtcclxuICAgIGNvbnN0IG5hbWUgOiBzdHJpbmcgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9OQU1FO1xyXG5cclxuICAgIHRoaXMubW9uZ29vc2UgPSBuZXcgTW9uZ29vc2UoKTtcclxuICAgIFxyXG4gICAgdGhpcy5tb25nb29zZS5zZXQoJ3VzZUZpbmRBbmRNb2RpZnknLCBmYWxzZSlcclxuXHJcbiAgICBpZighdXJsICYmICFuYW1lKSB0aHJvdyAoYEludmFsaWQgVVJMIG9yIG5hbWUgZ2l2ZW4sIHJlY2VpdmVkOiBcXG4gTmFtZTogJHtuYW1lfSBcXG4gVVJMOiAke3VybH1gKVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBDb25uZWN0aW5nIHRvIGRhdGFiYXNlIHdpdGggbmFtZTogJHtuYW1lfSBhdCB1cmw6ICR7dXJsfWApXHJcbiAgICB0aGlzLm1vbmdvb3NlLmNvbm5lY3QoYCR7dXJsfS8ke25hbWV9YCwge1xyXG4gICAgICB1c2VOZXdVcmxQYXJzZXI6IHRydWUsXHJcbiAgICAgIHVzZVVuaWZpZWRUb3BvbG9neTogdHJ1ZSxcclxuICAgICAgcG9vbFNpemU6IDEyMFxyXG4gICAgfSlcclxuXHJcbiAgICB0aGlzLmRiID0gdGhpcy5tb25nb29zZS5jb25uZWN0aW9uO1xyXG5cclxuICAgIHRoaXMub3V0cHV0REJDb25maWcgPSB7IGRiVVJMIDogYCR7dXJsfS8ke25hbWV9YCwgY29sbGVjdGlvbiA6ICd0cmlwcycgfTtcclxuXHJcbiAgICB0aGlzLmRiLm9uKCdlcnJvcicsIGVycm9yID0+IHtcclxuICAgICAgdGhyb3cgbmV3IGVycm9yKGBFcnJvciBjb25uZWN0aW5nIHRvIGRhdGFiYXNlLiAke2Vycm9yfWApO1xyXG4gICAgfSlcclxuXHJcbiAgICBhd2FpdCB0aGlzLkRhdGFiYXNlTGlzdGVuZXIoKTtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBHZXREYXRhYmFzZSgpIDogQ29ubmVjdGlvbiB7XHJcbiAgICByZXR1cm4gdGhpcy5kYjtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBEYXRhYmFzZUxpc3RlbmVyICgpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcclxuICAgICAgICB0aGlzLmRiLm9uY2UoXCJvcGVuXCIsICgpID0+IHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdGlvbiB0byBkYXRhYmFzZSBlc3RhYmxpc2hlZC5cIilcclxuXHJcbiAgICAgICAgICB0aGlzLnZlaGljbGVTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHBsYW5uaW5nTnVtYmVyOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIGpvdXJuZXlOdW1iZXI6IE51bWJlcixcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHZlaGljbGVOdW1iZXI6IE51bWJlcixcclxuICAgICAgICAgICAgcG9zaXRpb246IFtOdW1iZXIsIE51bWJlcl0sXHJcbiAgICAgICAgICAgIHN0YXR1czogU3RyaW5nLFxyXG4gICAgICAgICAgICBwdW5jdHVhbGl0eTogQXJyYXksXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogTnVtYmVyLFxyXG4gICAgICAgICAgICB1cGRhdGVkQXQ6IE51bWJlcixcclxuICAgICAgICAgICAgdXBkYXRlZFRpbWVzOiBBcnJheVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHRoaXMudHJpcHNTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgc2VydmljZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRyaXBJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB0cmlwTnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRyaXBQbGFubmluZ051bWJlcjogU3RyaW5nLFxyXG4gICAgICAgICAgICB0cmlwSGVhZHNpZ246IFN0cmluZyxcclxuICAgICAgICAgICAgdHJpcE5hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgZGlyZWN0aW9uSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgc2hhcGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB3aGVlbGNoYWlyQWNjZXNzaWJsZTogTnVtYmVyXHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIHRoaXMudHJpcHNTY2hlbWEuaW5kZXgoeyB0cmlwTnVtYmVyOiAtMSwgdHJpcFBsYW5uaW5nTnVtYmVyOiAtMSB9KVxyXG5cclxuICAgICAgICAgIHRoaXMudmVoaWNsZU1vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcIlZlaGljbGVQb3NpdGlvbnNcIiwgdGhpcy52ZWhpY2xlU2NoZW1hKTtcclxuICAgICAgICAgIHRoaXMudHJpcE1vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcInRyaXBzXCIsIHRoaXMudHJpcHNTY2hlbWEpO1xyXG5cclxuICAgICAgICAgIHRoaXMudHJpcE1vZGVsLmNyZWF0ZUluZGV4ZXMoKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgcmVzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0QWxsVmVoaWNsZXMgKGFyZ3MgPSB7fSkgOiBQcm9taXNlPEFycmF5PFZlaGljbGVEYXRhPj4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmQoey4uLmFyZ3N9LCB7IHB1bmN0dWFsaXR5OiAwLCB1cGRhdGVkVGltZXM6IDAsIF9fdiA6IDAgfSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0VmVoaWNsZSAodmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIsIGZpcnN0T25seSA6IGJvb2xlYW4gPSBmYWxzZSkgOiBQcm9taXNlPFZlaGljbGVEYXRhPiB7XHJcbiAgICByZXR1cm4geyBcclxuICAgICAgLi4uYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZSh7XHJcbiAgICAgICAgdmVoaWNsZU51bWJlciA6IHZlaGljbGVOdW1iZXIsXHJcbiAgICAgICAgY29tcGFueTogdHJhbnNwb3J0ZXJcclxuICAgICAgfSlcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgVmVoaWNsZUV4aXN0cyh2ZWhpY2xlTnVtYmVyLCB0cmFuc3BvcnRlcikgOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIHJldHVybiBhd2FpdCB0aGlzLkdldFZlaGljbGUodmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIpICE9PSBudWxsO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFVwZGF0ZVZlaGljbGUgKHZlaGljbGVUb1VwZGF0ZSA6IGFueSwgdXBkYXRlZFZlaGljbGVEYXRhIDogVmVoaWNsZURhdGEsIHBvc2l0aW9uQ2hlY2tzIDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYoIXZlaGljbGVUb1VwZGF0ZVtcIl9kb2NcIl0pIHJldHVyblxyXG5cclxuICAgIHZlaGljbGVUb1VwZGF0ZSA9IHZlaGljbGVUb1VwZGF0ZVtcIl9kb2NcIl07XHJcbiAgICBcclxuICAgIC8vTWVyZ2UgdGhlIHB1bmN0dWFsaXRpZXMgb2YgdGhlIG9sZCB2ZWhpY2xlRGF0YSB3aXRoIHRoZSBuZXcgb25lLlxyXG4gICAgdXBkYXRlZFZlaGljbGVEYXRhLnB1bmN0dWFsaXR5ID0gdmVoaWNsZVRvVXBkYXRlLnB1bmN0dWFsaXR5LmNvbmNhdCh1cGRhdGVkVmVoaWNsZURhdGEucHVuY3R1YWxpdHkpO1xyXG5cclxuICAgIC8vTWVyZ2UgdGhlIHVwZGF0ZWQgdGltZXMgb2YgdGhlIG9sZCB2ZWhpY2xlRGF0YSB3aXRoIHRoZSBuZXcgb25lLlxyXG4gICAgdXBkYXRlZFZlaGljbGVEYXRhLnVwZGF0ZWRUaW1lcyA9IHZlaGljbGVUb1VwZGF0ZS51cGRhdGVkVGltZXMuY29uY2F0KHVwZGF0ZWRWZWhpY2xlRGF0YS51cGRhdGVkVGltZXMpO1xyXG5cclxuICAgIGlmKHBvc2l0aW9uQ2hlY2tzICYmIHVwZGF0ZWRWZWhpY2xlRGF0YS5zdGF0dXMgIT09IHZlaGljbGVTdGF0ZS5PTlJPVVRFKVxyXG4gICAgICB1cGRhdGVkVmVoaWNsZURhdGEucG9zaXRpb24gPSB2ZWhpY2xlVG9VcGRhdGUucG9zaXRpb247XHJcblxyXG4gICAgdXBkYXRlZFZlaGljbGVEYXRhLnVwZGF0ZWRBdCA9IERhdGUubm93KCk7ICBcclxuXHJcbiAgICBhd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kT25lQW5kVXBkYXRlKHZlaGljbGVUb1VwZGF0ZSwgdXBkYXRlZFZlaGljbGVEYXRhKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBBZGRWZWhpY2xlICh2ZWhpY2xlIDogVmVoaWNsZURhdGEsIG9ubHlBZGRXaGlsZU9uUm91dGUgOiBib29sZWFuKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYob25seUFkZFdoaWxlT25Sb3V0ZSAmJiB2ZWhpY2xlLnN0YXR1cyAhPT0gdmVoaWNsZVN0YXRlLk9OUk9VVEUpIHJldHVybjtcclxuICAgIG5ldyB0aGlzLnZlaGljbGVNb2RlbCh7XHJcbiAgICAgIC4uLnZlaGljbGUsXHJcbiAgICAgIHB1bmN0dWFsaXR5IDogdmVoaWNsZS5wdW5jdHVhbGl0eVxyXG4gICAgfSkuc2F2ZShlcnJvciA9PiB7XHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGBTb21ldGhpbmcgd2VudCB3cm9uZyB3aGlsZSB0cnlpbmcgdG8gYWRkIHZlaGljbGU6ICR7dmVoaWNsZS52ZWhpY2xlTnVtYmVyfS4gRXJyb3I6ICR7ZXJyb3J9YClcclxuICAgIH0pXHJcbiAgfVxyXG4gIFxyXG4gIHB1YmxpYyBhc3luYyBSZW1vdmVWZWhpY2xlICh2ZWhpY2xlIDogVmVoaWNsZURhdGEpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZighdmVoaWNsZVtcIl9kb2NcIl0pIHJldHVyblxyXG5cclxuICAgIHRoaXMudmVoaWNsZU1vZGVsLmZpbmRPbmVBbmREZWxldGUodmVoaWNsZSlcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBSZW1vdmVWZWhpY2xlc1doZXJlKCBwYXJhbXMgOiBvYmplY3QsIGRvTG9nZ2luZyA6IGJvb2xlYW4gPSBmYWxzZSkgOiBQcm9taXNlPEFycmF5PFZlaGljbGVEYXRhPj4ge1xyXG4gICAgY29uc3QgcmVtb3ZlZFZlaGljbGVzIDogQXJyYXk8VmVoaWNsZURhdGE+ID0gYXdhaXQgdGhpcy5HZXRBbGxWZWhpY2xlcyhwYXJhbXMpO1xyXG4gICAgdGhpcy52ZWhpY2xlTW9kZWwuZGVsZXRlTWFueShwYXJhbXMpLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICBpZihkb0xvZ2dpbmcpIGNvbnNvbGUubG9nKGBEZWxldGVkICR7cmVzcG9uc2UuZGVsZXRlZENvdW50fSB2ZWhpY2xlcy5gKTtcclxuICAgICAgXHJcbiAgICB9KTtcclxuICAgIHJldHVybiByZW1vdmVkVmVoaWNsZXM7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0VHJpcHMocGFyYW1zIDogb2JqZWN0ID0ge30pIDogUHJvbWlzZTxBcnJheTxUcmlwPj4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMudHJpcE1vZGVsLmZpbmQocGFyYW1zKVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFRyaXAodHJpcE51bWJlciA6IG51bWJlciwgdHJpcFBsYW5uaW5nTnVtYmVyIDogbnVtYmVyKSB7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnRyaXBNb2RlbC5maW5kT25lKHtcclxuICAgICAgdHJpcE51bWJlciA6IHRyaXBOdW1iZXIsXHJcbiAgICAgIHRyaXBQbGFubmluZ051bWJlcjogdHJpcFBsYW5uaW5nTnVtYmVyLnRvU3RyaW5nKClcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiByZXNwb25zZVtcIl9kb2NcIl07XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgUmVtb3ZlVHJpcChwYXJhbXMgOiBvYmplY3QgPSB7fSwgZG9Mb2dnaW5nIDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy50cmlwTW9kZWwuZGVsZXRlTWFueShwYXJhbXMpLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICBpZihkb0xvZ2dpbmcpIGNvbnNvbGUubG9nKGBEZWxldGVkICR7cmVzcG9uc2UuZGVsZXRlZENvdW50fSB0cmlwc2ApO1xyXG4gICAgfSlcclxuICB9XHJcbiAgLyoqXHJcbiAgICogSW5zZXJ0cyBtYW55IHRyaXBzIGF0IG9uY2UgaW50byB0aGUgZGF0YWJhc2UuXHJcbiAgICogQHBhcmFtIHRyaXBzIFRoZSB0cmlwcyB0byBhZGQuXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIEluc2VydE1hbnlUcmlwcyh0cmlwcykgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgYXdhaXQgdGhpcy50cmlwTW9kZWwuaW5zZXJ0TWFueSh0cmlwcywgeyBvcmRlcmVkOiBmYWxzZSB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSBcIktvcHBlbHZsYWsgNyBhbmQgOCB0dXJib1wiIGZpbGVzIHRvIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBJbnNlcnRUcmlwKHRyaXAgOiBUcmlwKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgbmV3IHRoaXMudHJpcE1vZGVsKHRyaXApLnNhdmUoZXJyb3IgPT4ge1xyXG4gICAgICBpZihlcnJvcikgY29uc29sZS5lcnJvcihgU29tZXRoaW5nIHdlbnQgd3Jvbmcgd2hpbGUgdHJ5aW5nIHRvIGFkZCB0cmlwOiAke3RyaXAudHJpcEhlYWRzaWdufS4gRXJyb3I6ICR7ZXJyb3J9YClcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgRHJvcFRyaXBzQ29sbGVjdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBpbmcgdHJpcHMgY29sbGVjdGlvblwiKTtcclxuICAgIGF3YWl0IHRoaXMudHJpcE1vZGVsLnJlbW92ZSh7fSk7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwZWQgdHJpcHMgY29sbGVjdGlvblwiKTtcclxuICB9XHJcblxyXG4gIC8vIHB1YmxpYyBhc3luYyBBZGRSb3V0ZSgpXHJcblxyXG59XHJcbiIsIi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAgIEFQUCBDT05GSUdcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcblxyXG5pbXBvcnQgKiBhcyBkb3RlbnYgZnJvbSAnZG90ZW52JztcclxuZG90ZW52LmNvbmZpZygpO1xyXG5cclxuY29uc3QgcG9ydCA9IHByb2Nlc3MuZW52LlBPUlQgfHwgMzAwMjtcclxuXHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAgIFlBUk4gSU1QT1JUU1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuaW1wb3J0ICogYXMgaHR0cHMgZnJvbSAnaHR0cHMnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcblxyXG5jb25zdCBleHByZXNzID0gcmVxdWlyZShcImV4cHJlc3NcIik7XHJcbmNvbnN0IGNvcnMgPSByZXF1aXJlKFwiY29yc1wiKTtcclxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIENVU1RPTSBJTVBPUlRTXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5cclxuaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tICcuL2RhdGFiYXNlJztcclxuaW1wb3J0IHsgV2Vic29ja2V0IH0gZnJvbSAnLi9zb2NrZXQnO1xyXG5pbXBvcnQgeyBPVkRhdGEgfSBmcm9tICcuL3JlYWx0aW1lJztcclxuXHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAgIFNTTCBDT05GSUdcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcbmNvbnN0IHByaXZhdGVLZXkgPSBmcy5yZWFkRmlsZVN5bmMoXCIuL2NlcnRpZmljYXRlL2tleS5rZXlcIikudG9TdHJpbmcoKTtcclxuY29uc3QgY2VydGlmaWNhdGUgPSBmcy5yZWFkRmlsZVN5bmMoXCIuL2NlcnRpZmljYXRlL2NlcnQuY3J0XCIpLnRvU3RyaW5nKCk7XHJcbmNvbnN0IGNhID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9rZXktY2EuY3J0XCIpLnRvU3RyaW5nKCk7XHJcblxyXG5jb25zdCBBcHBJbml0ID0gYXN5bmMgKCkgPT4ge1xyXG4gIGNvbnN0IGRiID0gYXdhaXQgRGF0YWJhc2UuZ2V0SW5zdGFuY2UoKS5Jbml0KCkudGhlbigpO1xyXG4gIFxyXG4gIGNvbnN0IGFwcCA9IChtb2R1bGUuZXhwb3J0cyA9IGV4cHJlc3MoKSk7XHJcblxyXG4gIGNvbnN0IHNlcnZlciA9IGh0dHBzLmNyZWF0ZVNlcnZlcihcclxuICAgIHtcclxuICAgICAga2V5OiBwcml2YXRlS2V5LFxyXG4gICAgICBjZXJ0OiBjZXJ0aWZpY2F0ZSxcclxuICAgICAgY2E6IGNhLFxyXG4gICAgICByZXF1ZXN0Q2VydDogdHJ1ZSxcclxuICAgICAgcmVqZWN0VW5hdXRob3JpemVkOiBmYWxzZSxcclxuICAgIH0sXHJcbiAgICBhcHBcclxuICApO1xyXG4gIFxyXG5cclxuICAvL1RISVMgSVMgTk9UIFNBRkVcclxuXHJcbiAgY29uc3QgY29yc09wdGlvbnMgPSB7XHJcbiAgICBvcmlnaW46ICcqJyxcclxuICAgIG9wdGlvbnNTdWNjZXNzU3RhdHVzOiAyMDBcclxuICB9XHJcblxyXG4gIGFwcC51c2UoY29ycyhjb3JzT3B0aW9ucykpXHJcbiAgYXBwLm9wdGlvbnMoJyonLCBjb3JzKCkpXHJcblxyXG5cclxuICBjb25zdCBzb2NrZXQgPSBuZXcgV2Vic29ja2V0KHNlcnZlciwgZGIpO1xyXG4gIGNvbnN0IG92ID0gbmV3IE9WRGF0YShkYiwgc29ja2V0KTtcclxuICAvL2J1c0xvZ2ljLkluaXRLVjc4KCk7XHJcbiAgXHJcbiAgc2VydmVyLmxpc3Rlbihwb3J0LCAoKSA9PiBjb25zb2xlLmxvZyhgTGlzdGVuaW5nIGF0IGh0dHA6Ly9sb2NhbGhvc3Q6JHtwb3J0fWApKTtcclxuXHJcbn1cclxuXHJcbkFwcEluaXQoKTtcclxuIiwiaW1wb3J0IHsgVmVoaWNsZURhdGEgfSBmcm9tIFwiLi90eXBlcy9WZWhpY2xlRGF0YVwiO1xyXG5pbXBvcnQgeyBndW56aXAgfSBmcm9tICd6bGliJztcclxuaW1wb3J0IHsgQ29udmVydGVyIH0gZnJvbSAnLi9jb252ZXJ0ZXInO1xyXG5pbXBvcnQgeyBCdXNMb2dpYyB9IGZyb20gXCIuL2J1c2xvZ2ljXCI7XHJcblxyXG5pbXBvcnQgKiBhcyB4bWwgZnJvbSAnZmFzdC14bWwtcGFyc2VyJztcclxuaW1wb3J0IHsgV2Vic29ja2V0IH0gZnJvbSBcIi4vc29ja2V0XCI7XHJcblxyXG5jb25zdCB6bXEgPSByZXF1aXJlKCd6ZXJvbXEnKTtcclxuY29uc3QgZG9Mb2dnaW5nID0gcHJvY2Vzcy5lbnYuQVBQX0RPX0xPR0dJTkcgPT0gXCJ0cnVlXCIgPyB0cnVlIDogZmFsc2U7XHJcbmV4cG9ydCBjbGFzcyBPVkRhdGEge1xyXG4gIFxyXG4gIHByaXZhdGUgc29jaztcclxuICBwcml2YXRlIGt2Nzhzb2NrZXQ7XHJcbiAgcHJpdmF0ZSBidXNMb2dpYyA6IEJ1c0xvZ2ljO1xyXG4gIHByaXZhdGUgd2Vic29ja2V0IDogV2Vic29ja2V0O1xyXG5cclxuICBjb25zdHJ1Y3RvcihkYXRhYmFzZSwgc29ja2V0IDogV2Vic29ja2V0KSB7XHJcbiAgICB0aGlzLndlYnNvY2tldCA9IHNvY2tldDtcclxuICAgIHRoaXMuSW5pdCgpO1xyXG4gICAgdGhpcy5idXNMb2dpYyA9IG5ldyBCdXNMb2dpYyhkYXRhYmFzZSwgZmFsc2UpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIEluaXQoKSB7XHJcblxyXG4gICAgY29uc3QgY29udmVydGVyID0gbmV3IENvbnZlcnRlcigpO1xyXG5cclxuICAgIHRoaXMuc29jayA9IHptcS5zb2NrZXQoXCJzdWJcIik7XHJcblxyXG4gICAgdGhpcy5zb2NrLmNvbm5lY3QoXCJ0Y3A6Ly9wdWJzdWIubmRvdmxva2V0Lm5sOjc2NThcIik7XHJcbiAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL0FSUi9LVjZwb3NpbmZvXCIpO1xyXG4gICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9DWFgvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvRUJTL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL1FCVVpaL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL1JJRy9LVjZwb3NpbmZvXCIpO1xyXG4gICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9LRU9MSVMvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvU1lOVFVTL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL09QRU5PVi9LVjZwb3NpbmZvXCIpO1xyXG4gICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9HVkIvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvRElUUC9LVjZwb3NpbmZvXCIpO1xyXG5cclxuICAgIHRoaXMuc29jay5vbihcIm1lc3NhZ2VcIiwgKG9wQ29kZSwgLi4uY29udGVudCkgPT4ge1xyXG4gICAgICBjb25zdCBjb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoY29udGVudCk7XHJcbiAgICAgIGNvbnN0IG9wZXJhdG9yID0gb3BDb2RlLnRvU3RyaW5nKCk7XHJcbiAgICAgIGd1bnppcChjb250ZW50cywgYXN5bmMoZXJyb3IsIGJ1ZmZlcikgPT4ge1xyXG4gICAgICAgIGlmKGVycm9yKSByZXR1cm4gY29uc29sZS5lcnJvcihgU29tZXRoaW5nIHdlbnQgd3Jvbmcgd2hpbGUgdHJ5aW5nIHRvIHVuemlwLiAke2Vycm9yfWApXHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgZW5jb2RlZFhNTCA9IGJ1ZmZlci50b1N0cmluZygpO1xyXG4gICAgICAgIGNvbnN0IGRlY29kZWQgPSB4bWwucGFyc2UoZW5jb2RlZFhNTCk7XHJcbiAgICAgICAgbGV0IHZlaGljbGVEYXRhO1xyXG5cclxuICAgICAgICBcclxuXHJcbiAgICAgICAgaWYob3BlcmF0b3IgIT09IFwiL0tFT0xJUy9LVjZwb3NpbmZvXCIgfHwgb3BlcmF0b3IgIT09IFwiL0dWQi9LVjZwb3NpbmZvXCIpIFxyXG4gICAgICAgICAgdmVoaWNsZURhdGEgPSBjb252ZXJ0ZXIuZGVjb2RlKGRlY29kZWQpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHZlaGljbGVEYXRhID0gY29udmVydGVyLmRlY29kZShkZWNvZGVkLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICBcclxuICAgICAgICBhd2FpdCB0aGlzLmJ1c0xvZ2ljLlVwZGF0ZUJ1c3Nlcyh2ZWhpY2xlRGF0YSk7XHJcblxyXG4gICAgICAgIFxyXG4gICAgICB9KVxyXG5cclxuICAgIH0pXHJcbiAgICBcclxuICAgIHNldEludGVydmFsKCgpID0+IHtcclxuICAgICAgdGhpcy53ZWJzb2NrZXQuRW1pdCgpO1xyXG4gICAgfSwgcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0JVU19VUERBVEVfREVMQVkpKVxyXG4gICAgICAgIFxyXG4gICAgXHJcbiAgICAvLyB0aGlzLmt2Nzhzb2NrZXQgPSB6bXEuc29ja2V0KFwic3ViXCIpO1xyXG4gICAgLy8gdGhpcy5rdjc4c29ja2V0LmNvbm5lY3QoXCJ0Y3A6Ly9wdWJzdWIubmRvdmxva2V0Lm5sOjc4MTdcIik7XHJcbiAgICAvLyB0aGlzLmt2Nzhzb2NrZXQuc3Vic2NyaWJlKFwiL1wiKVxyXG4gICAgLy8gdGhpcy5rdjc4c29ja2V0Lm9uKFwibWVzc2FnZVwiLCAob3BDb2RlLCAuLi5jb250ZW50KSA9PiB7XHJcbiAgICAvLyAgIGNvbnN0IGNvbnRlbnRzID0gQnVmZmVyLmNvbmNhdChjb250ZW50KTtcclxuICAgIC8vICAgZ3VuemlwKGNvbnRlbnRzLCBhc3luYyhlcnJvciwgYnVmZmVyKSA9PiB7IFxyXG4gICAgLy8gICAgIGNvbnNvbGUubG9nKGJ1ZmZlci50b1N0cmluZygndXRmOCcpKVxyXG4gICAgLy8gICB9KTtcclxuICAgIC8vIH0pO1xyXG4gIH1cclxuXHJcbiAgXHJcbn0iLCJpbXBvcnQgeyBWZWhpY2xlRGF0YSB9IGZyb20gXCIuL3R5cGVzL1ZlaGljbGVEYXRhXCI7XHJcbmltcG9ydCB7IFNlcnZlciB9IGZyb20gJ2h0dHBzJztcclxuaW1wb3J0IHsgU29ja2V0IH0gZnJvbSAnc29ja2V0LmlvJztcclxuaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tICcuL2RhdGFiYXNlJztcclxuXHJcbmNvbnN0IGJ1c191cGRhdGVfcmF0ZSA9IHBhcnNlSW50KHByb2Nlc3MuZW52LkFQUF9CVVNfVVBEQVRFX0RFTEFZKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBXZWJzb2NrZXQge1xyXG4gIFxyXG4gIHByaXZhdGUgaW8gOiBTb2NrZXQ7XHJcbiAgcHJpdmF0ZSBhY3RpdmVTb2NrZXQgOiBTb2NrZXQ7XHJcbiAgcHJpdmF0ZSBkYiA6IERhdGFiYXNlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzZXJ2ZXIgOiBTZXJ2ZXIsIGRiIDogRGF0YWJhc2UpIHtcclxuICAgIHRoaXMuU29ja2V0SW5pdChzZXJ2ZXIpO1xyXG4gICAgdGhpcy5kYiA9IGRiO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgU29ja2V0SW5pdChzZXJ2ZXIgOiBTZXJ2ZXIpIHtcclxuICAgIGNvbnNvbGUubG9nKGBJbml0YWxpemluZyB3ZWJzb2NrZXRgKVxyXG5cclxuICAgIHRoaXMuaW8gPSByZXF1aXJlKFwic29ja2V0LmlvXCIpKHNlcnZlciwge1xyXG4gICAgICBjb3JzOiB7XHJcbiAgICAgICAgb3JpZ2luOiBcIipcIixcclxuICAgICAgICBtZXRob2RzOiBbXCJHRVRcIiwgXCJQT1NUXCJdLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5pby5vbihcImNvbm5lY3Rpb25cIiwgc29ja2V0ID0+IHtcclxuICAgICAgdGhpcy5Tb2NrZXQoc29ja2V0KTtcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBTb2NrZXQoc29ja2V0IDogU29ja2V0KSB7XHJcbiAgICB0aGlzLmFjdGl2ZVNvY2tldCA9IHNvY2tldDtcclxuICAgIGNvbnNvbGUubG9nKFwiTmV3IGNsaWVudCBjb25uZWN0ZWQuXCIpO1xyXG5cclxuICAgIC8vIGNvbnN0IGludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xyXG4gICAgLy8gICAgICAgLy9jb25zb2xlLmxvZyhcIkVtaXR0aW5nIG5ldyBkYXRhLlwiKTtcclxuICAgIC8vICAgICAgIHRoaXMuZGIuR2V0QWxsVmVoaWNsZXMoKS50aGVuKCh2ZWhpY2xlcykgPT4ge1xyXG4gICAgLy8gICAgICAgICBzb2NrZXQuZW1pdChcIm92ZGF0YVwiLCB2ZWhpY2xlcyk7XHJcbiAgICAvLyAgICAgICB9KVxyXG4gICAgLy8gfSwgYnVzX3VwZGF0ZV9yYXRlKTtcclxuXHJcbiAgICBzb2NrZXQub24oXCJkaXNjb25uZWN0XCIsICgpID0+IHtcclxuICAgICAgY29uc29sZS5sb2coXCJDbGllbnQgZGlzY29ubmVjdGVkXCIpO1xyXG4gICAgICAvL2NsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIFNlbmREZWxldGVkVmVoaWNsZXModmVoaWNsZXMgOiBBcnJheTxWZWhpY2xlRGF0YT4pIDogdm9pZCB7XHJcbiAgICB0aGlzLmlvLmVtaXQoXCJkZWxldGVkVmVoaWNsZXNcIiwgdmVoaWNsZXMpO1xyXG4gIH1cclxuXHJcbiAgRW1pdCgpIHtcclxuICAgIC8vU21hbGwgZGVsYXkgdG8gbWFrZSBzdXJlIHRoZSBzZXJ2ZXIgY2F0Y2hlcyB1cC5cclxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICB0aGlzLmRiLkdldEFsbFZlaGljbGVzKCkudGhlbigodmVoaWNsZXMpID0+IHtcclxuICAgICAgICB0aGlzLmlvLmVtaXQoXCJvdmRhdGFcIiwgdmVoaWNsZXMpO1xyXG4gICAgICB9KVxyXG4gICAgfSwgMTAwKVxyXG4gICAgLy9UT0RPOiBGaXggdGhpcyB0byBiZSBvbmx5IHRoZSBuZXcgdmVoaWNsZXMgaW5zdGVhZCBvZiBhbGwgdmVoaWNsZXMuXHJcbiAgfVxyXG5cclxufSIsImV4cG9ydCBlbnVtIHZlaGljbGVTdGF0ZSB7XHJcbiAgT05ST1VURSA9ICdPTlJPVVRFJyxcclxuICBPRkZST1VURSA9ICdPRkZST1VURScsXHJcbiAgRU5EID0gXCJFTkRcIixcclxuICBERVBBUlRVUkUgPSAnREVQQVJUVVJFJyxcclxuICBJTklUID0gJ0lOSVQnLFxyXG4gIERFTEFZID0gJ0RFTEFZJyxcclxuICBPTlNUT1AgPSAnT05TVE9QJyxcclxuICBBUlJJVkFMID0gJ0FSUklWQUwnXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVmVoaWNsZURhdGEge1xyXG4gIGNvbXBhbnk6IHN0cmluZyxcclxuICBwbGFubmluZ051bWJlcjogc3RyaW5nLFxyXG4gIGpvdXJuZXlOdW1iZXI6IG51bWJlcixcclxuICB0aW1lc3RhbXA6IG51bWJlcixcclxuICB2ZWhpY2xlTnVtYmVyOiBudW1iZXIsXHJcbiAgcG9zaXRpb246IFtudW1iZXIsIG51bWJlcl0sXHJcbiAgc3RhdHVzOiB2ZWhpY2xlU3RhdGUsXHJcbiAgY3JlYXRlZEF0OiBudW1iZXIsXHJcbiAgdXBkYXRlZEF0OiBudW1iZXIsXHJcbiAgcHVuY3R1YWxpdHk6IEFycmF5PG51bWJlcj4sXHJcbiAgdXBkYXRlZFRpbWVzOiBBcnJheTxudW1iZXI+XHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiY2hpbGRfcHJvY2Vzc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiY29yc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZG90ZW52XCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJleHByZXNzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJmYXN0LXhtbC1wYXJzZXJcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImZzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJodHRwc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwibW9uZ29vc2VcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInBhdGhcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInNvY2tldC5pb1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwic3BsaXRcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInN0cmVhbS10by1tb25nby1kYlwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiemVyb21xXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJ6bGliXCIpOzsiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gc3RhcnR1cFxuLy8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4vLyBUaGlzIGVudHJ5IG1vZHVsZSBpcyByZWZlcmVuY2VkIGJ5IG90aGVyIG1vZHVsZXMgc28gaXQgY2FuJ3QgYmUgaW5saW5lZFxudmFyIF9fd2VicGFja19leHBvcnRzX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKFwiLi9zcmMvbWFpbi50c1wiKTtcbiJdLCJzb3VyY2VSb290IjoiIn0=