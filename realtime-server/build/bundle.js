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
    Emit() {
        setTimeout(() => {
            this.db.GetAllVehiclesSmall().then((vehicles) => this.io.emit("ovdata", this.CreateBufferFromVehicles(vehicles)));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9idXNsb2dpYy50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9jb252ZXJ0ZXIudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvZGF0YWJhc2UudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvbWFpbi50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9yZWFsdGltZS50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9zb2NrZXQudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvdHlwZXMvQ29tcGFuaWVzLnRzIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyLy4vc3JjL3R5cGVzL1ZlaGljbGVEYXRhLnRzIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiQHR1cmYvdHVyZlwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiY2hpbGRfcHJvY2Vzc1wiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiY29yc1wiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiZG90ZW52XCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJleHByZXNzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJmYXN0LXhtbC1wYXJzZXJcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcImZzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJodHRwc1wiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwibW9uZ29vc2VcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcInBhdGhcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcInNvY2tldC5pb1wiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwic3BsaXRcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcInN0cmVhbS10by1tb25nby1kYlwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiemVyb21xXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJ6bGliXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvd2VicGFjay9zdGFydHVwIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsbUdBQWdFO0FBQ2hFLHVEQUErQjtBQUMvQiw2REFBeUI7QUFHekIsa0ZBQXFDO0FBR3JDLCtFQUFrQztBQUVsQyxNQUFhLFFBQVE7SUFJbkIsWUFBWSxRQUFRLEVBQUUsU0FBbUIsS0FBSztRQUM1QyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUV6QixJQUFHLE1BQU07WUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUVPLEtBQUssQ0FBQyxVQUFVO1FBQ3RCLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRXpCLFdBQVcsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNyQixNQUFNLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMzQixDQUFDLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlC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QUFDLENBQUM7UUFDM0MsTUFBTSxJQUFJLEdBQUcsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNO1lBQ3ZFLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDOUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPO1lBQzdDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU87WUFDOUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTztZQUM1QyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQ3hELEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTztZQUN4QixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDWCxNQUFNLElBQUksR0FBRyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPO1lBQy9ELEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDNUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPO1lBQ2xCLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDNUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUN2QixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQzVDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUNsQixFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFDOUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQzFCLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUNsQixJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRW5CLE1BQU0sUUFBUSxHQUFHLFFBQVEsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQztRQUMxQyxNQUFNLFNBQVMsR0FBRyxRQUFRLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFFM0MsT0FBTyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUM7SUFDOUIsQ0FBQztDQUVG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Q0E7VUFDQTs7VUFFQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTs7OztVQ3RCQTtVQUNBO1VBQ0E7VUFDQSIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEYXRhYmFzZSB9IGZyb20gXCIuL2RhdGFiYXNlXCI7XHJcbmltcG9ydCB7IFZlaGljbGVEYXRhLCB2ZWhpY2xlU3RhdGUgfSBmcm9tIFwiLi90eXBlcy9WZWhpY2xlRGF0YVwiO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0IHsgVHJpcCB9IGZyb20gXCIuL3R5cGVzL1RyaXBcIjtcclxuaW1wb3J0IHsgQXBpVHJpcCB9IGZyb20gXCIuL3R5cGVzL0FwaVRyaXBcIjtcclxuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xyXG5pbXBvcnQgeyBSb3V0ZSB9IGZyb20gXCIuL3R5cGVzL1JvdXRlXCI7XHJcbmltcG9ydCB7IFRyaXBQb3NpdGlvbkRhdGEgfSBmcm9tIFwiLi90eXBlcy9UcmlwUG9zaXRpb25EYXRhXCI7XHJcbmltcG9ydCAqIGFzIHR1cmYgZnJvbSAnQHR1cmYvdHVyZidcclxuXHJcbmV4cG9ydCBjbGFzcyBCdXNMb2dpYyB7XHJcblxyXG4gIHByaXZhdGUgZGF0YWJhc2UgOiBEYXRhYmFzZTtcclxuXHJcbiAgY29uc3RydWN0b3IoZGF0YWJhc2UsIGRvSW5pdCA6IGJvb2xlYW4gPSBmYWxzZSkge1xyXG4gICAgdGhpcy5kYXRhYmFzZSA9IGRhdGFiYXNlO1xyXG5cclxuICAgIGlmKGRvSW5pdCkgdGhpcy5Jbml0aWFsaXplKCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIEluaXRpYWxpemUoKSB7XHJcbiAgICBhd2FpdCB0aGlzLkNsZWFyQnVzc2VzKCk7XHJcblxyXG4gICAgc2V0SW50ZXJ2YWwoYXN5bmMgKCkgPT4ge1xyXG4gICAgICBhd2FpdCB0aGlzLkNsZWFyQnVzc2VzKCk7XHJcbiAgICB9LCBwYXJzZUludChwcm9jZXNzLmVudi5BUFBfQ0xFQU5VUF9ERUxBWSkpXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGVzIG9yIGNyZWF0ZXMgYSBuZXcgYnVzIGRlcGVuZGluZyBvbiBpZiBpdCBhbHJlYWR5IGV4aXN0cyBvciBub3QuXHJcbiAgICogQHBhcmFtIGJ1c3NlcyBUaGUgbGlzdCBvZiBidXNzZXMgdG8gdXBkYXRlLlxyXG4gICAqL1xyXG4gICBwdWJsaWMgYXN5bmMgVXBkYXRlQnVzc2VzKGJ1c3NlcyA6IEFycmF5PFZlaGljbGVEYXRhPikgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICBcclxuICAgIGF3YWl0IFByb21pc2UuYWxsKGJ1c3Nlcy5tYXAoYXN5bmMgKGJ1cykgPT4ge1xyXG4gICAgICBjb25zdCBmb3VuZFRyaXAgOiBUcmlwID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRUcmlwKGJ1cy5qb3VybmV5TnVtYmVyLCBidXMucGxhbm5pbmdOdW1iZXIsIGJ1cy5jb21wYW55KTtcclxuICAgICAgY29uc3QgZm91bmRSb3V0ZSA6IFJvdXRlID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRSb3V0ZShmb3VuZFRyaXAucm91dGVJZCk7XHJcblxyXG4gICAgICAvL1RPRE86IE1heWJlIHRoaXMgc2hvdWxkIGJlIGRpZmZlcmVudC5cclxuICAgICAgYnVzLmxpbmVOdW1iZXIgPSBcIjk5OVwiO1xyXG4gICAgICBidXMuY3VycmVudFJvdXRlSWQgPSAwO1xyXG4gICAgICBidXMuY3VycmVudFRyaXBJZCA9IDA7XHJcblxyXG4gICAgICBpZihmb3VuZFJvdXRlLmNvbXBhbnkpIGJ1cy5jb21wYW55ID0gZm91bmRSb3V0ZS5jb21wYW55O1xyXG4gICAgICBpZihmb3VuZFJvdXRlICYmIGZvdW5kUm91dGUucm91dGVTaG9ydE5hbWUgJiYgZm91bmRSb3V0ZS5yb3V0ZUlkKSB7XHJcbiAgICAgICAgYnVzLmxpbmVOdW1iZXIgPSBmb3VuZFJvdXRlLnJvdXRlU2hvcnROYW1lO1xyXG4gICAgICAgIGJ1cy5jdXJyZW50Um91dGVJZCA9IGZvdW5kUm91dGUucm91dGVJZFxyXG4gICAgICB9XHJcblxyXG4gICAgICBpZihmb3VuZFRyaXAgJiYgZm91bmRUcmlwLnRyaXBJZCkgYnVzLmN1cnJlbnRUcmlwSWQgPSBmb3VuZFRyaXAudHJpcElkO1xyXG5cclxuICAgICAgbGV0IGZvdW5kVmVoaWNsZSA6IFZlaGljbGVEYXRhID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRWZWhpY2xlKGJ1cy52ZWhpY2xlTnVtYmVyLCBidXMuY29tcGFueSk7XHJcbiAgICAgIFxyXG4gICAgICBcclxuXHJcbiAgICAgIGlmKE9iamVjdC5rZXlzKGZvdW5kVmVoaWNsZSkubGVuZ3RoICE9PSAwKSB7XHJcbiAgICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX1VQREFURV9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhgVXBkYXRpbmcgdmVoaWNsZSAke2J1cy52ZWhpY2xlTnVtYmVyfSBmcm9tICR7YnVzLmNvbXBhbnl9YClcclxuICAgICAgICBpZighZm91bmRWZWhpY2xlW1wiX2RvY1wiXSkgeyBjb25zb2xlLmVycm9yKGBWZWhpY2xlICR7YnVzLnZlaGljbGVOdW1iZXJ9IGZyb20gJHtidXMuY29tcGFueX0gZGlkIG5vdCBpbmNsdWRlIGEgZG9jLiBgKTsgcmV0dXJuIH1cclxuXHJcbiAgICAgICAgZm91bmRWZWhpY2xlID0gZm91bmRWZWhpY2xlW1wiX2RvY1wiXTtcclxuICAgICAgICBcclxuICAgICAgICAvL01lcmdlIHRoZSBwdW5jdHVhbGl0aWVzIG9mIHRoZSBvbGQgdmVoaWNsZURhdGEgd2l0aCB0aGUgbmV3IG9uZS5cclxuICAgICAgICBidXMucHVuY3R1YWxpdHkgPSBmb3VuZFZlaGljbGUucHVuY3R1YWxpdHkuY29uY2F0KGJ1cy5wdW5jdHVhbGl0eSk7XHJcblxyXG4gICAgICAgIC8vTWVyZ2UgdGhlIHVwZGF0ZWQgdGltZXMgb2YgdGhlIG9sZCB2ZWhpY2xlRGF0YSB3aXRoIHRoZSBuZXcgb25lLlxyXG4gICAgICAgIGJ1cy51cGRhdGVkVGltZXMgPSBmb3VuZFZlaGljbGUudXBkYXRlZFRpbWVzLmNvbmNhdChidXMudXBkYXRlZFRpbWVzKTtcclxuXHJcbiAgICAgICAgaWYoYnVzLnN0YXR1cyAhPT0gdmVoaWNsZVN0YXRlLk9OUk9VVEUpIGJ1cy5wb3NpdGlvbiA9IGZvdW5kVmVoaWNsZS5wb3NpdGlvbjtcclxuXHJcbiAgICAgICAgaWYoYnVzLnN0YXR1cyA9PT0gdmVoaWNsZVN0YXRlLklOSVQgfHwgYnVzLnN0YXR1cyA9PT0gdmVoaWNsZVN0YXRlLkVORCkge1xyXG4gICAgICAgICAgYnVzLnB1bmN0dWFsaXR5ID0gW107XHJcbiAgICAgICAgICBidXMudXBkYXRlZFRpbWVzID0gW107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBcclxuICAgICAgICAvL1RPRE86IFJlbW92ZSBwdW5jdHVhbGl0eSBkYXRhIG9sZGVyIHRoYW4gNjAgbWludXRlcy5cclxuXHJcbiAgICAgICAgYnVzLnVwZGF0ZWRBdCA9IERhdGUubm93KCk7ICBcclxuICAgICAgICBpZihPYmplY3Qua2V5cyhmb3VuZFRyaXApLmxlbmd0aCAhPT0gMCkgdGhpcy5BZGRQb3NpdGlvblRvVHJpcFJvdXRlKGZvdW5kVHJpcC50cmlwSWQsIGZvdW5kVHJpcC5jb21wYW55LCBidXMucG9zaXRpb24pO1xyXG4gICAgICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuVXBkYXRlVmVoaWNsZShmb3VuZFZlaGljbGUsIGJ1cywgdHJ1ZSlcclxuICAgICAgICBcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ1JFQVRFX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBjcmVhdGluZyBuZXcgdmVoaWNsZSAke2J1cy52ZWhpY2xlTnVtYmVyfSBmcm9tICR7YnVzLmNvbXBhbnl9YClcclxuICAgICAgICBpZihidXMuc3RhdHVzID09PSB2ZWhpY2xlU3RhdGUuT05ST1VURSkgYXdhaXQgdGhpcy5kYXRhYmFzZS5BZGRWZWhpY2xlKGJ1cylcclxuICAgICAgfVxyXG4gICAgfSkpXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgQWRkUG9zaXRpb25Ub1RyaXBSb3V0ZSAodHJpcElkIDogbnVtYmVyLCBjb21wYW55IDogc3RyaW5nLCBwb3NpdGlvbiA6IFtudW1iZXIsIG51bWJlcl0pIHtcclxuICAgIGlmKHBvc2l0aW9uWzBdID09IDMuMzEzNTI5MTU2MjY0MzQ2NykgcmV0dXJuO1xyXG4gICAgbGV0IHJldHJpZXZlZFRyaXBSb3V0ZURhdGEgOiBUcmlwUG9zaXRpb25EYXRhID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRUcmlwUG9zaXRpb25zKHRyaXBJZCwgY29tcGFueSk7XHJcbiAgICBpZihyZXRyaWV2ZWRUcmlwUm91dGVEYXRhKSB7IFxyXG4gICAgICByZXRyaWV2ZWRUcmlwUm91dGVEYXRhLnVwZGF0ZWRUaW1lcy5wdXNoKG5ldyBEYXRlKCkuZ2V0VGltZSgpKTtcclxuICAgICAgY29uc3QgbmV3VXBkYXRlZFRpbWVzID0gcmV0cmlldmVkVHJpcFJvdXRlRGF0YS51cGRhdGVkVGltZXM7XHJcbiAgICAgIGxldCByZXN1bHRBcnJheTtcclxuXHJcbiAgICAgIGlmKHJldHJpZXZlZFRyaXBSb3V0ZURhdGEucG9zaXRpb25zLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICBjb25zdCB0YXJnZXRQb2ludCA9IHR1cmYucG9pbnQocG9zaXRpb24pO1xyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRMaW5lID0gdHVyZi5saW5lU3RyaW5nKHJldHJpZXZlZFRyaXBSb3V0ZURhdGEucG9zaXRpb25zKVxyXG4gICAgICAgIGNvbnN0IG5lYXJlc3QgPSB0dXJmLm5lYXJlc3RQb2ludE9uTGluZShjdXJyZW50TGluZSwgdGFyZ2V0UG9pbnQpO1xyXG4gICAgICAgIGNvbnN0IGluZGV4ID0gbmVhcmVzdC5wcm9wZXJ0aWVzLmluZGV4O1xyXG4gIFxyXG4gICAgICAgIGNvbnN0IGZpcnN0SGFsZiA9IHJldHJpZXZlZFRyaXBSb3V0ZURhdGEucG9zaXRpb25zLnNsaWNlKDAsIGluZGV4KTtcclxuICAgICAgICBjb25zdCBzZWNvbmRIYWxmID0gcmV0cmlldmVkVHJpcFJvdXRlRGF0YS5wb3NpdGlvbnMuc2xpY2UoaW5kZXgpXHJcbiAgICAgICAgZmlyc3RIYWxmLnB1c2goW3RhcmdldFBvaW50Lmdlb21ldHJ5LmNvb3JkaW5hdGVzWzBdLCB0YXJnZXRQb2ludC5nZW9tZXRyeS5jb29yZGluYXRlc1sxXV0pO1xyXG4gICAgICAgIHJlc3VsdEFycmF5ID0gZmlyc3RIYWxmLmNvbmNhdChzZWNvbmRIYWxmKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXRyaWV2ZWRUcmlwUm91dGVEYXRhLnBvc2l0aW9ucy5wdXNoKHBvc2l0aW9uKTtcclxuICAgICAgICByZXN1bHRBcnJheSA9IHJldHJpZXZlZFRyaXBSb3V0ZURhdGEucG9zaXRpb25zO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBcclxuICAgICAgcmV0cmlldmVkVHJpcFJvdXRlRGF0YSA9IHtcclxuICAgICAgICB0cmlwSWQgOiB0cmlwSWQsXHJcbiAgICAgICAgY29tcGFueSA6IGNvbXBhbnksXHJcbiAgICAgICAgcG9zaXRpb25zOiByZXN1bHRBcnJheSxcclxuICAgICAgICB1cGRhdGVkVGltZXMgOiBuZXdVcGRhdGVkVGltZXNcclxuICAgICAgfVxyXG5cclxuICAgIH1cclxuICAgICAgXHJcbiAgICBlbHNlXHJcbiAgICAgIHJldHJpZXZlZFRyaXBSb3V0ZURhdGEgPSB7XHJcbiAgICAgICAgdHJpcElkIDogdHJpcElkLFxyXG4gICAgICAgIGNvbXBhbnkgOiBjb21wYW55LFxyXG4gICAgICAgIHBvc2l0aW9uczogW3Bvc2l0aW9uXSxcclxuICAgICAgICB1cGRhdGVkVGltZXMgOiBbbmV3IERhdGUoKS5nZXRUaW1lKCldXHJcbiAgICAgIH1cclxuXHJcbiAgICBhd2FpdCB0aGlzLmRhdGFiYXNlLlVwZGF0ZVRyaXBQb3NpdGlvbnModHJpcElkLCBjb21wYW55LCByZXRyaWV2ZWRUcmlwUm91dGVEYXRhKTtcclxuICB9XHJcblxyXG4gIFxyXG5cclxuICAvKipcclxuICAgKiBDbGVhcnMgYnVzc2VzIGV2ZXJ5IFggYW1vdW50IG9mIG1pbnV0ZXMgc3BlY2lmaWVkIGluIC5lbnYgZmlsZS5cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgQ2xlYXJCdXNzZXMoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NMRUFOVVBfTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJDbGVhcmluZyBidXNzZXNcIilcclxuICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnN0IGZpZnRlZW5NaW51dGVzQWdvID0gY3VycmVudFRpbWUgLSAoNjAgKiBwYXJzZUludChwcm9jZXNzLmVudi5BUFBfQ0xFQU5VUF9WRUhJQ0xFX0FHRV9SRVFVSVJFTUVOVCkgKiAxMDAwKTtcclxuICAgIGNvbnN0IFJlbW92ZWRWZWhpY2xlcyA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuUmVtb3ZlVmVoaWNsZXNXaGVyZSh7IHVwZGF0ZWRBdDogeyAkbHQ6IGZpZnRlZW5NaW51dGVzQWdvIH0gfSwgcHJvY2Vzcy5lbnYuQVBQX0RPX0NMRUFOVVBfTE9HR0lORyA9PSBcInRydWVcIik7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgXCJLb3BwZWx2bGFrIDcgYW5kIDggdHVyYm9cIiBmaWxlcyB0byBkYXRhYmFzZS5cclxuICAgKi9cclxuICBwdWJsaWMgSW5pdEtWNzgoKSA6IHZvaWQge1xyXG4gICAgdGhpcy5Jbml0VHJpcHNOZXcoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSB0cmlwcyBmcm9tIHRoZSBzcGVjaWZpZWQgVVJMIGluIHRoZSAuZW52ICwgb3IgXCIuLi9HVEZTL2V4dHJhY3RlZC90cmlwcy5qc29uXCIgdG8gdGhlIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gIHByaXZhdGUgSW5pdFRyaXBzTmV3KCkgOiB2b2lkIHsgXHJcbiAgICBjb25zdCB0cmlwc1BhdGggPSByZXNvbHZlKFwiR1RGU1xcXFxleHRyYWN0ZWRcXFxcdHJpcHMudHh0Lmpzb25cIik7XHJcbiAgICBjb25zdCBvdXRwdXRQYXRoID0gcmVzb2x2ZShcIkdURlNcXFxcY29udmVydGVkXFxcXHRyaXBzLmpzb25cIik7XHJcbiAgICBmcy5yZWFkRmlsZSh0cmlwc1BhdGgsICd1dGY4JywgYXN5bmMoZXJyb3IsIGRhdGEpID0+IHsgXHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgaWYoZGF0YSAmJiBwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkxvYWRlZCB0cmlwcyBmaWxlIGludG8gbWVtb3J5LlwiKTtcclxuICAgICAgZGF0YSA9IGRhdGEudHJpbSgpO1xyXG4gICAgICBjb25zdCBsaW5lcyA9IGRhdGEuc3BsaXQoXCJcXG5cIik7XHJcbiAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3V0cHV0UGF0aClcclxuICAgICAgY29uc3QgY29udmVydGVkVHJpcHMgPSBbXTtcclxuXHJcbiAgICAgIGZvcihsZXQgbGluZSBvZiBsaW5lcykge1xyXG4gICAgICAgIGNvbnN0IHRyaXBKU09OIDogQXBpVHJpcCA9IEpTT04ucGFyc2UobGluZSk7XHJcbiAgICAgICAgY29uc3QgcmVhbFRpbWVUcmlwSWQgPSB0cmlwSlNPTi5yZWFsdGltZV90cmlwX2lkLnNwbGl0KFwiOlwiKTtcclxuICAgICAgICBjb25zdCBjb21wYW55ID0gcmVhbFRpbWVUcmlwSWRbMF07XHJcbiAgICAgICAgY29uc3QgcGxhbm5pbmdOdW1iZXIgPSByZWFsVGltZVRyaXBJZFsxXTtcclxuICAgICAgICBjb25zdCB0cmlwTnVtYmVyID0gcmVhbFRpbWVUcmlwSWRbMl07XHJcblxyXG4gICAgICAgIGNvbnN0IHRyaXAgOiBUcmlwID0ge1xyXG4gICAgICAgICAgY29tcGFueTogY29tcGFueSxcclxuICAgICAgICAgIHJvdXRlSWQ6IHBhcnNlSW50KHRyaXBKU09OLnJvdXRlX2lkKSxcclxuICAgICAgICAgIHNlcnZpY2VJZDogcGFyc2VJbnQodHJpcEpTT04uc2VydmljZV9pZCksXHJcbiAgICAgICAgICB0cmlwSWQ6IHBhcnNlSW50KHRyaXBKU09OLnRyaXBfaWQpLFxyXG4gICAgICAgICAgdHJpcE51bWJlcjogcGFyc2VJbnQodHJpcE51bWJlciksXHJcbiAgICAgICAgICB0cmlwUGxhbm5pbmdOdW1iZXI6IHBsYW5uaW5nTnVtYmVyLFxyXG4gICAgICAgICAgdHJpcEhlYWRzaWduOiB0cmlwSlNPTi50cmlwX2hlYWRzaWduLFxyXG4gICAgICAgICAgdHJpcE5hbWU6IHRyaXBKU09OLnRyaXBfbG9uZ19uYW1lLFxyXG4gICAgICAgICAgZGlyZWN0aW9uSWQ6IHBhcnNlSW50KHRyaXBKU09OLmRpcmVjdGlvbl9pZCksXHJcbiAgICAgICAgICBzaGFwZUlkOiBwYXJzZUludCh0cmlwSlNPTi5zaGFwZV9pZCksXHJcbiAgICAgICAgICB3aGVlbGNoYWlyQWNjZXNzaWJsZTogcGFyc2VJbnQodHJpcEpTT04ud2hlZWxjaGFpcl9hY2Nlc3NpYmxlKVxyXG4gICAgICAgIH1cclxuICAgICAgICB3cml0ZVN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh0cmlwKSArIFwiXFxuXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB3cml0ZVN0cmVhbS5lbmQoKCkgPT4ge1xyXG4gICAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRmluaXNoZWQgd3JpdGluZyB0cmlwcyBmaWxlLCBpbXBvcnRpbmcgdG8gZGF0YWJhc2UuXCIpO1xyXG4gICAgICAgIHRoaXMuSW1wb3J0VHJpcHMoKTtcclxuICAgICAgfSlcclxuICAgIH0pO1xyXG4gICBcclxuICAgIFxyXG4gIH1cclxuXHJcbiAgYXN5bmMgSW1wb3J0VHJpcHMoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5kYXRhYmFzZS5Ecm9wVHJpcHNDb2xsZWN0aW9uKCk7XHJcblxyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJJbXBvcnRpbmcgdHJpcHMgdG8gbW9uZ29kYlwiKTtcclxuXHJcbiAgICBhd2FpdCBleGVjKFwibW9uZ29pbXBvcnQgLS1kYiB0YWlvdmEgLS1jb2xsZWN0aW9uIHRyaXBzIC0tZmlsZSAuXFxcXEdURlNcXFxcY29udmVydGVkXFxcXHRyaXBzLmpzb25cIiwgKGVycm9yLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzdGRlcnIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgc3RkZXJyOiAke3N0ZGVycn1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBzdGRvdXQ6ICR7c3Rkb3V0fWApO1xyXG4gICAgfSk7XHJcblxyXG4gIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBWZWhpY2xlRGF0YSwgdmVoaWNsZVN0YXRlIH0gZnJvbSAnLi90eXBlcy9WZWhpY2xlRGF0YSdcclxuaW1wb3J0IHsgVmVoaWNsZUFwaURhdGEsIFZlaGljbGVQb3NEYXRhLCBWZWhpY2xlQXBpRGF0YUtlb2xpcyB9IGZyb20gJy4vdHlwZXMvVmVoaWNsZUFwaURhdGEnXHJcbmltcG9ydCB7IENvbXBhbmllcyB9IGZyb20gJy4vdHlwZXMvQ29tcGFuaWVzJztcclxuaW1wb3J0IHsgYmVhcmluZ1RvQW5nbGUgfSBmcm9tICdAdHVyZi90dXJmJztcclxuaW1wb3J0IHsgS1Y2R2VuZXJpYyB9IGZyb20gJy4vdHlwZXMvYXBpL0tWNkFycml2YSc7XHJcbmltcG9ydCB7IERFTEFZLCBJTklULCBPTlJPVVRFLCBUeXBlcyB9IGZyb20gJy4vdHlwZXMvYXBpL0tWNkNvbW1vbic7XHJcbmV4cG9ydCBjbGFzcyBDb252ZXJ0ZXIge1xyXG5cclxuICBkZWNvZGUoZGF0YSA6IGFueSwgb3BlcmF0b3IgOiBzdHJpbmcpIDogYW55IHtcclxuICAgIGNvbnN0IGNvbXBhbnkgPSB0aGlzLkNoZWNrQ29tcGFueShvcGVyYXRvcik7XHJcblxyXG4gICAgc3dpdGNoIChjb21wYW55KSB7XHJcbiAgICAgIGNhc2UgQ29tcGFuaWVzLkFSUjpcclxuICAgICAgICByZXR1cm4gdGhpcy5EZWNvZGVNYWluKGRhdGEpO1xyXG4gICAgICBjYXNlIENvbXBhbmllcy5DWFg6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRGVjb2RlTWFpbihkYXRhKTtcclxuICAgICAgY2FzZSBDb21wYW5pZXMuRUJTOlxyXG4gICAgICAgIHJldHVybiB0aGlzLkRlY29kZU1haW4oZGF0YSk7XHJcbiAgICAgIGNhc2UgQ29tcGFuaWVzLlFCVVpaOlxyXG4gICAgICAgIHJldHVybiB0aGlzLkRlY29kZU1haW4oZGF0YSk7XHJcbiAgICAgIGNhc2UgQ29tcGFuaWVzLlJJRzpcclxuICAgICAgICByZXR1cm4gdGhpcy5EZWNvZGVNYWluKGRhdGEpO1xyXG4gICAgICBjYXNlIENvbXBhbmllcy5PUEVOT1Y6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRGVjb2RlTWFpbihkYXRhKTtcclxuICAgICAgY2FzZSBDb21wYW5pZXMuRElUUDpcclxuICAgICAgICByZXR1cm4gdGhpcy5EZWNvZGVNYWluKGRhdGEpO1xyXG4gICAgICBjYXNlIENvbXBhbmllcy5LRU9MSVM6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRGVjb2RlT3RoZXIoZGF0YSk7XHJcbiAgICAgIGNhc2UgQ29tcGFuaWVzLkdWQjpcclxuICAgICAgICByZXR1cm4gdGhpcy5EZWNvZGVPdGhlcihkYXRhKTtcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICBjb25zb2xlLmVycm9yKGBDb21wYW55ICR7Y29tcGFueX0gdW5rbm93bi5gKVxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICB9IFxyXG5cclxuICAvKiogXHJcbiAgKiBUaGlzIGlzIHRoZSBtYWluIGRlY29kaW5nIGZ1bmN0aW9uLiBJdCB3b3JrcyBmb3IgQXJyaXZhLCBDb25uZXh4aW9uLCBFQlMsIFFCVVpaLCBSSUcgKFJFVCksIE9QRU5PViwgRElUUFxyXG4gICogQHBhcmFtIGRhdGEgVGhlIHJlcXVpcmVkIGRhdGEuIEl0IHNob3VsZCBiZSBvZiB0eXBlIFwiS1Y2R2VuZXJpY1wiLCB3aGljaCB3b3JrcyBmb3IgdGhlIGNvbXBhbmllcyBtZW50aW9uZWQgYWJvdmUuXHJcbiAgKiBAcmV0dXJucyBBbiBhcnJheSB3aXRoIHRoZSBjb252ZXJ0ZWQgdmVoaWNsZWRhdGEuXHJcbiAgKi9cclxuICBEZWNvZGVNYWluIChkYXRhIDogS1Y2R2VuZXJpYykgOiBBcnJheTxWZWhpY2xlRGF0YT4ge1xyXG4gICAgY29uc3QgcmV0dXJuRGF0YSA6IEFycmF5PFZlaGljbGVEYXRhPiA9IFtdO1xyXG5cclxuICAgIGlmKGRhdGEuVlZfVE1fUFVTSC5LVjZwb3NpbmZvKSB7XHJcbiAgICAgIGNvbnN0IGt2NnBvc2luZm8gPSBkYXRhLlZWX1RNX1BVU0guS1Y2cG9zaW5mbztcclxuICAgICAgaWYoT2JqZWN0LmtleXMoa3Y2cG9zaW5mbykubGVuZ3RoID4gMClcclxuICAgICAgICBPYmplY3Qua2V5cyhrdjZwb3NpbmZvKS5mb3JFYWNoKFZlaGljbGVTdGF0dXNDb2RlID0+IHtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYoQXJyYXkuaXNBcnJheShrdjZwb3NpbmZvW1ZlaGljbGVTdGF0dXNDb2RlXSkpIHtcclxuICAgICAgICAgICAgZm9yKGNvbnN0IHZlaGljbGVEYXRhIG9mIGt2NnBvc2luZm9bVmVoaWNsZVN0YXR1c0NvZGVdKSB7XHJcbiAgICAgICAgICAgICAgLy9UT0RPOiBUaGlzIG1heWJlIGlzIHN0dXBpZC4gQ2F1c2VzIHR5cGVzIHdpdGhvdXQgdmVoaWNsZU51bWJlciB0byBub3QgYXBwZWFyLlxyXG4gICAgICAgICAgICAgIGlmKCF2ZWhpY2xlRGF0YS52ZWhpY2xlbnVtYmVyKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICByZXR1cm5EYXRhLnB1c2godGhpcy5NYXBwZXIodmVoaWNsZURhdGEsIFZlaGljbGVTdGF0dXNDb2RlKSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIGlmKGt2NnBvc2luZm9bVmVoaWNsZVN0YXR1c0NvZGVdLnZlaGljbGVudW1iZXIpIFxyXG4gICAgICAgICAgICByZXR1cm5EYXRhLnB1c2godGhpcy5NYXBwZXIoa3Y2cG9zaW5mb1tWZWhpY2xlU3RhdHVzQ29kZV0sIFZlaGljbGVTdGF0dXNDb2RlKSkgICAgIFxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJldHVybkRhdGE7XHJcblxyXG4gIH1cclxuICAvKiogXHJcbiAgKiBUaGlzIGlzIHRoZSBzZWNvbmRhcnkgZGVjb2RpbmcgZnVuY3Rpb24uIEl0IHdvcmtzIGZvciBLZW9saXMgYW5kIEdWQlxyXG4gICogQHBhcmFtIGRhdGEgVGhlIHJlcXVpcmVkIGRhdGEuIEl0IHNob3VsZCBiZSBvZiB0eXBlIFwiS1Y2R2VuZXJpY1wiLCB3aGljaCB3b3JrcyBmb3IgdGhlIGNvbXBhbmllcyBtZW50aW9uZWQgYWJvdmUuXHJcbiAgKiBAcmV0dXJucyBBbiBhcnJheSB3aXRoIHRoZSBjb252ZXJ0ZWQgdmVoaWNsZWRhdGEuXHJcbiAgKi9cclxuICBEZWNvZGVPdGhlcihkYXRhKSA6IEFycmF5PFZlaGljbGVEYXRhPiB7XHJcbiAgICBjb25zdCByZXR1cm5EYXRhIDogQXJyYXk8VmVoaWNsZURhdGE+ID0gW107XHJcbiAgICBcclxuXHJcbiAgICBpZihkYXRhLlZWX1RNX1BVU0guS1Y2cG9zaW5mbykge1xyXG4gICAgICBjb25zdCBrdjZwb3NpbmZvID0gZGF0YS5WVl9UTV9QVVNILktWNnBvc2luZm87XHJcbiAgICAgIGlmKEFycmF5LmlzQXJyYXkoa3Y2cG9zaW5mbykpIHtcclxuICAgICAgICBmb3IoY29uc3QgU3RhdHVzT2JqZWN0IG9mIGt2NnBvc2luZm8pIHtcclxuICAgICAgICAgIGNvbnN0IFZlaGljbGVTdGF0dXNDb2RlID0gT2JqZWN0LmtleXMoU3RhdHVzT2JqZWN0KVswXTtcclxuICAgICAgICAgIHJldHVybkRhdGEucHVzaCh0aGlzLk1hcHBlcihTdGF0dXNPYmplY3RbVmVoaWNsZVN0YXR1c0NvZGVdLCBWZWhpY2xlU3RhdHVzQ29kZSkpXHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnN0IFZlaGljbGVTdGF0dXNDb2RlID0gT2JqZWN0LmtleXMoa3Y2cG9zaW5mbylbMF07XHJcbiAgICAgICAgcmV0dXJuRGF0YS5wdXNoKHRoaXMuTWFwcGVyKGt2NnBvc2luZm9bVmVoaWNsZVN0YXR1c0NvZGVdLCBWZWhpY2xlU3RhdHVzQ29kZSkpXHJcbiAgICAgIH1cclxuICAgIH0gXHJcblxyXG4gICAgcmV0dXJuIHJldHVybkRhdGE7XHJcbiAgfVxyXG5cclxuICBDaGVja0NvbXBhbnkob3BlcmF0b3IgOiBzdHJpbmcpIDogc3RyaW5nIHtcclxuICAgIGxldCByZXR1cm5Db21wYW55IDogc3RyaW5nO1xyXG4gICAgT2JqZWN0LnZhbHVlcyhDb21wYW5pZXMpLmZvckVhY2goY29tcGFueSA9PiB7XHJcbiAgICAgIGlmKG9wZXJhdG9yLmluY2x1ZGVzKGNvbXBhbnkpKSByZXR1cm5Db21wYW55ID0gY29tcGFueTtcclxuICAgIH0pXHJcbiAgICByZXR1cm4gcmV0dXJuQ29tcGFueTtcclxuICB9XHJcblxyXG4gIE1hcHBlcih2ZWhpY2xlUG9zRGF0YSwgc3RhdHVzIDogc3RyaW5nKSB7IFxyXG4gICAgY29uc3QgbmV3RGF0YSA9IHtcclxuICAgICAgY29tcGFueTogdmVoaWNsZVBvc0RhdGEuZGF0YW93bmVyY29kZSxcclxuICAgICAgb3JpZ2luYWxDb21wYW55OiB2ZWhpY2xlUG9zRGF0YS5kYXRhb3duZXJjb2RlLFxyXG4gICAgICBwbGFubmluZ051bWJlcjogdmVoaWNsZVBvc0RhdGEubGluZXBsYW5uaW5nbnVtYmVyLnRvU3RyaW5nKCksXHJcbiAgICAgIGpvdXJuZXlOdW1iZXI6IHZlaGljbGVQb3NEYXRhLmpvdXJuZXludW1iZXIsXHJcbiAgICAgIHRpbWVzdGFtcDogRGF0ZS5wYXJzZSh2ZWhpY2xlUG9zRGF0YS50aW1lc3RhbXApLFxyXG4gICAgICB2ZWhpY2xlTnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS52ZWhpY2xlbnVtYmVyID8gdmVoaWNsZVBvc0RhdGEudmVoaWNsZW51bWJlciA6IDk5OTk5OSxcclxuICAgICAgbGluZU51bWJlcjogXCJPbmJla2VuZFwiLFxyXG4gICAgICBwb3NpdGlvbjogdGhpcy5yZFRvTGF0TG9uZyh2ZWhpY2xlUG9zRGF0YVsncmQteCddLCB2ZWhpY2xlUG9zRGF0YVsncmQteSddKSxcclxuICAgICAgcHVuY3R1YWxpdHk6IFt2ZWhpY2xlUG9zRGF0YS5wdW5jdHVhbGl0eV0sXHJcbiAgICAgIHN0YXR1czogdmVoaWNsZVN0YXRlW3N0YXR1c10sXHJcbiAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICB1cGRhdGVkVGltZXM6IFtEYXRlLm5vdygpXSxcclxuICAgICAgY3VycmVudFJvdXRlSWQ6IDAsXHJcbiAgICAgIGN1cnJlbnRUcmlwSWQ6IDBcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbmV3RGF0YTtcclxuICB9IFxyXG5cclxuICBcclxuICByZFRvTGF0TG9uZyAoeCwgeSkgOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgIGlmKHggPT09IHVuZGVmaW5lZCB8fCB5ID09PSB1bmRlZmluZWQpIHJldHVybiBbMCwgMF07XHJcbiAgICBcclxuICAgIGNvbnN0IGRYID0gKHggLSAxNTUwMDApICogTWF0aC5wb3coMTAsIC01KTtcclxuICAgIGNvbnN0IGRZID0gKHkgLSA0NjMwMDApICogTWF0aC5wb3coMTAsIC01KTtcclxuICAgIGNvbnN0IFNvbU4gPSAoMzIzNS42NTM4OSAqIGRZKSArICgtMzIuNTgyOTcgKiBNYXRoLnBvdyhkWCwgMikpICsgKC0wLjI0NzUgKlxyXG4gICAgICBNYXRoLnBvdyhkWSwgMikpICsgKC0wLjg0OTc4ICogTWF0aC5wb3coZFgsIDIpICpcclxuICAgICAgZFkpICsgKC0wLjA2NTUgKiBNYXRoLnBvdyhkWSwgMykpICsgKC0wLjAxNzA5ICpcclxuICAgICAgTWF0aC5wb3coZFgsIDIpICogTWF0aC5wb3coZFksIDIpKSArICgtMC4wMDczOCAqXHJcbiAgICAgIGRYKSArICgwLjAwNTMgKiBNYXRoLnBvdyhkWCwgNCkpICsgKC0wLjAwMDM5ICpcclxuICAgICAgTWF0aC5wb3coZFgsIDIpICogTWF0aC5wb3coZFksIDMpKSArICgwLjAwMDMzICogTWF0aC5wb3coXHJcbiAgICAgIGRYLCA0KSAqIGRZKSArICgtMC4wMDAxMiAqXHJcbiAgICAgIGRYICogZFkpO1xyXG4gICAgY29uc3QgU29tRSA9ICg1MjYwLjUyOTE2ICogZFgpICsgKDEwNS45NDY4NCAqIGRYICogZFkpICsgKDIuNDU2NTYgKlxyXG4gICAgICBkWCAqIE1hdGgucG93KGRZLCAyKSkgKyAoLTAuODE4ODUgKiBNYXRoLnBvdyhcclxuICAgICAgZFgsIDMpKSArICgwLjA1NTk0ICpcclxuICAgICAgZFggKiBNYXRoLnBvdyhkWSwgMykpICsgKC0wLjA1NjA3ICogTWF0aC5wb3coXHJcbiAgICAgIGRYLCAzKSAqIGRZKSArICgwLjAxMTk5ICpcclxuICAgICAgZFkpICsgKC0wLjAwMjU2ICogTWF0aC5wb3coZFgsIDMpICogTWF0aC5wb3coXHJcbiAgICAgIGRZLCAyKSkgKyAoMC4wMDEyOCAqXHJcbiAgICAgIGRYICogTWF0aC5wb3coZFksIDQpKSArICgwLjAwMDIyICogTWF0aC5wb3coZFksXHJcbiAgICAgIDIpKSArICgtMC4wMDAyMiAqIE1hdGgucG93KFxyXG4gICAgICBkWCwgMikpICsgKDAuMDAwMjYgKlxyXG4gICAgICBNYXRoLnBvdyhkWCwgNSkpO1xyXG4gICAgXHJcbiAgICBjb25zdCBMYXRpdHVkZSA9IDUyLjE1NTE3ICsgKFNvbU4gLyAzNjAwKTtcclxuICAgIGNvbnN0IExvbmdpdHVkZSA9IDUuMzg3MjA2ICsgKFNvbUUgLyAzNjAwKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIFtMb25naXR1ZGUsIExhdGl0dWRlXVxyXG4gIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBDb25uZWN0aW9uLCBNb2RlbCwgTW9uZ29vc2UsIEZpbHRlclF1ZXJ5LCBTY2hlbWEgfSBmcm9tICdtb25nb29zZSc7XHJcbmltcG9ydCB7IFRyaXAgfSBmcm9tICcuL3R5cGVzL1RyaXAnO1xyXG5pbXBvcnQgeyBWZWhpY2xlRGF0YSwgdmVoaWNsZVN0YXRlIH0gZnJvbSAnLi90eXBlcy9WZWhpY2xlRGF0YSc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBSb3V0ZSB9IGZyb20gJy4vdHlwZXMvUm91dGUnO1xyXG5pbXBvcnQgeyBUcmlwUG9zaXRpb25EYXRhIH0gZnJvbSAnLi90eXBlcy9UcmlwUG9zaXRpb25EYXRhJztcclxuaW1wb3J0IHsgV2Vic29ja2V0VmVoaWNsZURhdGEgfSBmcm9tICcuL3R5cGVzL1dlYnNvY2tldFZlaGljbGVEYXRhJztcclxuY29uc3Qgc3RyZWFtVG9Nb25nb0RCID0gcmVxdWlyZSgnc3RyZWFtLXRvLW1vbmdvLWRiJykuc3RyZWFtVG9Nb25nb0RCO1xyXG5jb25zdCBzcGxpdCA9IHJlcXVpcmUoJ3NwbGl0Jyk7XHJcbmV4cG9ydCBjbGFzcyBEYXRhYmFzZSB7XHJcbiAgXHJcbiAgcHJpdmF0ZSBzdGF0aWMgaW5zdGFuY2UgOiBEYXRhYmFzZTtcclxuICBcclxuICBwcml2YXRlIGRiIDogQ29ubmVjdGlvbjtcclxuICBwcml2YXRlIG1vbmdvb3NlIDogTW9uZ29vc2U7XHJcbiAgcHJpdmF0ZSB2ZWhpY2xlU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgdHJpcHNTY2hlbWEgOiBTY2hlbWE7XHJcbiAgcHJpdmF0ZSByb3V0ZXNTY2hlbWEgOiBTY2hlbWE7XHJcbiAgcHJpdmF0ZSBkcml2ZW5Sb3V0ZXNTY2hlbWEgOiBTY2hlbWE7XHJcbiAgcHJpdmF0ZSB2ZWhpY2xlTW9kZWwgOiB0eXBlb2YgTW9kZWw7XHJcbiAgcHJpdmF0ZSB0cmlwTW9kZWwgOiB0eXBlb2YgTW9kZWw7XHJcbiAgcHJpdmF0ZSByb3V0ZXNNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIGRyaXZlblJvdXRlc01vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgb3V0cHV0REJDb25maWc7XHJcblxyXG4gIHB1YmxpYyBzdGF0aWMgZ2V0SW5zdGFuY2UoKTogRGF0YWJhc2Uge1xyXG4gICAgaWYoIURhdGFiYXNlLmluc3RhbmNlKVxyXG4gICAgICBEYXRhYmFzZS5pbnN0YW5jZSA9IG5ldyBEYXRhYmFzZSgpO1xyXG5cclxuICAgIHJldHVybiBEYXRhYmFzZS5pbnN0YW5jZTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBJbml0KCkge1xyXG4gICAgY29uc3QgdXJsIDogc3RyaW5nID0gcHJvY2Vzcy5lbnYuREFUQUJBU0VfVVJMO1xyXG4gICAgY29uc3QgbmFtZSA6IHN0cmluZyA9IHByb2Nlc3MuZW52LkRBVEFCQVNFX05BTUU7XHJcblxyXG4gICAgdGhpcy5tb25nb29zZSA9IG5ldyBNb25nb29zZSgpO1xyXG4gICAgXHJcbiAgICB0aGlzLm1vbmdvb3NlLnNldCgndXNlRmluZEFuZE1vZGlmeScsIGZhbHNlKVxyXG5cclxuICAgIGlmKCF1cmwgJiYgIW5hbWUpIHRocm93IChgSW52YWxpZCBVUkwgb3IgbmFtZSBnaXZlbiwgcmVjZWl2ZWQ6IFxcbiBOYW1lOiAke25hbWV9IFxcbiBVUkw6ICR7dXJsfWApXHJcblxyXG4gICAgY29uc29sZS5sb2coYENvbm5lY3RpbmcgdG8gZGF0YWJhc2Ugd2l0aCBuYW1lOiAke25hbWV9IGF0IHVybDogJHt1cmx9YClcclxuICAgIHRoaXMubW9uZ29vc2UuY29ubmVjdChgJHt1cmx9LyR7bmFtZX1gLCB7XHJcbiAgICAgIHVzZU5ld1VybFBhcnNlcjogdHJ1ZSxcclxuICAgICAgdXNlVW5pZmllZFRvcG9sb2d5OiB0cnVlLFxyXG4gICAgICBwb29sU2l6ZTogMTIwXHJcbiAgICB9KVxyXG5cclxuICAgIHRoaXMuZGIgPSB0aGlzLm1vbmdvb3NlLmNvbm5lY3Rpb247XHJcblxyXG4gICAgdGhpcy5vdXRwdXREQkNvbmZpZyA9IHsgZGJVUkwgOiBgJHt1cmx9LyR7bmFtZX1gLCBjb2xsZWN0aW9uIDogJ3RyaXBzJyB9O1xyXG5cclxuICAgIHRoaXMuZGIub24oJ2Vycm9yJywgZXJyb3IgPT4ge1xyXG4gICAgICB0aHJvdyBuZXcgZXJyb3IoYEVycm9yIGNvbm5lY3RpbmcgdG8gZGF0YWJhc2UuICR7ZXJyb3J9YCk7XHJcbiAgICB9KVxyXG5cclxuICAgIGF3YWl0IHRoaXMuRGF0YWJhc2VMaXN0ZW5lcigpO1xyXG5cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIEdldERhdGFiYXNlKCkgOiBDb25uZWN0aW9uIHtcclxuICAgIHJldHVybiB0aGlzLmRiO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIERhdGFiYXNlTGlzdGVuZXIgKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMsIHJlaikgPT4ge1xyXG4gICAgICAgIHRoaXMuZGIub25jZShcIm9wZW5cIiwgKCkgPT4ge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0aW9uIHRvIGRhdGFiYXNlIGVzdGFibGlzaGVkLlwiKVxyXG5cclxuICAgICAgICAgIHRoaXMudmVoaWNsZVNjaGVtYSA9IG5ldyB0aGlzLm1vbmdvb3NlLlNjaGVtYSh7XHJcbiAgICAgICAgICAgIGNvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgb3JpZ2luYWxDb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHBsYW5uaW5nTnVtYmVyOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIGpvdXJuZXlOdW1iZXI6IE51bWJlcixcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHZlaGljbGVOdW1iZXI6IE51bWJlcixcclxuICAgICAgICAgICAgcG9zaXRpb246IFtOdW1iZXIsIE51bWJlcl0sXHJcbiAgICAgICAgICAgIHN0YXR1czogU3RyaW5nLFxyXG4gICAgICAgICAgICBsaW5lTnVtYmVyOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHB1bmN0dWFsaXR5OiBBcnJheSxcclxuICAgICAgICAgICAgY3JlYXRlZEF0OiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHVwZGF0ZWRBdDogTnVtYmVyLFxyXG4gICAgICAgICAgICB1cGRhdGVkVGltZXM6IEFycmF5LFxyXG4gICAgICAgICAgICBjdXJyZW50Um91dGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICBjdXJyZW50VHJpcElkOiBOdW1iZXIsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgdGhpcy50cmlwc1NjaGVtYSA9IG5ldyB0aGlzLm1vbmdvb3NlLlNjaGVtYSh7XHJcbiAgICAgICAgICAgIGNvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICBzZXJ2aWNlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgdHJpcElkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRyaXBOdW1iZXI6IE51bWJlcixcclxuICAgICAgICAgICAgdHJpcFBsYW5uaW5nTnVtYmVyOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHRyaXBIZWFkc2lnbjogU3RyaW5nLFxyXG4gICAgICAgICAgICB0cmlwTmFtZTogU3RyaW5nLFxyXG4gICAgICAgICAgICBkaXJlY3Rpb25JZDogTnVtYmVyLFxyXG4gICAgICAgICAgICBzaGFwZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHdoZWVsY2hhaXJBY2Nlc3NpYmxlOiBOdW1iZXJcclxuICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgdGhpcy5yb3V0ZXNTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICByb3V0ZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIGNvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgc3ViQ29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZVNob3J0TmFtZTogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZUxvbmdOYW1lOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlRGVzY3JpcHRpb246IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVUeXBlOiBOdW1iZXIsXHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIHRoaXMuZHJpdmVuUm91dGVzU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgdHJpcElkIDogTnVtYmVyLFxyXG4gICAgICAgICAgICBjb21wYW55IDogU3RyaW5nLFxyXG4gICAgICAgICAgICBwb3NpdGlvbnM6IEFycmF5LFxyXG4gICAgICAgICAgICB1cGRhdGVkVGltZXMgOiBBcnJheVxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLnRyaXBzU2NoZW1hLmluZGV4KHsgdHJpcE51bWJlcjogLTEsIHRyaXBQbGFubmluZ051bWJlcjogLTEsIGNvbXBhbnk6IC0xIH0pXHJcbiAgICAgICAgICB0aGlzLmRyaXZlblJvdXRlc1NjaGVtYS5pbmRleCh7IHRyaXBJZDogLTEsIGNvbXBhbnk6IC0xIH0pXHJcblxyXG4gICAgICAgICAgdGhpcy52ZWhpY2xlTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwiVmVoaWNsZVBvc2l0aW9uc1wiLCB0aGlzLnZlaGljbGVTY2hlbWEpO1xyXG4gICAgICAgICAgdGhpcy50cmlwTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwidHJpcHNcIiwgdGhpcy50cmlwc1NjaGVtYSk7XHJcbiAgICAgICAgICB0aGlzLnJvdXRlc01vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcInJvdXRlc1wiLCB0aGlzLnJvdXRlc1NjaGVtYSk7XHJcbiAgICAgICAgICB0aGlzLmRyaXZlblJvdXRlc01vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcImRyaXZlbnJvdXRlc1wiLCB0aGlzLmRyaXZlblJvdXRlc1NjaGVtYSk7XHJcblxyXG4gICAgICAgICAgdGhpcy50cmlwTW9kZWwuY3JlYXRlSW5kZXhlcygpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZXMoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSlcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRBbGxWZWhpY2xlcyAoYXJncyA9IHt9KSA6IFByb21pc2U8QXJyYXk8VmVoaWNsZURhdGE+PiB7XHJcbiAgICByZXR1cm4gYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZCh7Li4uYXJnc30sIHsgcHVuY3R1YWxpdHk6IDAsIHVwZGF0ZWRUaW1lczogMCwgX192IDogMCB9KTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRBbGxWZWhpY2xlc1NtYWxsIChhcmdzID0ge30pIDogUHJvbWlzZTxBcnJheTxXZWJzb2NrZXRWZWhpY2xlRGF0YT4+IHtcclxuICAgIGNvbnN0IHNtYWxsQnVzc2VzIDogQXJyYXk8V2Vic29ja2V0VmVoaWNsZURhdGE+ID0gW107XHJcblxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZCh7Li4uYXJnc30sXHJcbiAgICAgIHsgXHJcbiAgICAgIHB1bmN0dWFsaXR5OiAwLCBcclxuICAgICAgdXBkYXRlZFRpbWVzOiAwLCBcclxuICAgICAgX192IDogMCxcclxuICAgICAgam91cm5leU51bWJlcjogMCxcclxuICAgICAgdGltZXN0YW1wIDogMCxcclxuICAgICAgY3JlYXRlZEF0OiAwLFxyXG4gICAgICB1cGRhdGVkQXQ6IDAsXHJcbiAgICAgIGN1cnJlbnRSb3V0ZUlkOiAwLFxyXG4gICAgICBjdXJyZW50VHJpcElkOiAwLFxyXG4gICAgICBwbGFubmluZ051bWJlcjogMCxcclxuICAgICAgc3RhdHVzOiAwXHJcbiAgICB9KVxyXG5cclxuICAgIHJlc3VsdC5mb3JFYWNoKHJlcyA9PiB7XHJcbiAgICAgIHNtYWxsQnVzc2VzLnB1c2goe1xyXG4gICAgICAgIHA6IHJlcy5wb3NpdGlvbixcclxuICAgICAgICBjOiByZXMuY29tcGFueSxcclxuICAgICAgICB2OiByZXMudmVoaWNsZU51bWJlcixcclxuICAgICAgICBuOiByZXMubGluZU51bWJlclxyXG4gICAgICB9KVxyXG4gICAgfSlcclxuXHJcbiAgICByZXR1cm4gc21hbGxCdXNzZXM7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0VmVoaWNsZSAodmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIsIGZpcnN0T25seSA6IGJvb2xlYW4gPSBmYWxzZSkgOiBQcm9taXNlPFZlaGljbGVEYXRhPiB7XHJcbiAgICByZXR1cm4geyBcclxuICAgICAgLi4uYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZSh7XHJcbiAgICAgICAgdmVoaWNsZU51bWJlciA6IHZlaGljbGVOdW1iZXIsXHJcbiAgICAgICAgY29tcGFueTogdHJhbnNwb3J0ZXJcclxuICAgICAgfSlcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgVmVoaWNsZUV4aXN0cyh2ZWhpY2xlTnVtYmVyLCB0cmFuc3BvcnRlcikgOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIHJldHVybiBhd2FpdCB0aGlzLkdldFZlaGljbGUodmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIpICE9PSBudWxsO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFVwZGF0ZVZlaGljbGUgKHZlaGljbGVUb1VwZGF0ZSA6IGFueSwgdXBkYXRlZFZlaGljbGVEYXRhIDogVmVoaWNsZURhdGEsIHBvc2l0aW9uQ2hlY2tzIDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZUFuZFVwZGF0ZSh2ZWhpY2xlVG9VcGRhdGUsIHVwZGF0ZWRWZWhpY2xlRGF0YSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgQWRkVmVoaWNsZSAodmVoaWNsZSA6IFZlaGljbGVEYXRhKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgbmV3IHRoaXMudmVoaWNsZU1vZGVsKHtcclxuICAgICAgLi4udmVoaWNsZSxcclxuICAgICAgcHVuY3R1YWxpdHkgOiB2ZWhpY2xlLnB1bmN0dWFsaXR5XHJcbiAgICB9KS5zYXZlKGVycm9yID0+IHtcclxuICAgICAgaWYoZXJyb3IpIGNvbnNvbGUuZXJyb3IoYFNvbWV0aGluZyB3ZW50IHdyb25nIHdoaWxlIHRyeWluZyB0byBhZGQgdmVoaWNsZTogJHt2ZWhpY2xlLnZlaGljbGVOdW1iZXJ9LiBFcnJvcjogJHtlcnJvcn1gKVxyXG4gICAgfSlcclxuICB9XHJcbiAgXHJcbiAgcHVibGljIGFzeW5jIFJlbW92ZVZlaGljbGUgKHZlaGljbGUgOiBWZWhpY2xlRGF0YSkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKCF2ZWhpY2xlW1wiX2RvY1wiXSkgcmV0dXJuXHJcblxyXG4gICAgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZUFuZERlbGV0ZSh2ZWhpY2xlKVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFJlbW92ZVZlaGljbGVzV2hlcmUoIHBhcmFtcyA6IG9iamVjdCwgZG9Mb2dnaW5nIDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8QXJyYXk8VmVoaWNsZURhdGE+PiB7XHJcbiAgICBjb25zdCByZW1vdmVkVmVoaWNsZXMgOiBBcnJheTxWZWhpY2xlRGF0YT4gPSBhd2FpdCB0aGlzLkdldEFsbFZlaGljbGVzKHBhcmFtcyk7XHJcbiAgICB0aGlzLnZlaGljbGVNb2RlbC5kZWxldGVNYW55KHBhcmFtcykudGhlbihyZXNwb25zZSA9PiB7XHJcbiAgICAgIGlmKGRvTG9nZ2luZykgY29uc29sZS5sb2coYERlbGV0ZWQgJHtyZXNwb25zZS5kZWxldGVkQ291bnR9IHZlaGljbGVzLmApO1xyXG4gICAgICBcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHJlbW92ZWRWZWhpY2xlcztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRUcmlwcyhwYXJhbXMgOiBvYmplY3QgPSB7fSkgOiBQcm9taXNlPEFycmF5PFRyaXA+PiB7XHJcbiAgICByZXR1cm4gYXdhaXQgdGhpcy50cmlwTW9kZWwuZmluZChwYXJhbXMpXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0VHJpcCh0cmlwTnVtYmVyIDogbnVtYmVyLCB0cmlwUGxhbm5pbmdOdW1iZXIgOiBzdHJpbmcsIGNvbXBhbnkgOiBzdHJpbmcpIHtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMudHJpcE1vZGVsLmZpbmRPbmUoe1xyXG4gICAgICBjb21wYW55OiBjb21wYW55LFxyXG4gICAgICB0cmlwTnVtYmVyIDogdHJpcE51bWJlcixcclxuICAgICAgdHJpcFBsYW5uaW5nTnVtYmVyOiB0cmlwUGxhbm5pbmdOdW1iZXJcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiByZXNwb25zZSAhPT0gbnVsbCA/IHJlc3BvbnNlIDoge307XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgUmVtb3ZlVHJpcChwYXJhbXMgOiBvYmplY3QgPSB7fSwgZG9Mb2dnaW5nIDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy50cmlwTW9kZWwuZGVsZXRlTWFueShwYXJhbXMpLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICBpZihkb0xvZ2dpbmcpIGNvbnNvbGUubG9nKGBEZWxldGVkICR7cmVzcG9uc2UuZGVsZXRlZENvdW50fSB0cmlwc2ApO1xyXG4gICAgfSlcclxuICB9XHJcbiAgLyoqXHJcbiAgICogSW5zZXJ0cyBtYW55IHRyaXBzIGF0IG9uY2UgaW50byB0aGUgZGF0YWJhc2UuXHJcbiAgICogQHBhcmFtIHRyaXBzIFRoZSB0cmlwcyB0byBhZGQuXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIEluc2VydE1hbnlUcmlwcyh0cmlwcykgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgYXdhaXQgdGhpcy50cmlwTW9kZWwuaW5zZXJ0TWFueSh0cmlwcywgeyBvcmRlcmVkOiBmYWxzZSB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSBcIktvcHBlbHZsYWsgNyBhbmQgOCB0dXJib1wiIGZpbGVzIHRvIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBJbnNlcnRUcmlwKHRyaXAgOiBUcmlwKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgbmV3IHRoaXMudHJpcE1vZGVsKHRyaXApLnNhdmUoZXJyb3IgPT4ge1xyXG4gICAgICBpZihlcnJvcikgY29uc29sZS5lcnJvcihgU29tZXRoaW5nIHdlbnQgd3Jvbmcgd2hpbGUgdHJ5aW5nIHRvIGFkZCB0cmlwOiAke3RyaXAudHJpcEhlYWRzaWdufS4gRXJyb3I6ICR7ZXJyb3J9YClcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgRHJvcFRyaXBzQ29sbGVjdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBpbmcgdHJpcHMgY29sbGVjdGlvblwiKTtcclxuICAgIGF3YWl0IHRoaXMudHJpcE1vZGVsLnJlbW92ZSh7fSk7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwZWQgdHJpcHMgY29sbGVjdGlvblwiKTtcclxuICB9XHJcbiAgcHVibGljIGFzeW5jIERyb3BSb3V0ZXNDb2xsZWN0aW9uKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGluZyByb3V0ZXMgY29sbGVjdGlvblwiKTtcclxuICAgIGF3YWl0IHRoaXMucm91dGVzTW9kZWwucmVtb3ZlKHt9KTtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBlZCByb3V0ZXMgY29sbGVjdGlvblwiKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRSb3V0ZShyb3V0ZUlkIDogbnVtYmVyKSA6IFByb21pc2U8Um91dGU+IHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5yb3V0ZXNNb2RlbC5maW5kT25lKHtcclxuICAgICAgcm91dGVJZCA6IHJvdXRlSWQsXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcmVzcG9uc2UgIT09IG51bGwgPyByZXNwb25zZSA6IHt9O1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFVwZGF0ZVRyaXBQb3NpdGlvbnModHJpcElkLCBjb21wYW55LCB0cmlwRGF0YSA6IFRyaXBQb3NpdGlvbkRhdGEpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLmRyaXZlblJvdXRlc01vZGVsLmZpbmRPbmVBbmRVcGRhdGUoXHJcbiAgICAgIHtcclxuICAgICAgICB0cmlwSWQgOiB0cmlwSWQsXHJcbiAgICAgICAgY29tcGFueSA6IGNvbXBhbnlcclxuICAgICAgfSwgXHJcbiAgICAgIHRyaXBEYXRhLCBcclxuICAgICAgeyB1cHNlcnQgOiB0cnVlIH1cclxuICAgIClcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRUcmlwUG9zaXRpb25zKHRyaXBJZCA6IG51bWJlciwgY29tcGFueSA6IHN0cmluZykgOiBQcm9taXNlPFRyaXBQb3NpdGlvbkRhdGE+IHtcclxuICAgIHJldHVybiBhd2FpdCB0aGlzLmRyaXZlblJvdXRlc01vZGVsLmZpbmRPbmUoeyBcclxuICAgICAgdHJpcElkOiB0cmlwSWQsXHJcbiAgICAgIGNvbXBhbnk6IGNvbXBhbnksXHJcbiAgICB9KVxyXG5cclxuXHJcbiAgfVxyXG5cclxuICAvLyBwdWJsaWMgYXN5bmMgQWRkUm91dGUoKVxyXG5cclxufVxyXG4iLCIvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBBUFAgQ09ORklHXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5cclxuaW1wb3J0ICogYXMgZG90ZW52IGZyb20gJ2RvdGVudic7XHJcbmRvdGVudi5jb25maWcoKTtcclxuXHJcbmNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDMwMDI7XHJcblxyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBZQVJOIElNUE9SVFNcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcbmltcG9ydCAqIGFzIGh0dHBzIGZyb20gJ2h0dHBzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5cclxuY29uc3QgZXhwcmVzcyA9IHJlcXVpcmUoXCJleHByZXNzXCIpO1xyXG5jb25zdCBjb3JzID0gcmVxdWlyZShcImNvcnNcIik7XHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICBDVVNUT00gSU1QT1JUU1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuXHJcbmltcG9ydCB7IERhdGFiYXNlIH0gZnJvbSAnLi9kYXRhYmFzZSc7XHJcbmltcG9ydCB7IFdlYnNvY2tldCB9IGZyb20gJy4vc29ja2V0JztcclxuaW1wb3J0IHsgT1ZEYXRhIH0gZnJvbSAnLi9yZWFsdGltZSc7XHJcblxyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBTU0wgQ09ORklHXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5jb25zdCBwcml2YXRlS2V5ID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9rZXkua2V5XCIpLnRvU3RyaW5nKCk7XHJcbmNvbnN0IGNlcnRpZmljYXRlID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9jZXJ0LmNydFwiKS50b1N0cmluZygpO1xyXG5jb25zdCBjYSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUva2V5LWNhLmNydFwiKS50b1N0cmluZygpO1xyXG5cclxuY29uc3QgQXBwSW5pdCA9IGFzeW5jICgpID0+IHtcclxuICBjb25zdCBkYiA9IGF3YWl0IERhdGFiYXNlLmdldEluc3RhbmNlKCkuSW5pdCgpLnRoZW4oKTtcclxuICBcclxuICBjb25zdCBhcHAgPSAobW9kdWxlLmV4cG9ydHMgPSBleHByZXNzKCkpO1xyXG5cclxuICBjb25zdCBzZXJ2ZXIgPSBodHRwcy5jcmVhdGVTZXJ2ZXIoXHJcbiAgICB7XHJcbiAgICAgIGtleTogcHJpdmF0ZUtleSxcclxuICAgICAgY2VydDogY2VydGlmaWNhdGUsXHJcbiAgICAgIGNhOiBjYSxcclxuICAgICAgcmVxdWVzdENlcnQ6IHRydWUsXHJcbiAgICAgIHJlamVjdFVuYXV0aG9yaXplZDogZmFsc2UsXHJcbiAgICB9LFxyXG4gICAgYXBwXHJcbiAgKTtcclxuICBcclxuXHJcbiAgLy9USElTIElTIE5PVCBTQUZFXHJcblxyXG4gIGNvbnN0IGNvcnNPcHRpb25zID0ge1xyXG4gICAgb3JpZ2luOiAnKicsXHJcbiAgICBvcHRpb25zU3VjY2Vzc1N0YXR1czogMjAwXHJcbiAgfVxyXG5cclxuICBhcHAudXNlKGNvcnMoY29yc09wdGlvbnMpKVxyXG4gIGFwcC5vcHRpb25zKCcqJywgY29ycygpKVxyXG5cclxuXHJcbiAgY29uc3Qgc29ja2V0ID0gbmV3IFdlYnNvY2tldChzZXJ2ZXIsIGRiKTtcclxuICBjb25zdCBvdiA9IG5ldyBPVkRhdGEoZGIsIHNvY2tldCk7XHJcbiAgLy9idXNMb2dpYy5Jbml0S1Y3OCgpO1xyXG4gIFxyXG4gIHNlcnZlci5saXN0ZW4ocG9ydCwgKCkgPT4gY29uc29sZS5sb2coYExpc3RlbmluZyBhdCBodHRwOi8vbG9jYWxob3N0OiR7cG9ydH1gKSk7XHJcblxyXG59XHJcblxyXG5BcHBJbml0KCk7XHJcbiIsImltcG9ydCB7IGd1bnppcCB9IGZyb20gJ3psaWInO1xyXG5pbXBvcnQgeyBDb252ZXJ0ZXIgfSBmcm9tICcuL2NvbnZlcnRlcic7XHJcbmltcG9ydCB7IEJ1c0xvZ2ljIH0gZnJvbSBcIi4vYnVzbG9naWNcIjtcclxuXHJcbmltcG9ydCAqIGFzIHhtbCBmcm9tICdmYXN0LXhtbC1wYXJzZXInO1xyXG5pbXBvcnQgeyBXZWJzb2NrZXQgfSBmcm9tIFwiLi9zb2NrZXRcIjtcclxuXHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tICcuL2RhdGFiYXNlJztcclxuXHJcbi8vIGNvbnN0IHptcSA9IHJlcXVpcmUoJ3plcm9tcScpO1xyXG5pbXBvcnQgKiBhcyB6bXEgZnJvbSAnemVyb21xJztcclxuaW1wb3J0IHsgVmVoaWNsZURhdGEgfSBmcm9tICcuL3R5cGVzL1ZlaGljbGVEYXRhJztcclxuZXhwb3J0IGNsYXNzIE9WRGF0YSB7XHJcbiAgXHJcbiAgcHJpdmF0ZSBidXNTb2NrZXQgOiB6bXEuU29ja2V0O1xyXG4gIHByaXZhdGUgdHJhaW5Tb2NrZXQgOiB6bXEuU29ja2V0O1xyXG4gIC8vcHJpdmF0ZSBrdjc4c29ja2V0O1xyXG4gIHByaXZhdGUgYnVzTG9naWMgOiBCdXNMb2dpYztcclxuICBwcml2YXRlIHdlYnNvY2tldCA6IFdlYnNvY2tldDtcclxuXHJcbiAgY29uc3RydWN0b3IoZGF0YWJhc2UgOiBEYXRhYmFzZSwgc29ja2V0IDogV2Vic29ja2V0KSB7XHJcbiAgICB0aGlzLndlYnNvY2tldCA9IHNvY2tldDtcclxuICAgIHRoaXMuSW5pdCgpO1xyXG4gICAgdGhpcy5idXNMb2dpYyA9IG5ldyBCdXNMb2dpYyhkYXRhYmFzZSwgZmFsc2UpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIEluaXQoKSB7XHJcblxyXG4gICAgY29uc3QgY29udmVydGVyID0gbmV3IENvbnZlcnRlcigpO1xyXG5cclxuICAgIHRoaXMuYnVzU29ja2V0ID0gem1xLnNvY2tldChcInN1YlwiKTtcclxuICAgIC8vIHRoaXMudHJhaW5Tb2NrZXQgPSB6bXEuc29ja2V0KFwic3ViXCIpO1xyXG4gICAgXHJcbiAgICB0aGlzLmJ1c1NvY2tldC5jb25uZWN0KFwidGNwOi8vcHVic3ViLm5kb3Zsb2tldC5ubDo3NjU4XCIpO1xyXG4gICAgdGhpcy5idXNTb2NrZXQuc3Vic2NyaWJlKFwiL0FSUi9LVjZwb3NpbmZvXCIpO1xyXG4gICAgdGhpcy5idXNTb2NrZXQuc3Vic2NyaWJlKFwiL0NYWC9LVjZwb3NpbmZvXCIpO1xyXG4gICAgdGhpcy5idXNTb2NrZXQuc3Vic2NyaWJlKFwiL0RJVFAvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuYnVzU29ja2V0LnN1YnNjcmliZShcIi9FQlMvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuYnVzU29ja2V0LnN1YnNjcmliZShcIi9HVkIvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuYnVzU29ja2V0LnN1YnNjcmliZShcIi9PUEVOT1YvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuYnVzU29ja2V0LnN1YnNjcmliZShcIi9RQlVaWi9LVjZwb3NpbmZvXCIpO1xyXG4gICAgdGhpcy5idXNTb2NrZXQuc3Vic2NyaWJlKFwiL1JJRy9LVjZwb3NpbmZvXCIpO1xyXG4gICAgdGhpcy5idXNTb2NrZXQuc3Vic2NyaWJlKFwiL0tFT0xJUy9LVjZwb3NpbmZvXCIpO1xyXG5cclxuICAgIHRoaXMuYnVzU29ja2V0Lm9uKFwibWVzc2FnZVwiLCAob3BDb2RlIDogYW55LCAuLi5jb250ZW50IDogYW55KSA9PiB7XHJcbiAgICAgIGNvbnN0IGNvbnRlbnRzID0gQnVmZmVyLmNvbmNhdChjb250ZW50KTtcclxuICAgICAgY29uc3Qgb3BlcmF0b3IgPSBvcENvZGUudG9TdHJpbmcoKTtcclxuICAgICAgZ3VuemlwKGNvbnRlbnRzLCBhc3luYyhlcnJvciwgYnVmZmVyKSA9PiB7XHJcbiAgICAgICAgaWYoZXJyb3IpIHJldHVybiBjb25zb2xlLmVycm9yKGBTb21ldGhpbmcgd2VudCB3cm9uZyB3aGlsZSB0cnlpbmcgdG8gdW56aXAuICR7ZXJyb3J9YClcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBlbmNvZGVkWE1MID0gYnVmZmVyLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgY29uc3QgZGVjb2RlZCA9IHhtbC5wYXJzZSh0aGlzLnJlbW92ZVRtaTgoZW5jb2RlZFhNTCkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGxldCB2ZWhpY2xlRGF0YSA6IEFycmF5PFZlaGljbGVEYXRhPiA9IGNvbnZlcnRlci5kZWNvZGUoZGVjb2RlZCwgb3BlcmF0b3IpO1xyXG4gICAgICAgIFxyXG5cclxuICAgICAgICBhd2FpdCB0aGlzLmJ1c0xvZ2ljLlVwZGF0ZUJ1c3Nlcyh2ZWhpY2xlRGF0YSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgfSlcclxuXHJcbiAgICB9KVxyXG4gICAgXHJcbiAgICBcclxuICAgIC8vIHRoaXMudHJhaW5Tb2NrZXQuY29ubmVjdChcInRjcDovL3B1YnN1Yi5uZG92bG9rZXQubmw6NzY2NFwiKTtcclxuICAgIC8vIHRoaXMudHJhaW5Tb2NrZXQuc3Vic2NyaWJlKFwiL1JJRy9JbmZvUGx1c1ZUQlNJbnRlcmZhY2U1XCIpO1xyXG4gICAgLy8gdGhpcy50cmFpblNvY2tldC5zdWJzY3JpYmUoXCIvUklHL0luZm9QbHVzVlRCTEludGVyZmFjZTVcIik7XHJcblxyXG4gICAgLy8gdGhpcy50cmFpblNvY2tldC5vbihcIm1lc3NhZ2VcIiwgKG9wQ29kZSA6IGFueSwgLi4uY29udGVudCA6IGFueSkgPT4ge1xyXG4gICAgLy8gICBjb25zdCBjb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoY29udGVudCk7XHJcbiAgICAvLyAgIGNvbnN0IG9wZXJhdG9yID0gb3BDb2RlLnRvU3RyaW5nKCk7XHJcbiAgICAvLyAgIGNvbnNvbGUubG9nKG9wZXJhdG9yKTtcclxuICAgIC8vICAgZ3VuemlwKGNvbnRlbnRzLCBhc3luYyhlcnJvciwgYnVmZmVyKSA9PiB7XHJcbiAgICAvLyAgICAgaWYoZXJyb3IpIHJldHVybiBjb25zb2xlLmVycm9yKGBTb21ldGhpbmcgd2VudCB3cm9uZyB3aGlsZSB0cnlpbmcgdG8gdW56aXAuICR7ZXJyb3J9YClcclxuXHJcbiAgICAvLyAgICAgY29uc3QgZW5jb2RlZFhNTCA9IGJ1ZmZlci50b1N0cmluZygpO1xyXG4gICAgLy8gICAgIGNvbnN0IGRlY29kZWQgPSB4bWwucGFyc2UodGhpcy5yZW1vdmVUbWk4KGVuY29kZWRYTUwpKTtcclxuXHJcbiAgICAvLyAgICAgZnMud3JpdGVGaWxlKFwiSW5mb1BsdXNWVEJTSW50ZXJmYWNlNS5qc29uXCIsIEpTT04uc3RyaW5naWZ5KGRlY29kZWQpLCAoKSA9PiB7fSlcclxuICAgIC8vICAgICAvLyBjb25zb2xlLmxvZyhkZWNvZGVkKVxyXG4gICAgLy8gICAgIC8vIGxldCB2ZWhpY2xlRGF0YSA6IEFycmF5PFZlaGljbGVEYXRhPiA9IGNvbnZlcnRlci5kZWNvZGUoZGVjb2RlZCwgb3BlcmF0b3IpO1xyXG4gICAgICAgIFxyXG4gICAgLy8gICAgIC8vIGF3YWl0IHRoaXMuYnVzTG9naWMuVXBkYXRlQnVzc2VzKHZlaGljbGVEYXRhKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgLy8gICB9KVxyXG5cclxuICAgIC8vIH0pXHJcblxyXG4gICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xyXG4gICAgICB0aGlzLndlYnNvY2tldC5FbWl0KCk7XHJcbiAgICB9LCBwYXJzZUludChwcm9jZXNzLmVudi5BUFBfQlVTX1VQREFURV9ERUxBWSkpXHJcbiAgICBcclxuICAgIC8vIHRoaXMua3Y3OHNvY2tldCA9IHptcS5zb2NrZXQoXCJzdWJcIik7XHJcbiAgICAvLyB0aGlzLmt2Nzhzb2NrZXQuY29ubmVjdChcInRjcDovL3B1YnN1Yi5uZG92bG9rZXQubmw6NzgxN1wiKTtcclxuICAgIC8vIHRoaXMua3Y3OHNvY2tldC5zdWJzY3JpYmUoXCIvXCIpXHJcbiAgICAvLyB0aGlzLmt2Nzhzb2NrZXQub24oXCJtZXNzYWdlXCIsIChvcENvZGUsIC4uLmNvbnRlbnQpID0+IHtcclxuICAgIC8vICAgY29uc3QgY29udGVudHMgPSBCdWZmZXIuY29uY2F0KGNvbnRlbnQpO1xyXG4gICAgLy8gICBndW56aXAoY29udGVudHMsIGFzeW5jKGVycm9yLCBidWZmZXIpID0+IHsgXHJcbiAgICAvLyAgICAgY29uc29sZS5sb2coYnVmZmVyLnRvU3RyaW5nKCd1dGY4JykpXHJcbiAgICAvLyAgIH0pO1xyXG4gICAgLy8gfSk7XHJcbiAgfVxyXG5cclxuICByZW1vdmVUbWk4IChkYXRhKSA6IGFueSB7XHJcbiAgICByZXR1cm4gZGF0YS5yZXBsYWNlKC90bWk4Oi9nLCBcIlwiKTtcclxuICB9XHJcbn0iLCJpbXBvcnQgeyBWZWhpY2xlRGF0YSB9IGZyb20gXCIuL3R5cGVzL1ZlaGljbGVEYXRhXCI7XHJcbmltcG9ydCB7IFNlcnZlciB9IGZyb20gJ2h0dHBzJztcclxuaW1wb3J0IHsgU29ja2V0IH0gZnJvbSAnc29ja2V0LmlvJztcclxuaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tICcuL2RhdGFiYXNlJztcclxuaW1wb3J0IHsgV2Vic29ja2V0VmVoaWNsZURhdGEgfSBmcm9tIFwiLi90eXBlcy9XZWJzb2NrZXRWZWhpY2xlRGF0YVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFdlYnNvY2tldCB7XHJcbiAgXHJcbiAgcHJpdmF0ZSBpbyA6IFNvY2tldDtcclxuICBwcml2YXRlIGRiIDogRGF0YWJhc2U7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNlcnZlciA6IFNlcnZlciwgZGIgOiBEYXRhYmFzZSkge1xyXG4gICAgdGhpcy5Tb2NrZXRJbml0KHNlcnZlcik7XHJcbiAgICB0aGlzLmRiID0gZGI7XHJcbiAgfVxyXG5cclxuICBhc3luYyBTb2NrZXRJbml0KHNlcnZlciA6IFNlcnZlcikge1xyXG4gICAgY29uc29sZS5sb2coYEluaXRhbGl6aW5nIHdlYnNvY2tldGApXHJcblxyXG4gICAgdGhpcy5pbyA9IHJlcXVpcmUoXCJzb2NrZXQuaW9cIikoc2VydmVyLCB7XHJcbiAgICAgIGNvcnM6IHtcclxuICAgICAgICBvcmlnaW46IFwiKlwiLFxyXG4gICAgICAgIG1ldGhvZHM6IFtcIkdFVFwiLCBcIlBPU1RcIl0sXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmlvLm9uKFwiY29ubmVjdGlvblwiLCBzb2NrZXQgPT4ge1xyXG4gICAgICB0aGlzLlNvY2tldChzb2NrZXQpO1xyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIFNvY2tldChzb2NrZXQgOiBTb2NrZXQpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiTmV3IGNsaWVudCBjb25uZWN0ZWQuXCIpO1xyXG5cclxuICAgIHNvY2tldC5vbihcImRpc2Nvbm5lY3RcIiwgKCkgPT4ge1xyXG4gICAgICBjb25zb2xlLmxvZyhcIkNsaWVudCBkaXNjb25uZWN0ZWRcIik7XHJcbiAgICAgIC8vY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgU2VuZERlbGV0ZWRWZWhpY2xlcyh2ZWhpY2xlcyA6IEFycmF5PFZlaGljbGVEYXRhPikgOiB2b2lkIHtcclxuICAgIHRoaXMuaW8uZW1pdChcImRlbGV0ZWRWZWhpY2xlc1wiLCB2ZWhpY2xlcyk7XHJcbiAgfVxyXG5cclxuICBDcmVhdGVCdWZmZXJGcm9tVmVoaWNsZXModmVoaWNsZXMgOiBBcnJheTxXZWJzb2NrZXRWZWhpY2xlRGF0YT4pIHsgXHJcbiAgICBsZXQgYnVmID0gQnVmZmVyLmFsbG9jKCg0ICsgNCArIDQgKyAxNSkgKiB2ZWhpY2xlcy5sZW5ndGgpXHJcbiAgICB2ZWhpY2xlcy5mb3JFYWNoKCh2ZWhpY2xlIDogV2Vic29ja2V0VmVoaWNsZURhdGEsIGluZGV4IDogbnVtYmVyKSA9PiB7XHJcbiAgICAgIGJ1Zi53cml0ZUZsb2F0QkUodmVoaWNsZS5wWzBdLCBpbmRleCAqIDI3KVxyXG4gICAgICBidWYud3JpdGVGbG9hdEJFKHZlaGljbGUucFsxXSwgaW5kZXggKiAyNyArIDQpXHJcbiAgICAgIGJ1Zi53cml0ZVVJbnQzMkJFKHZlaGljbGUudiwgaW5kZXggKiAyNyArIDQgKyA0KVxyXG4gICAgICBidWYud3JpdGUoYCR7dmVoaWNsZS5jfXwke3ZlaGljbGUubn1gLCBpbmRleCAqIDI3ICsgNCArIDQgKyA0KVxyXG4gICAgICBmb3IobGV0IGkgPSAwOyBpIDwgMTUgLSAodmVoaWNsZS5jLmxlbmd0aCArIDEgKyB2ZWhpY2xlLm4ubGVuZ3RoKTsgaSsrKSB7XHJcbiAgICAgICAgYnVmLndyaXRlVUludDgoMCwgaW5kZXggKiAyNyArIDQgKyA0ICsgNCArIHZlaGljbGUuYy5sZW5ndGggKyAxICsgdmVoaWNsZS5uLmxlbmd0aClcclxuICAgICAgfVxyXG4gICAgfSlcclxuXHJcbiAgICByZXR1cm4gYnVmO1xyXG4gIH1cclxuXHJcbiAgRW1pdCgpIHtcclxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICB0aGlzLmRiLkdldEFsbFZlaGljbGVzU21hbGwoKS50aGVuKCh2ZWhpY2xlcykgPT4gdGhpcy5pby5lbWl0KFwib3ZkYXRhXCIsIHRoaXMuQ3JlYXRlQnVmZmVyRnJvbVZlaGljbGVzKHZlaGljbGVzKSkpXHJcbiAgICAgICAgLy9TbWFsbCBkZWxheSB0byBtYWtlIHN1cmUgdGhlIHNlcnZlciBjYXRjaGVzIHVwLlxyXG4gICAgfSwgMTAwKVxyXG4gIH1cclxuXHJcbn0iLCJleHBvcnQgY29uc3QgQ29tcGFuaWVzID0ge1xyXG4gIEFSUiA6IFwiQVJSXCIsXHJcbiAgQ1hYIDogXCJDWFhcIixcclxuICBESVRQIDogXCJESVRQXCIsXHJcbiAgRUJTIDogXCJFQlNcIixcclxuICBHVkIgOiBcIkdWQlwiLFxyXG4gIEtFT0xJUzogXCJLRU9MSVNcIixcclxuICBPUEVOT1Y6IFwiT1BFTk9WXCIsXHJcbiAgUUJVWlogOiBcIlFCVVpaXCIsXHJcbiAgUklHIDogXCJSSUdcIlxyXG59IiwiZXhwb3J0IGVudW0gdmVoaWNsZVN0YXRlIHtcclxuICBPTlJPVVRFID0gJ09OUk9VVEUnLFxyXG4gIE9GRlJPVVRFID0gJ09GRlJPVVRFJyxcclxuICBFTkQgPSBcIkVORFwiLFxyXG4gIERFUEFSVFVSRSA9ICdERVBBUlRVUkUnLFxyXG4gIElOSVQgPSAnSU5JVCcsXHJcbiAgREVMQVkgPSAnREVMQVknLFxyXG4gIE9OU1RPUCA9ICdPTlNUT1AnLFxyXG4gIEFSUklWQUwgPSAnQVJSSVZBTCdcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBWZWhpY2xlRGF0YSB7XHJcbiAgY29tcGFueTogc3RyaW5nLFxyXG4gIG9yaWdpbmFsQ29tcGFueTogc3RyaW5nLFxyXG4gIHBsYW5uaW5nTnVtYmVyOiBzdHJpbmcsXHJcbiAgam91cm5leU51bWJlcjogbnVtYmVyLFxyXG4gIGxpbmVOdW1iZXIgOiBzdHJpbmcsXHJcbiAgdGltZXN0YW1wOiBudW1iZXIsXHJcbiAgdmVoaWNsZU51bWJlcjogbnVtYmVyLFxyXG4gIHBvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdLFxyXG4gIHN0YXR1czogdmVoaWNsZVN0YXRlLFxyXG4gIGNyZWF0ZWRBdDogbnVtYmVyLFxyXG4gIHVwZGF0ZWRBdDogbnVtYmVyLFxyXG4gIHB1bmN0dWFsaXR5OiBBcnJheTxudW1iZXI+LFxyXG4gIHVwZGF0ZWRUaW1lczogQXJyYXk8bnVtYmVyPixcclxuICBjdXJyZW50Um91dGVJZDogbnVtYmVyLFxyXG4gIGN1cnJlbnRUcmlwSWQ6IG51bWJlclxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIkB0dXJmL3R1cmZcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImNoaWxkX3Byb2Nlc3NcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImNvcnNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImRvdGVudlwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZXhwcmVzc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZmFzdC14bWwtcGFyc2VyXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJmc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiaHR0cHNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIm1vbmdvb3NlXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJwYXRoXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzb2NrZXQuaW9cIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInNwbGl0XCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzdHJlYW0tdG8tbW9uZ28tZGJcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInplcm9tcVwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiemxpYlwiKTs7IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIHN0YXJ0dXBcbi8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuLy8gVGhpcyBlbnRyeSBtb2R1bGUgaXMgcmVmZXJlbmNlZCBieSBvdGhlciBtb2R1bGVzIHNvIGl0IGNhbid0IGJlIGlubGluZWRcbnZhciBfX3dlYnBhY2tfZXhwb3J0c19fID0gX193ZWJwYWNrX3JlcXVpcmVfXyhcIi4vc3JjL21haW4udHNcIik7XG4iXSwic291cmNlUm9vdCI6IiJ9