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
const turf = __importStar(__webpack_require__(/*! @turf/turf */ "@turf/turf"));
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
                await this.database.UpdateVehicle(foundVehicle, bus, true);
            }
            else {
                if (process.env.APP_DO_CREATE_LOGGING == "true")
                    console.log(`creating new vehicle ${bus.vehicleNumber} from ${bus.company}`);
                if (bus.status === VehicleData_1.vehicleState.ONROUTE)
                    await this.database.AddVehicle(bus);
            }
        }));
    }
    async AddPositionToTripRoute(tripId, company, position) {
        if (position[0] == 3.3135291562643467)
            return;
        let retrievedTripRouteData = await this.database.GetTripPositions(tripId, company);
        if (retrievedTripRouteData) {
            retrievedTripRouteData.updatedTimes.push(new Date().getTime());
            const newUpdatedTimes = retrievedTripRouteData.updatedTimes;
            let resultArray;
            if (retrievedTripRouteData.positions.length > 1) {
                const targetPoint = turf.point(position);
                const currentLine = turf.lineString(retrievedTripRouteData.positions);
                const nearest = turf.nearestPointOnLine(currentLine, targetPoint);
                const index = nearest.properties.index;
                const firstHalf = retrievedTripRouteData.positions.slice(0, index);
                const secondHalf = retrievedTripRouteData.positions.slice(index);
                firstHalf.push([targetPoint.geometry.coordinates[0], targetPoint.geometry.coordinates[1]]);
                resultArray = firstHalf.concat(secondHalf);
            }
            else {
                retrievedTripRouteData.positions.push(position);
                resultArray = retrievedTripRouteData.positions;
            }
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
        const smallBusses = [];
        const result = await this.vehicleModel.find({ ...args }, {
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
        result.forEach(res => {
            smallBusses.push({
                p: res.position,
                c: res.company,
                v: res.vehicleNumber,
                n: res.lineNumber
            });
        });
        return smallBusses;
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
        await this.vehicleModel.findOneAndUpdate(vehicleToUpdate, updatedVehicleData);
    }
    async AddVehicle(vehicle) {
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
    //THIS IS NOT SAFE
    const corsOptions = {
        origin: '*',
        optionsSuccessStatus: 200
    };
    app.use(cors(corsOptions));
    app.options('*', cors());
    const socket = new socket_1.Websocket(server, db);
    const ov = new realtime_1.OVData(db, socket);
    // const bikedal = new BikeDal(db);
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
                await this.busLogic.UpdateBusses(vehicleData);
            });
        });
        // this.bikeSocket = zmq.socket("sub");
        // this.bikeSocket.connect("tcp://vid.openov.nl:6703")
        // this.bikeSocket.subscribe("/OVfiets");
        // this.bikeSocket.on("message", (opCode : any, ...content : any) => {
        //   const contents = Buffer.concat(content);
        //   const operator = opCode.toString();
        //   console.log(operator);
        //   console.log(contents);
        // })
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
            this.websocket.EmitBikes();
        }, parseInt(process.env.APP_BIKE_UPDATE_DELAY));
        setInterval(() => {
            this.websocket.Emit("slow");
        }, parseInt(process.env.APP_BUS_UPDATE_DELAY_SLOW));
        setInterval(() => {
            this.websocket.Emit("normal");
        }, parseInt(process.env.APP_BUS_UPDATE_NORMAL));
        setInterval(() => {
            this.websocket.Emit("fast");
        }, parseInt(process.env.APP_BUS_UPDATE_DELAY_FAST));
        setInterval(() => {
            this.websocket.Emit("veryfast");
        }, parseInt(process.env.APP_BUS_UPDATE_DELAY_VERYFAST));
        setInterval(() => {
            this.websocket.Emit("superfast");
        }, parseInt(process.env.APP_BUS_UPDATE_DELAY_SUPERFAST));
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
            socket.on('room', room => {
                socket.join(room);
                console.log(`New client connected to room: ${room}.`);
            });
            socket.on("disconnect", () => {
                console.log("Client disconnected");
                //clearInterval(interval);
            });
        });
    }
    CreateBufferFromBikes(vehicles) {
        let buf = Buffer.alloc((4 + 4 + 4 + 15) * vehicles.length);
        vehicles.forEach((vehicle, index) => {
            buf.writeFloatBE(vehicle.p[0], index * 27);
            buf.writeFloatBE(vehicle.p[1], index * 27 + 4);
            buf.writeUInt32BE(vehicle.v, index * 27 + 4 + 4);
            buf.write(`${vehicle.c}|${vehicle.n}`, index * 27 + 4 + 4 + 4);
            for (let i = 0; i < 15 - (vehicle.c.length + 1 + vehicle.n.length); i++) {
                buf.writeUInt8(0, index * 27 + 4 + 4 + 4 + vehicle.c.length + 1 + vehicle.n.length);
            }
        });
        return buf;
    }
    CreateBufferFromVehicles(vehicles) {
        let buf = Buffer.alloc((4 + 4 + 4 + 15) * vehicles.length);
        vehicles.forEach((vehicle, index) => {
            buf.writeFloatBE(vehicle.p[0], index * 27);
            buf.writeFloatBE(vehicle.p[1], index * 27 + 4);
            buf.writeUInt32BE(vehicle.v, index * 27 + 4 + 4);
            buf.write(`${vehicle.c}|${vehicle.n}`, index * 27 + 4 + 4 + 4);
            for (let i = 0; i < 15 - (vehicle.c.length + 1 + vehicle.n.length); i++) {
                buf.writeUInt8(0, index * 27 + 4 + 4 + 4 + vehicle.c.length + 1 + vehicle.n.length);
            }
        });
        return buf;
    }
    Emit(room) {
        setTimeout(() => {
            this.db.GetAllVehiclesSmall().then((vehicles) => this.io.to(room).emit("ovdata", this.CreateBufferFromVehicles(vehicles)));
            //Small delay to make sure the server catches up.
        }, 100);
    }
    EmitBikes() {
        this.db.GetAllVehiclesSmall().then((bikes) => this.io.to("bikes").emit("bikes", this.CreateBufferFromBikes(bikes)));
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

/***/ "@turf/turf":
/*!*****************************!*\
  !*** external "@turf/turf" ***!
  \*****************************/
/***/ ((module) => {

module.exports = require("@turf/turf");;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9idXNsb2dpYy50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9jb252ZXJ0ZXIudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvZGF0YWJhc2UudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvbWFpbi50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9yZWFsdGltZS50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9zb2NrZXQudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvdHlwZXMvQ29tcGFuaWVzLnRzIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyLy4vc3JjL3R5cGVzL1ZlaGljbGVEYXRhLnRzIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiQHR1cmYvdHVyZlwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiY2hpbGRfcHJvY2Vzc1wiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiY29yc1wiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiZG90ZW52XCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJleHByZXNzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJmYXN0LXhtbC1wYXJzZXJcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcImZzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJodHRwc1wiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwibW9uZ29vc2VcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcInBhdGhcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcInNvY2tldC5pb1wiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwic3BsaXRcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcInN0cmVhbS10by1tb25nby1kYlwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiemVyb21xXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJ6bGliXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvd2VicGFjay9zdGFydHVwIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsbUdBQWdFO0FBQ2hFLHVEQUErQjtBQUMvQiw2REFBeUI7QUFHekIsa0ZBQXFDO0FBR3JDLCtFQUFrQztBQUVsQyxNQUFhLFFBQVE7SUFJbkIsWUFBWSxRQUFRLEVBQUUsU0FBbUIsS0FBSztRQUM1QyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUV6QixJQUFHLE1BQU07WUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUVPLEtBQUssQ0FBQyxVQUFVO1FBQ3RCLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRXpCLFdBQVcsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNyQixNQUFNLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMzQixDQUFDLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlC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QUFDLENBQUM7UUFDM0MsTUFBTSxJQUFJLEdBQUcsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNO1lBQ3ZFLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDOUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPO1lBQzdDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU87WUFDOUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTztZQUM1QyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQ3hELEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTztZQUN4QixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDWCxNQUFNLElBQUksR0FBRyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPO1lBQy9ELEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDNUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPO1lBQ2xCLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDNUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUN2QixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQzVDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUNsQixFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFDOUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQzFCLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUNsQixJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRW5CLE1BQU0sUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQztRQUMxQyxNQUFNLFNBQVMsR0FBRyxRQUFRLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFFM0MsT0FBTyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUM7SUFDOUIsQ0FBQztDQUVG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Ozs7O0FDQUEsbUM7Ozs7Ozs7Ozs7QUNBQSxnRDs7Ozs7Ozs7OztBQ0FBLG9DOzs7Ozs7Ozs7O0FDQUEsa0M7Ozs7OztVQ0FBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7VUN0QkE7VUFDQTtVQUNBO1VBQ0EiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tIFwiLi9kYXRhYmFzZVwiO1xyXG5pbXBvcnQgeyBWZWhpY2xlRGF0YSwgdmVoaWNsZVN0YXRlIH0gZnJvbSBcIi4vdHlwZXMvVmVoaWNsZURhdGFcIjtcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCB7IFRyaXAgfSBmcm9tIFwiLi90eXBlcy9UcmlwXCI7XHJcbmltcG9ydCB7IEFwaVRyaXAgfSBmcm9tIFwiLi90eXBlcy9BcGlUcmlwXCI7XHJcbmltcG9ydCB7IGV4ZWMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcclxuaW1wb3J0IHsgUm91dGUgfSBmcm9tIFwiLi90eXBlcy9Sb3V0ZVwiO1xyXG5pbXBvcnQgeyBUcmlwUG9zaXRpb25EYXRhIH0gZnJvbSBcIi4vdHlwZXMvVHJpcFBvc2l0aW9uRGF0YVwiO1xyXG5pbXBvcnQgKiBhcyB0dXJmIGZyb20gJ0B0dXJmL3R1cmYnXHJcblxyXG5leHBvcnQgY2xhc3MgQnVzTG9naWMge1xyXG5cclxuICBwcml2YXRlIGRhdGFiYXNlIDogRGF0YWJhc2U7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGRhdGFiYXNlLCBkb0luaXQgOiBib29sZWFuID0gZmFsc2UpIHtcclxuICAgIHRoaXMuZGF0YWJhc2UgPSBkYXRhYmFzZTtcclxuXHJcbiAgICBpZihkb0luaXQpIHRoaXMuSW5pdGlhbGl6ZSgpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBJbml0aWFsaXplKCkge1xyXG4gICAgYXdhaXQgdGhpcy5DbGVhckJ1c3NlcygpO1xyXG5cclxuICAgIHNldEludGVydmFsKGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgdGhpcy5DbGVhckJ1c3NlcygpO1xyXG4gICAgfSwgcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0NMRUFOVVBfREVMQVkpKVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRlcyBvciBjcmVhdGVzIGEgbmV3IGJ1cyBkZXBlbmRpbmcgb24gaWYgaXQgYWxyZWFkeSBleGlzdHMgb3Igbm90LlxyXG4gICAqIEBwYXJhbSBidXNzZXMgVGhlIGxpc3Qgb2YgYnVzc2VzIHRvIHVwZGF0ZS5cclxuICAgKi9cclxuICAgcHVibGljIGFzeW5jIFVwZGF0ZUJ1c3NlcyhidXNzZXMgOiBBcnJheTxWZWhpY2xlRGF0YT4pIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgXHJcbiAgICBhd2FpdCBQcm9taXNlLmFsbChidXNzZXMubWFwKGFzeW5jIChidXMpID0+IHtcclxuICAgICAgY29uc3QgZm91bmRUcmlwIDogVHJpcCA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0VHJpcChidXMuam91cm5leU51bWJlciwgYnVzLnBsYW5uaW5nTnVtYmVyLCBidXMuY29tcGFueSk7XHJcbiAgICAgIGNvbnN0IGZvdW5kUm91dGUgOiBSb3V0ZSA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0Um91dGUoZm91bmRUcmlwLnJvdXRlSWQpO1xyXG5cclxuICAgICAgLy9UT0RPOiBNYXliZSB0aGlzIHNob3VsZCBiZSBkaWZmZXJlbnQuXHJcbiAgICAgIGJ1cy5saW5lTnVtYmVyID0gXCI5OTlcIjtcclxuICAgICAgYnVzLmN1cnJlbnRSb3V0ZUlkID0gMDtcclxuICAgICAgYnVzLmN1cnJlbnRUcmlwSWQgPSAwO1xyXG5cclxuICAgICAgaWYoZm91bmRSb3V0ZS5jb21wYW55KSBidXMuY29tcGFueSA9IGZvdW5kUm91dGUuY29tcGFueTtcclxuICAgICAgaWYoZm91bmRSb3V0ZSAmJiBmb3VuZFJvdXRlLnJvdXRlU2hvcnROYW1lICYmIGZvdW5kUm91dGUucm91dGVJZCkge1xyXG4gICAgICAgIGJ1cy5saW5lTnVtYmVyID0gZm91bmRSb3V0ZS5yb3V0ZVNob3J0TmFtZTtcclxuICAgICAgICBidXMuY3VycmVudFJvdXRlSWQgPSBmb3VuZFJvdXRlLnJvdXRlSWRcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYoZm91bmRUcmlwICYmIGZvdW5kVHJpcC50cmlwSWQpIGJ1cy5jdXJyZW50VHJpcElkID0gZm91bmRUcmlwLnRyaXBJZDtcclxuXHJcbiAgICAgIGxldCBmb3VuZFZlaGljbGUgOiBWZWhpY2xlRGF0YSA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0VmVoaWNsZShidXMudmVoaWNsZU51bWJlciwgYnVzLmNvbXBhbnkpO1xyXG4gICAgICBcclxuICAgICAgXHJcblxyXG4gICAgICBpZihPYmplY3Qua2V5cyhmb3VuZFZlaGljbGUpLmxlbmd0aCAhPT0gMCkge1xyXG4gICAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19VUERBVEVfTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coYFVwZGF0aW5nIHZlaGljbGUgJHtidXMudmVoaWNsZU51bWJlcn0gZnJvbSAke2J1cy5jb21wYW55fWApXHJcbiAgICAgICAgaWYoIWZvdW5kVmVoaWNsZVtcIl9kb2NcIl0pIHsgY29uc29sZS5lcnJvcihgVmVoaWNsZSAke2J1cy52ZWhpY2xlTnVtYmVyfSBmcm9tICR7YnVzLmNvbXBhbnl9IGRpZCBub3QgaW5jbHVkZSBhIGRvYy4gYCk7IHJldHVybiB9XHJcblxyXG4gICAgICAgIGZvdW5kVmVoaWNsZSA9IGZvdW5kVmVoaWNsZVtcIl9kb2NcIl07XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy9NZXJnZSB0aGUgcHVuY3R1YWxpdGllcyBvZiB0aGUgb2xkIHZlaGljbGVEYXRhIHdpdGggdGhlIG5ldyBvbmUuXHJcbiAgICAgICAgYnVzLnB1bmN0dWFsaXR5ID0gZm91bmRWZWhpY2xlLnB1bmN0dWFsaXR5LmNvbmNhdChidXMucHVuY3R1YWxpdHkpO1xyXG5cclxuICAgICAgICAvL01lcmdlIHRoZSB1cGRhdGVkIHRpbWVzIG9mIHRoZSBvbGQgdmVoaWNsZURhdGEgd2l0aCB0aGUgbmV3IG9uZS5cclxuICAgICAgICBidXMudXBkYXRlZFRpbWVzID0gZm91bmRWZWhpY2xlLnVwZGF0ZWRUaW1lcy5jb25jYXQoYnVzLnVwZGF0ZWRUaW1lcyk7XHJcblxyXG4gICAgICAgIGlmKGJ1cy5zdGF0dXMgIT09IHZlaGljbGVTdGF0ZS5PTlJPVVRFKSBidXMucG9zaXRpb24gPSBmb3VuZFZlaGljbGUucG9zaXRpb247XHJcblxyXG4gICAgICAgIGlmKGJ1cy5zdGF0dXMgPT09IHZlaGljbGVTdGF0ZS5JTklUIHx8IGJ1cy5zdGF0dXMgPT09IHZlaGljbGVTdGF0ZS5FTkQpIHtcclxuICAgICAgICAgIGJ1cy5wdW5jdHVhbGl0eSA9IFtdO1xyXG4gICAgICAgICAgYnVzLnVwZGF0ZWRUaW1lcyA9IFtdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy9UT0RPOiBSZW1vdmUgcHVuY3R1YWxpdHkgZGF0YSBvbGRlciB0aGFuIDYwIG1pbnV0ZXMuXHJcblxyXG4gICAgICAgIGJ1cy51cGRhdGVkQXQgPSBEYXRlLm5vdygpOyAgXHJcbiAgICAgICAgaWYoT2JqZWN0LmtleXMoZm91bmRUcmlwKS5sZW5ndGggIT09IDApIHRoaXMuQWRkUG9zaXRpb25Ub1RyaXBSb3V0ZShmb3VuZFRyaXAudHJpcElkLCBmb3VuZFRyaXAuY29tcGFueSwgYnVzLnBvc2l0aW9uKTtcclxuICAgICAgICBhd2FpdCB0aGlzLmRhdGFiYXNlLlVwZGF0ZVZlaGljbGUoZm91bmRWZWhpY2xlLCBidXMsIHRydWUpXHJcbiAgICAgICAgXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NSRUFURV9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhgY3JlYXRpbmcgbmV3IHZlaGljbGUgJHtidXMudmVoaWNsZU51bWJlcn0gZnJvbSAke2J1cy5jb21wYW55fWApXHJcbiAgICAgICAgaWYoYnVzLnN0YXR1cyA9PT0gdmVoaWNsZVN0YXRlLk9OUk9VVEUpIGF3YWl0IHRoaXMuZGF0YWJhc2UuQWRkVmVoaWNsZShidXMpXHJcbiAgICAgIH1cclxuICAgIH0pKVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEFkZFBvc2l0aW9uVG9UcmlwUm91dGUgKHRyaXBJZCA6IG51bWJlciwgY29tcGFueSA6IHN0cmluZywgcG9zaXRpb24gOiBbbnVtYmVyLCBudW1iZXJdKSB7XHJcbiAgICBpZihwb3NpdGlvblswXSA9PSAzLjMxMzUyOTE1NjI2NDM0NjcpIHJldHVybjtcclxuICAgIGxldCByZXRyaWV2ZWRUcmlwUm91dGVEYXRhIDogVHJpcFBvc2l0aW9uRGF0YSA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0VHJpcFBvc2l0aW9ucyh0cmlwSWQsIGNvbXBhbnkpO1xyXG4gICAgaWYocmV0cmlldmVkVHJpcFJvdXRlRGF0YSkgeyBcclxuICAgICAgcmV0cmlldmVkVHJpcFJvdXRlRGF0YS51cGRhdGVkVGltZXMucHVzaChuZXcgRGF0ZSgpLmdldFRpbWUoKSk7XHJcbiAgICAgIGNvbnN0IG5ld1VwZGF0ZWRUaW1lcyA9IHJldHJpZXZlZFRyaXBSb3V0ZURhdGEudXBkYXRlZFRpbWVzO1xyXG4gICAgICBsZXQgcmVzdWx0QXJyYXk7XHJcblxyXG4gICAgICBpZihyZXRyaWV2ZWRUcmlwUm91dGVEYXRhLnBvc2l0aW9ucy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgY29uc3QgdGFyZ2V0UG9pbnQgPSB0dXJmLnBvaW50KHBvc2l0aW9uKTtcclxuICAgICAgICBjb25zdCBjdXJyZW50TGluZSA9IHR1cmYubGluZVN0cmluZyhyZXRyaWV2ZWRUcmlwUm91dGVEYXRhLnBvc2l0aW9ucylcclxuICAgICAgICBjb25zdCBuZWFyZXN0ID0gdHVyZi5uZWFyZXN0UG9pbnRPbkxpbmUoY3VycmVudExpbmUsIHRhcmdldFBvaW50KTtcclxuICAgICAgICBjb25zdCBpbmRleCA9IG5lYXJlc3QucHJvcGVydGllcy5pbmRleDtcclxuICBcclxuICAgICAgICBjb25zdCBmaXJzdEhhbGYgPSByZXRyaWV2ZWRUcmlwUm91dGVEYXRhLnBvc2l0aW9ucy5zbGljZSgwLCBpbmRleCk7XHJcbiAgICAgICAgY29uc3Qgc2Vjb25kSGFsZiA9IHJldHJpZXZlZFRyaXBSb3V0ZURhdGEucG9zaXRpb25zLnNsaWNlKGluZGV4KVxyXG4gICAgICAgIGZpcnN0SGFsZi5wdXNoKFt0YXJnZXRQb2ludC5nZW9tZXRyeS5jb29yZGluYXRlc1swXSwgdGFyZ2V0UG9pbnQuZ2VvbWV0cnkuY29vcmRpbmF0ZXNbMV1dKTtcclxuICAgICAgICByZXN1bHRBcnJheSA9IGZpcnN0SGFsZi5jb25jYXQoc2Vjb25kSGFsZik7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0cmlldmVkVHJpcFJvdXRlRGF0YS5wb3NpdGlvbnMucHVzaChwb3NpdGlvbik7XHJcbiAgICAgICAgcmVzdWx0QXJyYXkgPSByZXRyaWV2ZWRUcmlwUm91dGVEYXRhLnBvc2l0aW9ucztcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgXHJcbiAgICAgIHJldHJpZXZlZFRyaXBSb3V0ZURhdGEgPSB7XHJcbiAgICAgICAgdHJpcElkIDogdHJpcElkLFxyXG4gICAgICAgIGNvbXBhbnkgOiBjb21wYW55LFxyXG4gICAgICAgIHBvc2l0aW9uczogcmVzdWx0QXJyYXksXHJcbiAgICAgICAgdXBkYXRlZFRpbWVzIDogbmV3VXBkYXRlZFRpbWVzXHJcbiAgICAgIH1cclxuXHJcbiAgICB9XHJcbiAgICAgIFxyXG4gICAgZWxzZVxyXG4gICAgICByZXRyaWV2ZWRUcmlwUm91dGVEYXRhID0ge1xyXG4gICAgICAgIHRyaXBJZCA6IHRyaXBJZCxcclxuICAgICAgICBjb21wYW55IDogY29tcGFueSxcclxuICAgICAgICBwb3NpdGlvbnM6IFtwb3NpdGlvbl0sXHJcbiAgICAgICAgdXBkYXRlZFRpbWVzIDogW25ldyBEYXRlKCkuZ2V0VGltZSgpXVxyXG4gICAgICB9XHJcblxyXG4gICAgYXdhaXQgdGhpcy5kYXRhYmFzZS5VcGRhdGVUcmlwUG9zaXRpb25zKHRyaXBJZCwgY29tcGFueSwgcmV0cmlldmVkVHJpcFJvdXRlRGF0YSk7XHJcbiAgfVxyXG5cclxuICBcclxuXHJcbiAgLyoqXHJcbiAgICogQ2xlYXJzIGJ1c3NlcyBldmVyeSBYIGFtb3VudCBvZiBtaW51dGVzIHNwZWNpZmllZCBpbiAuZW52IGZpbGUuXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIENsZWFyQnVzc2VzKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DTEVBTlVQX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiQ2xlYXJpbmcgYnVzc2VzXCIpXHJcbiAgICBjb25zdCBjdXJyZW50VGltZSA9IERhdGUubm93KCk7XHJcbiAgICBjb25zdCBmaWZ0ZWVuTWludXRlc0FnbyA9IGN1cnJlbnRUaW1lIC0gKDYwICogcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0NMRUFOVVBfVkVISUNMRV9BR0VfUkVRVUlSRU1FTlQpICogMTAwMCk7XHJcbiAgICBjb25zdCBSZW1vdmVkVmVoaWNsZXMgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLlJlbW92ZVZlaGljbGVzV2hlcmUoeyB1cGRhdGVkQXQ6IHsgJGx0OiBmaWZ0ZWVuTWludXRlc0FnbyB9IH0sIHByb2Nlc3MuZW52LkFQUF9ET19DTEVBTlVQX0xPR0dJTkcgPT0gXCJ0cnVlXCIpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIFwiS29wcGVsdmxhayA3IGFuZCA4IHR1cmJvXCIgZmlsZXMgdG8gZGF0YWJhc2UuXHJcbiAgICovXHJcbiAgcHVibGljIEluaXRLVjc4KCkgOiB2b2lkIHtcclxuICAgIHRoaXMuSW5pdFRyaXBzTmV3KCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgdHJpcHMgZnJvbSB0aGUgc3BlY2lmaWVkIFVSTCBpbiB0aGUgLmVudiAsIG9yIFwiLi4vR1RGUy9leHRyYWN0ZWQvdHJpcHMuanNvblwiIHRvIHRoZSBkYXRhYmFzZS5cclxuICAgKi9cclxuICBwcml2YXRlIEluaXRUcmlwc05ldygpIDogdm9pZCB7IFxyXG4gICAgY29uc3QgdHJpcHNQYXRoID0gcmVzb2x2ZShcIkdURlNcXFxcZXh0cmFjdGVkXFxcXHRyaXBzLnR4dC5qc29uXCIpO1xyXG4gICAgY29uc3Qgb3V0cHV0UGF0aCA9IHJlc29sdmUoXCJHVEZTXFxcXGNvbnZlcnRlZFxcXFx0cmlwcy5qc29uXCIpO1xyXG4gICAgZnMucmVhZEZpbGUodHJpcHNQYXRoLCAndXRmOCcsIGFzeW5jKGVycm9yLCBkYXRhKSA9PiB7IFxyXG4gICAgICBpZihlcnJvcikgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgIGlmKGRhdGEgJiYgcHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJMb2FkZWQgdHJpcHMgZmlsZSBpbnRvIG1lbW9yeS5cIik7XHJcbiAgICAgIGRhdGEgPSBkYXRhLnRyaW0oKTtcclxuICAgICAgY29uc3QgbGluZXMgPSBkYXRhLnNwbGl0KFwiXFxuXCIpO1xyXG4gICAgICBjb25zdCB3cml0ZVN0cmVhbSA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG91dHB1dFBhdGgpXHJcbiAgICAgIGNvbnN0IGNvbnZlcnRlZFRyaXBzID0gW107XHJcblxyXG4gICAgICBmb3IobGV0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgICAgICBjb25zdCB0cmlwSlNPTiA6IEFwaVRyaXAgPSBKU09OLnBhcnNlKGxpbmUpO1xyXG4gICAgICAgIGNvbnN0IHJlYWxUaW1lVHJpcElkID0gdHJpcEpTT04ucmVhbHRpbWVfdHJpcF9pZC5zcGxpdChcIjpcIik7XHJcbiAgICAgICAgY29uc3QgY29tcGFueSA9IHJlYWxUaW1lVHJpcElkWzBdO1xyXG4gICAgICAgIGNvbnN0IHBsYW5uaW5nTnVtYmVyID0gcmVhbFRpbWVUcmlwSWRbMV07XHJcbiAgICAgICAgY29uc3QgdHJpcE51bWJlciA9IHJlYWxUaW1lVHJpcElkWzJdO1xyXG5cclxuICAgICAgICBjb25zdCB0cmlwIDogVHJpcCA9IHtcclxuICAgICAgICAgIGNvbXBhbnk6IGNvbXBhbnksXHJcbiAgICAgICAgICByb3V0ZUlkOiBwYXJzZUludCh0cmlwSlNPTi5yb3V0ZV9pZCksXHJcbiAgICAgICAgICBzZXJ2aWNlSWQ6IHBhcnNlSW50KHRyaXBKU09OLnNlcnZpY2VfaWQpLFxyXG4gICAgICAgICAgdHJpcElkOiBwYXJzZUludCh0cmlwSlNPTi50cmlwX2lkKSxcclxuICAgICAgICAgIHRyaXBOdW1iZXI6IHBhcnNlSW50KHRyaXBOdW1iZXIpLFxyXG4gICAgICAgICAgdHJpcFBsYW5uaW5nTnVtYmVyOiBwbGFubmluZ051bWJlcixcclxuICAgICAgICAgIHRyaXBIZWFkc2lnbjogdHJpcEpTT04udHJpcF9oZWFkc2lnbixcclxuICAgICAgICAgIHRyaXBOYW1lOiB0cmlwSlNPTi50cmlwX2xvbmdfbmFtZSxcclxuICAgICAgICAgIGRpcmVjdGlvbklkOiBwYXJzZUludCh0cmlwSlNPTi5kaXJlY3Rpb25faWQpLFxyXG4gICAgICAgICAgc2hhcGVJZDogcGFyc2VJbnQodHJpcEpTT04uc2hhcGVfaWQpLFxyXG4gICAgICAgICAgd2hlZWxjaGFpckFjY2Vzc2libGU6IHBhcnNlSW50KHRyaXBKU09OLndoZWVsY2hhaXJfYWNjZXNzaWJsZSlcclxuICAgICAgICB9XHJcbiAgICAgICAgd3JpdGVTdHJlYW0ud3JpdGUoSlNPTi5zdHJpbmdpZnkodHJpcCkgKyBcIlxcblwiKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgd3JpdGVTdHJlYW0uZW5kKCgpID0+IHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkZpbmlzaGVkIHdyaXRpbmcgdHJpcHMgZmlsZSwgaW1wb3J0aW5nIHRvIGRhdGFiYXNlLlwiKTtcclxuICAgICAgICB0aGlzLkltcG9ydFRyaXBzKCk7XHJcbiAgICAgIH0pXHJcbiAgICB9KTtcclxuICAgXHJcbiAgICBcclxuICB9XHJcblxyXG4gIGFzeW5jIEltcG9ydFRyaXBzKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuRHJvcFRyaXBzQ29sbGVjdGlvbigpO1xyXG5cclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiSW1wb3J0aW5nIHRyaXBzIHRvIG1vbmdvZGJcIik7XHJcblxyXG4gICAgYXdhaXQgZXhlYyhcIm1vbmdvaW1wb3J0IC0tZGIgdGFpb3ZhIC0tY29sbGVjdGlvbiB0cmlwcyAtLWZpbGUgLlxcXFxHVEZTXFxcXGNvbnZlcnRlZFxcXFx0cmlwcy5qc29uXCIsIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc3RkZXJyKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYHN0ZGVycjogJHtzdGRlcnJ9YCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhgc3Rkb3V0OiAke3N0ZG91dH1gKTtcclxuICAgIH0pO1xyXG5cclxuICB9XHJcblxyXG59IiwiaW1wb3J0IHsgVmVoaWNsZURhdGEsIHZlaGljbGVTdGF0ZSB9IGZyb20gJy4vdHlwZXMvVmVoaWNsZURhdGEnXHJcbmltcG9ydCB7IFZlaGljbGVBcGlEYXRhLCBWZWhpY2xlUG9zRGF0YSwgVmVoaWNsZUFwaURhdGFLZW9saXMgfSBmcm9tICcuL3R5cGVzL1ZlaGljbGVBcGlEYXRhJ1xyXG5pbXBvcnQgeyBDb21wYW5pZXMgfSBmcm9tICcuL3R5cGVzL0NvbXBhbmllcyc7XHJcbmltcG9ydCB7IGJlYXJpbmdUb0FuZ2xlIH0gZnJvbSAnQHR1cmYvdHVyZic7XHJcbmltcG9ydCB7IEtWNkdlbmVyaWMgfSBmcm9tICcuL3R5cGVzL2FwaS9LVjZBcnJpdmEnO1xyXG5pbXBvcnQgeyBERUxBWSwgSU5JVCwgT05ST1VURSwgVHlwZXMgfSBmcm9tICcuL3R5cGVzL2FwaS9LVjZDb21tb24nO1xyXG5leHBvcnQgY2xhc3MgQ29udmVydGVyIHtcclxuXHJcbiAgZGVjb2RlKGRhdGEgOiBhbnksIG9wZXJhdG9yIDogc3RyaW5nKSA6IGFueSB7XHJcbiAgICBjb25zdCBjb21wYW55ID0gdGhpcy5DaGVja0NvbXBhbnkob3BlcmF0b3IpO1xyXG5cclxuICAgIHN3aXRjaCAoY29tcGFueSkge1xyXG4gICAgICBjYXNlIENvbXBhbmllcy5BUlI6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRGVjb2RlTWFpbihkYXRhKTtcclxuICAgICAgY2FzZSBDb21wYW5pZXMuQ1hYOlxyXG4gICAgICAgIHJldHVybiB0aGlzLkRlY29kZU1haW4oZGF0YSk7XHJcbiAgICAgIGNhc2UgQ29tcGFuaWVzLkVCUzpcclxuICAgICAgICByZXR1cm4gdGhpcy5EZWNvZGVNYWluKGRhdGEpO1xyXG4gICAgICBjYXNlIENvbXBhbmllcy5RQlVaWjpcclxuICAgICAgICByZXR1cm4gdGhpcy5EZWNvZGVNYWluKGRhdGEpO1xyXG4gICAgICBjYXNlIENvbXBhbmllcy5SSUc6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRGVjb2RlTWFpbihkYXRhKTtcclxuICAgICAgY2FzZSBDb21wYW5pZXMuT1BFTk9WOlxyXG4gICAgICAgIHJldHVybiB0aGlzLkRlY29kZU1haW4oZGF0YSk7XHJcbiAgICAgIGNhc2UgQ29tcGFuaWVzLkRJVFA6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRGVjb2RlTWFpbihkYXRhKTtcclxuICAgICAgY2FzZSBDb21wYW5pZXMuS0VPTElTOlxyXG4gICAgICAgIHJldHVybiB0aGlzLkRlY29kZU90aGVyKGRhdGEpO1xyXG4gICAgICBjYXNlIENvbXBhbmllcy5HVkI6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRGVjb2RlT3RoZXIoZGF0YSk7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihgQ29tcGFueSAke2NvbXBhbnl9IHVua25vd24uYClcclxuICAgICAgICBicmVhaztcclxuICAgIH1cclxuXHJcbiAgfSBcclxuXHJcbiAgLyoqIFxyXG4gICogVGhpcyBpcyB0aGUgbWFpbiBkZWNvZGluZyBmdW5jdGlvbi4gSXQgd29ya3MgZm9yIEFycml2YSwgQ29ubmV4eGlvbiwgRUJTLCBRQlVaWiwgUklHIChSRVQpLCBPUEVOT1YsIERJVFBcclxuICAqIEBwYXJhbSBkYXRhIFRoZSByZXF1aXJlZCBkYXRhLiBJdCBzaG91bGQgYmUgb2YgdHlwZSBcIktWNkdlbmVyaWNcIiwgd2hpY2ggd29ya3MgZm9yIHRoZSBjb21wYW5pZXMgbWVudGlvbmVkIGFib3ZlLlxyXG4gICogQHJldHVybnMgQW4gYXJyYXkgd2l0aCB0aGUgY29udmVydGVkIHZlaGljbGVkYXRhLlxyXG4gICovXHJcbiAgRGVjb2RlTWFpbiAoZGF0YSA6IEtWNkdlbmVyaWMpIDogQXJyYXk8VmVoaWNsZURhdGE+IHtcclxuICAgIGNvbnN0IHJldHVybkRhdGEgOiBBcnJheTxWZWhpY2xlRGF0YT4gPSBbXTtcclxuXHJcbiAgICBpZihkYXRhLlZWX1RNX1BVU0guS1Y2cG9zaW5mbykge1xyXG4gICAgICBjb25zdCBrdjZwb3NpbmZvID0gZGF0YS5WVl9UTV9QVVNILktWNnBvc2luZm87XHJcbiAgICAgIGlmKE9iamVjdC5rZXlzKGt2NnBvc2luZm8pLmxlbmd0aCA+IDApXHJcbiAgICAgICAgT2JqZWN0LmtleXMoa3Y2cG9zaW5mbykuZm9yRWFjaChWZWhpY2xlU3RhdHVzQ29kZSA9PiB7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmKEFycmF5LmlzQXJyYXkoa3Y2cG9zaW5mb1tWZWhpY2xlU3RhdHVzQ29kZV0pKSB7XHJcbiAgICAgICAgICAgIGZvcihjb25zdCB2ZWhpY2xlRGF0YSBvZiBrdjZwb3NpbmZvW1ZlaGljbGVTdGF0dXNDb2RlXSkge1xyXG4gICAgICAgICAgICAgIC8vVE9ETzogVGhpcyBtYXliZSBpcyBzdHVwaWQuIENhdXNlcyB0eXBlcyB3aXRob3V0IHZlaGljbGVOdW1iZXIgdG8gbm90IGFwcGVhci5cclxuICAgICAgICAgICAgICBpZighdmVoaWNsZURhdGEudmVoaWNsZW51bWJlcikgY29udGludWU7XHJcbiAgICAgICAgICAgICAgcmV0dXJuRGF0YS5wdXNoKHRoaXMuTWFwcGVyKHZlaGljbGVEYXRhLCBWZWhpY2xlU3RhdHVzQ29kZSkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gZWxzZSBpZihrdjZwb3NpbmZvW1ZlaGljbGVTdGF0dXNDb2RlXS52ZWhpY2xlbnVtYmVyKSBcclxuICAgICAgICAgICAgcmV0dXJuRGF0YS5wdXNoKHRoaXMuTWFwcGVyKGt2NnBvc2luZm9bVmVoaWNsZVN0YXR1c0NvZGVdLCBWZWhpY2xlU3RhdHVzQ29kZSkpICAgICBcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXR1cm5EYXRhO1xyXG5cclxuICB9XHJcbiAgLyoqIFxyXG4gICogVGhpcyBpcyB0aGUgc2Vjb25kYXJ5IGRlY29kaW5nIGZ1bmN0aW9uLiBJdCB3b3JrcyBmb3IgS2VvbGlzIGFuZCBHVkJcclxuICAqIEBwYXJhbSBkYXRhIFRoZSByZXF1aXJlZCBkYXRhLiBJdCBzaG91bGQgYmUgb2YgdHlwZSBcIktWNkdlbmVyaWNcIiwgd2hpY2ggd29ya3MgZm9yIHRoZSBjb21wYW5pZXMgbWVudGlvbmVkIGFib3ZlLlxyXG4gICogQHJldHVybnMgQW4gYXJyYXkgd2l0aCB0aGUgY29udmVydGVkIHZlaGljbGVkYXRhLlxyXG4gICovXHJcbiAgRGVjb2RlT3RoZXIoZGF0YSkgOiBBcnJheTxWZWhpY2xlRGF0YT4ge1xyXG4gICAgY29uc3QgcmV0dXJuRGF0YSA6IEFycmF5PFZlaGljbGVEYXRhPiA9IFtdO1xyXG4gICAgXHJcblxyXG4gICAgaWYoZGF0YS5WVl9UTV9QVVNILktWNnBvc2luZm8pIHtcclxuICAgICAgY29uc3Qga3Y2cG9zaW5mbyA9IGRhdGEuVlZfVE1fUFVTSC5LVjZwb3NpbmZvO1xyXG4gICAgICBpZihBcnJheS5pc0FycmF5KGt2NnBvc2luZm8pKSB7XHJcbiAgICAgICAgZm9yKGNvbnN0IFN0YXR1c09iamVjdCBvZiBrdjZwb3NpbmZvKSB7XHJcbiAgICAgICAgICBjb25zdCBWZWhpY2xlU3RhdHVzQ29kZSA9IE9iamVjdC5rZXlzKFN0YXR1c09iamVjdClbMF07XHJcbiAgICAgICAgICByZXR1cm5EYXRhLnB1c2godGhpcy5NYXBwZXIoU3RhdHVzT2JqZWN0W1ZlaGljbGVTdGF0dXNDb2RlXSwgVmVoaWNsZVN0YXR1c0NvZGUpKVxyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjb25zdCBWZWhpY2xlU3RhdHVzQ29kZSA9IE9iamVjdC5rZXlzKGt2NnBvc2luZm8pWzBdO1xyXG4gICAgICAgIHJldHVybkRhdGEucHVzaCh0aGlzLk1hcHBlcihrdjZwb3NpbmZvW1ZlaGljbGVTdGF0dXNDb2RlXSwgVmVoaWNsZVN0YXR1c0NvZGUpKVxyXG4gICAgICB9XHJcbiAgICB9IFxyXG5cclxuICAgIHJldHVybiByZXR1cm5EYXRhO1xyXG4gIH1cclxuXHJcbiAgQ2hlY2tDb21wYW55KG9wZXJhdG9yIDogc3RyaW5nKSA6IHN0cmluZyB7XHJcbiAgICBsZXQgcmV0dXJuQ29tcGFueSA6IHN0cmluZztcclxuICAgIE9iamVjdC52YWx1ZXMoQ29tcGFuaWVzKS5mb3JFYWNoKGNvbXBhbnkgPT4ge1xyXG4gICAgICBpZihvcGVyYXRvci5pbmNsdWRlcyhjb21wYW55KSkgcmV0dXJuQ29tcGFueSA9IGNvbXBhbnk7XHJcbiAgICB9KVxyXG4gICAgcmV0dXJuIHJldHVybkNvbXBhbnk7XHJcbiAgfVxyXG5cclxuICBNYXBwZXIodmVoaWNsZVBvc0RhdGEsIHN0YXR1cyA6IHN0cmluZykgeyBcclxuICAgIGNvbnN0IG5ld0RhdGEgPSB7XHJcbiAgICAgIGNvbXBhbnk6IHZlaGljbGVQb3NEYXRhLmRhdGFvd25lcmNvZGUsXHJcbiAgICAgIG9yaWdpbmFsQ29tcGFueTogdmVoaWNsZVBvc0RhdGEuZGF0YW93bmVyY29kZSxcclxuICAgICAgcGxhbm5pbmdOdW1iZXI6IHZlaGljbGVQb3NEYXRhLmxpbmVwbGFubmluZ251bWJlci50b1N0cmluZygpLFxyXG4gICAgICBqb3VybmV5TnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS5qb3VybmV5bnVtYmVyLFxyXG4gICAgICB0aW1lc3RhbXA6IERhdGUucGFyc2UodmVoaWNsZVBvc0RhdGEudGltZXN0YW1wKSxcclxuICAgICAgdmVoaWNsZU51bWJlcjogdmVoaWNsZVBvc0RhdGEudmVoaWNsZW51bWJlciA/IHZlaGljbGVQb3NEYXRhLnZlaGljbGVudW1iZXIgOiA5OTk5OTksXHJcbiAgICAgIGxpbmVOdW1iZXI6IFwiT25iZWtlbmRcIixcclxuICAgICAgcG9zaXRpb246IHRoaXMucmRUb0xhdExvbmcodmVoaWNsZVBvc0RhdGFbJ3JkLXgnXSwgdmVoaWNsZVBvc0RhdGFbJ3JkLXknXSksXHJcbiAgICAgIHB1bmN0dWFsaXR5OiBbdmVoaWNsZVBvc0RhdGEucHVuY3R1YWxpdHldLFxyXG4gICAgICBzdGF0dXM6IHZlaGljbGVTdGF0ZVtzdGF0dXNdLFxyXG4gICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgIHVwZGF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgdXBkYXRlZFRpbWVzOiBbRGF0ZS5ub3coKV0sXHJcbiAgICAgIGN1cnJlbnRSb3V0ZUlkOiAwLFxyXG4gICAgICBjdXJyZW50VHJpcElkOiAwXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG5ld0RhdGE7XHJcbiAgfSBcclxuXHJcbiAgXHJcbiAgcmRUb0xhdExvbmcgKHgsIHkpIDogW251bWJlciwgbnVtYmVyXSB7XHJcbiAgICBpZih4ID09PSB1bmRlZmluZWQgfHwgeSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gWzAsIDBdO1xyXG4gICAgXHJcbiAgICBjb25zdCBkWCA9ICh4IC0gMTU1MDAwKSAqIE1hdGgucG93KDEwLCAtNSk7XHJcbiAgICBjb25zdCBkWSA9ICh5IC0gNDYzMDAwKSAqIE1hdGgucG93KDEwLCAtNSk7XHJcbiAgICBjb25zdCBTb21OID0gKDMyMzUuNjUzODkgKiBkWSkgKyAoLTMyLjU4Mjk3ICogTWF0aC5wb3coZFgsIDIpKSArICgtMC4yNDc1ICpcclxuICAgICAgTWF0aC5wb3coZFksIDIpKSArICgtMC44NDk3OCAqIE1hdGgucG93KGRYLCAyKSAqXHJcbiAgICAgIGRZKSArICgtMC4wNjU1ICogTWF0aC5wb3coZFksIDMpKSArICgtMC4wMTcwOSAqXHJcbiAgICAgIE1hdGgucG93KGRYLCAyKSAqIE1hdGgucG93KGRZLCAyKSkgKyAoLTAuMDA3MzggKlxyXG4gICAgICBkWCkgKyAoMC4wMDUzICogTWF0aC5wb3coZFgsIDQpKSArICgtMC4wMDAzOSAqXHJcbiAgICAgIE1hdGgucG93KGRYLCAyKSAqIE1hdGgucG93KGRZLCAzKSkgKyAoMC4wMDAzMyAqIE1hdGgucG93KFxyXG4gICAgICBkWCwgNCkgKiBkWSkgKyAoLTAuMDAwMTIgKlxyXG4gICAgICBkWCAqIGRZKTtcclxuICAgIGNvbnN0IFNvbUUgPSAoNTI2MC41MjkxNiAqIGRYKSArICgxMDUuOTQ2ODQgKiBkWCAqIGRZKSArICgyLjQ1NjU2ICpcclxuICAgICAgZFggKiBNYXRoLnBvdyhkWSwgMikpICsgKC0wLjgxODg1ICogTWF0aC5wb3coXHJcbiAgICAgIGRYLCAzKSkgKyAoMC4wNTU5NCAqXHJcbiAgICAgIGRYICogTWF0aC5wb3coZFksIDMpKSArICgtMC4wNTYwNyAqIE1hdGgucG93KFxyXG4gICAgICBkWCwgMykgKiBkWSkgKyAoMC4wMTE5OSAqXHJcbiAgICAgIGRZKSArICgtMC4wMDI1NiAqIE1hdGgucG93KGRYLCAzKSAqIE1hdGgucG93KFxyXG4gICAgICBkWSwgMikpICsgKDAuMDAxMjggKlxyXG4gICAgICBkWCAqIE1hdGgucG93KGRZLCA0KSkgKyAoMC4wMDAyMiAqIE1hdGgucG93KGRZLFxyXG4gICAgICAyKSkgKyAoLTAuMDAwMjIgKiBNYXRoLnBvdyhcclxuICAgICAgZFgsIDIpKSArICgwLjAwMDI2ICpcclxuICAgICAgTWF0aC5wb3coZFgsIDUpKTtcclxuICAgIFxyXG4gICAgY29uc3QgTGF0aXR1ZGUgPSA1Mi4xNTUxNyArIChTb21OIC8gMzYwMCk7XHJcbiAgICBjb25zdCBMb25naXR1ZGUgPSA1LjM4NzIwNiArIChTb21FIC8gMzYwMCk7XHJcbiAgICBcclxuICAgIHJldHVybiBbTG9uZ2l0dWRlLCBMYXRpdHVkZV1cclxuICB9XHJcblxyXG59IiwiaW1wb3J0IHsgQ29ubmVjdGlvbiwgTW9kZWwsIE1vbmdvb3NlLCBGaWx0ZXJRdWVyeSwgU2NoZW1hIH0gZnJvbSAnbW9uZ29vc2UnO1xyXG5pbXBvcnQgeyBUcmlwIH0gZnJvbSAnLi90eXBlcy9UcmlwJztcclxuaW1wb3J0IHsgVmVoaWNsZURhdGEsIHZlaGljbGVTdGF0ZSB9IGZyb20gJy4vdHlwZXMvVmVoaWNsZURhdGEnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgUm91dGUgfSBmcm9tICcuL3R5cGVzL1JvdXRlJztcclxuaW1wb3J0IHsgVHJpcFBvc2l0aW9uRGF0YSB9IGZyb20gJy4vdHlwZXMvVHJpcFBvc2l0aW9uRGF0YSc7XHJcbmltcG9ydCB7IFdlYnNvY2tldFZlaGljbGVEYXRhIH0gZnJvbSAnLi90eXBlcy9XZWJzb2NrZXRWZWhpY2xlRGF0YSc7XHJcbmNvbnN0IHN0cmVhbVRvTW9uZ29EQiA9IHJlcXVpcmUoJ3N0cmVhbS10by1tb25nby1kYicpLnN0cmVhbVRvTW9uZ29EQjtcclxuY29uc3Qgc3BsaXQgPSByZXF1aXJlKCdzcGxpdCcpO1xyXG5leHBvcnQgY2xhc3MgRGF0YWJhc2Uge1xyXG4gIFxyXG4gIHByaXZhdGUgc3RhdGljIGluc3RhbmNlIDogRGF0YWJhc2U7XHJcbiAgXHJcbiAgcHJpdmF0ZSBkYiA6IENvbm5lY3Rpb247XHJcbiAgcHJpdmF0ZSBtb25nb29zZSA6IE1vbmdvb3NlO1xyXG5cclxuICBwcml2YXRlIHZlaGljbGVTY2hlbWEgOiBTY2hlbWE7XHJcbiAgcHJpdmF0ZSB0cmlwc1NjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIHJvdXRlc1NjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIGRyaXZlblJvdXRlc1NjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIHZlaGljbGVNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIHRyaXBNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIHJvdXRlc01vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgZHJpdmVuUm91dGVzTW9kZWwgOiB0eXBlb2YgTW9kZWw7XHJcbiAgcHJpdmF0ZSBvdXRwdXREQkNvbmZpZztcclxuXHJcbiAgcHVibGljIHN0YXRpYyBnZXRJbnN0YW5jZSgpOiBEYXRhYmFzZSB7XHJcbiAgICBpZighRGF0YWJhc2UuaW5zdGFuY2UpXHJcbiAgICAgIERhdGFiYXNlLmluc3RhbmNlID0gbmV3IERhdGFiYXNlKCk7XHJcblxyXG4gICAgcmV0dXJuIERhdGFiYXNlLmluc3RhbmNlO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEluaXQoKSB7XHJcbiAgICBjb25zdCB1cmwgOiBzdHJpbmcgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkw7XHJcbiAgICBjb25zdCBuYW1lIDogc3RyaW5nID0gcHJvY2Vzcy5lbnYuREFUQUJBU0VfTkFNRTtcclxuXHJcbiAgICB0aGlzLm1vbmdvb3NlID0gbmV3IE1vbmdvb3NlKCk7XHJcbiAgICBcclxuICAgIHRoaXMubW9uZ29vc2Uuc2V0KCd1c2VGaW5kQW5kTW9kaWZ5JywgZmFsc2UpXHJcblxyXG4gICAgaWYoIXVybCAmJiAhbmFtZSkgdGhyb3cgKGBJbnZhbGlkIFVSTCBvciBuYW1lIGdpdmVuLCByZWNlaXZlZDogXFxuIE5hbWU6ICR7bmFtZX0gXFxuIFVSTDogJHt1cmx9YClcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgQ29ubmVjdGluZyB0byBkYXRhYmFzZSB3aXRoIG5hbWU6ICR7bmFtZX0gYXQgdXJsOiAke3VybH1gKVxyXG4gICAgdGhpcy5tb25nb29zZS5jb25uZWN0KGAke3VybH0vJHtuYW1lfWAsIHtcclxuICAgICAgdXNlTmV3VXJsUGFyc2VyOiB0cnVlLFxyXG4gICAgICB1c2VVbmlmaWVkVG9wb2xvZ3k6IHRydWUsXHJcbiAgICAgIHBvb2xTaXplOiAxMjBcclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy5kYiA9IHRoaXMubW9uZ29vc2UuY29ubmVjdGlvbjtcclxuXHJcbiAgICB0aGlzLm91dHB1dERCQ29uZmlnID0geyBkYlVSTCA6IGAke3VybH0vJHtuYW1lfWAsIGNvbGxlY3Rpb24gOiAndHJpcHMnIH07XHJcblxyXG4gICAgdGhpcy5kYi5vbignZXJyb3InLCBlcnJvciA9PiB7XHJcbiAgICAgIHRocm93IG5ldyBlcnJvcihgRXJyb3IgY29ubmVjdGluZyB0byBkYXRhYmFzZS4gJHtlcnJvcn1gKTtcclxuICAgIH0pXHJcblxyXG4gICAgYXdhaXQgdGhpcy5EYXRhYmFzZUxpc3RlbmVyKCk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgR2V0RGF0YWJhc2UoKSA6IENvbm5lY3Rpb24ge1xyXG4gICAgcmV0dXJuIHRoaXMuZGI7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgRGF0YWJhc2VMaXN0ZW5lciAoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XHJcbiAgICAgICAgdGhpcy5kYi5vbmNlKFwib3BlblwiLCAoKSA9PiB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvbm5lY3Rpb24gdG8gZGF0YWJhc2UgZXN0YWJsaXNoZWQuXCIpXHJcblxyXG4gICAgICAgICAgdGhpcy52ZWhpY2xlU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgY29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICBvcmlnaW5hbENvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgcGxhbm5pbmdOdW1iZXI6IFN0cmluZyxcclxuICAgICAgICAgICAgam91cm5leU51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IE51bWJlcixcclxuICAgICAgICAgICAgdmVoaWNsZU51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogW051bWJlciwgTnVtYmVyXSxcclxuICAgICAgICAgICAgc3RhdHVzOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIGxpbmVOdW1iZXI6IFN0cmluZyxcclxuICAgICAgICAgICAgcHVuY3R1YWxpdHk6IEFycmF5LFxyXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IE51bWJlcixcclxuICAgICAgICAgICAgdXBkYXRlZEF0OiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHVwZGF0ZWRUaW1lczogQXJyYXksXHJcbiAgICAgICAgICAgIGN1cnJlbnRSb3V0ZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIGN1cnJlbnRUcmlwSWQ6IE51bWJlcixcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICB0aGlzLnRyaXBzU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgY29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHNlcnZpY2VJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB0cmlwSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgdHJpcE51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICB0cmlwUGxhbm5pbmdOdW1iZXI6IFN0cmluZyxcclxuICAgICAgICAgICAgdHJpcEhlYWRzaWduOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHRyaXBOYW1lOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIGRpcmVjdGlvbklkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHNoYXBlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgd2hlZWxjaGFpckFjY2Vzc2libGU6IE51bWJlclxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLnJvdXRlc1NjaGVtYSA9IG5ldyB0aGlzLm1vbmdvb3NlLlNjaGVtYSh7XHJcbiAgICAgICAgICAgIHJvdXRlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgY29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICBzdWJDb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlU2hvcnROYW1lOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlTG9uZ05hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVEZXNjcmlwdGlvbjogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZVR5cGU6IE51bWJlcixcclxuICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgdGhpcy5kcml2ZW5Sb3V0ZXNTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICB0cmlwSWQgOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIGNvbXBhbnkgOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uczogQXJyYXksXHJcbiAgICAgICAgICAgIHVwZGF0ZWRUaW1lcyA6IEFycmF5XHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIHRoaXMudHJpcHNTY2hlbWEuaW5kZXgoeyB0cmlwTnVtYmVyOiAtMSwgdHJpcFBsYW5uaW5nTnVtYmVyOiAtMSwgY29tcGFueTogLTEgfSlcclxuICAgICAgICAgIHRoaXMuZHJpdmVuUm91dGVzU2NoZW1hLmluZGV4KHsgdHJpcElkOiAtMSwgY29tcGFueTogLTEgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLnZlaGljbGVNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJWZWhpY2xlUG9zaXRpb25zXCIsIHRoaXMudmVoaWNsZVNjaGVtYSk7XHJcbiAgICAgICAgICB0aGlzLnRyaXBNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJ0cmlwc1wiLCB0aGlzLnRyaXBzU2NoZW1hKTtcclxuICAgICAgICAgIHRoaXMucm91dGVzTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwicm91dGVzXCIsIHRoaXMucm91dGVzU2NoZW1hKTtcclxuICAgICAgICAgIHRoaXMuZHJpdmVuUm91dGVzTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwiZHJpdmVucm91dGVzXCIsIHRoaXMuZHJpdmVuUm91dGVzU2NoZW1hKTtcclxuXHJcbiAgICAgICAgICB0aGlzLnRyaXBNb2RlbC5jcmVhdGVJbmRleGVzKCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJlcygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldEFsbFZlaGljbGVzIChhcmdzID0ge30pIDogUHJvbWlzZTxBcnJheTxWZWhpY2xlRGF0YT4+IHtcclxuICAgIHJldHVybiBhd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kKHsuLi5hcmdzfSwgeyBwdW5jdHVhbGl0eTogMCwgdXBkYXRlZFRpbWVzOiAwLCBfX3YgOiAwIH0pO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldEFsbFZlaGljbGVzU21hbGwgKGFyZ3MgPSB7fSkgOiBQcm9taXNlPEFycmF5PFdlYnNvY2tldFZlaGljbGVEYXRhPj4ge1xyXG4gICAgY29uc3Qgc21hbGxCdXNzZXMgOiBBcnJheTxXZWJzb2NrZXRWZWhpY2xlRGF0YT4gPSBbXTtcclxuXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kKHsuLi5hcmdzfSxcclxuICAgICAgeyBcclxuICAgICAgcHVuY3R1YWxpdHk6IDAsIFxyXG4gICAgICB1cGRhdGVkVGltZXM6IDAsIFxyXG4gICAgICBfX3YgOiAwLFxyXG4gICAgICBqb3VybmV5TnVtYmVyOiAwLFxyXG4gICAgICB0aW1lc3RhbXAgOiAwLFxyXG4gICAgICBjcmVhdGVkQXQ6IDAsXHJcbiAgICAgIHVwZGF0ZWRBdDogMCxcclxuICAgICAgY3VycmVudFJvdXRlSWQ6IDAsXHJcbiAgICAgIGN1cnJlbnRUcmlwSWQ6IDAsXHJcbiAgICAgIHBsYW5uaW5nTnVtYmVyOiAwLFxyXG4gICAgICBzdGF0dXM6IDBcclxuICAgIH0pXHJcblxyXG4gICAgcmVzdWx0LmZvckVhY2gocmVzID0+IHtcclxuICAgICAgc21hbGxCdXNzZXMucHVzaCh7XHJcbiAgICAgICAgcDogcmVzLnBvc2l0aW9uLFxyXG4gICAgICAgIGM6IHJlcy5jb21wYW55LFxyXG4gICAgICAgIHY6IHJlcy52ZWhpY2xlTnVtYmVyLFxyXG4gICAgICAgIG46IHJlcy5saW5lTnVtYmVyXHJcbiAgICAgIH0pXHJcbiAgICB9KVxyXG5cclxuICAgIHJldHVybiBzbWFsbEJ1c3NlcztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRWZWhpY2xlICh2ZWhpY2xlTnVtYmVyLCB0cmFuc3BvcnRlciwgZmlyc3RPbmx5IDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8VmVoaWNsZURhdGE+IHtcclxuICAgIHJldHVybiB7IFxyXG4gICAgICAuLi5hd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kT25lKHtcclxuICAgICAgICB2ZWhpY2xlTnVtYmVyIDogdmVoaWNsZU51bWJlcixcclxuICAgICAgICBjb21wYW55OiB0cmFuc3BvcnRlclxyXG4gICAgICB9KVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBWZWhpY2xlRXhpc3RzKHZlaGljbGVOdW1iZXIsIHRyYW5zcG9ydGVyKSA6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuR2V0VmVoaWNsZSh2ZWhpY2xlTnVtYmVyLCB0cmFuc3BvcnRlcikgIT09IG51bGw7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgVXBkYXRlVmVoaWNsZSAodmVoaWNsZVRvVXBkYXRlIDogYW55LCB1cGRhdGVkVmVoaWNsZURhdGEgOiBWZWhpY2xlRGF0YSwgcG9zaXRpb25DaGVja3MgOiBib29sZWFuID0gZmFsc2UpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kT25lQW5kVXBkYXRlKHZlaGljbGVUb1VwZGF0ZSwgdXBkYXRlZFZlaGljbGVEYXRhKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBBZGRWZWhpY2xlICh2ZWhpY2xlIDogVmVoaWNsZURhdGEpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBuZXcgdGhpcy52ZWhpY2xlTW9kZWwoe1xyXG4gICAgICAuLi52ZWhpY2xlLFxyXG4gICAgICBwdW5jdHVhbGl0eSA6IHZlaGljbGUucHVuY3R1YWxpdHlcclxuICAgIH0pLnNhdmUoZXJyb3IgPT4ge1xyXG4gICAgICBpZihlcnJvcikgY29uc29sZS5lcnJvcihgU29tZXRoaW5nIHdlbnQgd3Jvbmcgd2hpbGUgdHJ5aW5nIHRvIGFkZCB2ZWhpY2xlOiAke3ZlaGljbGUudmVoaWNsZU51bWJlcn0uIEVycm9yOiAke2Vycm9yfWApXHJcbiAgICB9KVxyXG4gIH1cclxuICBcclxuICBwdWJsaWMgYXN5bmMgUmVtb3ZlVmVoaWNsZSAodmVoaWNsZSA6IFZlaGljbGVEYXRhKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYoIXZlaGljbGVbXCJfZG9jXCJdKSByZXR1cm5cclxuXHJcbiAgICB0aGlzLnZlaGljbGVNb2RlbC5maW5kT25lQW5kRGVsZXRlKHZlaGljbGUpXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgUmVtb3ZlVmVoaWNsZXNXaGVyZSggcGFyYW1zIDogb2JqZWN0LCBkb0xvZ2dpbmcgOiBib29sZWFuID0gZmFsc2UpIDogUHJvbWlzZTxBcnJheTxWZWhpY2xlRGF0YT4+IHtcclxuICAgIGNvbnN0IHJlbW92ZWRWZWhpY2xlcyA6IEFycmF5PFZlaGljbGVEYXRhPiA9IGF3YWl0IHRoaXMuR2V0QWxsVmVoaWNsZXMocGFyYW1zKTtcclxuICAgIHRoaXMudmVoaWNsZU1vZGVsLmRlbGV0ZU1hbnkocGFyYW1zKS50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgaWYoZG9Mb2dnaW5nKSBjb25zb2xlLmxvZyhgRGVsZXRlZCAke3Jlc3BvbnNlLmRlbGV0ZWRDb3VudH0gdmVoaWNsZXMuYCk7XHJcbiAgICAgIFxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gcmVtb3ZlZFZlaGljbGVzO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFRyaXBzKHBhcmFtcyA6IG9iamVjdCA9IHt9KSA6IFByb21pc2U8QXJyYXk8VHJpcD4+IHtcclxuICAgIHJldHVybiBhd2FpdCB0aGlzLnRyaXBNb2RlbC5maW5kKHBhcmFtcylcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRUcmlwKHRyaXBOdW1iZXIgOiBudW1iZXIsIHRyaXBQbGFubmluZ051bWJlciA6IHN0cmluZywgY29tcGFueSA6IHN0cmluZykge1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy50cmlwTW9kZWwuZmluZE9uZSh7XHJcbiAgICAgIGNvbXBhbnk6IGNvbXBhbnksXHJcbiAgICAgIHRyaXBOdW1iZXIgOiB0cmlwTnVtYmVyLFxyXG4gICAgICB0cmlwUGxhbm5pbmdOdW1iZXI6IHRyaXBQbGFubmluZ051bWJlclxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3BvbnNlICE9PSBudWxsID8gcmVzcG9uc2UgOiB7fTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBSZW1vdmVUcmlwKHBhcmFtcyA6IG9iamVjdCA9IHt9LCBkb0xvZ2dpbmcgOiBib29sZWFuID0gZmFsc2UpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLnRyaXBNb2RlbC5kZWxldGVNYW55KHBhcmFtcykudGhlbihyZXNwb25zZSA9PiB7XHJcbiAgICAgIGlmKGRvTG9nZ2luZykgY29uc29sZS5sb2coYERlbGV0ZWQgJHtyZXNwb25zZS5kZWxldGVkQ291bnR9IHRyaXBzYCk7XHJcbiAgICB9KVxyXG4gIH1cclxuICAvKipcclxuICAgKiBJbnNlcnRzIG1hbnkgdHJpcHMgYXQgb25jZSBpbnRvIHRoZSBkYXRhYmFzZS5cclxuICAgKiBAcGFyYW0gdHJpcHMgVGhlIHRyaXBzIHRvIGFkZC5cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgSW5zZXJ0TWFueVRyaXBzKHRyaXBzKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICBhd2FpdCB0aGlzLnRyaXBNb2RlbC5pbnNlcnRNYW55KHRyaXBzLCB7IG9yZGVyZWQ6IGZhbHNlIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIFwiS29wcGVsdmxhayA3IGFuZCA4IHR1cmJvXCIgZmlsZXMgdG8gZGF0YWJhc2UuXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIEluc2VydFRyaXAodHJpcCA6IFRyaXApIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBuZXcgdGhpcy50cmlwTW9kZWwodHJpcCkuc2F2ZShlcnJvciA9PiB7XHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGBTb21ldGhpbmcgd2VudCB3cm9uZyB3aGlsZSB0cnlpbmcgdG8gYWRkIHRyaXA6ICR7dHJpcC50cmlwSGVhZHNpZ259LiBFcnJvcjogJHtlcnJvcn1gKVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBEcm9wVHJpcHNDb2xsZWN0aW9uKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGluZyB0cmlwcyBjb2xsZWN0aW9uXCIpO1xyXG4gICAgYXdhaXQgdGhpcy50cmlwTW9kZWwucmVtb3ZlKHt9KTtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBlZCB0cmlwcyBjb2xsZWN0aW9uXCIpO1xyXG4gIH1cclxuICBwdWJsaWMgYXN5bmMgRHJvcFJvdXRlc0NvbGxlY3Rpb24oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwaW5nIHJvdXRlcyBjb2xsZWN0aW9uXCIpO1xyXG4gICAgYXdhaXQgdGhpcy5yb3V0ZXNNb2RlbC5yZW1vdmUoe30pO1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGVkIHJvdXRlcyBjb2xsZWN0aW9uXCIpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFJvdXRlKHJvdXRlSWQgOiBudW1iZXIpIDogUHJvbWlzZTxSb3V0ZT4ge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnJvdXRlc01vZGVsLmZpbmRPbmUoe1xyXG4gICAgICByb3V0ZUlkIDogcm91dGVJZCxcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiByZXNwb25zZSAhPT0gbnVsbCA/IHJlc3BvbnNlIDoge307XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgVXBkYXRlVHJpcFBvc2l0aW9ucyh0cmlwSWQsIGNvbXBhbnksIHRyaXBEYXRhIDogVHJpcFBvc2l0aW9uRGF0YSkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMuZHJpdmVuUm91dGVzTW9kZWwuZmluZE9uZUFuZFVwZGF0ZShcclxuICAgICAge1xyXG4gICAgICAgIHRyaXBJZCA6IHRyaXBJZCxcclxuICAgICAgICBjb21wYW55IDogY29tcGFueVxyXG4gICAgICB9LCBcclxuICAgICAgdHJpcERhdGEsIFxyXG4gICAgICB7IHVwc2VydCA6IHRydWUgfVxyXG4gICAgKVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFRyaXBQb3NpdGlvbnModHJpcElkIDogbnVtYmVyLCBjb21wYW55IDogc3RyaW5nKSA6IFByb21pc2U8VHJpcFBvc2l0aW9uRGF0YT4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuZHJpdmVuUm91dGVzTW9kZWwuZmluZE9uZSh7IFxyXG4gICAgICB0cmlwSWQ6IHRyaXBJZCxcclxuICAgICAgY29tcGFueTogY29tcGFueSxcclxuICAgIH0pXHJcblxyXG5cclxuICB9XHJcblxyXG4gIC8vIHB1YmxpYyBhc3luYyBBZGRSb3V0ZSgpXHJcblxyXG59XHJcbiIsIi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAgIEFQUCBDT05GSUdcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcblxyXG5pbXBvcnQgKiBhcyBkb3RlbnYgZnJvbSAnZG90ZW52JztcclxuZG90ZW52LmNvbmZpZygpO1xyXG5cclxuY29uc3QgcG9ydCA9IHByb2Nlc3MuZW52LlBPUlQgfHwgMzAwMjtcclxuXHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAgIFlBUk4gSU1QT1JUU1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuaW1wb3J0ICogYXMgaHR0cHMgZnJvbSAnaHR0cHMnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcblxyXG5jb25zdCBleHByZXNzID0gcmVxdWlyZShcImV4cHJlc3NcIik7XHJcbmNvbnN0IGNvcnMgPSByZXF1aXJlKFwiY29yc1wiKTtcclxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIENVU1RPTSBJTVBPUlRTXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5cclxuaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tICcuL2RhdGFiYXNlJztcclxuaW1wb3J0IHsgV2Vic29ja2V0IH0gZnJvbSAnLi9zb2NrZXQnO1xyXG5pbXBvcnQgeyBPVkRhdGEgfSBmcm9tICcuL3JlYWx0aW1lJztcclxuaW1wb3J0IHsgQmlrZURhbCB9IGZyb20gJy4vYmlrZWRiJztcclxuXHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAgIFNTTCBDT05GSUdcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcbmNvbnN0IHByaXZhdGVLZXkgPSBmcy5yZWFkRmlsZVN5bmMoXCIuL2NlcnRpZmljYXRlL2tleS5rZXlcIikudG9TdHJpbmcoKTtcclxuY29uc3QgY2VydGlmaWNhdGUgPSBmcy5yZWFkRmlsZVN5bmMoXCIuL2NlcnRpZmljYXRlL2NlcnQuY3J0XCIpLnRvU3RyaW5nKCk7XHJcbmNvbnN0IGNhID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9rZXktY2EuY3J0XCIpLnRvU3RyaW5nKCk7XHJcblxyXG5jb25zdCBBcHBJbml0ID0gYXN5bmMgKCkgPT4ge1xyXG4gIGNvbnN0IGRiID0gYXdhaXQgRGF0YWJhc2UuZ2V0SW5zdGFuY2UoKS5Jbml0KCkudGhlbigpO1xyXG4gIFxyXG4gIGNvbnN0IGFwcCA9IChtb2R1bGUuZXhwb3J0cyA9IGV4cHJlc3MoKSk7XHJcblxyXG4gIGNvbnN0IHNlcnZlciA9IGh0dHBzLmNyZWF0ZVNlcnZlcihcclxuICAgIHtcclxuICAgICAga2V5OiBwcml2YXRlS2V5LFxyXG4gICAgICBjZXJ0OiBjZXJ0aWZpY2F0ZSxcclxuICAgICAgY2E6IGNhLFxyXG4gICAgICByZXF1ZXN0Q2VydDogdHJ1ZSxcclxuICAgICAgcmVqZWN0VW5hdXRob3JpemVkOiBmYWxzZSxcclxuICAgIH0sXHJcbiAgICBhcHBcclxuICApO1xyXG4gIFxyXG5cclxuICAvL1RISVMgSVMgTk9UIFNBRkVcclxuXHJcbiAgY29uc3QgY29yc09wdGlvbnMgPSB7XHJcbiAgICBvcmlnaW46ICcqJyxcclxuICAgIG9wdGlvbnNTdWNjZXNzU3RhdHVzOiAyMDBcclxuICB9XHJcblxyXG4gIGFwcC51c2UoY29ycyhjb3JzT3B0aW9ucykpXHJcbiAgYXBwLm9wdGlvbnMoJyonLCBjb3JzKCkpXHJcblxyXG5cclxuICBjb25zdCBzb2NrZXQgPSBuZXcgV2Vic29ja2V0KHNlcnZlciwgZGIpO1xyXG4gIGNvbnN0IG92ID0gbmV3IE9WRGF0YShkYiwgc29ja2V0KTtcclxuIC8vIGNvbnN0IGJpa2VkYWwgPSBuZXcgQmlrZURhbChkYik7XHJcbiAgc2VydmVyLmxpc3Rlbihwb3J0LCAoKSA9PiBjb25zb2xlLmxvZyhgTGlzdGVuaW5nIGF0IGh0dHA6Ly9sb2NhbGhvc3Q6JHtwb3J0fWApKTtcclxuXHJcbn1cclxuXHJcbkFwcEluaXQoKTtcclxuIiwiaW1wb3J0IHsgZ3VuemlwIH0gZnJvbSAnemxpYic7XHJcbmltcG9ydCB7IENvbnZlcnRlciB9IGZyb20gJy4vY29udmVydGVyJztcclxuaW1wb3J0IHsgQnVzTG9naWMgfSBmcm9tIFwiLi9idXNsb2dpY1wiO1xyXG5cclxuaW1wb3J0ICogYXMgeG1sIGZyb20gJ2Zhc3QteG1sLXBhcnNlcic7XHJcbmltcG9ydCB7IFdlYnNvY2tldCB9IGZyb20gXCIuL3NvY2tldFwiO1xyXG5cclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgeyBEYXRhYmFzZSB9IGZyb20gJy4vZGF0YWJhc2UnO1xyXG5cclxuLy8gY29uc3Qgem1xID0gcmVxdWlyZSgnemVyb21xJyk7XHJcbmltcG9ydCAqIGFzIHptcSBmcm9tICd6ZXJvbXEnO1xyXG5pbXBvcnQgeyBWZWhpY2xlRGF0YSB9IGZyb20gJy4vdHlwZXMvVmVoaWNsZURhdGEnO1xyXG5leHBvcnQgY2xhc3MgT1ZEYXRhIHtcclxuICBcclxuICBwcml2YXRlIGJ1c1NvY2tldCA6IHptcS5Tb2NrZXQ7XHJcbiAgcHJpdmF0ZSB0cmFpblNvY2tldCA6IHptcS5Tb2NrZXQ7XHJcbiAgcHJpdmF0ZSBiaWtlU29ja2V0IDogem1xLlNvY2tldDtcclxuICAvL3ByaXZhdGUga3Y3OHNvY2tldDtcclxuICBwcml2YXRlIGJ1c0xvZ2ljIDogQnVzTG9naWM7XHJcbiAgcHJpdmF0ZSB3ZWJzb2NrZXQgOiBXZWJzb2NrZXQ7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGRhdGFiYXNlIDogRGF0YWJhc2UsIHNvY2tldCA6IFdlYnNvY2tldCkge1xyXG4gICAgdGhpcy53ZWJzb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICB0aGlzLkluaXQoKTtcclxuICAgIHRoaXMuYnVzTG9naWMgPSBuZXcgQnVzTG9naWMoZGF0YWJhc2UsIGZhbHNlKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBJbml0KCkge1xyXG5cclxuICAgIGNvbnN0IGNvbnZlcnRlciA9IG5ldyBDb252ZXJ0ZXIoKTtcclxuXHJcbiAgICB0aGlzLmJ1c1NvY2tldCA9IHptcS5zb2NrZXQoXCJzdWJcIik7XHJcbiAgICAvLyB0aGlzLnRyYWluU29ja2V0ID0gem1xLnNvY2tldChcInN1YlwiKTtcclxuICAgIFxyXG4gICAgdGhpcy5idXNTb2NrZXQuY29ubmVjdChcInRjcDovL3B1YnN1Yi5uZG92bG9rZXQubmw6NzY1OFwiKTtcclxuICAgIHRoaXMuYnVzU29ja2V0LnN1YnNjcmliZShcIi9BUlIvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuYnVzU29ja2V0LnN1YnNjcmliZShcIi9DWFgvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuYnVzU29ja2V0LnN1YnNjcmliZShcIi9ESVRQL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLmJ1c1NvY2tldC5zdWJzY3JpYmUoXCIvRUJTL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLmJ1c1NvY2tldC5zdWJzY3JpYmUoXCIvR1ZCL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLmJ1c1NvY2tldC5zdWJzY3JpYmUoXCIvT1BFTk9WL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLmJ1c1NvY2tldC5zdWJzY3JpYmUoXCIvUUJVWlovS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuYnVzU29ja2V0LnN1YnNjcmliZShcIi9SSUcvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuYnVzU29ja2V0LnN1YnNjcmliZShcIi9LRU9MSVMvS1Y2cG9zaW5mb1wiKTtcclxuXHJcbiAgICB0aGlzLmJ1c1NvY2tldC5vbihcIm1lc3NhZ2VcIiwgKG9wQ29kZSA6IGFueSwgLi4uY29udGVudCA6IGFueSkgPT4ge1xyXG4gICAgICBjb25zdCBjb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoY29udGVudCk7XHJcbiAgICAgIGNvbnN0IG9wZXJhdG9yID0gb3BDb2RlLnRvU3RyaW5nKCk7XHJcbiAgICAgIGd1bnppcChjb250ZW50cywgYXN5bmMoZXJyb3IsIGJ1ZmZlcikgPT4ge1xyXG4gICAgICAgIGlmKGVycm9yKSByZXR1cm4gY29uc29sZS5lcnJvcihgU29tZXRoaW5nIHdlbnQgd3Jvbmcgd2hpbGUgdHJ5aW5nIHRvIHVuemlwLiAke2Vycm9yfWApXHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgZW5jb2RlZFhNTCA9IGJ1ZmZlci50b1N0cmluZygpO1xyXG4gICAgICAgIGNvbnN0IGRlY29kZWQgPSB4bWwucGFyc2UodGhpcy5yZW1vdmVUbWk4KGVuY29kZWRYTUwpKTtcclxuICAgICAgICBcclxuICAgICAgICBsZXQgdmVoaWNsZURhdGEgOiBBcnJheTxWZWhpY2xlRGF0YT4gPSBjb252ZXJ0ZXIuZGVjb2RlKGRlY29kZWQsIG9wZXJhdG9yKTtcclxuICAgICAgICBcclxuXHJcbiAgICAgICAgYXdhaXQgdGhpcy5idXNMb2dpYy5VcGRhdGVCdXNzZXModmVoaWNsZURhdGEpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgIH0pXHJcblxyXG4gICAgfSlcclxuICAgIFxyXG4gICAgLy8gdGhpcy5iaWtlU29ja2V0ID0gem1xLnNvY2tldChcInN1YlwiKTtcclxuICAgIC8vIHRoaXMuYmlrZVNvY2tldC5jb25uZWN0KFwidGNwOi8vdmlkLm9wZW5vdi5ubDo2NzAzXCIpXHJcbiAgICAvLyB0aGlzLmJpa2VTb2NrZXQuc3Vic2NyaWJlKFwiL09WZmlldHNcIik7XHJcblxyXG4gICAgLy8gdGhpcy5iaWtlU29ja2V0Lm9uKFwibWVzc2FnZVwiLCAob3BDb2RlIDogYW55LCAuLi5jb250ZW50IDogYW55KSA9PiB7XHJcbiAgICAvLyAgIGNvbnN0IGNvbnRlbnRzID0gQnVmZmVyLmNvbmNhdChjb250ZW50KTtcclxuICAgIC8vICAgY29uc3Qgb3BlcmF0b3IgPSBvcENvZGUudG9TdHJpbmcoKTtcclxuXHJcbiAgICAvLyAgIGNvbnNvbGUubG9nKG9wZXJhdG9yKTtcclxuICAgIC8vICAgY29uc29sZS5sb2coY29udGVudHMpO1xyXG4gICAgLy8gfSlcclxuICAgIC8vIHRoaXMudHJhaW5Tb2NrZXQuY29ubmVjdChcInRjcDovL3B1YnN1Yi5uZG92bG9rZXQubmw6NzY2NFwiKTtcclxuICAgIC8vIHRoaXMudHJhaW5Tb2NrZXQuc3Vic2NyaWJlKFwiL1JJRy9JbmZvUGx1c1ZUQlNJbnRlcmZhY2U1XCIpO1xyXG4gICAgLy8gdGhpcy50cmFpblNvY2tldC5zdWJzY3JpYmUoXCIvUklHL0luZm9QbHVzVlRCTEludGVyZmFjZTVcIik7XHJcblxyXG4gICAgLy8gdGhpcy50cmFpblNvY2tldC5vbihcIm1lc3NhZ2VcIiwgKG9wQ29kZSA6IGFueSwgLi4uY29udGVudCA6IGFueSkgPT4ge1xyXG4gICAgLy8gICBjb25zdCBjb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoY29udGVudCk7XHJcbiAgICAvLyAgIGNvbnN0IG9wZXJhdG9yID0gb3BDb2RlLnRvU3RyaW5nKCk7XHJcbiAgICAvLyAgIGNvbnNvbGUubG9nKG9wZXJhdG9yKTtcclxuICAgIC8vICAgZ3VuemlwKGNvbnRlbnRzLCBhc3luYyhlcnJvciwgYnVmZmVyKSA9PiB7XHJcbiAgICAvLyAgICAgaWYoZXJyb3IpIHJldHVybiBjb25zb2xlLmVycm9yKGBTb21ldGhpbmcgd2VudCB3cm9uZyB3aGlsZSB0cnlpbmcgdG8gdW56aXAuICR7ZXJyb3J9YClcclxuXHJcbiAgICAvLyAgICAgY29uc3QgZW5jb2RlZFhNTCA9IGJ1ZmZlci50b1N0cmluZygpO1xyXG4gICAgLy8gICAgIGNvbnN0IGRlY29kZWQgPSB4bWwucGFyc2UodGhpcy5yZW1vdmVUbWk4KGVuY29kZWRYTUwpKTtcclxuXHJcbiAgICAvLyAgICAgZnMud3JpdGVGaWxlKFwiSW5mb1BsdXNWVEJTSW50ZXJmYWNlNS5qc29uXCIsIEpTT04uc3RyaW5naWZ5KGRlY29kZWQpLCAoKSA9PiB7fSlcclxuICAgIC8vICAgICAvLyBjb25zb2xlLmxvZyhkZWNvZGVkKVxyXG4gICAgLy8gICAgIC8vIGxldCB2ZWhpY2xlRGF0YSA6IEFycmF5PFZlaGljbGVEYXRhPiA9IGNvbnZlcnRlci5kZWNvZGUoZGVjb2RlZCwgb3BlcmF0b3IpO1xyXG4gICAgICAgIFxyXG4gICAgLy8gICAgIC8vIGF3YWl0IHRoaXMuYnVzTG9naWMuVXBkYXRlQnVzc2VzKHZlaGljbGVEYXRhKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgLy8gICB9KVxyXG5cclxuICAgIC8vIH0pXHJcblxyXG4gICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xyXG4gICAgICB0aGlzLndlYnNvY2tldC5FbWl0QmlrZXMoKTtcclxuICAgIH0sIHBhcnNlSW50KHByb2Nlc3MuZW52LkFQUF9CSUtFX1VQREFURV9ERUxBWSkpXHJcbiAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgIHRoaXMud2Vic29ja2V0LkVtaXQoXCJzbG93XCIpO1xyXG4gICAgfSwgcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0JVU19VUERBVEVfREVMQVlfU0xPVykpXHJcbiAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgIHRoaXMud2Vic29ja2V0LkVtaXQoXCJub3JtYWxcIik7XHJcbiAgICB9LCBwYXJzZUludChwcm9jZXNzLmVudi5BUFBfQlVTX1VQREFURV9OT1JNQUwpKVxyXG4gICAgXHJcbiAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgIHRoaXMud2Vic29ja2V0LkVtaXQoXCJmYXN0XCIpO1xyXG4gICAgfSwgcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0JVU19VUERBVEVfREVMQVlfRkFTVCkpXHJcbiAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgIHRoaXMud2Vic29ja2V0LkVtaXQoXCJ2ZXJ5ZmFzdFwiKTtcclxuICAgIH0sIHBhcnNlSW50KHByb2Nlc3MuZW52LkFQUF9CVVNfVVBEQVRFX0RFTEFZX1ZFUllGQVNUKSlcclxuICAgIHNldEludGVydmFsKCgpID0+IHtcclxuICAgICAgdGhpcy53ZWJzb2NrZXQuRW1pdChcInN1cGVyZmFzdFwiKTtcclxuICAgIH0sIHBhcnNlSW50KHByb2Nlc3MuZW52LkFQUF9CVVNfVVBEQVRFX0RFTEFZX1NVUEVSRkFTVCkpXHJcblxyXG4gICAgLy8gdGhpcy5rdjc4c29ja2V0ID0gem1xLnNvY2tldChcInN1YlwiKTtcclxuICAgIC8vIHRoaXMua3Y3OHNvY2tldC5jb25uZWN0KFwidGNwOi8vcHVic3ViLm5kb3Zsb2tldC5ubDo3ODE3XCIpO1xyXG4gICAgLy8gdGhpcy5rdjc4c29ja2V0LnN1YnNjcmliZShcIi9cIilcclxuICAgIC8vIHRoaXMua3Y3OHNvY2tldC5vbihcIm1lc3NhZ2VcIiwgKG9wQ29kZSwgLi4uY29udGVudCkgPT4ge1xyXG4gICAgLy8gICBjb25zdCBjb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoY29udGVudCk7XHJcbiAgICAvLyAgIGd1bnppcChjb250ZW50cywgYXN5bmMoZXJyb3IsIGJ1ZmZlcikgPT4geyBcclxuICAgIC8vICAgICBjb25zb2xlLmxvZyhidWZmZXIudG9TdHJpbmcoJ3V0ZjgnKSlcclxuICAgIC8vICAgfSk7XHJcbiAgICAvLyB9KTtcclxuICB9XHJcblxyXG4gIHJlbW92ZVRtaTggKGRhdGEpIDogYW55IHtcclxuICAgIHJldHVybiBkYXRhLnJlcGxhY2UoL3RtaTg6L2csIFwiXCIpO1xyXG4gIH1cclxufSIsImltcG9ydCB7IFZlaGljbGVEYXRhIH0gZnJvbSBcIi4vdHlwZXMvVmVoaWNsZURhdGFcIjtcclxuaW1wb3J0IHsgU2VydmVyIH0gZnJvbSAnaHR0cHMnO1xyXG5pbXBvcnQgeyBTb2NrZXQgfSBmcm9tICdzb2NrZXQuaW8nO1xyXG5pbXBvcnQgeyBEYXRhYmFzZSB9IGZyb20gJy4vZGF0YWJhc2UnO1xyXG5pbXBvcnQgeyBXZWJzb2NrZXRWZWhpY2xlRGF0YSB9IGZyb20gXCIuL3R5cGVzL1dlYnNvY2tldFZlaGljbGVEYXRhXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgV2Vic29ja2V0IHtcclxuICBcclxuICBwcml2YXRlIGlvIDogU29ja2V0O1xyXG4gIHByaXZhdGUgZGIgOiBEYXRhYmFzZTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2VydmVyIDogU2VydmVyLCBkYiA6IERhdGFiYXNlKSB7XHJcbiAgICB0aGlzLlNvY2tldEluaXQoc2VydmVyKTtcclxuICAgIHRoaXMuZGIgPSBkYjtcclxuICB9XHJcblxyXG4gIGFzeW5jIFNvY2tldEluaXQoc2VydmVyIDogU2VydmVyKSB7XHJcbiAgICBjb25zb2xlLmxvZyhgSW5pdGFsaXppbmcgd2Vic29ja2V0YClcclxuXHJcbiAgICB0aGlzLmlvID0gcmVxdWlyZShcInNvY2tldC5pb1wiKShzZXJ2ZXIsIHtcclxuICAgICAgY29yczoge1xyXG4gICAgICAgIG9yaWdpbjogXCIqXCIsXHJcbiAgICAgICAgbWV0aG9kczogW1wiR0VUXCIsIFwiUE9TVFwiXSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuaW8ub24oXCJjb25uZWN0aW9uXCIsIHNvY2tldCA9PiB7XHJcbiAgICAgIHNvY2tldC5vbigncm9vbScsIHJvb20gPT4ge1xyXG4gICAgICAgIHNvY2tldC5qb2luKHJvb20pO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBOZXcgY2xpZW50IGNvbm5lY3RlZCB0byByb29tOiAke3Jvb219LmApO1xyXG4gICAgICB9KVxyXG4gICAgICBcclxuICAgICAgc29ja2V0Lm9uKFwiZGlzY29ubmVjdFwiLCAoKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJDbGllbnQgZGlzY29ubmVjdGVkXCIpO1xyXG4gICAgICAgIC8vY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XHJcbiAgICAgIH0pXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcblxyXG5cclxuICBDcmVhdGVCdWZmZXJGcm9tQmlrZXModmVoaWNsZXMgOiBBcnJheTxXZWJzb2NrZXRWZWhpY2xlRGF0YT4pIHsgXHJcbiAgICBsZXQgYnVmID0gQnVmZmVyLmFsbG9jKCg0ICsgNCArIDQgKyAxNSkgKiB2ZWhpY2xlcy5sZW5ndGgpXHJcbiAgICB2ZWhpY2xlcy5mb3JFYWNoKCh2ZWhpY2xlIDogV2Vic29ja2V0VmVoaWNsZURhdGEsIGluZGV4IDogbnVtYmVyKSA9PiB7XHJcbiAgICAgIGJ1Zi53cml0ZUZsb2F0QkUodmVoaWNsZS5wWzBdLCBpbmRleCAqIDI3KVxyXG4gICAgICBidWYud3JpdGVGbG9hdEJFKHZlaGljbGUucFsxXSwgaW5kZXggKiAyNyArIDQpXHJcbiAgICAgIGJ1Zi53cml0ZVVJbnQzMkJFKHZlaGljbGUudiwgaW5kZXggKiAyNyArIDQgKyA0KVxyXG4gICAgICBidWYud3JpdGUoYCR7dmVoaWNsZS5jfXwke3ZlaGljbGUubn1gLCBpbmRleCAqIDI3ICsgNCArIDQgKyA0KVxyXG4gICAgICBmb3IobGV0IGkgPSAwOyBpIDwgMTUgLSAodmVoaWNsZS5jLmxlbmd0aCArIDEgKyB2ZWhpY2xlLm4ubGVuZ3RoKTsgaSsrKSB7XHJcbiAgICAgICAgYnVmLndyaXRlVUludDgoMCwgaW5kZXggKiAyNyArIDQgKyA0ICsgNCArIHZlaGljbGUuYy5sZW5ndGggKyAxICsgdmVoaWNsZS5uLmxlbmd0aClcclxuICAgICAgfVxyXG4gICAgfSlcclxuXHJcbiAgICByZXR1cm4gYnVmO1xyXG4gIH1cclxuXHJcbiAgQ3JlYXRlQnVmZmVyRnJvbVZlaGljbGVzKHZlaGljbGVzIDogQXJyYXk8V2Vic29ja2V0VmVoaWNsZURhdGE+KSB7IFxyXG4gICAgbGV0IGJ1ZiA9IEJ1ZmZlci5hbGxvYygoNCArIDQgKyA0ICsgMTUpICogdmVoaWNsZXMubGVuZ3RoKVxyXG4gICAgdmVoaWNsZXMuZm9yRWFjaCgodmVoaWNsZSA6IFdlYnNvY2tldFZlaGljbGVEYXRhLCBpbmRleCA6IG51bWJlcikgPT4ge1xyXG4gICAgICBidWYud3JpdGVGbG9hdEJFKHZlaGljbGUucFswXSwgaW5kZXggKiAyNylcclxuICAgICAgYnVmLndyaXRlRmxvYXRCRSh2ZWhpY2xlLnBbMV0sIGluZGV4ICogMjcgKyA0KVxyXG4gICAgICBidWYud3JpdGVVSW50MzJCRSh2ZWhpY2xlLnYsIGluZGV4ICogMjcgKyA0ICsgNClcclxuICAgICAgYnVmLndyaXRlKGAke3ZlaGljbGUuY318JHt2ZWhpY2xlLm59YCwgaW5kZXggKiAyNyArIDQgKyA0ICsgNClcclxuICAgICAgZm9yKGxldCBpID0gMDsgaSA8IDE1IC0gKHZlaGljbGUuYy5sZW5ndGggKyAxICsgdmVoaWNsZS5uLmxlbmd0aCk7IGkrKykge1xyXG4gICAgICAgIGJ1Zi53cml0ZVVJbnQ4KDAsIGluZGV4ICogMjcgKyA0ICsgNCArIDQgKyB2ZWhpY2xlLmMubGVuZ3RoICsgMSArIHZlaGljbGUubi5sZW5ndGgpXHJcbiAgICAgIH1cclxuICAgIH0pXHJcblxyXG4gICAgcmV0dXJuIGJ1ZjtcclxuICB9XHJcblxyXG4gIEVtaXQocm9vbSA6IHN0cmluZykge1xyXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgIHRoaXMuZGIuR2V0QWxsVmVoaWNsZXNTbWFsbCgpLnRoZW4oKHZlaGljbGVzKSA9PiB0aGlzLmlvLnRvKHJvb20pLmVtaXQoXCJvdmRhdGFcIiwgdGhpcy5DcmVhdGVCdWZmZXJGcm9tVmVoaWNsZXModmVoaWNsZXMpKSlcclxuICAgICAgICAvL1NtYWxsIGRlbGF5IHRvIG1ha2Ugc3VyZSB0aGUgc2VydmVyIGNhdGNoZXMgdXAuXHJcbiAgICB9LCAxMDApXHJcbiAgfVxyXG5cclxuICBFbWl0QmlrZXMoKSB7XHJcbiAgICB0aGlzLmRiLkdldEFsbFZlaGljbGVzU21hbGwoKS50aGVuKChiaWtlcykgPT4gdGhpcy5pby50byhcImJpa2VzXCIpLmVtaXQoXCJiaWtlc1wiLCB0aGlzLkNyZWF0ZUJ1ZmZlckZyb21CaWtlcyhiaWtlcykpKVxyXG4gIH1cclxuXHJcbn0iLCJleHBvcnQgY29uc3QgQ29tcGFuaWVzID0ge1xyXG4gIEFSUiA6IFwiQVJSXCIsXHJcbiAgQ1hYIDogXCJDWFhcIixcclxuICBESVRQIDogXCJESVRQXCIsXHJcbiAgRUJTIDogXCJFQlNcIixcclxuICBHVkIgOiBcIkdWQlwiLFxyXG4gIEtFT0xJUzogXCJLRU9MSVNcIixcclxuICBPUEVOT1Y6IFwiT1BFTk9WXCIsXHJcbiAgUUJVWlogOiBcIlFCVVpaXCIsXHJcbiAgUklHIDogXCJSSUdcIlxyXG59IiwiZXhwb3J0IGVudW0gdmVoaWNsZVN0YXRlIHtcclxuICBPTlJPVVRFID0gJ09OUk9VVEUnLFxyXG4gIE9GRlJPVVRFID0gJ09GRlJPVVRFJyxcclxuICBFTkQgPSBcIkVORFwiLFxyXG4gIERFUEFSVFVSRSA9ICdERVBBUlRVUkUnLFxyXG4gIElOSVQgPSAnSU5JVCcsXHJcbiAgREVMQVkgPSAnREVMQVknLFxyXG4gIE9OU1RPUCA9ICdPTlNUT1AnLFxyXG4gIEFSUklWQUwgPSAnQVJSSVZBTCdcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBWZWhpY2xlRGF0YSB7XHJcbiAgY29tcGFueTogc3RyaW5nLFxyXG4gIG9yaWdpbmFsQ29tcGFueTogc3RyaW5nLFxyXG4gIHBsYW5uaW5nTnVtYmVyOiBzdHJpbmcsXHJcbiAgam91cm5leU51bWJlcjogbnVtYmVyLFxyXG4gIGxpbmVOdW1iZXIgOiBzdHJpbmcsXHJcbiAgdGltZXN0YW1wOiBudW1iZXIsXHJcbiAgdmVoaWNsZU51bWJlcjogbnVtYmVyLFxyXG4gIHBvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdLFxyXG4gIHN0YXR1czogdmVoaWNsZVN0YXRlLFxyXG4gIGNyZWF0ZWRBdDogbnVtYmVyLFxyXG4gIHVwZGF0ZWRBdDogbnVtYmVyLFxyXG4gIHB1bmN0dWFsaXR5OiBBcnJheTxudW1iZXI+LFxyXG4gIHVwZGF0ZWRUaW1lczogQXJyYXk8bnVtYmVyPixcclxuICBjdXJyZW50Um91dGVJZDogbnVtYmVyLFxyXG4gIGN1cnJlbnRUcmlwSWQ6IG51bWJlclxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIkB0dXJmL3R1cmZcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImNoaWxkX3Byb2Nlc3NcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImNvcnNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImRvdGVudlwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZXhwcmVzc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZmFzdC14bWwtcGFyc2VyXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJmc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiaHR0cHNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIm1vbmdvb3NlXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJwYXRoXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzb2NrZXQuaW9cIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInNwbGl0XCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzdHJlYW0tdG8tbW9uZ28tZGJcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInplcm9tcVwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiemxpYlwiKTs7IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIHN0YXJ0dXBcbi8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuLy8gVGhpcyBlbnRyeSBtb2R1bGUgaXMgcmVmZXJlbmNlZCBieSBvdGhlciBtb2R1bGVzIHNvIGl0IGNhbid0IGJlIGlubGluZWRcbnZhciBfX3dlYnBhY2tfZXhwb3J0c19fID0gX193ZWJwYWNrX3JlcXVpcmVfXyhcIi4vc3JjL21haW4udHNcIik7XG4iXSwic291cmNlUm9vdCI6IiJ9