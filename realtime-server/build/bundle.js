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
        const updatedVehicles = [];
        await Promise.all(busses.map(async (bus) => {
            const foundTrip = await this.database.GetTrip(bus.journeyNumber, bus.planningNumber, bus.company);
            const foundRoute = await this.database.GetRoute(foundTrip.routeId);
            //TODO: Maybe this should be different.
            bus.lineNumber = "999";
            bus.currentRouteId = 0;
            bus.currentTripId = 0;
            if (foundRoute.company)
                bus.company = foundRoute.company;
            if (foundRoute && foundRoute.routeShortName && foundRoute.routeId) {
                bus.lineNumber = foundRoute.routeShortName;
                bus.currentRouteId = foundRoute.routeId;
            }
            if (foundTrip && foundTrip.tripId)
                bus.currentTripId = foundTrip.tripId;
            let foundVehicle = await this.database.GetVehicle(bus.vehicleNumber, bus.company);
            if (Object.keys(foundVehicle).length !== 0) {
                if (process.env.APP_DO_UPDATE_LOGGING == "true")
                    console.log(`Updating vehicle ${bus.vehicleNumber} from ${bus.company}`);
                if (!foundVehicle["_doc"]) {
                    console.error(`Vehicle ${bus.vehicleNumber} from ${bus.company} did not include a doc. `);
                    return;
                }
                foundVehicle = foundVehicle["_doc"];
                //Merge the punctualities of the old vehicleData with the new one.
                bus.punctuality = foundVehicle.punctuality.concat(bus.punctuality);
                //Merge the updated times of the old vehicleData with the new one.
                bus.updatedTimes = foundVehicle.updatedTimes.concat(bus.updatedTimes);
                if (bus.status !== VehicleData_1.vehicleState.ONROUTE)
                    bus.position = foundVehicle.position;
                if (bus.status === VehicleData_1.vehicleState.INIT || bus.status === VehicleData_1.vehicleState.END) {
                    bus.punctuality = [];
                    bus.updatedTimes = [];
                }
                //TODO: Remove punctuality data older than 60 minutes.
                bus.updatedAt = Date.now();
                if (Object.keys(foundTrip).length !== 0)
                    this.AddPositionToTripRoute(foundTrip.tripId, foundTrip.company, bus.position);
                updatedVehicles.push(await this.database.UpdateVehicle(foundVehicle, bus, true));
            }
            else {
                if (process.env.APP_DO_CREATE_LOGGING == "true")
                    console.log(`creating new vehicle ${bus.vehicleNumber} from ${bus.company}`);
                if (bus.status === VehicleData_1.vehicleState.ONROUTE || bus.status === VehicleData_1.vehicleState.OFFROUTE)
                    updatedVehicles.push(await this.database.AddVehicle(bus));
            }
        }));
        return updatedVehicles;
    }
    //Todo: Fix vehicles being "null"?
    ConvertToWebsocket(vehicles) {
        const newVehicles = [];
        for (const vehicle of vehicles) {
            if (vehicle === null)
                continue;
            newVehicles.push({
                i: vehicle._id,
                p: vehicle.position,
                c: vehicle.company,
                n: vehicle.lineNumber,
                v: vehicle.vehicleNumber
            });
        }
        return newVehicles;
    }
    async AddPositionToTripRoute(tripId, company, position) {
        if (position[0] == 3.3135291562643467)
            return;
        let retrievedTripRouteData = await this.database.GetTripPositions(tripId, company);
        if (retrievedTripRouteData) {
            retrievedTripRouteData.updatedTimes.push(new Date().getTime());
            const newUpdatedTimes = retrievedTripRouteData.updatedTimes;
            retrievedTripRouteData.positions.push(position);
            let resultArray = retrievedTripRouteData.positions;
            retrievedTripRouteData = {
                tripId: tripId,
                company: company,
                positions: resultArray,
                updatedTimes: newUpdatedTimes
            };
        }
        else
            retrievedTripRouteData = {
                tripId: tripId,
                company: company,
                positions: [position],
                updatedTimes: [new Date().getTime()]
            };
        await this.database.UpdateTripPositions(tripId, company, retrievedTripRouteData);
    }
    /**
     * Fetches all the busses in the websocket format without any extra information.
     */
    async FetchBussesSmall() {
        const result = await this.database.GetAllVehiclesSmall();
        const smallBusses = [];
        result.forEach(res => {
            smallBusses.push({
                i: res._id,
                p: res.position,
                c: res.company,
                v: res.vehicleNumber,
                n: res.lineNumber
            });
        });
        return smallBusses;
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
const Companies_1 = __webpack_require__(/*! ./types/Companies */ "./src/types/Companies.ts");
class Converter {
    decode(data, operator) {
        const company = this.CheckCompany(operator);
        switch (company) {
            case Companies_1.Companies.ARR:
                return this.DecodeMain(data);
            case Companies_1.Companies.CXX:
                return this.DecodeMain(data);
            case Companies_1.Companies.EBS:
                return this.DecodeMain(data);
            case Companies_1.Companies.QBUZZ:
                return this.DecodeMain(data);
            case Companies_1.Companies.RIG:
                return this.DecodeMain(data);
            case Companies_1.Companies.OPENOV:
                return this.DecodeMain(data);
            case Companies_1.Companies.DITP:
                return this.DecodeMain(data);
            case Companies_1.Companies.KEOLIS:
                return this.DecodeOther(data);
            case Companies_1.Companies.GVB:
                return this.DecodeOther(data);
            default:
                console.error(`Company ${company} unknown.`);
                break;
        }
    }
    /**
    * This is the main decoding function. It works for Arriva, Connexxion, EBS, QBUZZ, RIG (RET), OPENOV, DITP
    * @param data The required data. It should be of type "KV6Generic", which works for the companies mentioned above.
    * @returns An array with the converted vehicledata.
    */
    DecodeMain(data) {
        const returnData = [];
        if (data.VV_TM_PUSH.KV6posinfo) {
            const kv6posinfo = data.VV_TM_PUSH.KV6posinfo;
            if (Object.keys(kv6posinfo).length > 0)
                Object.keys(kv6posinfo).forEach(VehicleStatusCode => {
                    if (Array.isArray(kv6posinfo[VehicleStatusCode])) {
                        for (const vehicleData of kv6posinfo[VehicleStatusCode]) {
                            //TODO: This maybe is stupid. Causes types without vehicleNumber to not appear.
                            if (!vehicleData.vehiclenumber)
                                continue;
                            returnData.push(this.Mapper(vehicleData, VehicleStatusCode));
                        }
                    }
                    else if (kv6posinfo[VehicleStatusCode].vehiclenumber)
                        returnData.push(this.Mapper(kv6posinfo[VehicleStatusCode], VehicleStatusCode));
                });
        }
        return returnData;
    }
    /**
    * This is the secondary decoding function. It works for Keolis and GVB
    * @param data The required data. It should be of type "KV6Generic", which works for the companies mentioned above.
    * @returns An array with the converted vehicledata.
    */
    DecodeOther(data) {
        const returnData = [];
        if (data.VV_TM_PUSH.KV6posinfo) {
            const kv6posinfo = data.VV_TM_PUSH.KV6posinfo;
            if (Array.isArray(kv6posinfo)) {
                for (const StatusObject of kv6posinfo) {
                    const VehicleStatusCode = Object.keys(StatusObject)[0];
                    returnData.push(this.Mapper(StatusObject[VehicleStatusCode], VehicleStatusCode));
                }
            }
            else {
                const VehicleStatusCode = Object.keys(kv6posinfo)[0];
                returnData.push(this.Mapper(kv6posinfo[VehicleStatusCode], VehicleStatusCode));
            }
        }
        return returnData;
    }
    CheckCompany(operator) {
        let returnCompany;
        Object.values(Companies_1.Companies).forEach(company => {
            if (operator.includes(company))
                returnCompany = company;
        });
        return returnCompany;
    }
    Mapper(vehiclePosData, status) {
        const newData = {
            company: vehiclePosData.dataownercode,
            originalCompany: vehiclePosData.dataownercode,
            planningNumber: vehiclePosData.lineplanningnumber.toString(),
            journeyNumber: vehiclePosData.journeynumber,
            timestamp: Date.parse(vehiclePosData.timestamp),
            vehicleNumber: vehiclePosData.vehiclenumber ? vehiclePosData.vehiclenumber : 999999,
            lineNumber: "Onbekend",
            position: this.rdToLatLong(vehiclePosData['rd-x'], vehiclePosData['rd-y']),
            punctuality: [vehiclePosData.punctuality],
            status: VehicleData_1.vehicleState[status],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            updatedTimes: [Date.now()],
            currentRouteId: 0,
            currentTripId: 0
        };
        return newData;
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
                    updatedTimes: Array,
                    currentRouteId: Number,
                    currentTripId: Number,
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
                this.drivenRoutesSchema = new this.mongoose.Schema({
                    tripId: Number,
                    company: String,
                    positions: Array,
                    updatedTimes: Array
                });
                this.tripsSchema.index({ tripNumber: -1, tripPlanningNumber: -1, company: -1 });
                this.drivenRoutesSchema.index({ tripId: -1, company: -1 });
                this.vehicleModel = this.mongoose.model("VehiclePositions", this.vehicleSchema);
                this.tripModel = this.mongoose.model("trips", this.tripsSchema);
                this.routesModel = this.mongoose.model("routes", this.routesSchema);
                this.drivenRoutesModel = this.mongoose.model("drivenroutes", this.drivenRoutesSchema);
                this.tripModel.createIndexes();
                res();
            });
        });
    }
    async GetAllVehicles(args = {}) {
        return await this.vehicleModel.find({ ...args }, { punctuality: 0, updatedTimes: 0, __v: 0 });
    }
    async GetAllVehiclesSmall(args = {}) {
        return await this.vehicleModel.find({ ...args }, {
            punctuality: 0,
            updatedTimes: 0,
            __v: 0,
            journeyNumber: 0,
            timestamp: 0,
            createdAt: 0,
            updatedAt: 0,
            currentRouteId: 0,
            currentTripId: 0,
            planningNumber: 0,
            status: 0
        });
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
        return await this.vehicleModel.findOneAndUpdate(vehicleToUpdate, updatedVehicleData);
    }
    async AddVehicle(vehicle) {
        try {
            return await this.vehicleModel.create({ ...vehicle });
        }
        catch (error) {
            console.error(error);
        }
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
    async UpdateTripPositions(tripId, company, tripData) {
        await this.drivenRoutesModel.findOneAndUpdate({
            tripId: tripId,
            company: company
        }, tripData, { upsert: true });
    }
    async GetTripPositions(tripId, company) {
        return await this.drivenRoutesModel.findOne({
            tripId: tripId,
            company: company,
        });
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
    //Todo: Cors only for own server
    const corsOptions = {
        origin: '*',
        optionsSuccessStatus: 200
    };
    app.use(cors(corsOptions));
    app.options('*', cors());
    const socket = new socket_1.Websocket(server, db);
    const ov = new realtime_1.OVData(db, socket);
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
// const zmq = require('zeromq');
const zmq = __importStar(__webpack_require__(/*! zeromq */ "zeromq"));
class OVData {
    constructor(database, socket) {
        this.websocket = socket;
        this.Init();
        this.busLogic = new buslogic_1.BusLogic(database, false);
    }
    Init() {
        const converter = new converter_1.Converter();
        this.busSocket = zmq.socket("sub");
        // this.trainSocket = zmq.socket("sub");
        this.busSocket.connect("tcp://pubsub.ndovloket.nl:7658");
        this.busSocket.subscribe("/ARR/KV6posinfo");
        this.busSocket.subscribe("/CXX/KV6posinfo");
        this.busSocket.subscribe("/DITP/KV6posinfo");
        this.busSocket.subscribe("/EBS/KV6posinfo");
        this.busSocket.subscribe("/GVB/KV6posinfo");
        this.busSocket.subscribe("/OPENOV/KV6posinfo");
        this.busSocket.subscribe("/QBUZZ/KV6posinfo");
        this.busSocket.subscribe("/RIG/KV6posinfo");
        this.busSocket.subscribe("/KEOLIS/KV6posinfo");
        this.busSocket.on("message", (opCode, ...content) => {
            const contents = Buffer.concat(content);
            const operator = opCode.toString();
            zlib_1.gunzip(contents, async (error, buffer) => {
                if (error)
                    return console.error(`Something went wrong while trying to unzip. ${error}`);
                const encodedXML = buffer.toString();
                const decoded = xml.parse(this.removeTmi8(encodedXML));
                let vehicleData = converter.decode(decoded, operator);
                const updatedVehicles = await this.busLogic.UpdateBusses(vehicleData);
                if (updatedVehicles.length > 0) {
                    const convertedUpdatedVehicles = await this.busLogic.ConvertToWebsocket(updatedVehicles);
                    this.websocket.Emit(convertedUpdatedVehicles);
                }
            });
        });
        // this.trainSocket.connect("tcp://pubsub.ndovloket.nl:7664");
        // this.trainSocket.subscribe("/RIG/InfoPlusVTBSInterface5");
        // this.trainSocket.subscribe("/RIG/InfoPlusVTBLInterface5");
        // this.trainSocket.on("message", (opCode : any, ...content : any) => {
        //   const contents = Buffer.concat(content);
        //   const operator = opCode.toString();
        //   console.log(operator);
        //   gunzip(contents, async(error, buffer) => {
        //     if(error) return console.error(`Something went wrong while trying to unzip. ${error}`)
        //     const encodedXML = buffer.toString();
        //     const decoded = xml.parse(this.removeTmi8(encodedXML));
        //     fs.writeFile("InfoPlusVTBSInterface5.json", JSON.stringify(decoded), () => {})
        //     // console.log(decoded)
        //     // let vehicleData : Array<VehicleData> = converter.decode(decoded, operator);
        //     // await this.busLogic.UpdateBusses(vehicleData);
        //   })
        // })
        setInterval(() => {
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
    removeTmi8(data) {
        return data.replace(/tmi8:/g, "");
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
        console.log("New client connected.");
        socket.on("disconnect", () => {
            console.log("Client disconnected");
            //clearInterval(interval);
        });
    }
    SendDeletedVehicles(vehicles) {
        this.io.emit("deletedVehicles", vehicles);
    }
    CreateBufferFromVehicles(vehicles) {
        let buf = Buffer.alloc((4 + 4 + 4 + 39) * vehicles.length);
        vehicles.forEach((vehicle, index) => {
            buf.writeFloatBE(vehicle.p[0], index * 51);
            buf.writeFloatBE(vehicle.p[1], index * 51 + 4);
            buf.writeUInt32BE(vehicle.v, index * 51 + 4 + 4);
            buf.write(`${vehicle.c}|${vehicle.n}|${vehicle.i}`, index * 51 + 4 + 4 + 4);
            for (let i = 0; i < 39 - (vehicle.c.length + 1 + vehicle.n.length); i++) {
                buf.writeUInt8(0, index * 51 + 4 + 4 + 4 + vehicle.c.length + 1 + vehicle.n.length);
            }
        });
        return buf;
    }
    Emit(vehicles) {
        setTimeout(() => {
            //Todo: See if this really is a smart way and if it saves data.
            const buffer = this.CreateBufferFromVehicles(vehicles);
            // const compressed = zlib.deflate(buffer, (err, buffer) => {
            //   if(!err) this.io.emit("ovdata", buffer)
            // })
            this.io.emit("ovdata", buffer);
            //Small delay to make sure the server catches up.
        }, 100);
    }
}
exports.Websocket = Websocket;


/***/ }),

/***/ "./src/types/Companies.ts":
/*!********************************!*\
  !*** ./src/types/Companies.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Companies = void 0;
exports.Companies = {
    ARR: "ARR",
    CXX: "CXX",
    DITP: "DITP",
    EBS: "EBS",
    GVB: "GVB",
    KEOLIS: "KEOLIS",
    OPENOV: "OPENOV",
    QBUZZ: "QBUZZ",
    RIG: "RIG"
};


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9idXNsb2dpYy50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9jb252ZXJ0ZXIudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvZGF0YWJhc2UudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvbWFpbi50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9yZWFsdGltZS50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9zb2NrZXQudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvdHlwZXMvQ29tcGFuaWVzLnRzIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyLy4vc3JjL3R5cGVzL1ZlaGljbGVEYXRhLnRzIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiY2hpbGRfcHJvY2Vzc1wiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiY29yc1wiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiZG90ZW52XCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJleHByZXNzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJmYXN0LXhtbC1wYXJzZXJcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcImZzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJodHRwc1wiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwibW9uZ29vc2VcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcInBhdGhcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcInNvY2tldC5pb1wiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwic3BsaXRcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcInN0cmVhbS10by1tb25nby1kYlwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiemVyb21xXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJ6bGliXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvd2VicGFjay9zdGFydHVwIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsbUdBQW1GO0FBQ25GLHVEQUErQjtBQUMvQiw2REFBeUI7QUFHekIsa0ZBQXFDO0FBTXJDLE1BQWEsUUFBUTtJQUluQixZQUFZLFFBQVEsRUFBRSxTQUFtQixLQUFLO1FBQzVDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBRXpCLElBQUcsTUFBTTtZQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBRU8sS0FBSyxDQUFDLFVBQVU7UUFDdEIsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFekIsV0FBVyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ3JCLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzNCLENBQUMsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRDs7O09BR0c7SUFDSyxLQUFLLENBQUMsWUFBWSxDQUFDLE1BQTJCO1FBQ3BE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Q0FBQztRQUVyRCxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxJQUFJLEdBQUcsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNO1lBQ3ZFLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDOUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPO1lBQzdDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU87WUFDOUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTztZQUM1QyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQ3hELEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTztZQUN4QixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDWCxNQUFNLElBQUksR0FBRyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPO1lBQy9ELEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDNUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPO1lBQ2xCLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDNUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUN2QixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQzVDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUNsQixFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFDOUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQzFCLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUNsQixJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUs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QTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7VUN0QkE7VUFDQTtVQUNBO1VBQ0EiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tIFwiLi9kYXRhYmFzZVwiO1xyXG5pbXBvcnQgeyBWZWhpY2xlRGF0YSwgVmVoaWNsZURhdGFXaXRoSWQsIHZlaGljbGVTdGF0ZSB9IGZyb20gXCIuL3R5cGVzL1ZlaGljbGVEYXRhXCI7XHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgeyBUcmlwIH0gZnJvbSBcIi4vdHlwZXMvVHJpcFwiO1xyXG5pbXBvcnQgeyBBcGlUcmlwIH0gZnJvbSBcIi4vdHlwZXMvQXBpVHJpcFwiO1xyXG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XHJcbmltcG9ydCB7IFJvdXRlIH0gZnJvbSBcIi4vdHlwZXMvUm91dGVcIjtcclxuaW1wb3J0IHsgVHJpcFBvc2l0aW9uRGF0YSB9IGZyb20gXCIuL3R5cGVzL1RyaXBQb3NpdGlvbkRhdGFcIjtcclxuaW1wb3J0ICogYXMgdHVyZiBmcm9tICdAdHVyZi90dXJmJ1xyXG5pbXBvcnQgeyBXZWJzb2NrZXRWZWhpY2xlRGF0YSB9IGZyb20gXCIuL3R5cGVzL1dlYnNvY2tldFZlaGljbGVEYXRhXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQnVzTG9naWMge1xyXG5cclxuICBwcml2YXRlIGRhdGFiYXNlIDogRGF0YWJhc2U7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGRhdGFiYXNlLCBkb0luaXQgOiBib29sZWFuID0gZmFsc2UpIHtcclxuICAgIHRoaXMuZGF0YWJhc2UgPSBkYXRhYmFzZTtcclxuXHJcbiAgICBpZihkb0luaXQpIHRoaXMuSW5pdGlhbGl6ZSgpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBJbml0aWFsaXplKCkge1xyXG4gICAgYXdhaXQgdGhpcy5DbGVhckJ1c3NlcygpO1xyXG5cclxuICAgIHNldEludGVydmFsKGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgdGhpcy5DbGVhckJ1c3NlcygpO1xyXG4gICAgfSwgcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0NMRUFOVVBfREVMQVkpKVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRlcyBvciBjcmVhdGVzIGEgbmV3IGJ1cyBkZXBlbmRpbmcgb24gaWYgaXQgYWxyZWFkeSBleGlzdHMgb3Igbm90LlxyXG4gICAqIEBwYXJhbSBidXNzZXMgVGhlIGxpc3Qgb2YgYnVzc2VzIHRvIHVwZGF0ZS5cclxuICAgKi9cclxuICAgcHVibGljIGFzeW5jIFVwZGF0ZUJ1c3NlcyhidXNzZXMgOiBBcnJheTxWZWhpY2xlRGF0YT4pIDogUHJvbWlzZTxBcnJheTxWZWhpY2xlRGF0YVdpdGhJZD4+IHtcclxuICAgIGNvbnN0IHVwZGF0ZWRWZWhpY2xlcyA6IEFycmF5PFZlaGljbGVEYXRhV2l0aElkPiA9IFtdO1xyXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoYnVzc2VzLm1hcChhc3luYyAoYnVzKSA9PiB7XHJcbiAgICAgIGNvbnN0IGZvdW5kVHJpcCA6IFRyaXAgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFRyaXAoYnVzLmpvdXJuZXlOdW1iZXIsIGJ1cy5wbGFubmluZ051bWJlciwgYnVzLmNvbXBhbnkpO1xyXG4gICAgICBjb25zdCBmb3VuZFJvdXRlIDogUm91dGUgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFJvdXRlKGZvdW5kVHJpcC5yb3V0ZUlkKTtcclxuXHJcbiAgICAgIC8vVE9ETzogTWF5YmUgdGhpcyBzaG91bGQgYmUgZGlmZmVyZW50LlxyXG4gICAgICBidXMubGluZU51bWJlciA9IFwiOTk5XCI7XHJcbiAgICAgIGJ1cy5jdXJyZW50Um91dGVJZCA9IDA7XHJcbiAgICAgIGJ1cy5jdXJyZW50VHJpcElkID0gMDtcclxuXHJcbiAgICAgIGlmKGZvdW5kUm91dGUuY29tcGFueSkgYnVzLmNvbXBhbnkgPSBmb3VuZFJvdXRlLmNvbXBhbnk7XHJcbiAgICAgIGlmKGZvdW5kUm91dGUgJiYgZm91bmRSb3V0ZS5yb3V0ZVNob3J0TmFtZSAmJiBmb3VuZFJvdXRlLnJvdXRlSWQpIHtcclxuICAgICAgICBidXMubGluZU51bWJlciA9IGZvdW5kUm91dGUucm91dGVTaG9ydE5hbWU7XHJcbiAgICAgICAgYnVzLmN1cnJlbnRSb3V0ZUlkID0gZm91bmRSb3V0ZS5yb3V0ZUlkXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKGZvdW5kVHJpcCAmJiBmb3VuZFRyaXAudHJpcElkKSBidXMuY3VycmVudFRyaXBJZCA9IGZvdW5kVHJpcC50cmlwSWQ7XHJcblxyXG4gICAgICBsZXQgZm91bmRWZWhpY2xlIDogVmVoaWNsZURhdGEgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFZlaGljbGUoYnVzLnZlaGljbGVOdW1iZXIsIGJ1cy5jb21wYW55KTtcclxuICAgICAgXHJcbiAgICAgIFxyXG5cclxuICAgICAgaWYoT2JqZWN0LmtleXMoZm91bmRWZWhpY2xlKS5sZW5ndGggIT09IDApIHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fVVBEQVRFX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBVcGRhdGluZyB2ZWhpY2xlICR7YnVzLnZlaGljbGVOdW1iZXJ9IGZyb20gJHtidXMuY29tcGFueX1gKVxyXG4gICAgICAgIGlmKCFmb3VuZFZlaGljbGVbXCJfZG9jXCJdKSB7IGNvbnNvbGUuZXJyb3IoYFZlaGljbGUgJHtidXMudmVoaWNsZU51bWJlcn0gZnJvbSAke2J1cy5jb21wYW55fSBkaWQgbm90IGluY2x1ZGUgYSBkb2MuIGApOyByZXR1cm4gfVxyXG5cclxuICAgICAgICBmb3VuZFZlaGljbGUgPSBmb3VuZFZlaGljbGVbXCJfZG9jXCJdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vTWVyZ2UgdGhlIHB1bmN0dWFsaXRpZXMgb2YgdGhlIG9sZCB2ZWhpY2xlRGF0YSB3aXRoIHRoZSBuZXcgb25lLlxyXG4gICAgICAgIGJ1cy5wdW5jdHVhbGl0eSA9IGZvdW5kVmVoaWNsZS5wdW5jdHVhbGl0eS5jb25jYXQoYnVzLnB1bmN0dWFsaXR5KTtcclxuXHJcbiAgICAgICAgLy9NZXJnZSB0aGUgdXBkYXRlZCB0aW1lcyBvZiB0aGUgb2xkIHZlaGljbGVEYXRhIHdpdGggdGhlIG5ldyBvbmUuXHJcbiAgICAgICAgYnVzLnVwZGF0ZWRUaW1lcyA9IGZvdW5kVmVoaWNsZS51cGRhdGVkVGltZXMuY29uY2F0KGJ1cy51cGRhdGVkVGltZXMpO1xyXG5cclxuICAgICAgICBpZihidXMuc3RhdHVzICE9PSB2ZWhpY2xlU3RhdGUuT05ST1VURSkgYnVzLnBvc2l0aW9uID0gZm91bmRWZWhpY2xlLnBvc2l0aW9uO1xyXG5cclxuICAgICAgICBpZihidXMuc3RhdHVzID09PSB2ZWhpY2xlU3RhdGUuSU5JVCB8fCBidXMuc3RhdHVzID09PSB2ZWhpY2xlU3RhdGUuRU5EKSB7XHJcbiAgICAgICAgICBidXMucHVuY3R1YWxpdHkgPSBbXTtcclxuICAgICAgICAgIGJ1cy51cGRhdGVkVGltZXMgPSBbXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vVE9ETzogUmVtb3ZlIHB1bmN0dWFsaXR5IGRhdGEgb2xkZXIgdGhhbiA2MCBtaW51dGVzLlxyXG5cclxuICAgICAgICBidXMudXBkYXRlZEF0ID0gRGF0ZS5ub3coKTsgIFxyXG4gICAgICAgIGlmKE9iamVjdC5rZXlzKGZvdW5kVHJpcCkubGVuZ3RoICE9PSAwKSB0aGlzLkFkZFBvc2l0aW9uVG9UcmlwUm91dGUoZm91bmRUcmlwLnRyaXBJZCwgZm91bmRUcmlwLmNvbXBhbnksIGJ1cy5wb3NpdGlvbik7XHJcbiAgICAgICAgdXBkYXRlZFZlaGljbGVzLnB1c2goYXdhaXQgdGhpcy5kYXRhYmFzZS5VcGRhdGVWZWhpY2xlKGZvdW5kVmVoaWNsZSwgYnVzLCB0cnVlKSlcclxuICAgICAgICBcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ1JFQVRFX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBjcmVhdGluZyBuZXcgdmVoaWNsZSAke2J1cy52ZWhpY2xlTnVtYmVyfSBmcm9tICR7YnVzLmNvbXBhbnl9YClcclxuICAgICAgICBpZihidXMuc3RhdHVzID09PSB2ZWhpY2xlU3RhdGUuT05ST1VURSB8fCBidXMuc3RhdHVzID09PSB2ZWhpY2xlU3RhdGUuT0ZGUk9VVEUpIHVwZGF0ZWRWZWhpY2xlcy5wdXNoKGF3YWl0IHRoaXMuZGF0YWJhc2UuQWRkVmVoaWNsZShidXMpKVxyXG4gICAgICB9XHJcbiAgICB9KSlcclxuXHJcbiAgICByZXR1cm4gdXBkYXRlZFZlaGljbGVzO1xyXG4gIH1cclxuXHJcbiAgLy9Ub2RvOiBGaXggdmVoaWNsZXMgYmVpbmcgXCJudWxsXCI/XHJcbiAgcHVibGljIENvbnZlcnRUb1dlYnNvY2tldCAodmVoaWNsZXMgOiBBcnJheTxWZWhpY2xlRGF0YVdpdGhJZD4pIDogQXJyYXk8V2Vic29ja2V0VmVoaWNsZURhdGE+IHtcclxuICAgIGNvbnN0IG5ld1ZlaGljbGVzIDogQXJyYXk8V2Vic29ja2V0VmVoaWNsZURhdGE+ID0gW107XHJcbiAgICBmb3IoY29uc3QgdmVoaWNsZSBvZiB2ZWhpY2xlcykge1xyXG4gICAgICBpZih2ZWhpY2xlID09PSBudWxsKSBjb250aW51ZTtcclxuICAgICAgbmV3VmVoaWNsZXMucHVzaCh7XHJcbiAgICAgICAgaTogdmVoaWNsZS5faWQsXHJcbiAgICAgICAgcDogdmVoaWNsZS5wb3NpdGlvbixcclxuICAgICAgICBjOiB2ZWhpY2xlLmNvbXBhbnksIFxyXG4gICAgICAgIG46IHZlaGljbGUubGluZU51bWJlcixcclxuICAgICAgICB2OiB2ZWhpY2xlLnZlaGljbGVOdW1iZXJcclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIHJldHVybiBuZXdWZWhpY2xlcztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBBZGRQb3NpdGlvblRvVHJpcFJvdXRlICh0cmlwSWQgOiBudW1iZXIsIGNvbXBhbnkgOiBzdHJpbmcsIHBvc2l0aW9uIDogW251bWJlciwgbnVtYmVyXSkge1xyXG4gICAgaWYocG9zaXRpb25bMF0gPT0gMy4zMTM1MjkxNTYyNjQzNDY3KSByZXR1cm47XHJcbiAgICBsZXQgcmV0cmlldmVkVHJpcFJvdXRlRGF0YSA6IFRyaXBQb3NpdGlvbkRhdGEgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFRyaXBQb3NpdGlvbnModHJpcElkLCBjb21wYW55KTtcclxuICAgIGlmKHJldHJpZXZlZFRyaXBSb3V0ZURhdGEpIHsgXHJcbiAgICAgIHJldHJpZXZlZFRyaXBSb3V0ZURhdGEudXBkYXRlZFRpbWVzLnB1c2gobmV3IERhdGUoKS5nZXRUaW1lKCkpO1xyXG4gICAgICBjb25zdCBuZXdVcGRhdGVkVGltZXMgPSByZXRyaWV2ZWRUcmlwUm91dGVEYXRhLnVwZGF0ZWRUaW1lcztcclxuICAgICAgcmV0cmlldmVkVHJpcFJvdXRlRGF0YS5wb3NpdGlvbnMucHVzaChwb3NpdGlvbik7XHJcbiAgICAgIGxldCByZXN1bHRBcnJheSA9IHJldHJpZXZlZFRyaXBSb3V0ZURhdGEucG9zaXRpb25zO1xyXG4gICAgICBcclxuICAgICAgcmV0cmlldmVkVHJpcFJvdXRlRGF0YSA9IHtcclxuICAgICAgICB0cmlwSWQgOiB0cmlwSWQsXHJcbiAgICAgICAgY29tcGFueSA6IGNvbXBhbnksXHJcbiAgICAgICAgcG9zaXRpb25zOiByZXN1bHRBcnJheSxcclxuICAgICAgICB1cGRhdGVkVGltZXMgOiBuZXdVcGRhdGVkVGltZXNcclxuICAgICAgfVxyXG5cclxuICAgIH1cclxuICAgICAgXHJcbiAgICBlbHNlXHJcbiAgICAgIHJldHJpZXZlZFRyaXBSb3V0ZURhdGEgPSB7XHJcbiAgICAgICAgdHJpcElkIDogdHJpcElkLFxyXG4gICAgICAgIGNvbXBhbnkgOiBjb21wYW55LFxyXG4gICAgICAgIHBvc2l0aW9uczogW3Bvc2l0aW9uXSxcclxuICAgICAgICB1cGRhdGVkVGltZXMgOiBbbmV3IERhdGUoKS5nZXRUaW1lKCldXHJcbiAgICAgIH1cclxuXHJcbiAgICBhd2FpdCB0aGlzLmRhdGFiYXNlLlVwZGF0ZVRyaXBQb3NpdGlvbnModHJpcElkLCBjb21wYW55LCByZXRyaWV2ZWRUcmlwUm91dGVEYXRhKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoZXMgYWxsIHRoZSBidXNzZXMgaW4gdGhlIHdlYnNvY2tldCBmb3JtYXQgd2l0aG91dCBhbnkgZXh0cmEgaW5mb3JtYXRpb24uXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIEZldGNoQnVzc2VzU21hbGwoKSA6IFByb21pc2U8QXJyYXk8V2Vic29ja2V0VmVoaWNsZURhdGE+PiB7XHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLkdldEFsbFZlaGljbGVzU21hbGwoKTtcclxuICAgIGNvbnN0IHNtYWxsQnVzc2VzIDogQXJyYXk8V2Vic29ja2V0VmVoaWNsZURhdGE+ID0gW107XHJcbiAgICByZXN1bHQuZm9yRWFjaChyZXMgPT4ge1xyXG4gICAgICBzbWFsbEJ1c3Nlcy5wdXNoKHtcclxuICAgICAgICBpOiByZXMuX2lkLFxyXG4gICAgICAgIHA6IHJlcy5wb3NpdGlvbixcclxuICAgICAgICBjOiByZXMuY29tcGFueSxcclxuICAgICAgICB2OiByZXMudmVoaWNsZU51bWJlcixcclxuICAgICAgICBuOiByZXMubGluZU51bWJlclxyXG4gICAgICB9KVxyXG4gICAgfSlcclxuXHJcbiAgICByZXR1cm4gc21hbGxCdXNzZXM7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDbGVhcnMgYnVzc2VzIGV2ZXJ5IFggYW1vdW50IG9mIG1pbnV0ZXMgc3BlY2lmaWVkIGluIC5lbnYgZmlsZS5cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgQ2xlYXJCdXNzZXMoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NMRUFOVVBfTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJDbGVhcmluZyBidXNzZXNcIilcclxuICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnN0IGZpZnRlZW5NaW51dGVzQWdvID0gY3VycmVudFRpbWUgLSAoNjAgKiBwYXJzZUludChwcm9jZXNzLmVudi5BUFBfQ0xFQU5VUF9WRUhJQ0xFX0FHRV9SRVFVSVJFTUVOVCkgKiAxMDAwKTtcclxuICAgIGNvbnN0IFJlbW92ZWRWZWhpY2xlcyA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuUmVtb3ZlVmVoaWNsZXNXaGVyZSh7IHVwZGF0ZWRBdDogeyAkbHQ6IGZpZnRlZW5NaW51dGVzQWdvIH0gfSwgcHJvY2Vzcy5lbnYuQVBQX0RPX0NMRUFOVVBfTE9HR0lORyA9PSBcInRydWVcIik7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgXCJLb3BwZWx2bGFrIDcgYW5kIDggdHVyYm9cIiBmaWxlcyB0byBkYXRhYmFzZS5cclxuICAgKi9cclxuICBwdWJsaWMgSW5pdEtWNzgoKSA6IHZvaWQge1xyXG4gICAgdGhpcy5Jbml0VHJpcHNOZXcoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSB0cmlwcyBmcm9tIHRoZSBzcGVjaWZpZWQgVVJMIGluIHRoZSAuZW52ICwgb3IgXCIuLi9HVEZTL2V4dHJhY3RlZC90cmlwcy5qc29uXCIgdG8gdGhlIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gIHByaXZhdGUgSW5pdFRyaXBzTmV3KCkgOiB2b2lkIHsgXHJcbiAgICBjb25zdCB0cmlwc1BhdGggPSByZXNvbHZlKFwiR1RGU1xcXFxleHRyYWN0ZWRcXFxcdHJpcHMudHh0Lmpzb25cIik7XHJcbiAgICBjb25zdCBvdXRwdXRQYXRoID0gcmVzb2x2ZShcIkdURlNcXFxcY29udmVydGVkXFxcXHRyaXBzLmpzb25cIik7XHJcbiAgICBmcy5yZWFkRmlsZSh0cmlwc1BhdGgsICd1dGY4JywgYXN5bmMoZXJyb3IsIGRhdGEpID0+IHsgXHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgaWYoZGF0YSAmJiBwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkxvYWRlZCB0cmlwcyBmaWxlIGludG8gbWVtb3J5LlwiKTtcclxuICAgICAgZGF0YSA9IGRhdGEudHJpbSgpO1xyXG4gICAgICBjb25zdCBsaW5lcyA9IGRhdGEuc3BsaXQoXCJcXG5cIik7XHJcbiAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3V0cHV0UGF0aClcclxuICAgICAgY29uc3QgY29udmVydGVkVHJpcHMgPSBbXTtcclxuXHJcbiAgICAgIGZvcihsZXQgbGluZSBvZiBsaW5lcykge1xyXG4gICAgICAgIGNvbnN0IHRyaXBKU09OIDogQXBpVHJpcCA9IEpTT04ucGFyc2UobGluZSk7XHJcbiAgICAgICAgY29uc3QgcmVhbFRpbWVUcmlwSWQgPSB0cmlwSlNPTi5yZWFsdGltZV90cmlwX2lkLnNwbGl0KFwiOlwiKTtcclxuICAgICAgICBjb25zdCBjb21wYW55ID0gcmVhbFRpbWVUcmlwSWRbMF07XHJcbiAgICAgICAgY29uc3QgcGxhbm5pbmdOdW1iZXIgPSByZWFsVGltZVRyaXBJZFsxXTtcclxuICAgICAgICBjb25zdCB0cmlwTnVtYmVyID0gcmVhbFRpbWVUcmlwSWRbMl07XHJcblxyXG4gICAgICAgIGNvbnN0IHRyaXAgOiBUcmlwID0ge1xyXG4gICAgICAgICAgY29tcGFueTogY29tcGFueSxcclxuICAgICAgICAgIHJvdXRlSWQ6IHBhcnNlSW50KHRyaXBKU09OLnJvdXRlX2lkKSxcclxuICAgICAgICAgIHNlcnZpY2VJZDogcGFyc2VJbnQodHJpcEpTT04uc2VydmljZV9pZCksXHJcbiAgICAgICAgICB0cmlwSWQ6IHBhcnNlSW50KHRyaXBKU09OLnRyaXBfaWQpLFxyXG4gICAgICAgICAgdHJpcE51bWJlcjogcGFyc2VJbnQodHJpcE51bWJlciksXHJcbiAgICAgICAgICB0cmlwUGxhbm5pbmdOdW1iZXI6IHBsYW5uaW5nTnVtYmVyLFxyXG4gICAgICAgICAgdHJpcEhlYWRzaWduOiB0cmlwSlNPTi50cmlwX2hlYWRzaWduLFxyXG4gICAgICAgICAgdHJpcE5hbWU6IHRyaXBKU09OLnRyaXBfbG9uZ19uYW1lLFxyXG4gICAgICAgICAgZGlyZWN0aW9uSWQ6IHBhcnNlSW50KHRyaXBKU09OLmRpcmVjdGlvbl9pZCksXHJcbiAgICAgICAgICBzaGFwZUlkOiBwYXJzZUludCh0cmlwSlNPTi5zaGFwZV9pZCksXHJcbiAgICAgICAgICB3aGVlbGNoYWlyQWNjZXNzaWJsZTogcGFyc2VJbnQodHJpcEpTT04ud2hlZWxjaGFpcl9hY2Nlc3NpYmxlKVxyXG4gICAgICAgIH1cclxuICAgICAgICB3cml0ZVN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh0cmlwKSArIFwiXFxuXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB3cml0ZVN0cmVhbS5lbmQoKCkgPT4ge1xyXG4gICAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRmluaXNoZWQgd3JpdGluZyB0cmlwcyBmaWxlLCBpbXBvcnRpbmcgdG8gZGF0YWJhc2UuXCIpO1xyXG4gICAgICAgIHRoaXMuSW1wb3J0VHJpcHMoKTtcclxuICAgICAgfSlcclxuICAgIH0pO1xyXG4gICBcclxuICAgIFxyXG4gIH1cclxuXHJcbiAgYXN5bmMgSW1wb3J0VHJpcHMoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5kYXRhYmFzZS5Ecm9wVHJpcHNDb2xsZWN0aW9uKCk7XHJcblxyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJJbXBvcnRpbmcgdHJpcHMgdG8gbW9uZ29kYlwiKTtcclxuXHJcbiAgICBhd2FpdCBleGVjKFwibW9uZ29pbXBvcnQgLS1kYiB0YWlvdmEgLS1jb2xsZWN0aW9uIHRyaXBzIC0tZmlsZSAuXFxcXEdURlNcXFxcY29udmVydGVkXFxcXHRyaXBzLmpzb25cIiwgKGVycm9yLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzdGRlcnIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgc3RkZXJyOiAke3N0ZGVycn1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBzdGRvdXQ6ICR7c3Rkb3V0fWApO1xyXG4gICAgfSk7XHJcblxyXG4gIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBWZWhpY2xlRGF0YSwgdmVoaWNsZVN0YXRlIH0gZnJvbSAnLi90eXBlcy9WZWhpY2xlRGF0YSdcclxuaW1wb3J0IHsgVmVoaWNsZUFwaURhdGEsIFZlaGljbGVQb3NEYXRhLCBWZWhpY2xlQXBpRGF0YUtlb2xpcyB9IGZyb20gJy4vdHlwZXMvVmVoaWNsZUFwaURhdGEnXHJcbmltcG9ydCB7IENvbXBhbmllcyB9IGZyb20gJy4vdHlwZXMvQ29tcGFuaWVzJztcclxuaW1wb3J0IHsgYmVhcmluZ1RvQW5nbGUgfSBmcm9tICdAdHVyZi90dXJmJztcclxuaW1wb3J0IHsgS1Y2R2VuZXJpYyB9IGZyb20gJy4vdHlwZXMvYXBpL0tWNkFycml2YSc7XHJcbmltcG9ydCB7IERFTEFZLCBJTklULCBPTlJPVVRFLCBUeXBlcyB9IGZyb20gJy4vdHlwZXMvYXBpL0tWNkNvbW1vbic7XHJcbmV4cG9ydCBjbGFzcyBDb252ZXJ0ZXIge1xyXG5cclxuICBkZWNvZGUoZGF0YSA6IGFueSwgb3BlcmF0b3IgOiBzdHJpbmcpIDogYW55IHtcclxuICAgIGNvbnN0IGNvbXBhbnkgPSB0aGlzLkNoZWNrQ29tcGFueShvcGVyYXRvcik7XHJcblxyXG4gICAgc3dpdGNoIChjb21wYW55KSB7XHJcbiAgICAgIGNhc2UgQ29tcGFuaWVzLkFSUjpcclxuICAgICAgICByZXR1cm4gdGhpcy5EZWNvZGVNYWluKGRhdGEpO1xyXG4gICAgICBjYXNlIENvbXBhbmllcy5DWFg6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRGVjb2RlTWFpbihkYXRhKTtcclxuICAgICAgY2FzZSBDb21wYW5pZXMuRUJTOlxyXG4gICAgICAgIHJldHVybiB0aGlzLkRlY29kZU1haW4oZGF0YSk7XHJcbiAgICAgIGNhc2UgQ29tcGFuaWVzLlFCVVpaOlxyXG4gICAgICAgIHJldHVybiB0aGlzLkRlY29kZU1haW4oZGF0YSk7XHJcbiAgICAgIGNhc2UgQ29tcGFuaWVzLlJJRzpcclxuICAgICAgICByZXR1cm4gdGhpcy5EZWNvZGVNYWluKGRhdGEpO1xyXG4gICAgICBjYXNlIENvbXBhbmllcy5PUEVOT1Y6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRGVjb2RlTWFpbihkYXRhKTtcclxuICAgICAgY2FzZSBDb21wYW5pZXMuRElUUDpcclxuICAgICAgICByZXR1cm4gdGhpcy5EZWNvZGVNYWluKGRhdGEpO1xyXG4gICAgICBjYXNlIENvbXBhbmllcy5LRU9MSVM6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRGVjb2RlT3RoZXIoZGF0YSk7XHJcbiAgICAgIGNhc2UgQ29tcGFuaWVzLkdWQjpcclxuICAgICAgICByZXR1cm4gdGhpcy5EZWNvZGVPdGhlcihkYXRhKTtcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICBjb25zb2xlLmVycm9yKGBDb21wYW55ICR7Y29tcGFueX0gdW5rbm93bi5gKVxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICB9IFxyXG5cclxuICAvKiogXHJcbiAgKiBUaGlzIGlzIHRoZSBtYWluIGRlY29kaW5nIGZ1bmN0aW9uLiBJdCB3b3JrcyBmb3IgQXJyaXZhLCBDb25uZXh4aW9uLCBFQlMsIFFCVVpaLCBSSUcgKFJFVCksIE9QRU5PViwgRElUUFxyXG4gICogQHBhcmFtIGRhdGEgVGhlIHJlcXVpcmVkIGRhdGEuIEl0IHNob3VsZCBiZSBvZiB0eXBlIFwiS1Y2R2VuZXJpY1wiLCB3aGljaCB3b3JrcyBmb3IgdGhlIGNvbXBhbmllcyBtZW50aW9uZWQgYWJvdmUuXHJcbiAgKiBAcmV0dXJucyBBbiBhcnJheSB3aXRoIHRoZSBjb252ZXJ0ZWQgdmVoaWNsZWRhdGEuXHJcbiAgKi9cclxuICBEZWNvZGVNYWluIChkYXRhIDogS1Y2R2VuZXJpYykgOiBBcnJheTxWZWhpY2xlRGF0YT4ge1xyXG4gICAgY29uc3QgcmV0dXJuRGF0YSA6IEFycmF5PFZlaGljbGVEYXRhPiA9IFtdO1xyXG5cclxuICAgIGlmKGRhdGEuVlZfVE1fUFVTSC5LVjZwb3NpbmZvKSB7XHJcbiAgICAgIGNvbnN0IGt2NnBvc2luZm8gPSBkYXRhLlZWX1RNX1BVU0guS1Y2cG9zaW5mbztcclxuICAgICAgaWYoT2JqZWN0LmtleXMoa3Y2cG9zaW5mbykubGVuZ3RoID4gMClcclxuICAgICAgICBPYmplY3Qua2V5cyhrdjZwb3NpbmZvKS5mb3JFYWNoKFZlaGljbGVTdGF0dXNDb2RlID0+IHtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYoQXJyYXkuaXNBcnJheShrdjZwb3NpbmZvW1ZlaGljbGVTdGF0dXNDb2RlXSkpIHtcclxuICAgICAgICAgICAgZm9yKGNvbnN0IHZlaGljbGVEYXRhIG9mIGt2NnBvc2luZm9bVmVoaWNsZVN0YXR1c0NvZGVdKSB7XHJcbiAgICAgICAgICAgICAgLy9UT0RPOiBUaGlzIG1heWJlIGlzIHN0dXBpZC4gQ2F1c2VzIHR5cGVzIHdpdGhvdXQgdmVoaWNsZU51bWJlciB0byBub3QgYXBwZWFyLlxyXG4gICAgICAgICAgICAgIGlmKCF2ZWhpY2xlRGF0YS52ZWhpY2xlbnVtYmVyKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICByZXR1cm5EYXRhLnB1c2godGhpcy5NYXBwZXIodmVoaWNsZURhdGEsIFZlaGljbGVTdGF0dXNDb2RlKSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIGlmKGt2NnBvc2luZm9bVmVoaWNsZVN0YXR1c0NvZGVdLnZlaGljbGVudW1iZXIpIFxyXG4gICAgICAgICAgICByZXR1cm5EYXRhLnB1c2godGhpcy5NYXBwZXIoa3Y2cG9zaW5mb1tWZWhpY2xlU3RhdHVzQ29kZV0sIFZlaGljbGVTdGF0dXNDb2RlKSkgICAgIFxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJldHVybkRhdGE7XHJcblxyXG4gIH1cclxuICAvKiogXHJcbiAgKiBUaGlzIGlzIHRoZSBzZWNvbmRhcnkgZGVjb2RpbmcgZnVuY3Rpb24uIEl0IHdvcmtzIGZvciBLZW9saXMgYW5kIEdWQlxyXG4gICogQHBhcmFtIGRhdGEgVGhlIHJlcXVpcmVkIGRhdGEuIEl0IHNob3VsZCBiZSBvZiB0eXBlIFwiS1Y2R2VuZXJpY1wiLCB3aGljaCB3b3JrcyBmb3IgdGhlIGNvbXBhbmllcyBtZW50aW9uZWQgYWJvdmUuXHJcbiAgKiBAcmV0dXJucyBBbiBhcnJheSB3aXRoIHRoZSBjb252ZXJ0ZWQgdmVoaWNsZWRhdGEuXHJcbiAgKi9cclxuICBEZWNvZGVPdGhlcihkYXRhKSA6IEFycmF5PFZlaGljbGVEYXRhPiB7XHJcbiAgICBjb25zdCByZXR1cm5EYXRhIDogQXJyYXk8VmVoaWNsZURhdGE+ID0gW107XHJcbiAgICBcclxuXHJcbiAgICBpZihkYXRhLlZWX1RNX1BVU0guS1Y2cG9zaW5mbykge1xyXG4gICAgICBjb25zdCBrdjZwb3NpbmZvID0gZGF0YS5WVl9UTV9QVVNILktWNnBvc2luZm87XHJcbiAgICAgIGlmKEFycmF5LmlzQXJyYXkoa3Y2cG9zaW5mbykpIHtcclxuICAgICAgICBmb3IoY29uc3QgU3RhdHVzT2JqZWN0IG9mIGt2NnBvc2luZm8pIHtcclxuICAgICAgICAgIGNvbnN0IFZlaGljbGVTdGF0dXNDb2RlID0gT2JqZWN0LmtleXMoU3RhdHVzT2JqZWN0KVswXTtcclxuICAgICAgICAgIHJldHVybkRhdGEucHVzaCh0aGlzLk1hcHBlcihTdGF0dXNPYmplY3RbVmVoaWNsZVN0YXR1c0NvZGVdLCBWZWhpY2xlU3RhdHVzQ29kZSkpXHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnN0IFZlaGljbGVTdGF0dXNDb2RlID0gT2JqZWN0LmtleXMoa3Y2cG9zaW5mbylbMF07XHJcbiAgICAgICAgcmV0dXJuRGF0YS5wdXNoKHRoaXMuTWFwcGVyKGt2NnBvc2luZm9bVmVoaWNsZVN0YXR1c0NvZGVdLCBWZWhpY2xlU3RhdHVzQ29kZSkpXHJcbiAgICAgIH1cclxuICAgIH0gXHJcblxyXG4gICAgcmV0dXJuIHJldHVybkRhdGE7XHJcbiAgfVxyXG5cclxuICBDaGVja0NvbXBhbnkob3BlcmF0b3IgOiBzdHJpbmcpIDogc3RyaW5nIHtcclxuICAgIGxldCByZXR1cm5Db21wYW55IDogc3RyaW5nO1xyXG4gICAgT2JqZWN0LnZhbHVlcyhDb21wYW5pZXMpLmZvckVhY2goY29tcGFueSA9PiB7XHJcbiAgICAgIGlmKG9wZXJhdG9yLmluY2x1ZGVzKGNvbXBhbnkpKSByZXR1cm5Db21wYW55ID0gY29tcGFueTtcclxuICAgIH0pXHJcbiAgICByZXR1cm4gcmV0dXJuQ29tcGFueTtcclxuICB9XHJcblxyXG4gIE1hcHBlcih2ZWhpY2xlUG9zRGF0YSwgc3RhdHVzIDogc3RyaW5nKSB7IFxyXG4gICAgY29uc3QgbmV3RGF0YSA9IHtcclxuICAgICAgY29tcGFueTogdmVoaWNsZVBvc0RhdGEuZGF0YW93bmVyY29kZSxcclxuICAgICAgb3JpZ2luYWxDb21wYW55OiB2ZWhpY2xlUG9zRGF0YS5kYXRhb3duZXJjb2RlLFxyXG4gICAgICBwbGFubmluZ051bWJlcjogdmVoaWNsZVBvc0RhdGEubGluZXBsYW5uaW5nbnVtYmVyLnRvU3RyaW5nKCksXHJcbiAgICAgIGpvdXJuZXlOdW1iZXI6IHZlaGljbGVQb3NEYXRhLmpvdXJuZXludW1iZXIsXHJcbiAgICAgIHRpbWVzdGFtcDogRGF0ZS5wYXJzZSh2ZWhpY2xlUG9zRGF0YS50aW1lc3RhbXApLFxyXG4gICAgICB2ZWhpY2xlTnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS52ZWhpY2xlbnVtYmVyID8gdmVoaWNsZVBvc0RhdGEudmVoaWNsZW51bWJlciA6IDk5OTk5OSxcclxuICAgICAgbGluZU51bWJlcjogXCJPbmJla2VuZFwiLFxyXG4gICAgICBwb3NpdGlvbjogdGhpcy5yZFRvTGF0TG9uZyh2ZWhpY2xlUG9zRGF0YVsncmQteCddLCB2ZWhpY2xlUG9zRGF0YVsncmQteSddKSxcclxuICAgICAgcHVuY3R1YWxpdHk6IFt2ZWhpY2xlUG9zRGF0YS5wdW5jdHVhbGl0eV0sXHJcbiAgICAgIHN0YXR1czogdmVoaWNsZVN0YXRlW3N0YXR1c10sXHJcbiAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICB1cGRhdGVkVGltZXM6IFtEYXRlLm5vdygpXSxcclxuICAgICAgY3VycmVudFJvdXRlSWQ6IDAsXHJcbiAgICAgIGN1cnJlbnRUcmlwSWQ6IDBcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbmV3RGF0YTtcclxuICB9IFxyXG5cclxuICBcclxuICByZFRvTGF0TG9uZyAoeCwgeSkgOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgIGlmKHggPT09IHVuZGVmaW5lZCB8fCB5ID09PSB1bmRlZmluZWQpIHJldHVybiBbMCwgMF07XHJcbiAgICBcclxuICAgIGNvbnN0IGRYID0gKHggLSAxNTUwMDApICogTWF0aC5wb3coMTAsIC01KTtcclxuICAgIGNvbnN0IGRZID0gKHkgLSA0NjMwMDApICogTWF0aC5wb3coMTAsIC01KTtcclxuICAgIGNvbnN0IFNvbU4gPSAoMzIzNS42NTM4OSAqIGRZKSArICgtMzIuNTgyOTcgKiBNYXRoLnBvdyhkWCwgMikpICsgKC0wLjI0NzUgKlxyXG4gICAgICBNYXRoLnBvdyhkWSwgMikpICsgKC0wLjg0OTc4ICogTWF0aC5wb3coZFgsIDIpICpcclxuICAgICAgZFkpICsgKC0wLjA2NTUgKiBNYXRoLnBvdyhkWSwgMykpICsgKC0wLjAxNzA5ICpcclxuICAgICAgTWF0aC5wb3coZFgsIDIpICogTWF0aC5wb3coZFksIDIpKSArICgtMC4wMDczOCAqXHJcbiAgICAgIGRYKSArICgwLjAwNTMgKiBNYXRoLnBvdyhkWCwgNCkpICsgKC0wLjAwMDM5ICpcclxuICAgICAgTWF0aC5wb3coZFgsIDIpICogTWF0aC5wb3coZFksIDMpKSArICgwLjAwMDMzICogTWF0aC5wb3coXHJcbiAgICAgIGRYLCA0KSAqIGRZKSArICgtMC4wMDAxMiAqXHJcbiAgICAgIGRYICogZFkpO1xyXG4gICAgY29uc3QgU29tRSA9ICg1MjYwLjUyOTE2ICogZFgpICsgKDEwNS45NDY4NCAqIGRYICogZFkpICsgKDIuNDU2NTYgKlxyXG4gICAgICBkWCAqIE1hdGgucG93KGRZLCAyKSkgKyAoLTAuODE4ODUgKiBNYXRoLnBvdyhcclxuICAgICAgZFgsIDMpKSArICgwLjA1NTk0ICpcclxuICAgICAgZFggKiBNYXRoLnBvdyhkWSwgMykpICsgKC0wLjA1NjA3ICogTWF0aC5wb3coXHJcbiAgICAgIGRYLCAzKSAqIGRZKSArICgwLjAxMTk5ICpcclxuICAgICAgZFkpICsgKC0wLjAwMjU2ICogTWF0aC5wb3coZFgsIDMpICogTWF0aC5wb3coXHJcbiAgICAgIGRZLCAyKSkgKyAoMC4wMDEyOCAqXHJcbiAgICAgIGRYICogTWF0aC5wb3coZFksIDQpKSArICgwLjAwMDIyICogTWF0aC5wb3coZFksXHJcbiAgICAgIDIpKSArICgtMC4wMDAyMiAqIE1hdGgucG93KFxyXG4gICAgICBkWCwgMikpICsgKDAuMDAwMjYgKlxyXG4gICAgICBNYXRoLnBvdyhkWCwgNSkpO1xyXG4gICAgXHJcbiAgICBjb25zdCBMYXRpdHVkZSA9IDUyLjE1NTE3ICsgKFNvbU4gLyAzNjAwKTtcclxuICAgIGNvbnN0IExvbmdpdHVkZSA9IDUuMzg3MjA2ICsgKFNvbUUgLyAzNjAwKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIFtMb25naXR1ZGUsIExhdGl0dWRlXVxyXG4gIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBDb25uZWN0aW9uLCBNb2RlbCwgTW9uZ29vc2UsIEZpbHRlclF1ZXJ5LCBTY2hlbWEgfSBmcm9tICdtb25nb29zZSc7XHJcbmltcG9ydCB7IFRyaXAgfSBmcm9tICcuL3R5cGVzL1RyaXAnO1xyXG5pbXBvcnQgeyBWZWhpY2xlRGF0YSwgVmVoaWNsZURhdGFXaXRoSWQsIHZlaGljbGVTdGF0ZSB9IGZyb20gJy4vdHlwZXMvVmVoaWNsZURhdGEnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgUm91dGUgfSBmcm9tICcuL3R5cGVzL1JvdXRlJztcclxuaW1wb3J0IHsgVHJpcFBvc2l0aW9uRGF0YSB9IGZyb20gJy4vdHlwZXMvVHJpcFBvc2l0aW9uRGF0YSc7XHJcbmltcG9ydCB7IFdlYnNvY2tldFZlaGljbGVEYXRhIH0gZnJvbSAnLi90eXBlcy9XZWJzb2NrZXRWZWhpY2xlRGF0YSc7XHJcbmNvbnN0IHN0cmVhbVRvTW9uZ29EQiA9IHJlcXVpcmUoJ3N0cmVhbS10by1tb25nby1kYicpLnN0cmVhbVRvTW9uZ29EQjtcclxuY29uc3Qgc3BsaXQgPSByZXF1aXJlKCdzcGxpdCcpO1xyXG5leHBvcnQgY2xhc3MgRGF0YWJhc2Uge1xyXG4gIFxyXG4gIHByaXZhdGUgc3RhdGljIGluc3RhbmNlIDogRGF0YWJhc2U7XHJcbiAgXHJcbiAgcHJpdmF0ZSBkYiA6IENvbm5lY3Rpb247XHJcbiAgcHJpdmF0ZSBtb25nb29zZSA6IE1vbmdvb3NlO1xyXG4gIHByaXZhdGUgdmVoaWNsZVNjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIHRyaXBzU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgcm91dGVzU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgZHJpdmVuUm91dGVzU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgdmVoaWNsZU1vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgdHJpcE1vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgcm91dGVzTW9kZWwgOiB0eXBlb2YgTW9kZWw7XHJcbiAgcHJpdmF0ZSBkcml2ZW5Sb3V0ZXNNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIG91dHB1dERCQ29uZmlnO1xyXG5cclxuICBwdWJsaWMgc3RhdGljIGdldEluc3RhbmNlKCk6IERhdGFiYXNlIHtcclxuICAgIGlmKCFEYXRhYmFzZS5pbnN0YW5jZSlcclxuICAgICAgRGF0YWJhc2UuaW5zdGFuY2UgPSBuZXcgRGF0YWJhc2UoKTtcclxuXHJcbiAgICByZXR1cm4gRGF0YWJhc2UuaW5zdGFuY2U7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgSW5pdCgpIHtcclxuICAgIGNvbnN0IHVybCA6IHN0cmluZyA9IHByb2Nlc3MuZW52LkRBVEFCQVNFX1VSTDtcclxuICAgIGNvbnN0IG5hbWUgOiBzdHJpbmcgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9OQU1FO1xyXG5cclxuICAgIHRoaXMubW9uZ29vc2UgPSBuZXcgTW9uZ29vc2UoKTtcclxuICAgIFxyXG4gICAgdGhpcy5tb25nb29zZS5zZXQoJ3VzZUZpbmRBbmRNb2RpZnknLCBmYWxzZSlcclxuXHJcbiAgICBpZighdXJsICYmICFuYW1lKSB0aHJvdyAoYEludmFsaWQgVVJMIG9yIG5hbWUgZ2l2ZW4sIHJlY2VpdmVkOiBcXG4gTmFtZTogJHtuYW1lfSBcXG4gVVJMOiAke3VybH1gKVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBDb25uZWN0aW5nIHRvIGRhdGFiYXNlIHdpdGggbmFtZTogJHtuYW1lfSBhdCB1cmw6ICR7dXJsfWApXHJcbiAgICB0aGlzLm1vbmdvb3NlLmNvbm5lY3QoYCR7dXJsfS8ke25hbWV9YCwge1xyXG4gICAgICB1c2VOZXdVcmxQYXJzZXI6IHRydWUsXHJcbiAgICAgIHVzZVVuaWZpZWRUb3BvbG9neTogdHJ1ZSxcclxuICAgICAgcG9vbFNpemU6IDEyMFxyXG4gICAgfSlcclxuXHJcbiAgICB0aGlzLmRiID0gdGhpcy5tb25nb29zZS5jb25uZWN0aW9uO1xyXG5cclxuICAgIHRoaXMub3V0cHV0REJDb25maWcgPSB7IGRiVVJMIDogYCR7dXJsfS8ke25hbWV9YCwgY29sbGVjdGlvbiA6ICd0cmlwcycgfTtcclxuXHJcbiAgICB0aGlzLmRiLm9uKCdlcnJvcicsIGVycm9yID0+IHtcclxuICAgICAgdGhyb3cgbmV3IGVycm9yKGBFcnJvciBjb25uZWN0aW5nIHRvIGRhdGFiYXNlLiAke2Vycm9yfWApO1xyXG4gICAgfSlcclxuXHJcbiAgICBhd2FpdCB0aGlzLkRhdGFiYXNlTGlzdGVuZXIoKTtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBHZXREYXRhYmFzZSgpIDogQ29ubmVjdGlvbiB7XHJcbiAgICByZXR1cm4gdGhpcy5kYjtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBEYXRhYmFzZUxpc3RlbmVyICgpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcclxuICAgICAgICB0aGlzLmRiLm9uY2UoXCJvcGVuXCIsICgpID0+IHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdGlvbiB0byBkYXRhYmFzZSBlc3RhYmxpc2hlZC5cIilcclxuXHJcbiAgICAgICAgICB0aGlzLnZlaGljbGVTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIG9yaWdpbmFsQ29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICBwbGFubmluZ051bWJlcjogU3RyaW5nLFxyXG4gICAgICAgICAgICBqb3VybmV5TnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogTnVtYmVyLFxyXG4gICAgICAgICAgICB2ZWhpY2xlTnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBbTnVtYmVyLCBOdW1iZXJdLFxyXG4gICAgICAgICAgICBzdGF0dXM6IFN0cmluZyxcclxuICAgICAgICAgICAgbGluZU51bWJlcjogU3RyaW5nLFxyXG4gICAgICAgICAgICBwdW5jdHVhbGl0eTogQXJyYXksXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogTnVtYmVyLFxyXG4gICAgICAgICAgICB1cGRhdGVkQXQ6IE51bWJlcixcclxuICAgICAgICAgICAgdXBkYXRlZFRpbWVzOiBBcnJheSxcclxuICAgICAgICAgICAgY3VycmVudFJvdXRlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgY3VycmVudFRyaXBJZDogTnVtYmVyLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHRoaXMudHJpcHNTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgc2VydmljZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRyaXBJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB0cmlwTnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRyaXBQbGFubmluZ051bWJlcjogU3RyaW5nLFxyXG4gICAgICAgICAgICB0cmlwSGVhZHNpZ246IFN0cmluZyxcclxuICAgICAgICAgICAgdHJpcE5hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgZGlyZWN0aW9uSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgc2hhcGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB3aGVlbGNoYWlyQWNjZXNzaWJsZTogTnVtYmVyXHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIHRoaXMucm91dGVzU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgcm91dGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHN1YkNvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVTaG9ydE5hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVMb25nTmFtZTogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZURlc2NyaXB0aW9uOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlVHlwZTogTnVtYmVyLFxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLmRyaXZlblJvdXRlc1NjaGVtYSA9IG5ldyB0aGlzLm1vbmdvb3NlLlNjaGVtYSh7XHJcbiAgICAgICAgICAgIHRyaXBJZCA6IE51bWJlcixcclxuICAgICAgICAgICAgY29tcGFueSA6IFN0cmluZyxcclxuICAgICAgICAgICAgcG9zaXRpb25zOiBBcnJheSxcclxuICAgICAgICAgICAgdXBkYXRlZFRpbWVzIDogQXJyYXlcclxuICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgdGhpcy50cmlwc1NjaGVtYS5pbmRleCh7IHRyaXBOdW1iZXI6IC0xLCB0cmlwUGxhbm5pbmdOdW1iZXI6IC0xLCBjb21wYW55OiAtMSB9KVxyXG4gICAgICAgICAgdGhpcy5kcml2ZW5Sb3V0ZXNTY2hlbWEuaW5kZXgoeyB0cmlwSWQ6IC0xLCBjb21wYW55OiAtMSB9KVxyXG5cclxuICAgICAgICAgIHRoaXMudmVoaWNsZU1vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcIlZlaGljbGVQb3NpdGlvbnNcIiwgdGhpcy52ZWhpY2xlU2NoZW1hKTtcclxuICAgICAgICAgIHRoaXMudHJpcE1vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcInRyaXBzXCIsIHRoaXMudHJpcHNTY2hlbWEpO1xyXG4gICAgICAgICAgdGhpcy5yb3V0ZXNNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJyb3V0ZXNcIiwgdGhpcy5yb3V0ZXNTY2hlbWEpO1xyXG4gICAgICAgICAgdGhpcy5kcml2ZW5Sb3V0ZXNNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJkcml2ZW5yb3V0ZXNcIiwgdGhpcy5kcml2ZW5Sb3V0ZXNTY2hlbWEpO1xyXG5cclxuICAgICAgICAgIHRoaXMudHJpcE1vZGVsLmNyZWF0ZUluZGV4ZXMoKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgcmVzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0QWxsVmVoaWNsZXMgKGFyZ3MgPSB7fSkgOiBQcm9taXNlPEFycmF5PFZlaGljbGVEYXRhPj4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmQoey4uLmFyZ3N9LCB7IHB1bmN0dWFsaXR5OiAwLCB1cGRhdGVkVGltZXM6IDAsIF9fdiA6IDAgfSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0QWxsVmVoaWNsZXNTbWFsbCAoYXJncyA9IHt9KSA6IFByb21pc2U8QXJyYXk8VmVoaWNsZURhdGFXaXRoSWQ+PiB7XHJcbiAgICByZXR1cm4gYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZCh7Li4uYXJnc30sXHJcbiAgICAgIHsgXHJcbiAgICAgIHB1bmN0dWFsaXR5OiAwLCBcclxuICAgICAgdXBkYXRlZFRpbWVzOiAwLCBcclxuICAgICAgX192IDogMCxcclxuICAgICAgam91cm5leU51bWJlcjogMCxcclxuICAgICAgdGltZXN0YW1wIDogMCxcclxuICAgICAgY3JlYXRlZEF0OiAwLFxyXG4gICAgICB1cGRhdGVkQXQ6IDAsXHJcbiAgICAgIGN1cnJlbnRSb3V0ZUlkOiAwLFxyXG4gICAgICBjdXJyZW50VHJpcElkOiAwLFxyXG4gICAgICBwbGFubmluZ051bWJlcjogMCxcclxuICAgICAgc3RhdHVzOiAwXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFZlaGljbGUgKHZlaGljbGVOdW1iZXIsIHRyYW5zcG9ydGVyLCBmaXJzdE9ubHkgOiBib29sZWFuID0gZmFsc2UpIDogUHJvbWlzZTxWZWhpY2xlRGF0YT4ge1xyXG4gICAgcmV0dXJuIHsgXHJcbiAgICAgIC4uLmF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmRPbmUoe1xyXG4gICAgICAgIHZlaGljbGVOdW1iZXIgOiB2ZWhpY2xlTnVtYmVyLFxyXG4gICAgICAgIGNvbXBhbnk6IHRyYW5zcG9ydGVyXHJcbiAgICAgIH0pXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFZlaGljbGVFeGlzdHModmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIpIDogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5HZXRWZWhpY2xlKHZlaGljbGVOdW1iZXIsIHRyYW5zcG9ydGVyKSAhPT0gbnVsbDtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBVcGRhdGVWZWhpY2xlICh2ZWhpY2xlVG9VcGRhdGUgOiBhbnksIHVwZGF0ZWRWZWhpY2xlRGF0YSA6IFZlaGljbGVEYXRhLCBwb3NpdGlvbkNoZWNrcyA6IGJvb2xlYW4gPSBmYWxzZSkgOiBQcm9taXNlPFZlaGljbGVEYXRhV2l0aElkPiB7XHJcbiAgICByZXR1cm4gYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZUFuZFVwZGF0ZSh2ZWhpY2xlVG9VcGRhdGUsIHVwZGF0ZWRWZWhpY2xlRGF0YSk7XHJcbiAgfVxyXG4gIFxyXG4gIHB1YmxpYyBhc3luYyBBZGRWZWhpY2xlICh2ZWhpY2xlKSA6IFByb21pc2U8VmVoaWNsZURhdGFXaXRoSWQ+e1xyXG4gICAgdHJ5IHsgXHJcbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5jcmVhdGUoey4uLnZlaGljbGV9KTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFJlbW92ZVZlaGljbGUgKHZlaGljbGUgOiBWZWhpY2xlRGF0YSkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKCF2ZWhpY2xlW1wiX2RvY1wiXSkgcmV0dXJuXHJcblxyXG4gICAgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZUFuZERlbGV0ZSh2ZWhpY2xlKVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFJlbW92ZVZlaGljbGVzV2hlcmUoIHBhcmFtcyA6IG9iamVjdCwgZG9Mb2dnaW5nIDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8QXJyYXk8VmVoaWNsZURhdGE+PiB7XHJcbiAgICBjb25zdCByZW1vdmVkVmVoaWNsZXMgOiBBcnJheTxWZWhpY2xlRGF0YT4gPSBhd2FpdCB0aGlzLkdldEFsbFZlaGljbGVzKHBhcmFtcyk7XHJcbiAgICB0aGlzLnZlaGljbGVNb2RlbC5kZWxldGVNYW55KHBhcmFtcykudGhlbihyZXNwb25zZSA9PiB7XHJcbiAgICAgIGlmKGRvTG9nZ2luZykgY29uc29sZS5sb2coYERlbGV0ZWQgJHtyZXNwb25zZS5kZWxldGVkQ291bnR9IHZlaGljbGVzLmApO1xyXG4gICAgICBcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHJlbW92ZWRWZWhpY2xlcztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRUcmlwcyhwYXJhbXMgOiBvYmplY3QgPSB7fSkgOiBQcm9taXNlPEFycmF5PFRyaXA+PiB7XHJcbiAgICByZXR1cm4gYXdhaXQgdGhpcy50cmlwTW9kZWwuZmluZChwYXJhbXMpXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0VHJpcCh0cmlwTnVtYmVyIDogbnVtYmVyLCB0cmlwUGxhbm5pbmdOdW1iZXIgOiBzdHJpbmcsIGNvbXBhbnkgOiBzdHJpbmcpIHtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMudHJpcE1vZGVsLmZpbmRPbmUoe1xyXG4gICAgICBjb21wYW55OiBjb21wYW55LFxyXG4gICAgICB0cmlwTnVtYmVyIDogdHJpcE51bWJlcixcclxuICAgICAgdHJpcFBsYW5uaW5nTnVtYmVyOiB0cmlwUGxhbm5pbmdOdW1iZXJcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiByZXNwb25zZSAhPT0gbnVsbCA/IHJlc3BvbnNlIDoge307XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgUmVtb3ZlVHJpcChwYXJhbXMgOiBvYmplY3QgPSB7fSwgZG9Mb2dnaW5nIDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy50cmlwTW9kZWwuZGVsZXRlTWFueShwYXJhbXMpLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICBpZihkb0xvZ2dpbmcpIGNvbnNvbGUubG9nKGBEZWxldGVkICR7cmVzcG9uc2UuZGVsZXRlZENvdW50fSB0cmlwc2ApO1xyXG4gICAgfSlcclxuICB9XHJcbiAgLyoqXHJcbiAgICogSW5zZXJ0cyBtYW55IHRyaXBzIGF0IG9uY2UgaW50byB0aGUgZGF0YWJhc2UuXHJcbiAgICogQHBhcmFtIHRyaXBzIFRoZSB0cmlwcyB0byBhZGQuXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIEluc2VydE1hbnlUcmlwcyh0cmlwcykgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgYXdhaXQgdGhpcy50cmlwTW9kZWwuaW5zZXJ0TWFueSh0cmlwcywgeyBvcmRlcmVkOiBmYWxzZSB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSBcIktvcHBlbHZsYWsgNyBhbmQgOCB0dXJib1wiIGZpbGVzIHRvIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBJbnNlcnRUcmlwKHRyaXAgOiBUcmlwKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgbmV3IHRoaXMudHJpcE1vZGVsKHRyaXApLnNhdmUoZXJyb3IgPT4ge1xyXG4gICAgICBpZihlcnJvcikgY29uc29sZS5lcnJvcihgU29tZXRoaW5nIHdlbnQgd3Jvbmcgd2hpbGUgdHJ5aW5nIHRvIGFkZCB0cmlwOiAke3RyaXAudHJpcEhlYWRzaWdufS4gRXJyb3I6ICR7ZXJyb3J9YClcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgRHJvcFRyaXBzQ29sbGVjdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBpbmcgdHJpcHMgY29sbGVjdGlvblwiKTtcclxuICAgIGF3YWl0IHRoaXMudHJpcE1vZGVsLnJlbW92ZSh7fSk7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwZWQgdHJpcHMgY29sbGVjdGlvblwiKTtcclxuICB9XHJcbiAgcHVibGljIGFzeW5jIERyb3BSb3V0ZXNDb2xsZWN0aW9uKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGluZyByb3V0ZXMgY29sbGVjdGlvblwiKTtcclxuICAgIGF3YWl0IHRoaXMucm91dGVzTW9kZWwucmVtb3ZlKHt9KTtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBlZCByb3V0ZXMgY29sbGVjdGlvblwiKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRSb3V0ZShyb3V0ZUlkIDogbnVtYmVyKSA6IFByb21pc2U8Um91dGU+IHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5yb3V0ZXNNb2RlbC5maW5kT25lKHtcclxuICAgICAgcm91dGVJZCA6IHJvdXRlSWQsXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcmVzcG9uc2UgIT09IG51bGwgPyByZXNwb25zZSA6IHt9O1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFVwZGF0ZVRyaXBQb3NpdGlvbnModHJpcElkLCBjb21wYW55LCB0cmlwRGF0YSA6IFRyaXBQb3NpdGlvbkRhdGEpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLmRyaXZlblJvdXRlc01vZGVsLmZpbmRPbmVBbmRVcGRhdGUoXHJcbiAgICAgIHtcclxuICAgICAgICB0cmlwSWQgOiB0cmlwSWQsXHJcbiAgICAgICAgY29tcGFueSA6IGNvbXBhbnlcclxuICAgICAgfSwgXHJcbiAgICAgIHRyaXBEYXRhLCBcclxuICAgICAgeyB1cHNlcnQgOiB0cnVlIH1cclxuICAgIClcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRUcmlwUG9zaXRpb25zKHRyaXBJZCA6IG51bWJlciwgY29tcGFueSA6IHN0cmluZykgOiBQcm9taXNlPFRyaXBQb3NpdGlvbkRhdGE+IHtcclxuICAgIHJldHVybiBhd2FpdCB0aGlzLmRyaXZlblJvdXRlc01vZGVsLmZpbmRPbmUoeyBcclxuICAgICAgdHJpcElkOiB0cmlwSWQsXHJcbiAgICAgIGNvbXBhbnk6IGNvbXBhbnksXHJcbiAgICB9KVxyXG5cclxuXHJcbiAgfVxyXG5cclxuICAvLyBwdWJsaWMgYXN5bmMgQWRkUm91dGUoKVxyXG5cclxufVxyXG4iLCIvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBBUFAgQ09ORklHXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5cclxuaW1wb3J0ICogYXMgZG90ZW52IGZyb20gJ2RvdGVudic7XHJcbmRvdGVudi5jb25maWcoKTtcclxuXHJcbmNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDMwMDI7XHJcblxyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBZQVJOIElNUE9SVFNcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcbmltcG9ydCAqIGFzIGh0dHBzIGZyb20gJ2h0dHBzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5cclxuY29uc3QgZXhwcmVzcyA9IHJlcXVpcmUoXCJleHByZXNzXCIpO1xyXG5jb25zdCBjb3JzID0gcmVxdWlyZShcImNvcnNcIik7XHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICBDVVNUT00gSU1QT1JUU1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuXHJcbmltcG9ydCB7IERhdGFiYXNlIH0gZnJvbSAnLi9kYXRhYmFzZSc7XHJcbmltcG9ydCB7IFdlYnNvY2tldCB9IGZyb20gJy4vc29ja2V0JztcclxuaW1wb3J0IHsgT1ZEYXRhIH0gZnJvbSAnLi9yZWFsdGltZSc7XHJcblxyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBTU0wgQ09ORklHXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5jb25zdCBwcml2YXRlS2V5ID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9rZXkua2V5XCIpLnRvU3RyaW5nKCk7XHJcbmNvbnN0IGNlcnRpZmljYXRlID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9jZXJ0LmNydFwiKS50b1N0cmluZygpO1xyXG5jb25zdCBjYSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUva2V5LWNhLmNydFwiKS50b1N0cmluZygpO1xyXG5cclxuY29uc3QgQXBwSW5pdCA9IGFzeW5jICgpID0+IHtcclxuICBjb25zdCBkYiA9IGF3YWl0IERhdGFiYXNlLmdldEluc3RhbmNlKCkuSW5pdCgpLnRoZW4oKTtcclxuICBcclxuICBjb25zdCBhcHAgPSAobW9kdWxlLmV4cG9ydHMgPSBleHByZXNzKCkpO1xyXG5cclxuICBjb25zdCBzZXJ2ZXIgPSBodHRwcy5jcmVhdGVTZXJ2ZXIoXHJcbiAgICB7XHJcbiAgICAgIGtleTogcHJpdmF0ZUtleSxcclxuICAgICAgY2VydDogY2VydGlmaWNhdGUsXHJcbiAgICAgIGNhOiBjYSxcclxuICAgICAgcmVxdWVzdENlcnQ6IHRydWUsXHJcbiAgICAgIHJlamVjdFVuYXV0aG9yaXplZDogZmFsc2UsXHJcbiAgICB9LFxyXG4gICAgYXBwXHJcbiAgKTtcclxuICBcclxuXHJcbiAgLy9Ub2RvOiBDb3JzIG9ubHkgZm9yIG93biBzZXJ2ZXJcclxuXHJcbiAgY29uc3QgY29yc09wdGlvbnMgPSB7XHJcbiAgICBvcmlnaW46ICcqJyxcclxuICAgIG9wdGlvbnNTdWNjZXNzU3RhdHVzOiAyMDBcclxuICB9XHJcblxyXG4gIGFwcC51c2UoY29ycyhjb3JzT3B0aW9ucykpXHJcbiAgYXBwLm9wdGlvbnMoJyonLCBjb3JzKCkpXHJcblxyXG5cclxuICBjb25zdCBzb2NrZXQgPSBuZXcgV2Vic29ja2V0KHNlcnZlciwgZGIpO1xyXG4gIGNvbnN0IG92ID0gbmV3IE9WRGF0YShkYiwgc29ja2V0KTtcclxuICBcclxuICBzZXJ2ZXIubGlzdGVuKHBvcnQsICgpID0+IGNvbnNvbGUubG9nKGBMaXN0ZW5pbmcgYXQgaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9YCkpO1xyXG5cclxufVxyXG5cclxuQXBwSW5pdCgpO1xyXG4iLCJpbXBvcnQgeyBndW56aXAgfSBmcm9tICd6bGliJztcclxuaW1wb3J0IHsgQ29udmVydGVyIH0gZnJvbSAnLi9jb252ZXJ0ZXInO1xyXG5pbXBvcnQgeyBCdXNMb2dpYyB9IGZyb20gXCIuL2J1c2xvZ2ljXCI7XHJcblxyXG5pbXBvcnQgKiBhcyB4bWwgZnJvbSAnZmFzdC14bWwtcGFyc2VyJztcclxuaW1wb3J0IHsgV2Vic29ja2V0IH0gZnJvbSBcIi4vc29ja2V0XCI7XHJcblxyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCB7IERhdGFiYXNlIH0gZnJvbSAnLi9kYXRhYmFzZSc7XHJcblxyXG4vLyBjb25zdCB6bXEgPSByZXF1aXJlKCd6ZXJvbXEnKTtcclxuaW1wb3J0ICogYXMgem1xIGZyb20gJ3plcm9tcSc7XHJcbmltcG9ydCB7IFZlaGljbGVEYXRhIH0gZnJvbSAnLi90eXBlcy9WZWhpY2xlRGF0YSc7XHJcbmV4cG9ydCBjbGFzcyBPVkRhdGEge1xyXG4gIFxyXG4gIHByaXZhdGUgYnVzU29ja2V0IDogem1xLlNvY2tldDtcclxuICBwcml2YXRlIHRyYWluU29ja2V0IDogem1xLlNvY2tldDtcclxuICAvL3ByaXZhdGUga3Y3OHNvY2tldDtcclxuICBwcml2YXRlIGJ1c0xvZ2ljIDogQnVzTG9naWM7XHJcbiAgcHJpdmF0ZSB3ZWJzb2NrZXQgOiBXZWJzb2NrZXQ7XHJcblxyXG4gIHByaXZhdGUgdXBkYXRlZFZlaGljbGVzO1xyXG4gIGNvbnN0cnVjdG9yKGRhdGFiYXNlIDogRGF0YWJhc2UsIHNvY2tldCA6IFdlYnNvY2tldCkge1xyXG4gICAgdGhpcy53ZWJzb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICB0aGlzLkluaXQoKTtcclxuICAgIHRoaXMuYnVzTG9naWMgPSBuZXcgQnVzTG9naWMoZGF0YWJhc2UsIGZhbHNlKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBJbml0KCkge1xyXG5cclxuICAgIGNvbnN0IGNvbnZlcnRlciA9IG5ldyBDb252ZXJ0ZXIoKTtcclxuXHJcbiAgICB0aGlzLmJ1c1NvY2tldCA9IHptcS5zb2NrZXQoXCJzdWJcIik7XHJcbiAgICAvLyB0aGlzLnRyYWluU29ja2V0ID0gem1xLnNvY2tldChcInN1YlwiKTtcclxuICAgIFxyXG4gICAgdGhpcy5idXNTb2NrZXQuY29ubmVjdChcInRjcDovL3B1YnN1Yi5uZG92bG9rZXQubmw6NzY1OFwiKTtcclxuICAgIHRoaXMuYnVzU29ja2V0LnN1YnNjcmliZShcIi9BUlIvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuYnVzU29ja2V0LnN1YnNjcmliZShcIi9DWFgvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuYnVzU29ja2V0LnN1YnNjcmliZShcIi9ESVRQL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLmJ1c1NvY2tldC5zdWJzY3JpYmUoXCIvRUJTL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLmJ1c1NvY2tldC5zdWJzY3JpYmUoXCIvR1ZCL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLmJ1c1NvY2tldC5zdWJzY3JpYmUoXCIvT1BFTk9WL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLmJ1c1NvY2tldC5zdWJzY3JpYmUoXCIvUUJVWlovS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuYnVzU29ja2V0LnN1YnNjcmliZShcIi9SSUcvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuYnVzU29ja2V0LnN1YnNjcmliZShcIi9LRU9MSVMvS1Y2cG9zaW5mb1wiKTtcclxuXHJcbiAgICB0aGlzLmJ1c1NvY2tldC5vbihcIm1lc3NhZ2VcIiwgKG9wQ29kZSA6IGFueSwgLi4uY29udGVudCA6IGFueSkgPT4ge1xyXG4gICAgICBjb25zdCBjb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoY29udGVudCk7XHJcbiAgICAgIGNvbnN0IG9wZXJhdG9yID0gb3BDb2RlLnRvU3RyaW5nKCk7XHJcbiAgICAgIGd1bnppcChjb250ZW50cywgYXN5bmMoZXJyb3IsIGJ1ZmZlcikgPT4ge1xyXG4gICAgICAgIGlmKGVycm9yKSByZXR1cm4gY29uc29sZS5lcnJvcihgU29tZXRoaW5nIHdlbnQgd3Jvbmcgd2hpbGUgdHJ5aW5nIHRvIHVuemlwLiAke2Vycm9yfWApXHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgZW5jb2RlZFhNTCA9IGJ1ZmZlci50b1N0cmluZygpO1xyXG4gICAgICAgIGNvbnN0IGRlY29kZWQgPSB4bWwucGFyc2UodGhpcy5yZW1vdmVUbWk4KGVuY29kZWRYTUwpKTtcclxuICAgICAgICBcclxuICAgICAgICBsZXQgdmVoaWNsZURhdGEgOiBBcnJheTxWZWhpY2xlRGF0YT4gPSBjb252ZXJ0ZXIuZGVjb2RlKGRlY29kZWQsIG9wZXJhdG9yKTtcclxuICAgICAgICBcclxuXHJcbiAgICAgICAgY29uc3QgdXBkYXRlZFZlaGljbGVzID0gYXdhaXQgdGhpcy5idXNMb2dpYy5VcGRhdGVCdXNzZXModmVoaWNsZURhdGEpO1xyXG4gICAgICAgIGlmKHVwZGF0ZWRWZWhpY2xlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBjb25zdCBjb252ZXJ0ZWRVcGRhdGVkVmVoaWNsZXMgPSBhd2FpdCB0aGlzLmJ1c0xvZ2ljLkNvbnZlcnRUb1dlYnNvY2tldCh1cGRhdGVkVmVoaWNsZXMpO1xyXG4gICAgICAgICAgdGhpcy53ZWJzb2NrZXQuRW1pdChjb252ZXJ0ZWRVcGRhdGVkVmVoaWNsZXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgfSlcclxuXHJcbiAgICB9KVxyXG4gICAgXHJcbiAgICBcclxuICAgIC8vIHRoaXMudHJhaW5Tb2NrZXQuY29ubmVjdChcInRjcDovL3B1YnN1Yi5uZG92bG9rZXQubmw6NzY2NFwiKTtcclxuICAgIC8vIHRoaXMudHJhaW5Tb2NrZXQuc3Vic2NyaWJlKFwiL1JJRy9JbmZvUGx1c1ZUQlNJbnRlcmZhY2U1XCIpO1xyXG4gICAgLy8gdGhpcy50cmFpblNvY2tldC5zdWJzY3JpYmUoXCIvUklHL0luZm9QbHVzVlRCTEludGVyZmFjZTVcIik7XHJcblxyXG4gICAgLy8gdGhpcy50cmFpblNvY2tldC5vbihcIm1lc3NhZ2VcIiwgKG9wQ29kZSA6IGFueSwgLi4uY29udGVudCA6IGFueSkgPT4ge1xyXG4gICAgLy8gICBjb25zdCBjb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoY29udGVudCk7XHJcbiAgICAvLyAgIGNvbnN0IG9wZXJhdG9yID0gb3BDb2RlLnRvU3RyaW5nKCk7XHJcbiAgICAvLyAgIGNvbnNvbGUubG9nKG9wZXJhdG9yKTtcclxuICAgIC8vICAgZ3VuemlwKGNvbnRlbnRzLCBhc3luYyhlcnJvciwgYnVmZmVyKSA9PiB7XHJcbiAgICAvLyAgICAgaWYoZXJyb3IpIHJldHVybiBjb25zb2xlLmVycm9yKGBTb21ldGhpbmcgd2VudCB3cm9uZyB3aGlsZSB0cnlpbmcgdG8gdW56aXAuICR7ZXJyb3J9YClcclxuXHJcbiAgICAvLyAgICAgY29uc3QgZW5jb2RlZFhNTCA9IGJ1ZmZlci50b1N0cmluZygpO1xyXG4gICAgLy8gICAgIGNvbnN0IGRlY29kZWQgPSB4bWwucGFyc2UodGhpcy5yZW1vdmVUbWk4KGVuY29kZWRYTUwpKTtcclxuXHJcbiAgICAvLyAgICAgZnMud3JpdGVGaWxlKFwiSW5mb1BsdXNWVEJTSW50ZXJmYWNlNS5qc29uXCIsIEpTT04uc3RyaW5naWZ5KGRlY29kZWQpLCAoKSA9PiB7fSlcclxuICAgIC8vICAgICAvLyBjb25zb2xlLmxvZyhkZWNvZGVkKVxyXG4gICAgLy8gICAgIC8vIGxldCB2ZWhpY2xlRGF0YSA6IEFycmF5PFZlaGljbGVEYXRhPiA9IGNvbnZlcnRlci5kZWNvZGUoZGVjb2RlZCwgb3BlcmF0b3IpO1xyXG4gICAgICAgIFxyXG4gICAgLy8gICAgIC8vIGF3YWl0IHRoaXMuYnVzTG9naWMuVXBkYXRlQnVzc2VzKHZlaGljbGVEYXRhKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgLy8gICB9KVxyXG5cclxuICAgIC8vIH0pXHJcblxyXG4gICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xyXG4gICAgICBcclxuICAgIH0sIHBhcnNlSW50KHByb2Nlc3MuZW52LkFQUF9CVVNfVVBEQVRFX0RFTEFZKSlcclxuICAgIFxyXG4gICAgLy8gdGhpcy5rdjc4c29ja2V0ID0gem1xLnNvY2tldChcInN1YlwiKTtcclxuICAgIC8vIHRoaXMua3Y3OHNvY2tldC5jb25uZWN0KFwidGNwOi8vcHVic3ViLm5kb3Zsb2tldC5ubDo3ODE3XCIpO1xyXG4gICAgLy8gdGhpcy5rdjc4c29ja2V0LnN1YnNjcmliZShcIi9cIilcclxuICAgIC8vIHRoaXMua3Y3OHNvY2tldC5vbihcIm1lc3NhZ2VcIiwgKG9wQ29kZSwgLi4uY29udGVudCkgPT4ge1xyXG4gICAgLy8gICBjb25zdCBjb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoY29udGVudCk7XHJcbiAgICAvLyAgIGd1bnppcChjb250ZW50cywgYXN5bmMoZXJyb3IsIGJ1ZmZlcikgPT4geyBcclxuICAgIC8vICAgICBjb25zb2xlLmxvZyhidWZmZXIudG9TdHJpbmcoJ3V0ZjgnKSlcclxuICAgIC8vICAgfSk7XHJcbiAgICAvLyB9KTtcclxuICB9XHJcblxyXG4gIHJlbW92ZVRtaTggKGRhdGEpIDogYW55IHtcclxuICAgIHJldHVybiBkYXRhLnJlcGxhY2UoL3RtaTg6L2csIFwiXCIpO1xyXG4gIH1cclxufSIsImltcG9ydCB7IFZlaGljbGVEYXRhIH0gZnJvbSBcIi4vdHlwZXMvVmVoaWNsZURhdGFcIjtcclxuaW1wb3J0IHsgU2VydmVyIH0gZnJvbSAnaHR0cHMnO1xyXG5pbXBvcnQgeyBTb2NrZXQgfSBmcm9tICdzb2NrZXQuaW8nO1xyXG5pbXBvcnQgeyBEYXRhYmFzZSB9IGZyb20gJy4vZGF0YWJhc2UnO1xyXG5pbXBvcnQgeyBXZWJzb2NrZXRWZWhpY2xlRGF0YSB9IGZyb20gXCIuL3R5cGVzL1dlYnNvY2tldFZlaGljbGVEYXRhXCI7XHJcbmltcG9ydCAqIGFzIHpsaWIgZnJvbSAnemxpYic7XHJcblxyXG5leHBvcnQgY2xhc3MgV2Vic29ja2V0IHtcclxuICBcclxuICBwcml2YXRlIGlvIDogU29ja2V0O1xyXG4gIHByaXZhdGUgZGIgOiBEYXRhYmFzZTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2VydmVyIDogU2VydmVyLCBkYiA6IERhdGFiYXNlKSB7XHJcbiAgICB0aGlzLlNvY2tldEluaXQoc2VydmVyKTtcclxuICAgIHRoaXMuZGIgPSBkYjtcclxuICB9XHJcblxyXG4gIGFzeW5jIFNvY2tldEluaXQoc2VydmVyIDogU2VydmVyKSB7XHJcbiAgICBjb25zb2xlLmxvZyhgSW5pdGFsaXppbmcgd2Vic29ja2V0YClcclxuXHJcbiAgICB0aGlzLmlvID0gcmVxdWlyZShcInNvY2tldC5pb1wiKShzZXJ2ZXIsIHtcclxuICAgICAgY29yczoge1xyXG4gICAgICAgIG9yaWdpbjogXCIqXCIsXHJcbiAgICAgICAgbWV0aG9kczogW1wiR0VUXCIsIFwiUE9TVFwiXSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuaW8ub24oXCJjb25uZWN0aW9uXCIsIHNvY2tldCA9PiB7XHJcbiAgICAgIHRoaXMuU29ja2V0KHNvY2tldCk7XHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgU29ja2V0KHNvY2tldCA6IFNvY2tldCkge1xyXG4gICAgY29uc29sZS5sb2coXCJOZXcgY2xpZW50IGNvbm5lY3RlZC5cIik7XHJcblxyXG4gICAgc29ja2V0Lm9uKFwiZGlzY29ubmVjdFwiLCAoKSA9PiB7XHJcbiAgICAgIGNvbnNvbGUubG9nKFwiQ2xpZW50IGRpc2Nvbm5lY3RlZFwiKTtcclxuICAgICAgLy9jbGVhckludGVydmFsKGludGVydmFsKTtcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBTZW5kRGVsZXRlZFZlaGljbGVzKHZlaGljbGVzIDogQXJyYXk8VmVoaWNsZURhdGE+KSA6IHZvaWQge1xyXG4gICAgdGhpcy5pby5lbWl0KFwiZGVsZXRlZFZlaGljbGVzXCIsIHZlaGljbGVzKTtcclxuICB9XHJcblxyXG4gIENyZWF0ZUJ1ZmZlckZyb21WZWhpY2xlcyh2ZWhpY2xlcyA6IEFycmF5PFdlYnNvY2tldFZlaGljbGVEYXRhPikgeyBcclxuICAgIGxldCBidWYgPSBCdWZmZXIuYWxsb2MoKDQgKyA0ICsgNCArIDM5KSAqIHZlaGljbGVzLmxlbmd0aClcclxuICAgIHZlaGljbGVzLmZvckVhY2goKHZlaGljbGUgOiBXZWJzb2NrZXRWZWhpY2xlRGF0YSwgaW5kZXggOiBudW1iZXIpID0+IHtcclxuICAgICAgYnVmLndyaXRlRmxvYXRCRSh2ZWhpY2xlLnBbMF0sIGluZGV4ICogNTEpXHJcbiAgICAgIGJ1Zi53cml0ZUZsb2F0QkUodmVoaWNsZS5wWzFdLCBpbmRleCAqIDUxICsgNClcclxuICAgICAgYnVmLndyaXRlVUludDMyQkUodmVoaWNsZS52LCBpbmRleCAqIDUxICsgNCArIDQpXHJcbiAgICAgIGJ1Zi53cml0ZShgJHt2ZWhpY2xlLmN9fCR7dmVoaWNsZS5ufXwke3ZlaGljbGUuaX1gLCBpbmRleCAqIDUxICsgNCArIDQgKyA0KVxyXG4gICAgICBmb3IobGV0IGkgPSAwOyBpIDwgMzkgLSAodmVoaWNsZS5jLmxlbmd0aCArIDEgKyB2ZWhpY2xlLm4ubGVuZ3RoKTsgaSsrKSB7XHJcbiAgICAgICAgYnVmLndyaXRlVUludDgoMCwgaW5kZXggKiA1MSArIDQgKyA0ICsgNCArIHZlaGljbGUuYy5sZW5ndGggKyAxICsgdmVoaWNsZS5uLmxlbmd0aClcclxuICAgICAgfVxyXG4gICAgfSlcclxuXHJcbiAgICByZXR1cm4gYnVmO1xyXG4gIH1cclxuXHJcbiAgRW1pdCh2ZWhpY2xlcykge1xyXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgIC8vVG9kbzogU2VlIGlmIHRoaXMgcmVhbGx5IGlzIGEgc21hcnQgd2F5IGFuZCBpZiBpdCBzYXZlcyBkYXRhLlxyXG4gICAgICBjb25zdCBidWZmZXIgPSB0aGlzLkNyZWF0ZUJ1ZmZlckZyb21WZWhpY2xlcyh2ZWhpY2xlcyk7XHJcbiAgICAgICAgLy8gY29uc3QgY29tcHJlc3NlZCA9IHpsaWIuZGVmbGF0ZShidWZmZXIsIChlcnIsIGJ1ZmZlcikgPT4ge1xyXG4gICAgICAgIC8vICAgaWYoIWVycikgdGhpcy5pby5lbWl0KFwib3ZkYXRhXCIsIGJ1ZmZlcilcclxuICAgICAgICAgIFxyXG4gICAgICAgIC8vIH0pXHJcbiAgICAgICAgdGhpcy5pby5lbWl0KFwib3ZkYXRhXCIsIGJ1ZmZlcilcclxuICAgICAgICAvL1NtYWxsIGRlbGF5IHRvIG1ha2Ugc3VyZSB0aGUgc2VydmVyIGNhdGNoZXMgdXAuXHJcbiAgICB9LCAxMDApXHJcbiAgfVxyXG5cclxufSIsImV4cG9ydCBjb25zdCBDb21wYW5pZXMgPSB7XHJcbiAgQVJSIDogXCJBUlJcIixcclxuICBDWFggOiBcIkNYWFwiLFxyXG4gIERJVFAgOiBcIkRJVFBcIixcclxuICBFQlMgOiBcIkVCU1wiLFxyXG4gIEdWQiA6IFwiR1ZCXCIsXHJcbiAgS0VPTElTOiBcIktFT0xJU1wiLFxyXG4gIE9QRU5PVjogXCJPUEVOT1ZcIixcclxuICBRQlVaWiA6IFwiUUJVWlpcIixcclxuICBSSUcgOiBcIlJJR1wiXHJcbn0iLCJleHBvcnQgZW51bSB2ZWhpY2xlU3RhdGUge1xyXG4gIE9OUk9VVEUgPSAnT05ST1VURScsXHJcbiAgT0ZGUk9VVEUgPSAnT0ZGUk9VVEUnLFxyXG4gIEVORCA9IFwiRU5EXCIsXHJcbiAgREVQQVJUVVJFID0gJ0RFUEFSVFVSRScsXHJcbiAgSU5JVCA9ICdJTklUJyxcclxuICBERUxBWSA9ICdERUxBWScsXHJcbiAgT05TVE9QID0gJ09OU1RPUCcsXHJcbiAgQVJSSVZBTCA9ICdBUlJJVkFMJ1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFZlaGljbGVEYXRhIHtcclxuICBjb21wYW55OiBzdHJpbmcsXHJcbiAgb3JpZ2luYWxDb21wYW55OiBzdHJpbmcsXHJcbiAgcGxhbm5pbmdOdW1iZXI6IHN0cmluZyxcclxuICBqb3VybmV5TnVtYmVyOiBudW1iZXIsXHJcbiAgbGluZU51bWJlciA6IHN0cmluZyxcclxuICB0aW1lc3RhbXA6IG51bWJlcixcclxuICB2ZWhpY2xlTnVtYmVyOiBudW1iZXIsXHJcbiAgcG9zaXRpb246IFtudW1iZXIsIG51bWJlcl0sXHJcbiAgc3RhdHVzOiB2ZWhpY2xlU3RhdGUsXHJcbiAgY3JlYXRlZEF0OiBudW1iZXIsXHJcbiAgdXBkYXRlZEF0OiBudW1iZXIsXHJcbiAgcHVuY3R1YWxpdHk6IEFycmF5PG51bWJlcj4sXHJcbiAgdXBkYXRlZFRpbWVzOiBBcnJheTxudW1iZXI+LFxyXG4gIGN1cnJlbnRSb3V0ZUlkOiBudW1iZXIsXHJcbiAgY3VycmVudFRyaXBJZDogbnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVmVoaWNsZURhdGFXaXRoSWQge1xyXG4gIF9pZDogc3RyaW5nLFxyXG4gIGNvbXBhbnk6IHN0cmluZyxcclxuICBvcmlnaW5hbENvbXBhbnk6IHN0cmluZyxcclxuICBwbGFubmluZ051bWJlcjogc3RyaW5nLFxyXG4gIGpvdXJuZXlOdW1iZXI6IG51bWJlcixcclxuICBsaW5lTnVtYmVyIDogc3RyaW5nLFxyXG4gIHRpbWVzdGFtcDogbnVtYmVyLFxyXG4gIHZlaGljbGVOdW1iZXI6IG51bWJlcixcclxuICBwb3NpdGlvbjogW251bWJlciwgbnVtYmVyXSxcclxuICBzdGF0dXM6IHZlaGljbGVTdGF0ZSxcclxuICBjcmVhdGVkQXQ6IG51bWJlcixcclxuICB1cGRhdGVkQXQ6IG51bWJlcixcclxuICBwdW5jdHVhbGl0eTogQXJyYXk8bnVtYmVyPixcclxuICB1cGRhdGVkVGltZXM6IEFycmF5PG51bWJlcj4sXHJcbiAgY3VycmVudFJvdXRlSWQ6IG51bWJlcixcclxuICBjdXJyZW50VHJpcElkOiBudW1iZXJcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJjaGlsZF9wcm9jZXNzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJjb3JzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJkb3RlbnZcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImV4cHJlc3NcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImZhc3QteG1sLXBhcnNlclwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZnNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImh0dHBzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJtb25nb29zZVwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwicGF0aFwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwic29ja2V0LmlvXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzcGxpdFwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwic3RyZWFtLXRvLW1vbmdvLWRiXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJ6ZXJvbXFcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInpsaWJcIik7OyIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBzdGFydHVwXG4vLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbi8vIFRoaXMgZW50cnkgbW9kdWxlIGlzIHJlZmVyZW5jZWQgYnkgb3RoZXIgbW9kdWxlcyBzbyBpdCBjYW4ndCBiZSBpbmxpbmVkXG52YXIgX193ZWJwYWNrX2V4cG9ydHNfXyA9IF9fd2VicGFja19yZXF1aXJlX18oXCIuL3NyYy9tYWluLnRzXCIpO1xuIl0sInNvdXJjZVJvb3QiOiIifQ==