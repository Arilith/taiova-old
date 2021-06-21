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
                    await this.database.AddVehicle(bus, true);
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
        this.sock = zmq.socket("sub");
        this.sock.connect("tcp://pubsub.ndovloket.nl:7658");
        this.sock.subscribe("/ARR/KV6posinfo");
        this.sock.subscribe("/CXX/KV6posinfo");
        this.sock.subscribe("/DITP/KV6posinfo");
        this.sock.subscribe("/EBS/KV6posinfo");
        this.sock.subscribe("/GVB/KV6posinfo");
        this.sock.subscribe("/OPENOV/KV6posinfo");
        this.sock.subscribe("/QBUZZ/KV6posinfo");
        this.sock.subscribe("/RIG/KV6posinfo");
        this.sock.subscribe("/KEOLIS/KV6posinfo");
        this.sock.on("message", (opCode, ...content) => {
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
        //Small delay to make sure the server catches up.
        setTimeout(() => {
            this.db.GetAllVehiclesSmall().then((vehicles) => this.io.emit("ovdata", this.CreateBufferFromVehicles(vehicles)));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9idXNsb2dpYy50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9jb252ZXJ0ZXIudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvZGF0YWJhc2UudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvbWFpbi50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9yZWFsdGltZS50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9zb2NrZXQudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvdHlwZXMvQ29tcGFuaWVzLnRzIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyLy4vc3JjL3R5cGVzL1ZlaGljbGVEYXRhLnRzIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiQHR1cmYvdHVyZlwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiY2hpbGRfcHJvY2Vzc1wiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiY29yc1wiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiZG90ZW52XCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJleHByZXNzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJmYXN0LXhtbC1wYXJzZXJcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcImZzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJodHRwc1wiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwibW9uZ29vc2VcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcInBhdGhcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcInNvY2tldC5pb1wiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwic3BsaXRcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcInN0cmVhbS10by1tb25nby1kYlwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiemVyb21xXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJ6bGliXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvd2VicGFjay9zdGFydHVwIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsbUdBQWdFO0FBQ2hFLHVEQUErQjtBQUMvQiw2REFBeUI7QUFHekIsa0ZBQXFDO0FBR3JDLCtFQUFrQztBQUVsQyxNQUFhLFFBQVE7SUFJbkIsWUFBWSxRQUFRLEVBQUUsU0FBbUIsS0FBSztRQUM1QyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUV6QixJQUFHLE1BQU07WUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUVPLEtBQUssQ0FBQyxVQUFVO1FBQ3RCLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRXpCLFdBQVcsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNyQixNQUFNLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMzQixDQUFDLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlC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QyxHQUFHLENBQUMsT0FBTztZQUMvRCxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQzVDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUNsQixFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQzVDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU87WUFDdkIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUM1QyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU87WUFDbEIsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQzlDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUMxQixFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU87WUFDbEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVuQixNQUFNLFFBQVEsR0FBRyxRQUFRLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDMUMsTUFBTSxTQUFTLEdBQUcsUUFBUSxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBRTNDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDO0lBQzlC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QTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTs7VUFFQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTs7OztVQ3RCQTtVQUNBO1VBQ0E7VUFDQSIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEYXRhYmFzZSB9IGZyb20gXCIuL2RhdGFiYXNlXCI7XHJcbmltcG9ydCB7IFZlaGljbGVEYXRhLCB2ZWhpY2xlU3RhdGUgfSBmcm9tIFwiLi90eXBlcy9WZWhpY2xlRGF0YVwiO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0IHsgVHJpcCB9IGZyb20gXCIuL3R5cGVzL1RyaXBcIjtcclxuaW1wb3J0IHsgQXBpVHJpcCB9IGZyb20gXCIuL3R5cGVzL0FwaVRyaXBcIjtcclxuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xyXG5pbXBvcnQgeyBSb3V0ZSB9IGZyb20gXCIuL3R5cGVzL1JvdXRlXCI7XHJcbmltcG9ydCB7IFRyaXBQb3NpdGlvbkRhdGEgfSBmcm9tIFwiLi90eXBlcy9UcmlwUG9zaXRpb25EYXRhXCI7XHJcbmltcG9ydCAqIGFzIHR1cmYgZnJvbSAnQHR1cmYvdHVyZidcclxuXHJcbmV4cG9ydCBjbGFzcyBCdXNMb2dpYyB7XHJcblxyXG4gIHByaXZhdGUgZGF0YWJhc2UgOiBEYXRhYmFzZTtcclxuXHJcbiAgY29uc3RydWN0b3IoZGF0YWJhc2UsIGRvSW5pdCA6IGJvb2xlYW4gPSBmYWxzZSkge1xyXG4gICAgdGhpcy5kYXRhYmFzZSA9IGRhdGFiYXNlO1xyXG5cclxuICAgIGlmKGRvSW5pdCkgdGhpcy5Jbml0aWFsaXplKCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIEluaXRpYWxpemUoKSB7XHJcbiAgICBhd2FpdCB0aGlzLkNsZWFyQnVzc2VzKCk7XHJcblxyXG4gICAgc2V0SW50ZXJ2YWwoYXN5bmMgKCkgPT4ge1xyXG4gICAgICBhd2FpdCB0aGlzLkNsZWFyQnVzc2VzKCk7XHJcbiAgICB9LCBwYXJzZUludChwcm9jZXNzLmVudi5BUFBfQ0xFQU5VUF9ERUxBWSkpXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGVzIG9yIGNyZWF0ZXMgYSBuZXcgYnVzIGRlcGVuZGluZyBvbiBpZiBpdCBhbHJlYWR5IGV4aXN0cyBvciBub3QuXHJcbiAgICogQHBhcmFtIGJ1c3NlcyBUaGUgbGlzdCBvZiBidXNzZXMgdG8gdXBkYXRlLlxyXG4gICAqL1xyXG4gICBwdWJsaWMgYXN5bmMgVXBkYXRlQnVzc2VzKGJ1c3NlcyA6IEFycmF5PFZlaGljbGVEYXRhPikgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IFByb21pc2UuYWxsKGJ1c3Nlcy5tYXAoYXN5bmMgKGJ1cykgPT4ge1xyXG4gICAgICBjb25zdCBmb3VuZFRyaXAgOiBUcmlwID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRUcmlwKGJ1cy5qb3VybmV5TnVtYmVyLCBidXMucGxhbm5pbmdOdW1iZXIsIGJ1cy5jb21wYW55KTtcclxuICAgICAgY29uc3QgZm91bmRSb3V0ZSA6IFJvdXRlID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRSb3V0ZShmb3VuZFRyaXAucm91dGVJZCk7XHJcblxyXG4gICAgICAvL1RPRE86IE1heWJlIHRoaXMgc2hvdWxkIGJlIGRpZmZlcmVudC5cclxuICAgICAgYnVzLmxpbmVOdW1iZXIgPSBcIjk5OVwiO1xyXG4gICAgICBidXMuY3VycmVudFJvdXRlSWQgPSAwO1xyXG4gICAgICBidXMuY3VycmVudFRyaXBJZCA9IDA7XHJcblxyXG4gICAgICBpZihmb3VuZFJvdXRlLmNvbXBhbnkpIGJ1cy5jb21wYW55ID0gZm91bmRSb3V0ZS5jb21wYW55O1xyXG4gICAgICBpZihmb3VuZFJvdXRlICYmIGZvdW5kUm91dGUucm91dGVTaG9ydE5hbWUgJiYgZm91bmRSb3V0ZS5yb3V0ZUlkKSB7XHJcbiAgICAgICAgYnVzLmxpbmVOdW1iZXIgPSBmb3VuZFJvdXRlLnJvdXRlU2hvcnROYW1lO1xyXG4gICAgICAgIGJ1cy5jdXJyZW50Um91dGVJZCA9IGZvdW5kUm91dGUucm91dGVJZFxyXG4gICAgICB9XHJcblxyXG4gICAgICBpZihmb3VuZFRyaXAgJiYgZm91bmRUcmlwLnRyaXBJZCkgYnVzLmN1cnJlbnRUcmlwSWQgPSBmb3VuZFRyaXAudHJpcElkO1xyXG5cclxuICAgICAgbGV0IGZvdW5kVmVoaWNsZSA6IFZlaGljbGVEYXRhID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRWZWhpY2xlKGJ1cy52ZWhpY2xlTnVtYmVyLCBidXMuY29tcGFueSk7XHJcbiAgICAgIFxyXG5cclxuICAgICAgaWYoT2JqZWN0LmtleXMoZm91bmRWZWhpY2xlKS5sZW5ndGggIT09IDApIHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fVVBEQVRFX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBVcGRhdGluZyB2ZWhpY2xlICR7YnVzLnZlaGljbGVOdW1iZXJ9IGZyb20gJHtidXMuY29tcGFueX1gKVxyXG4gICAgICAgIGlmKCFmb3VuZFZlaGljbGVbXCJfZG9jXCJdKSB7IGNvbnNvbGUuZXJyb3IoYFZlaGljbGUgJHtidXMudmVoaWNsZU51bWJlcn0gZnJvbSAke2J1cy5jb21wYW55fSBkaWQgbm90IGluY2x1ZGUgYSBkb2MuIGApOyByZXR1cm4gfVxyXG5cclxuICAgICAgICBmb3VuZFZlaGljbGUgPSBmb3VuZFZlaGljbGVbXCJfZG9jXCJdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vTWVyZ2UgdGhlIHB1bmN0dWFsaXRpZXMgb2YgdGhlIG9sZCB2ZWhpY2xlRGF0YSB3aXRoIHRoZSBuZXcgb25lLlxyXG4gICAgICAgIGJ1cy5wdW5jdHVhbGl0eSA9IGZvdW5kVmVoaWNsZS5wdW5jdHVhbGl0eS5jb25jYXQoYnVzLnB1bmN0dWFsaXR5KTtcclxuXHJcbiAgICAgICAgLy9NZXJnZSB0aGUgdXBkYXRlZCB0aW1lcyBvZiB0aGUgb2xkIHZlaGljbGVEYXRhIHdpdGggdGhlIG5ldyBvbmUuXHJcbiAgICAgICAgYnVzLnVwZGF0ZWRUaW1lcyA9IGZvdW5kVmVoaWNsZS51cGRhdGVkVGltZXMuY29uY2F0KGJ1cy51cGRhdGVkVGltZXMpO1xyXG5cclxuICAgICAgICBpZihidXMuc3RhdHVzICE9PSB2ZWhpY2xlU3RhdGUuT05ST1VURSkgYnVzLnBvc2l0aW9uID0gZm91bmRWZWhpY2xlLnBvc2l0aW9uO1xyXG5cclxuICAgICAgICBpZihidXMuc3RhdHVzID09PSB2ZWhpY2xlU3RhdGUuSU5JVCB8fCBidXMuc3RhdHVzID09PSB2ZWhpY2xlU3RhdGUuRU5EKSB7XHJcbiAgICAgICAgICBidXMucHVuY3R1YWxpdHkgPSBbXTtcclxuICAgICAgICAgIGJ1cy51cGRhdGVkVGltZXMgPSBbXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vVE9ETzogUmVtb3ZlIHB1bmN0dWFsaXR5IGRhdGEgb2xkZXIgdGhhbiA2MCBtaW51dGVzLlxyXG5cclxuICAgICAgICBidXMudXBkYXRlZEF0ID0gRGF0ZS5ub3coKTsgIFxyXG4gICAgICAgIGlmKE9iamVjdC5rZXlzKGZvdW5kVHJpcCkubGVuZ3RoICE9PSAwKSB0aGlzLkFkZFBvc2l0aW9uVG9UcmlwUm91dGUoZm91bmRUcmlwLnRyaXBJZCwgZm91bmRUcmlwLmNvbXBhbnksIGJ1cy5wb3NpdGlvbik7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5kYXRhYmFzZS5VcGRhdGVWZWhpY2xlKGZvdW5kVmVoaWNsZSwgYnVzLCB0cnVlKVxyXG4gICAgICAgIFxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DUkVBVEVfTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coYGNyZWF0aW5nIG5ldyB2ZWhpY2xlICR7YnVzLnZlaGljbGVOdW1iZXJ9IGZyb20gJHtidXMuY29tcGFueX1gKVxyXG4gICAgICAgIGlmKGJ1cy5zdGF0dXMgPT09IHZlaGljbGVTdGF0ZS5PTlJPVVRFKSBhd2FpdCB0aGlzLmRhdGFiYXNlLkFkZFZlaGljbGUoYnVzLCB0cnVlKVxyXG4gICAgICB9XHJcbiAgICB9KSlcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBBZGRQb3NpdGlvblRvVHJpcFJvdXRlICh0cmlwSWQgOiBudW1iZXIsIGNvbXBhbnkgOiBzdHJpbmcsIHBvc2l0aW9uIDogW251bWJlciwgbnVtYmVyXSkge1xyXG4gICAgaWYocG9zaXRpb25bMF0gPT0gMy4zMTM1MjkxNTYyNjQzNDY3KSByZXR1cm47XHJcbiAgICBsZXQgcmV0cmlldmVkVHJpcFJvdXRlRGF0YSA6IFRyaXBQb3NpdGlvbkRhdGEgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFRyaXBQb3NpdGlvbnModHJpcElkLCBjb21wYW55KTtcclxuICAgIGlmKHJldHJpZXZlZFRyaXBSb3V0ZURhdGEpIHsgXHJcbiAgICAgIHJldHJpZXZlZFRyaXBSb3V0ZURhdGEudXBkYXRlZFRpbWVzLnB1c2gobmV3IERhdGUoKS5nZXRUaW1lKCkpO1xyXG4gICAgICBjb25zdCBuZXdVcGRhdGVkVGltZXMgPSByZXRyaWV2ZWRUcmlwUm91dGVEYXRhLnVwZGF0ZWRUaW1lcztcclxuICAgICAgbGV0IHJlc3VsdEFycmF5O1xyXG5cclxuICAgICAgaWYocmV0cmlldmVkVHJpcFJvdXRlRGF0YS5wb3NpdGlvbnMubGVuZ3RoID4gMSkge1xyXG4gICAgICAgIGNvbnN0IHRhcmdldFBvaW50ID0gdHVyZi5wb2ludChwb3NpdGlvbik7XHJcbiAgICAgICAgY29uc3QgY3VycmVudExpbmUgPSB0dXJmLmxpbmVTdHJpbmcocmV0cmlldmVkVHJpcFJvdXRlRGF0YS5wb3NpdGlvbnMpXHJcbiAgICAgICAgY29uc3QgbmVhcmVzdCA9IHR1cmYubmVhcmVzdFBvaW50T25MaW5lKGN1cnJlbnRMaW5lLCB0YXJnZXRQb2ludCk7XHJcbiAgICAgICAgY29uc3QgaW5kZXggPSBuZWFyZXN0LnByb3BlcnRpZXMuaW5kZXg7XHJcbiAgXHJcbiAgICAgICAgY29uc3QgZmlyc3RIYWxmID0gcmV0cmlldmVkVHJpcFJvdXRlRGF0YS5wb3NpdGlvbnMuc2xpY2UoMCwgaW5kZXgpO1xyXG4gICAgICAgIGNvbnN0IHNlY29uZEhhbGYgPSByZXRyaWV2ZWRUcmlwUm91dGVEYXRhLnBvc2l0aW9ucy5zbGljZShpbmRleClcclxuICAgICAgICBmaXJzdEhhbGYucHVzaChbdGFyZ2V0UG9pbnQuZ2VvbWV0cnkuY29vcmRpbmF0ZXNbMF0sIHRhcmdldFBvaW50Lmdlb21ldHJ5LmNvb3JkaW5hdGVzWzFdXSk7XHJcbiAgICAgICAgcmVzdWx0QXJyYXkgPSBmaXJzdEhhbGYuY29uY2F0KHNlY29uZEhhbGYpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHJpZXZlZFRyaXBSb3V0ZURhdGEucG9zaXRpb25zLnB1c2gocG9zaXRpb24pO1xyXG4gICAgICAgIHJlc3VsdEFycmF5ID0gcmV0cmlldmVkVHJpcFJvdXRlRGF0YS5wb3NpdGlvbnM7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIFxyXG4gICAgICByZXRyaWV2ZWRUcmlwUm91dGVEYXRhID0ge1xyXG4gICAgICAgIHRyaXBJZCA6IHRyaXBJZCxcclxuICAgICAgICBjb21wYW55IDogY29tcGFueSxcclxuICAgICAgICBwb3NpdGlvbnM6IHJlc3VsdEFycmF5LFxyXG4gICAgICAgIHVwZGF0ZWRUaW1lcyA6IG5ld1VwZGF0ZWRUaW1lc1xyXG4gICAgICB9XHJcblxyXG4gICAgfVxyXG4gICAgICBcclxuICAgIGVsc2VcclxuICAgICAgcmV0cmlldmVkVHJpcFJvdXRlRGF0YSA9IHtcclxuICAgICAgICB0cmlwSWQgOiB0cmlwSWQsXHJcbiAgICAgICAgY29tcGFueSA6IGNvbXBhbnksXHJcbiAgICAgICAgcG9zaXRpb25zOiBbcG9zaXRpb25dLFxyXG4gICAgICAgIHVwZGF0ZWRUaW1lcyA6IFtuZXcgRGF0ZSgpLmdldFRpbWUoKV1cclxuICAgICAgfVxyXG5cclxuICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuVXBkYXRlVHJpcFBvc2l0aW9ucyh0cmlwSWQsIGNvbXBhbnksIHJldHJpZXZlZFRyaXBSb3V0ZURhdGEpO1xyXG4gIH1cclxuXHJcbiAgXHJcblxyXG4gIC8qKlxyXG4gICAqIENsZWFycyBidXNzZXMgZXZlcnkgWCBhbW91bnQgb2YgbWludXRlcyBzcGVjaWZpZWQgaW4gLmVudiBmaWxlLlxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBDbGVhckJ1c3NlcygpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ0xFQU5VUF9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkNsZWFyaW5nIGJ1c3Nlc1wiKVxyXG4gICAgY29uc3QgY3VycmVudFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgY29uc3QgZmlmdGVlbk1pbnV0ZXNBZ28gPSBjdXJyZW50VGltZSAtICg2MCAqIHBhcnNlSW50KHByb2Nlc3MuZW52LkFQUF9DTEVBTlVQX1ZFSElDTEVfQUdFX1JFUVVJUkVNRU5UKSAqIDEwMDApO1xyXG4gICAgY29uc3QgUmVtb3ZlZFZlaGljbGVzID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5SZW1vdmVWZWhpY2xlc1doZXJlKHsgdXBkYXRlZEF0OiB7ICRsdDogZmlmdGVlbk1pbnV0ZXNBZ28gfSB9LCBwcm9jZXNzLmVudi5BUFBfRE9fQ0xFQU5VUF9MT0dHSU5HID09IFwidHJ1ZVwiKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSBcIktvcHBlbHZsYWsgNyBhbmQgOCB0dXJib1wiIGZpbGVzIHRvIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gIHB1YmxpYyBJbml0S1Y3OCgpIDogdm9pZCB7XHJcbiAgICB0aGlzLkluaXRUcmlwc05ldygpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHRyaXBzIGZyb20gdGhlIHNwZWNpZmllZCBVUkwgaW4gdGhlIC5lbnYgLCBvciBcIi4uL0dURlMvZXh0cmFjdGVkL3RyaXBzLmpzb25cIiB0byB0aGUgZGF0YWJhc2UuXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBJbml0VHJpcHNOZXcoKSA6IHZvaWQgeyBcclxuICAgIGNvbnN0IHRyaXBzUGF0aCA9IHJlc29sdmUoXCJHVEZTXFxcXGV4dHJhY3RlZFxcXFx0cmlwcy50eHQuanNvblwiKTtcclxuICAgIGNvbnN0IG91dHB1dFBhdGggPSByZXNvbHZlKFwiR1RGU1xcXFxjb252ZXJ0ZWRcXFxcdHJpcHMuanNvblwiKTtcclxuICAgIGZzLnJlYWRGaWxlKHRyaXBzUGF0aCwgJ3V0ZjgnLCBhc3luYyhlcnJvciwgZGF0YSkgPT4geyBcclxuICAgICAgaWYoZXJyb3IpIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICBpZihkYXRhICYmIHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiTG9hZGVkIHRyaXBzIGZpbGUgaW50byBtZW1vcnkuXCIpO1xyXG4gICAgICBkYXRhID0gZGF0YS50cmltKCk7XHJcbiAgICAgIGNvbnN0IGxpbmVzID0gZGF0YS5zcGxpdChcIlxcblwiKTtcclxuICAgICAgY29uc3Qgd3JpdGVTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShvdXRwdXRQYXRoKVxyXG4gICAgICBjb25zdCBjb252ZXJ0ZWRUcmlwcyA9IFtdO1xyXG5cclxuICAgICAgZm9yKGxldCBsaW5lIG9mIGxpbmVzKSB7XHJcbiAgICAgICAgY29uc3QgdHJpcEpTT04gOiBBcGlUcmlwID0gSlNPTi5wYXJzZShsaW5lKTtcclxuICAgICAgICBjb25zdCByZWFsVGltZVRyaXBJZCA9IHRyaXBKU09OLnJlYWx0aW1lX3RyaXBfaWQuc3BsaXQoXCI6XCIpO1xyXG4gICAgICAgIGNvbnN0IGNvbXBhbnkgPSByZWFsVGltZVRyaXBJZFswXTtcclxuICAgICAgICBjb25zdCBwbGFubmluZ051bWJlciA9IHJlYWxUaW1lVHJpcElkWzFdO1xyXG4gICAgICAgIGNvbnN0IHRyaXBOdW1iZXIgPSByZWFsVGltZVRyaXBJZFsyXTtcclxuXHJcbiAgICAgICAgY29uc3QgdHJpcCA6IFRyaXAgPSB7XHJcbiAgICAgICAgICBjb21wYW55OiBjb21wYW55LFxyXG4gICAgICAgICAgcm91dGVJZDogcGFyc2VJbnQodHJpcEpTT04ucm91dGVfaWQpLFxyXG4gICAgICAgICAgc2VydmljZUlkOiBwYXJzZUludCh0cmlwSlNPTi5zZXJ2aWNlX2lkKSxcclxuICAgICAgICAgIHRyaXBJZDogcGFyc2VJbnQodHJpcEpTT04udHJpcF9pZCksXHJcbiAgICAgICAgICB0cmlwTnVtYmVyOiBwYXJzZUludCh0cmlwTnVtYmVyKSxcclxuICAgICAgICAgIHRyaXBQbGFubmluZ051bWJlcjogcGxhbm5pbmdOdW1iZXIsXHJcbiAgICAgICAgICB0cmlwSGVhZHNpZ246IHRyaXBKU09OLnRyaXBfaGVhZHNpZ24sXHJcbiAgICAgICAgICB0cmlwTmFtZTogdHJpcEpTT04udHJpcF9sb25nX25hbWUsXHJcbiAgICAgICAgICBkaXJlY3Rpb25JZDogcGFyc2VJbnQodHJpcEpTT04uZGlyZWN0aW9uX2lkKSxcclxuICAgICAgICAgIHNoYXBlSWQ6IHBhcnNlSW50KHRyaXBKU09OLnNoYXBlX2lkKSxcclxuICAgICAgICAgIHdoZWVsY2hhaXJBY2Nlc3NpYmxlOiBwYXJzZUludCh0cmlwSlNPTi53aGVlbGNoYWlyX2FjY2Vzc2libGUpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHdyaXRlU3RyZWFtLndyaXRlKEpTT04uc3RyaW5naWZ5KHRyaXApICsgXCJcXG5cIik7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHdyaXRlU3RyZWFtLmVuZCgoKSA9PiB7XHJcbiAgICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJGaW5pc2hlZCB3cml0aW5nIHRyaXBzIGZpbGUsIGltcG9ydGluZyB0byBkYXRhYmFzZS5cIik7XHJcbiAgICAgICAgdGhpcy5JbXBvcnRUcmlwcygpO1xyXG4gICAgICB9KVxyXG4gICAgfSk7XHJcbiAgIFxyXG4gICAgXHJcbiAgfVxyXG5cclxuICBhc3luYyBJbXBvcnRUcmlwcygpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLmRhdGFiYXNlLkRyb3BUcmlwc0NvbGxlY3Rpb24oKTtcclxuXHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkltcG9ydGluZyB0cmlwcyB0byBtb25nb2RiXCIpO1xyXG5cclxuICAgIGF3YWl0IGV4ZWMoXCJtb25nb2ltcG9ydCAtLWRiIHRhaW92YSAtLWNvbGxlY3Rpb24gdHJpcHMgLS1maWxlIC5cXFxcR1RGU1xcXFxjb252ZXJ0ZWRcXFxcdHJpcHMuanNvblwiLCAoZXJyb3IsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBlcnJvcjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHN0ZGVycikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBzdGRlcnI6ICR7c3RkZXJyfWApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coYHN0ZG91dDogJHtzdGRvdXR9YCk7XHJcbiAgICB9KTtcclxuXHJcbiAgfVxyXG5cclxufSIsImltcG9ydCB7IFZlaGljbGVEYXRhLCB2ZWhpY2xlU3RhdGUgfSBmcm9tICcuL3R5cGVzL1ZlaGljbGVEYXRhJ1xyXG5pbXBvcnQgeyBWZWhpY2xlQXBpRGF0YSwgVmVoaWNsZVBvc0RhdGEsIFZlaGljbGVBcGlEYXRhS2VvbGlzIH0gZnJvbSAnLi90eXBlcy9WZWhpY2xlQXBpRGF0YSdcclxuaW1wb3J0IHsgQ29tcGFuaWVzIH0gZnJvbSAnLi90eXBlcy9Db21wYW5pZXMnO1xyXG5pbXBvcnQgeyBiZWFyaW5nVG9BbmdsZSB9IGZyb20gJ0B0dXJmL3R1cmYnO1xyXG5pbXBvcnQgeyBLVjZHZW5lcmljIH0gZnJvbSAnLi90eXBlcy9hcGkvS1Y2QXJyaXZhJztcclxuaW1wb3J0IHsgREVMQVksIElOSVQsIE9OUk9VVEUsIFR5cGVzIH0gZnJvbSAnLi90eXBlcy9hcGkvS1Y2Q29tbW9uJztcclxuZXhwb3J0IGNsYXNzIENvbnZlcnRlciB7XHJcblxyXG4gIGRlY29kZShkYXRhIDogYW55LCBvcGVyYXRvciA6IHN0cmluZykgOiBhbnkge1xyXG4gICAgY29uc3QgY29tcGFueSA9IHRoaXMuQ2hlY2tDb21wYW55KG9wZXJhdG9yKTtcclxuXHJcbiAgICBzd2l0Y2ggKGNvbXBhbnkpIHtcclxuICAgICAgY2FzZSBDb21wYW5pZXMuQVJSOlxyXG4gICAgICAgIHJldHVybiB0aGlzLkRlY29kZU1haW4oZGF0YSk7XHJcbiAgICAgIGNhc2UgQ29tcGFuaWVzLkNYWDpcclxuICAgICAgICByZXR1cm4gdGhpcy5EZWNvZGVNYWluKGRhdGEpO1xyXG4gICAgICBjYXNlIENvbXBhbmllcy5FQlM6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRGVjb2RlTWFpbihkYXRhKTtcclxuICAgICAgY2FzZSBDb21wYW5pZXMuUUJVWlo6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRGVjb2RlTWFpbihkYXRhKTtcclxuICAgICAgY2FzZSBDb21wYW5pZXMuUklHOlxyXG4gICAgICAgIHJldHVybiB0aGlzLkRlY29kZU1haW4oZGF0YSk7XHJcbiAgICAgIGNhc2UgQ29tcGFuaWVzLk9QRU5PVjpcclxuICAgICAgICByZXR1cm4gdGhpcy5EZWNvZGVNYWluKGRhdGEpO1xyXG4gICAgICBjYXNlIENvbXBhbmllcy5ESVRQOlxyXG4gICAgICAgIHJldHVybiB0aGlzLkRlY29kZU1haW4oZGF0YSk7XHJcbiAgICAgIGNhc2UgQ29tcGFuaWVzLktFT0xJUzpcclxuICAgICAgICByZXR1cm4gdGhpcy5EZWNvZGVPdGhlcihkYXRhKTtcclxuICAgICAgY2FzZSBDb21wYW5pZXMuR1ZCOlxyXG4gICAgICAgIHJldHVybiB0aGlzLkRlY29kZU90aGVyKGRhdGEpO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYENvbXBhbnkgJHtjb21wYW55fSB1bmtub3duLmApXHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcblxyXG4gIH0gXHJcblxyXG4gIC8qKiBcclxuICAqIFRoaXMgaXMgdGhlIG1haW4gZGVjb2RpbmcgZnVuY3Rpb24uIEl0IHdvcmtzIGZvciBBcnJpdmEsIENvbm5leHhpb24sIEVCUywgUUJVWlosIFJJRyAoUkVUKSwgT1BFTk9WLCBESVRQXHJcbiAgKiBAcGFyYW0gZGF0YSBUaGUgcmVxdWlyZWQgZGF0YS4gSXQgc2hvdWxkIGJlIG9mIHR5cGUgXCJLVjZHZW5lcmljXCIsIHdoaWNoIHdvcmtzIGZvciB0aGUgY29tcGFuaWVzIG1lbnRpb25lZCBhYm92ZS5cclxuICAqIEByZXR1cm5zIEFuIGFycmF5IHdpdGggdGhlIGNvbnZlcnRlZCB2ZWhpY2xlZGF0YS5cclxuICAqL1xyXG4gIERlY29kZU1haW4gKGRhdGEgOiBLVjZHZW5lcmljKSA6IEFycmF5PFZlaGljbGVEYXRhPiB7XHJcbiAgICBjb25zdCByZXR1cm5EYXRhIDogQXJyYXk8VmVoaWNsZURhdGE+ID0gW107XHJcblxyXG4gICAgaWYoZGF0YS5WVl9UTV9QVVNILktWNnBvc2luZm8pIHtcclxuICAgICAgY29uc3Qga3Y2cG9zaW5mbyA9IGRhdGEuVlZfVE1fUFVTSC5LVjZwb3NpbmZvO1xyXG4gICAgICBpZihPYmplY3Qua2V5cyhrdjZwb3NpbmZvKS5sZW5ndGggPiAwKVxyXG4gICAgICAgIE9iamVjdC5rZXlzKGt2NnBvc2luZm8pLmZvckVhY2goVmVoaWNsZVN0YXR1c0NvZGUgPT4ge1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZihBcnJheS5pc0FycmF5KGt2NnBvc2luZm9bVmVoaWNsZVN0YXR1c0NvZGVdKSkge1xyXG4gICAgICAgICAgICBmb3IoY29uc3QgdmVoaWNsZURhdGEgb2Yga3Y2cG9zaW5mb1tWZWhpY2xlU3RhdHVzQ29kZV0pIHtcclxuICAgICAgICAgICAgICAvL1RPRE86IFRoaXMgbWF5YmUgaXMgc3R1cGlkLiBDYXVzZXMgdHlwZXMgd2l0aG91dCB2ZWhpY2xlTnVtYmVyIHRvIG5vdCBhcHBlYXIuXHJcbiAgICAgICAgICAgICAgaWYoIXZlaGljbGVEYXRhLnZlaGljbGVudW1iZXIpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgIHJldHVybkRhdGEucHVzaCh0aGlzLk1hcHBlcih2ZWhpY2xlRGF0YSwgVmVoaWNsZVN0YXR1c0NvZGUpKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2UgaWYoa3Y2cG9zaW5mb1tWZWhpY2xlU3RhdHVzQ29kZV0udmVoaWNsZW51bWJlcikgXHJcbiAgICAgICAgICAgIHJldHVybkRhdGEucHVzaCh0aGlzLk1hcHBlcihrdjZwb3NpbmZvW1ZlaGljbGVTdGF0dXNDb2RlXSwgVmVoaWNsZVN0YXR1c0NvZGUpKSAgICAgXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmV0dXJuRGF0YTtcclxuXHJcbiAgfVxyXG4gIC8qKiBcclxuICAqIFRoaXMgaXMgdGhlIHNlY29uZGFyeSBkZWNvZGluZyBmdW5jdGlvbi4gSXQgd29ya3MgZm9yIEtlb2xpcyBhbmQgR1ZCXHJcbiAgKiBAcGFyYW0gZGF0YSBUaGUgcmVxdWlyZWQgZGF0YS4gSXQgc2hvdWxkIGJlIG9mIHR5cGUgXCJLVjZHZW5lcmljXCIsIHdoaWNoIHdvcmtzIGZvciB0aGUgY29tcGFuaWVzIG1lbnRpb25lZCBhYm92ZS5cclxuICAqIEByZXR1cm5zIEFuIGFycmF5IHdpdGggdGhlIGNvbnZlcnRlZCB2ZWhpY2xlZGF0YS5cclxuICAqL1xyXG4gIERlY29kZU90aGVyKGRhdGEpIDogQXJyYXk8VmVoaWNsZURhdGE+IHtcclxuICAgIGNvbnN0IHJldHVybkRhdGEgOiBBcnJheTxWZWhpY2xlRGF0YT4gPSBbXTtcclxuXHJcbiAgICBpZihkYXRhLlZWX1RNX1BVU0guS1Y2cG9zaW5mbykge1xyXG4gICAgICBjb25zdCBrdjZwb3NpbmZvID0gZGF0YS5WVl9UTV9QVVNILktWNnBvc2luZm87XHJcbiAgICAgIGlmKEFycmF5LmlzQXJyYXkoa3Y2cG9zaW5mbykpIHtcclxuICAgICAgICBmb3IoY29uc3QgU3RhdHVzT2JqZWN0IG9mIGt2NnBvc2luZm8pIHtcclxuICAgICAgICAgIGNvbnN0IFZlaGljbGVTdGF0dXNDb2RlID0gT2JqZWN0LmtleXMoU3RhdHVzT2JqZWN0KVswXTtcclxuICAgICAgICAgIHJldHVybkRhdGEucHVzaCh0aGlzLk1hcHBlcihTdGF0dXNPYmplY3RbVmVoaWNsZVN0YXR1c0NvZGVdLCBWZWhpY2xlU3RhdHVzQ29kZSkpXHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnN0IFZlaGljbGVTdGF0dXNDb2RlID0gT2JqZWN0LmtleXMoa3Y2cG9zaW5mbylbMF07XHJcbiAgICAgICAgcmV0dXJuRGF0YS5wdXNoKHRoaXMuTWFwcGVyKGt2NnBvc2luZm9bVmVoaWNsZVN0YXR1c0NvZGVdLCBWZWhpY2xlU3RhdHVzQ29kZSkpXHJcbiAgICAgIH1cclxuICAgIH0gXHJcbiAgICByZXR1cm4gcmV0dXJuRGF0YTtcclxuICB9XHJcblxyXG4gIENoZWNrQ29tcGFueShvcGVyYXRvciA6IHN0cmluZykgOiBzdHJpbmcge1xyXG4gICAgbGV0IHJldHVybkNvbXBhbnkgOiBzdHJpbmc7XHJcbiAgICBPYmplY3QudmFsdWVzKENvbXBhbmllcykuZm9yRWFjaChjb21wYW55ID0+IHtcclxuICAgICAgaWYob3BlcmF0b3IuaW5jbHVkZXMoY29tcGFueSkpIHJldHVybkNvbXBhbnkgPSBjb21wYW55O1xyXG4gICAgfSlcclxuICAgIHJldHVybiByZXR1cm5Db21wYW55O1xyXG4gIH1cclxuXHJcbiAgTWFwcGVyKHZlaGljbGVQb3NEYXRhLCBzdGF0dXMgOiBzdHJpbmcpIHsgXHJcbiAgICBjb25zdCBuZXdEYXRhID0ge1xyXG4gICAgICBjb21wYW55OiB2ZWhpY2xlUG9zRGF0YS5kYXRhb3duZXJjb2RlLFxyXG4gICAgICBvcmlnaW5hbENvbXBhbnk6IHZlaGljbGVQb3NEYXRhLmRhdGFvd25lcmNvZGUsXHJcbiAgICAgIHBsYW5uaW5nTnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS5saW5lcGxhbm5pbmdudW1iZXIudG9TdHJpbmcoKSxcclxuICAgICAgam91cm5leU51bWJlcjogdmVoaWNsZVBvc0RhdGEuam91cm5leW51bWJlcixcclxuICAgICAgdGltZXN0YW1wOiBEYXRlLnBhcnNlKHZlaGljbGVQb3NEYXRhLnRpbWVzdGFtcCksXHJcbiAgICAgIHZlaGljbGVOdW1iZXI6IHZlaGljbGVQb3NEYXRhLnZlaGljbGVudW1iZXIgPyB2ZWhpY2xlUG9zRGF0YS52ZWhpY2xlbnVtYmVyIDogOTk5OTk5LFxyXG4gICAgICBsaW5lTnVtYmVyOiBcIk9uYmVrZW5kXCIsXHJcbiAgICAgIHBvc2l0aW9uOiB0aGlzLnJkVG9MYXRMb25nKHZlaGljbGVQb3NEYXRhWydyZC14J10sIHZlaGljbGVQb3NEYXRhWydyZC15J10pLFxyXG4gICAgICBwdW5jdHVhbGl0eTogW3ZlaGljbGVQb3NEYXRhLnB1bmN0dWFsaXR5XSxcclxuICAgICAgc3RhdHVzOiB2ZWhpY2xlU3RhdGVbc3RhdHVzXSxcclxuICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICB1cGRhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgIHVwZGF0ZWRUaW1lczogW0RhdGUubm93KCldLFxyXG4gICAgICBjdXJyZW50Um91dGVJZDogMCxcclxuICAgICAgY3VycmVudFRyaXBJZDogMFxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBuZXdEYXRhO1xyXG4gIH0gXHJcblxyXG4gIFxyXG4gIHJkVG9MYXRMb25nICh4LCB5KSA6IFtudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgaWYoeCA9PT0gdW5kZWZpbmVkIHx8IHkgPT09IHVuZGVmaW5lZCkgcmV0dXJuIFswLCAwXTtcclxuXHJcbiAgICBjb25zdCBkWCA9ICh4IC0gMTU1MDAwKSAqIE1hdGgucG93KDEwLCAtNSk7XHJcbiAgICBjb25zdCBkWSA9ICh5IC0gNDYzMDAwKSAqIE1hdGgucG93KDEwLCAtNSk7XHJcbiAgICBjb25zdCBTb21OID0gKDMyMzUuNjUzODkgKiBkWSkgKyAoLTMyLjU4Mjk3ICogTWF0aC5wb3coZFgsIDIpKSArICgtMC4yNDc1ICpcclxuICAgICAgTWF0aC5wb3coZFksIDIpKSArICgtMC44NDk3OCAqIE1hdGgucG93KGRYLCAyKSAqXHJcbiAgICAgIGRZKSArICgtMC4wNjU1ICogTWF0aC5wb3coZFksIDMpKSArICgtMC4wMTcwOSAqXHJcbiAgICAgIE1hdGgucG93KGRYLCAyKSAqIE1hdGgucG93KGRZLCAyKSkgKyAoLTAuMDA3MzggKlxyXG4gICAgICBkWCkgKyAoMC4wMDUzICogTWF0aC5wb3coZFgsIDQpKSArICgtMC4wMDAzOSAqXHJcbiAgICAgIE1hdGgucG93KGRYLCAyKSAqIE1hdGgucG93KGRZLCAzKSkgKyAoMC4wMDAzMyAqIE1hdGgucG93KFxyXG4gICAgICBkWCwgNCkgKiBkWSkgKyAoLTAuMDAwMTIgKlxyXG4gICAgICBkWCAqIGRZKTtcclxuICAgIGNvbnN0IFNvbUUgPSAoNTI2MC41MjkxNiAqIGRYKSArICgxMDUuOTQ2ODQgKiBkWCAqIGRZKSArICgyLjQ1NjU2ICpcclxuICAgICAgZFggKiBNYXRoLnBvdyhkWSwgMikpICsgKC0wLjgxODg1ICogTWF0aC5wb3coXHJcbiAgICAgIGRYLCAzKSkgKyAoMC4wNTU5NCAqXHJcbiAgICAgIGRYICogTWF0aC5wb3coZFksIDMpKSArICgtMC4wNTYwNyAqIE1hdGgucG93KFxyXG4gICAgICBkWCwgMykgKiBkWSkgKyAoMC4wMTE5OSAqXHJcbiAgICAgIGRZKSArICgtMC4wMDI1NiAqIE1hdGgucG93KGRYLCAzKSAqIE1hdGgucG93KFxyXG4gICAgICBkWSwgMikpICsgKDAuMDAxMjggKlxyXG4gICAgICBkWCAqIE1hdGgucG93KGRZLCA0KSkgKyAoMC4wMDAyMiAqIE1hdGgucG93KGRZLFxyXG4gICAgICAyKSkgKyAoLTAuMDAwMjIgKiBNYXRoLnBvdyhcclxuICAgICAgZFgsIDIpKSArICgwLjAwMDI2ICpcclxuICAgICAgTWF0aC5wb3coZFgsIDUpKTtcclxuICAgIFxyXG4gICAgY29uc3QgTGF0aXR1ZGUgPSA1Mi4xNTUxNyArIChTb21OIC8gMzYwMCk7XHJcbiAgICBjb25zdCBMb25naXR1ZGUgPSA1LjM4NzIwNiArIChTb21FIC8gMzYwMCk7XHJcbiAgICBcclxuICAgIHJldHVybiBbTG9uZ2l0dWRlLCBMYXRpdHVkZV1cclxuICB9XHJcblxyXG59IiwiaW1wb3J0IHsgQ29ubmVjdGlvbiwgTW9kZWwsIE1vbmdvb3NlLCBGaWx0ZXJRdWVyeSwgU2NoZW1hIH0gZnJvbSAnbW9uZ29vc2UnO1xyXG5pbXBvcnQgeyBUcmlwIH0gZnJvbSAnLi90eXBlcy9UcmlwJztcclxuaW1wb3J0IHsgVmVoaWNsZURhdGEsIHZlaGljbGVTdGF0ZSB9IGZyb20gJy4vdHlwZXMvVmVoaWNsZURhdGEnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgUm91dGUgfSBmcm9tICcuL3R5cGVzL1JvdXRlJztcclxuaW1wb3J0IHsgVHJpcFBvc2l0aW9uRGF0YSB9IGZyb20gJy4vdHlwZXMvVHJpcFBvc2l0aW9uRGF0YSc7XHJcbmltcG9ydCB7IFdlYnNvY2tldFZlaGljbGVEYXRhIH0gZnJvbSAnLi90eXBlcy9XZWJzb2NrZXRWZWhpY2xlRGF0YSc7XHJcbmNvbnN0IHN0cmVhbVRvTW9uZ29EQiA9IHJlcXVpcmUoJ3N0cmVhbS10by1tb25nby1kYicpLnN0cmVhbVRvTW9uZ29EQjtcclxuY29uc3Qgc3BsaXQgPSByZXF1aXJlKCdzcGxpdCcpO1xyXG5leHBvcnQgY2xhc3MgRGF0YWJhc2Uge1xyXG4gIFxyXG4gIHByaXZhdGUgc3RhdGljIGluc3RhbmNlIDogRGF0YWJhc2U7XHJcbiAgXHJcbiAgcHJpdmF0ZSBkYiA6IENvbm5lY3Rpb247XHJcbiAgcHJpdmF0ZSBtb25nb29zZSA6IE1vbmdvb3NlO1xyXG4gIHByaXZhdGUgdmVoaWNsZVNjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIHRyaXBzU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgcm91dGVzU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgZHJpdmVuUm91dGVzU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgdmVoaWNsZU1vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgdHJpcE1vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgcm91dGVzTW9kZWwgOiB0eXBlb2YgTW9kZWw7XHJcbiAgcHJpdmF0ZSBkcml2ZW5Sb3V0ZXNNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIG91dHB1dERCQ29uZmlnO1xyXG5cclxuICBwdWJsaWMgc3RhdGljIGdldEluc3RhbmNlKCk6IERhdGFiYXNlIHtcclxuICAgIGlmKCFEYXRhYmFzZS5pbnN0YW5jZSlcclxuICAgICAgRGF0YWJhc2UuaW5zdGFuY2UgPSBuZXcgRGF0YWJhc2UoKTtcclxuXHJcbiAgICByZXR1cm4gRGF0YWJhc2UuaW5zdGFuY2U7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgSW5pdCgpIHtcclxuICAgIGNvbnN0IHVybCA6IHN0cmluZyA9IHByb2Nlc3MuZW52LkRBVEFCQVNFX1VSTDtcclxuICAgIGNvbnN0IG5hbWUgOiBzdHJpbmcgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9OQU1FO1xyXG5cclxuICAgIHRoaXMubW9uZ29vc2UgPSBuZXcgTW9uZ29vc2UoKTtcclxuICAgIFxyXG4gICAgdGhpcy5tb25nb29zZS5zZXQoJ3VzZUZpbmRBbmRNb2RpZnknLCBmYWxzZSlcclxuXHJcbiAgICBpZighdXJsICYmICFuYW1lKSB0aHJvdyAoYEludmFsaWQgVVJMIG9yIG5hbWUgZ2l2ZW4sIHJlY2VpdmVkOiBcXG4gTmFtZTogJHtuYW1lfSBcXG4gVVJMOiAke3VybH1gKVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBDb25uZWN0aW5nIHRvIGRhdGFiYXNlIHdpdGggbmFtZTogJHtuYW1lfSBhdCB1cmw6ICR7dXJsfWApXHJcbiAgICB0aGlzLm1vbmdvb3NlLmNvbm5lY3QoYCR7dXJsfS8ke25hbWV9YCwge1xyXG4gICAgICB1c2VOZXdVcmxQYXJzZXI6IHRydWUsXHJcbiAgICAgIHVzZVVuaWZpZWRUb3BvbG9neTogdHJ1ZSxcclxuICAgICAgcG9vbFNpemU6IDEyMFxyXG4gICAgfSlcclxuXHJcbiAgICB0aGlzLmRiID0gdGhpcy5tb25nb29zZS5jb25uZWN0aW9uO1xyXG5cclxuICAgIHRoaXMub3V0cHV0REJDb25maWcgPSB7IGRiVVJMIDogYCR7dXJsfS8ke25hbWV9YCwgY29sbGVjdGlvbiA6ICd0cmlwcycgfTtcclxuXHJcbiAgICB0aGlzLmRiLm9uKCdlcnJvcicsIGVycm9yID0+IHtcclxuICAgICAgdGhyb3cgbmV3IGVycm9yKGBFcnJvciBjb25uZWN0aW5nIHRvIGRhdGFiYXNlLiAke2Vycm9yfWApO1xyXG4gICAgfSlcclxuXHJcbiAgICBhd2FpdCB0aGlzLkRhdGFiYXNlTGlzdGVuZXIoKTtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBHZXREYXRhYmFzZSgpIDogQ29ubmVjdGlvbiB7XHJcbiAgICByZXR1cm4gdGhpcy5kYjtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBEYXRhYmFzZUxpc3RlbmVyICgpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcclxuICAgICAgICB0aGlzLmRiLm9uY2UoXCJvcGVuXCIsICgpID0+IHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdGlvbiB0byBkYXRhYmFzZSBlc3RhYmxpc2hlZC5cIilcclxuXHJcbiAgICAgICAgICB0aGlzLnZlaGljbGVTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIG9yaWdpbmFsQ29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICBwbGFubmluZ051bWJlcjogU3RyaW5nLFxyXG4gICAgICAgICAgICBqb3VybmV5TnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogTnVtYmVyLFxyXG4gICAgICAgICAgICB2ZWhpY2xlTnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBbTnVtYmVyLCBOdW1iZXJdLFxyXG4gICAgICAgICAgICBzdGF0dXM6IFN0cmluZyxcclxuICAgICAgICAgICAgbGluZU51bWJlcjogU3RyaW5nLFxyXG4gICAgICAgICAgICBwdW5jdHVhbGl0eTogQXJyYXksXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogTnVtYmVyLFxyXG4gICAgICAgICAgICB1cGRhdGVkQXQ6IE51bWJlcixcclxuICAgICAgICAgICAgdXBkYXRlZFRpbWVzOiBBcnJheSxcclxuICAgICAgICAgICAgY3VycmVudFJvdXRlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgY3VycmVudFRyaXBJZDogTnVtYmVyLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHRoaXMudHJpcHNTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgc2VydmljZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRyaXBJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB0cmlwTnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRyaXBQbGFubmluZ051bWJlcjogU3RyaW5nLFxyXG4gICAgICAgICAgICB0cmlwSGVhZHNpZ246IFN0cmluZyxcclxuICAgICAgICAgICAgdHJpcE5hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgZGlyZWN0aW9uSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgc2hhcGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB3aGVlbGNoYWlyQWNjZXNzaWJsZTogTnVtYmVyXHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIHRoaXMucm91dGVzU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgcm91dGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHN1YkNvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVTaG9ydE5hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVMb25nTmFtZTogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZURlc2NyaXB0aW9uOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlVHlwZTogTnVtYmVyLFxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLmRyaXZlblJvdXRlc1NjaGVtYSA9IG5ldyB0aGlzLm1vbmdvb3NlLlNjaGVtYSh7XHJcbiAgICAgICAgICAgIHRyaXBJZCA6IE51bWJlcixcclxuICAgICAgICAgICAgY29tcGFueSA6IFN0cmluZyxcclxuICAgICAgICAgICAgcG9zaXRpb25zOiBBcnJheSxcclxuICAgICAgICAgICAgdXBkYXRlZFRpbWVzIDogQXJyYXlcclxuICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgdGhpcy50cmlwc1NjaGVtYS5pbmRleCh7IHRyaXBOdW1iZXI6IC0xLCB0cmlwUGxhbm5pbmdOdW1iZXI6IC0xLCBjb21wYW55OiAtMSB9KVxyXG4gICAgICAgICAgdGhpcy5kcml2ZW5Sb3V0ZXNTY2hlbWEuaW5kZXgoeyB0cmlwSWQ6IC0xLCBjb21wYW55OiAtMSB9KVxyXG5cclxuICAgICAgICAgIHRoaXMudmVoaWNsZU1vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcIlZlaGljbGVQb3NpdGlvbnNcIiwgdGhpcy52ZWhpY2xlU2NoZW1hKTtcclxuICAgICAgICAgIHRoaXMudHJpcE1vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcInRyaXBzXCIsIHRoaXMudHJpcHNTY2hlbWEpO1xyXG4gICAgICAgICAgdGhpcy5yb3V0ZXNNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJyb3V0ZXNcIiwgdGhpcy5yb3V0ZXNTY2hlbWEpO1xyXG4gICAgICAgICAgdGhpcy5kcml2ZW5Sb3V0ZXNNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJkcml2ZW5yb3V0ZXNcIiwgdGhpcy5kcml2ZW5Sb3V0ZXNTY2hlbWEpO1xyXG5cclxuICAgICAgICAgIHRoaXMudHJpcE1vZGVsLmNyZWF0ZUluZGV4ZXMoKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgcmVzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0QWxsVmVoaWNsZXMgKGFyZ3MgPSB7fSkgOiBQcm9taXNlPEFycmF5PFZlaGljbGVEYXRhPj4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmQoey4uLmFyZ3N9LCB7IHB1bmN0dWFsaXR5OiAwLCB1cGRhdGVkVGltZXM6IDAsIF9fdiA6IDAgfSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0QWxsVmVoaWNsZXNTbWFsbCAoYXJncyA9IHt9KSA6IFByb21pc2U8QXJyYXk8V2Vic29ja2V0VmVoaWNsZURhdGE+PiB7XHJcbiAgICBjb25zdCBzbWFsbEJ1c3NlcyA6IEFycmF5PFdlYnNvY2tldFZlaGljbGVEYXRhPiA9IFtdO1xyXG5cclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmQoey4uLmFyZ3N9LFxyXG4gICAgICB7IFxyXG4gICAgICBwdW5jdHVhbGl0eTogMCwgXHJcbiAgICAgIHVwZGF0ZWRUaW1lczogMCwgXHJcbiAgICAgIF9fdiA6IDAsXHJcbiAgICAgIGpvdXJuZXlOdW1iZXI6IDAsXHJcbiAgICAgIHRpbWVzdGFtcCA6IDAsXHJcbiAgICAgIGNyZWF0ZWRBdDogMCxcclxuICAgICAgdXBkYXRlZEF0OiAwLFxyXG4gICAgICBjdXJyZW50Um91dGVJZDogMCxcclxuICAgICAgY3VycmVudFRyaXBJZDogMCxcclxuICAgICAgcGxhbm5pbmdOdW1iZXI6IDAsXHJcbiAgICAgIHN0YXR1czogMFxyXG4gICAgfSlcclxuXHJcbiAgICByZXN1bHQuZm9yRWFjaChyZXMgPT4ge1xyXG4gICAgICBzbWFsbEJ1c3Nlcy5wdXNoKHtcclxuICAgICAgICBwOiByZXMucG9zaXRpb24sXHJcbiAgICAgICAgYzogcmVzLmNvbXBhbnksXHJcbiAgICAgICAgdjogcmVzLnZlaGljbGVOdW1iZXIsXHJcbiAgICAgICAgbjogcmVzLmxpbmVOdW1iZXJcclxuICAgICAgfSlcclxuICAgIH0pXHJcblxyXG4gICAgcmV0dXJuIHNtYWxsQnVzc2VzO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFZlaGljbGUgKHZlaGljbGVOdW1iZXIsIHRyYW5zcG9ydGVyLCBmaXJzdE9ubHkgOiBib29sZWFuID0gZmFsc2UpIDogUHJvbWlzZTxWZWhpY2xlRGF0YT4ge1xyXG4gICAgcmV0dXJuIHsgXHJcbiAgICAgIC4uLmF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmRPbmUoe1xyXG4gICAgICAgIHZlaGljbGVOdW1iZXIgOiB2ZWhpY2xlTnVtYmVyLFxyXG4gICAgICAgIGNvbXBhbnk6IHRyYW5zcG9ydGVyXHJcbiAgICAgIH0pXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFZlaGljbGVFeGlzdHModmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIpIDogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5HZXRWZWhpY2xlKHZlaGljbGVOdW1iZXIsIHRyYW5zcG9ydGVyKSAhPT0gbnVsbDtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBVcGRhdGVWZWhpY2xlICh2ZWhpY2xlVG9VcGRhdGUgOiBhbnksIHVwZGF0ZWRWZWhpY2xlRGF0YSA6IFZlaGljbGVEYXRhLCBwb3NpdGlvbkNoZWNrcyA6IGJvb2xlYW4gPSBmYWxzZSkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmRPbmVBbmRVcGRhdGUodmVoaWNsZVRvVXBkYXRlLCB1cGRhdGVkVmVoaWNsZURhdGEpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEFkZFZlaGljbGUgKHZlaGljbGUgOiBWZWhpY2xlRGF0YSwgb25seUFkZFdoaWxlT25Sb3V0ZSA6IGJvb2xlYW4pIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZihvbmx5QWRkV2hpbGVPblJvdXRlICYmIHZlaGljbGUuc3RhdHVzICE9PSB2ZWhpY2xlU3RhdGUuT05ST1VURSkgcmV0dXJuO1xyXG4gICAgbmV3IHRoaXMudmVoaWNsZU1vZGVsKHtcclxuICAgICAgLi4udmVoaWNsZSxcclxuICAgICAgcHVuY3R1YWxpdHkgOiB2ZWhpY2xlLnB1bmN0dWFsaXR5XHJcbiAgICB9KS5zYXZlKGVycm9yID0+IHtcclxuICAgICAgaWYoZXJyb3IpIGNvbnNvbGUuZXJyb3IoYFNvbWV0aGluZyB3ZW50IHdyb25nIHdoaWxlIHRyeWluZyB0byBhZGQgdmVoaWNsZTogJHt2ZWhpY2xlLnZlaGljbGVOdW1iZXJ9LiBFcnJvcjogJHtlcnJvcn1gKVxyXG4gICAgfSlcclxuICB9XHJcbiAgXHJcbiAgcHVibGljIGFzeW5jIFJlbW92ZVZlaGljbGUgKHZlaGljbGUgOiBWZWhpY2xlRGF0YSkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKCF2ZWhpY2xlW1wiX2RvY1wiXSkgcmV0dXJuXHJcblxyXG4gICAgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZUFuZERlbGV0ZSh2ZWhpY2xlKVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFJlbW92ZVZlaGljbGVzV2hlcmUoIHBhcmFtcyA6IG9iamVjdCwgZG9Mb2dnaW5nIDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8QXJyYXk8VmVoaWNsZURhdGE+PiB7XHJcbiAgICBjb25zdCByZW1vdmVkVmVoaWNsZXMgOiBBcnJheTxWZWhpY2xlRGF0YT4gPSBhd2FpdCB0aGlzLkdldEFsbFZlaGljbGVzKHBhcmFtcyk7XHJcbiAgICB0aGlzLnZlaGljbGVNb2RlbC5kZWxldGVNYW55KHBhcmFtcykudGhlbihyZXNwb25zZSA9PiB7XHJcbiAgICAgIGlmKGRvTG9nZ2luZykgY29uc29sZS5sb2coYERlbGV0ZWQgJHtyZXNwb25zZS5kZWxldGVkQ291bnR9IHZlaGljbGVzLmApO1xyXG4gICAgICBcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHJlbW92ZWRWZWhpY2xlcztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRUcmlwcyhwYXJhbXMgOiBvYmplY3QgPSB7fSkgOiBQcm9taXNlPEFycmF5PFRyaXA+PiB7XHJcbiAgICByZXR1cm4gYXdhaXQgdGhpcy50cmlwTW9kZWwuZmluZChwYXJhbXMpXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0VHJpcCh0cmlwTnVtYmVyIDogbnVtYmVyLCB0cmlwUGxhbm5pbmdOdW1iZXIgOiBzdHJpbmcsIGNvbXBhbnkgOiBzdHJpbmcpIHtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMudHJpcE1vZGVsLmZpbmRPbmUoe1xyXG4gICAgICBjb21wYW55OiBjb21wYW55LFxyXG4gICAgICB0cmlwTnVtYmVyIDogdHJpcE51bWJlcixcclxuICAgICAgdHJpcFBsYW5uaW5nTnVtYmVyOiB0cmlwUGxhbm5pbmdOdW1iZXJcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiByZXNwb25zZSAhPT0gbnVsbCA/IHJlc3BvbnNlIDoge307XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgUmVtb3ZlVHJpcChwYXJhbXMgOiBvYmplY3QgPSB7fSwgZG9Mb2dnaW5nIDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy50cmlwTW9kZWwuZGVsZXRlTWFueShwYXJhbXMpLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICBpZihkb0xvZ2dpbmcpIGNvbnNvbGUubG9nKGBEZWxldGVkICR7cmVzcG9uc2UuZGVsZXRlZENvdW50fSB0cmlwc2ApO1xyXG4gICAgfSlcclxuICB9XHJcbiAgLyoqXHJcbiAgICogSW5zZXJ0cyBtYW55IHRyaXBzIGF0IG9uY2UgaW50byB0aGUgZGF0YWJhc2UuXHJcbiAgICogQHBhcmFtIHRyaXBzIFRoZSB0cmlwcyB0byBhZGQuXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIEluc2VydE1hbnlUcmlwcyh0cmlwcykgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgYXdhaXQgdGhpcy50cmlwTW9kZWwuaW5zZXJ0TWFueSh0cmlwcywgeyBvcmRlcmVkOiBmYWxzZSB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSBcIktvcHBlbHZsYWsgNyBhbmQgOCB0dXJib1wiIGZpbGVzIHRvIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBJbnNlcnRUcmlwKHRyaXAgOiBUcmlwKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgbmV3IHRoaXMudHJpcE1vZGVsKHRyaXApLnNhdmUoZXJyb3IgPT4ge1xyXG4gICAgICBpZihlcnJvcikgY29uc29sZS5lcnJvcihgU29tZXRoaW5nIHdlbnQgd3Jvbmcgd2hpbGUgdHJ5aW5nIHRvIGFkZCB0cmlwOiAke3RyaXAudHJpcEhlYWRzaWdufS4gRXJyb3I6ICR7ZXJyb3J9YClcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgRHJvcFRyaXBzQ29sbGVjdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBpbmcgdHJpcHMgY29sbGVjdGlvblwiKTtcclxuICAgIGF3YWl0IHRoaXMudHJpcE1vZGVsLnJlbW92ZSh7fSk7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwZWQgdHJpcHMgY29sbGVjdGlvblwiKTtcclxuICB9XHJcbiAgcHVibGljIGFzeW5jIERyb3BSb3V0ZXNDb2xsZWN0aW9uKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGluZyByb3V0ZXMgY29sbGVjdGlvblwiKTtcclxuICAgIGF3YWl0IHRoaXMucm91dGVzTW9kZWwucmVtb3ZlKHt9KTtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBlZCByb3V0ZXMgY29sbGVjdGlvblwiKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRSb3V0ZShyb3V0ZUlkIDogbnVtYmVyKSA6IFByb21pc2U8Um91dGU+IHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5yb3V0ZXNNb2RlbC5maW5kT25lKHtcclxuICAgICAgcm91dGVJZCA6IHJvdXRlSWQsXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcmVzcG9uc2UgIT09IG51bGwgPyByZXNwb25zZSA6IHt9O1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFVwZGF0ZVRyaXBQb3NpdGlvbnModHJpcElkLCBjb21wYW55LCB0cmlwRGF0YSA6IFRyaXBQb3NpdGlvbkRhdGEpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLmRyaXZlblJvdXRlc01vZGVsLmZpbmRPbmVBbmRVcGRhdGUoXHJcbiAgICAgIHtcclxuICAgICAgICB0cmlwSWQgOiB0cmlwSWQsXHJcbiAgICAgICAgY29tcGFueSA6IGNvbXBhbnlcclxuICAgICAgfSwgXHJcbiAgICAgIHRyaXBEYXRhLCBcclxuICAgICAgeyB1cHNlcnQgOiB0cnVlIH1cclxuICAgIClcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRUcmlwUG9zaXRpb25zKHRyaXBJZCA6IG51bWJlciwgY29tcGFueSA6IHN0cmluZykgOiBQcm9taXNlPFRyaXBQb3NpdGlvbkRhdGE+IHtcclxuICAgIHJldHVybiBhd2FpdCB0aGlzLmRyaXZlblJvdXRlc01vZGVsLmZpbmRPbmUoeyBcclxuICAgICAgdHJpcElkOiB0cmlwSWQsXHJcbiAgICAgIGNvbXBhbnk6IGNvbXBhbnksXHJcbiAgICB9KVxyXG5cclxuXHJcbiAgfVxyXG5cclxuICAvLyBwdWJsaWMgYXN5bmMgQWRkUm91dGUoKVxyXG5cclxufVxyXG4iLCIvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBBUFAgQ09ORklHXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5cclxuaW1wb3J0ICogYXMgZG90ZW52IGZyb20gJ2RvdGVudic7XHJcbmRvdGVudi5jb25maWcoKTtcclxuXHJcbmNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDMwMDI7XHJcblxyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBZQVJOIElNUE9SVFNcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcbmltcG9ydCAqIGFzIGh0dHBzIGZyb20gJ2h0dHBzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5cclxuY29uc3QgZXhwcmVzcyA9IHJlcXVpcmUoXCJleHByZXNzXCIpO1xyXG5jb25zdCBjb3JzID0gcmVxdWlyZShcImNvcnNcIik7XHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICBDVVNUT00gSU1QT1JUU1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuXHJcbmltcG9ydCB7IERhdGFiYXNlIH0gZnJvbSAnLi9kYXRhYmFzZSc7XHJcbmltcG9ydCB7IFdlYnNvY2tldCB9IGZyb20gJy4vc29ja2V0JztcclxuaW1wb3J0IHsgT1ZEYXRhIH0gZnJvbSAnLi9yZWFsdGltZSc7XHJcblxyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBTU0wgQ09ORklHXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5jb25zdCBwcml2YXRlS2V5ID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9rZXkua2V5XCIpLnRvU3RyaW5nKCk7XHJcbmNvbnN0IGNlcnRpZmljYXRlID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9jZXJ0LmNydFwiKS50b1N0cmluZygpO1xyXG5jb25zdCBjYSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUva2V5LWNhLmNydFwiKS50b1N0cmluZygpO1xyXG5cclxuY29uc3QgQXBwSW5pdCA9IGFzeW5jICgpID0+IHtcclxuICBjb25zdCBkYiA9IGF3YWl0IERhdGFiYXNlLmdldEluc3RhbmNlKCkuSW5pdCgpLnRoZW4oKTtcclxuICBcclxuICBjb25zdCBhcHAgPSAobW9kdWxlLmV4cG9ydHMgPSBleHByZXNzKCkpO1xyXG5cclxuICBjb25zdCBzZXJ2ZXIgPSBodHRwcy5jcmVhdGVTZXJ2ZXIoXHJcbiAgICB7XHJcbiAgICAgIGtleTogcHJpdmF0ZUtleSxcclxuICAgICAgY2VydDogY2VydGlmaWNhdGUsXHJcbiAgICAgIGNhOiBjYSxcclxuICAgICAgcmVxdWVzdENlcnQ6IHRydWUsXHJcbiAgICAgIHJlamVjdFVuYXV0aG9yaXplZDogZmFsc2UsXHJcbiAgICB9LFxyXG4gICAgYXBwXHJcbiAgKTtcclxuICBcclxuXHJcbiAgLy9USElTIElTIE5PVCBTQUZFXHJcblxyXG4gIGNvbnN0IGNvcnNPcHRpb25zID0ge1xyXG4gICAgb3JpZ2luOiAnKicsXHJcbiAgICBvcHRpb25zU3VjY2Vzc1N0YXR1czogMjAwXHJcbiAgfVxyXG5cclxuICBhcHAudXNlKGNvcnMoY29yc09wdGlvbnMpKVxyXG4gIGFwcC5vcHRpb25zKCcqJywgY29ycygpKVxyXG5cclxuXHJcbiAgY29uc3Qgc29ja2V0ID0gbmV3IFdlYnNvY2tldChzZXJ2ZXIsIGRiKTtcclxuICBjb25zdCBvdiA9IG5ldyBPVkRhdGEoZGIsIHNvY2tldCk7XHJcbiAgLy9idXNMb2dpYy5Jbml0S1Y3OCgpO1xyXG4gIFxyXG4gIHNlcnZlci5saXN0ZW4ocG9ydCwgKCkgPT4gY29uc29sZS5sb2coYExpc3RlbmluZyBhdCBodHRwOi8vbG9jYWxob3N0OiR7cG9ydH1gKSk7XHJcblxyXG59XHJcblxyXG5BcHBJbml0KCk7XHJcbiIsImltcG9ydCB7IGd1bnppcCB9IGZyb20gJ3psaWInO1xyXG5pbXBvcnQgeyBDb252ZXJ0ZXIgfSBmcm9tICcuL2NvbnZlcnRlcic7XHJcbmltcG9ydCB7IEJ1c0xvZ2ljIH0gZnJvbSBcIi4vYnVzbG9naWNcIjtcclxuXHJcbmltcG9ydCAqIGFzIHhtbCBmcm9tICdmYXN0LXhtbC1wYXJzZXInO1xyXG5pbXBvcnQgeyBXZWJzb2NrZXQgfSBmcm9tIFwiLi9zb2NrZXRcIjtcclxuXHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tICcuL2RhdGFiYXNlJztcclxuXHJcbi8vIGNvbnN0IHptcSA9IHJlcXVpcmUoJ3plcm9tcScpO1xyXG5pbXBvcnQgKiBhcyB6bXEgZnJvbSAnemVyb21xJztcclxuaW1wb3J0IHsgVmVoaWNsZURhdGEgfSBmcm9tICcuL3R5cGVzL1ZlaGljbGVEYXRhJztcclxuZXhwb3J0IGNsYXNzIE9WRGF0YSB7XHJcbiAgXHJcbiAgcHJpdmF0ZSBzb2NrIDogem1xLlNvY2tldDtcclxuICAvL3ByaXZhdGUga3Y3OHNvY2tldDtcclxuICBwcml2YXRlIGJ1c0xvZ2ljIDogQnVzTG9naWM7XHJcbiAgcHJpdmF0ZSB3ZWJzb2NrZXQgOiBXZWJzb2NrZXQ7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGRhdGFiYXNlIDogRGF0YWJhc2UsIHNvY2tldCA6IFdlYnNvY2tldCkge1xyXG4gICAgdGhpcy53ZWJzb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICB0aGlzLkluaXQoKTtcclxuICAgIHRoaXMuYnVzTG9naWMgPSBuZXcgQnVzTG9naWMoZGF0YWJhc2UsIGZhbHNlKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBJbml0KCkge1xyXG5cclxuICAgIGNvbnN0IGNvbnZlcnRlciA9IG5ldyBDb252ZXJ0ZXIoKTtcclxuXHJcbiAgICB0aGlzLnNvY2sgPSB6bXEuc29ja2V0KFwic3ViXCIpO1xyXG5cclxuICAgIHRoaXMuc29jay5jb25uZWN0KFwidGNwOi8vcHVic3ViLm5kb3Zsb2tldC5ubDo3NjU4XCIpO1xyXG4gICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9BUlIvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvQ1hYL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL0RJVFAvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvRUJTL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL0dWQi9LVjZwb3NpbmZvXCIpO1xyXG4gICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9PUEVOT1YvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvUUJVWlovS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvUklHL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL0tFT0xJUy9LVjZwb3NpbmZvXCIpO1xyXG5cclxuICAgIFxyXG5cclxuICAgIHRoaXMuc29jay5vbihcIm1lc3NhZ2VcIiwgKG9wQ29kZSA6IGFueSwgLi4uY29udGVudCA6IGFueSkgPT4ge1xyXG4gICAgICBjb25zdCBjb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoY29udGVudCk7XHJcbiAgICAgIGNvbnN0IG9wZXJhdG9yID0gb3BDb2RlLnRvU3RyaW5nKCk7XHJcbiAgICAgIGd1bnppcChjb250ZW50cywgYXN5bmMoZXJyb3IsIGJ1ZmZlcikgPT4ge1xyXG4gICAgICAgIGlmKGVycm9yKSByZXR1cm4gY29uc29sZS5lcnJvcihgU29tZXRoaW5nIHdlbnQgd3Jvbmcgd2hpbGUgdHJ5aW5nIHRvIHVuemlwLiAke2Vycm9yfWApXHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgZW5jb2RlZFhNTCA9IGJ1ZmZlci50b1N0cmluZygpO1xyXG4gICAgICAgIGNvbnN0IGRlY29kZWQgPSB4bWwucGFyc2UodGhpcy5yZW1vdmVUbWk4KGVuY29kZWRYTUwpKTtcclxuICAgICAgICBsZXQgdmVoaWNsZURhdGEgOiBBcnJheTxWZWhpY2xlRGF0YT4gPSBjb252ZXJ0ZXIuZGVjb2RlKGRlY29kZWQsIG9wZXJhdG9yKTtcclxuICAgICAgICBcclxuICAgICAgICBhd2FpdCB0aGlzLmJ1c0xvZ2ljLlVwZGF0ZUJ1c3Nlcyh2ZWhpY2xlRGF0YSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgfSlcclxuXHJcbiAgICB9KVxyXG4gICAgXHJcbiAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgIHRoaXMud2Vic29ja2V0LkVtaXQoKTtcclxuICAgIH0sIHBhcnNlSW50KHByb2Nlc3MuZW52LkFQUF9CVVNfVVBEQVRFX0RFTEFZKSlcclxuICAgIFxyXG4gICAgLy8gdGhpcy5rdjc4c29ja2V0ID0gem1xLnNvY2tldChcInN1YlwiKTtcclxuICAgIC8vIHRoaXMua3Y3OHNvY2tldC5jb25uZWN0KFwidGNwOi8vcHVic3ViLm5kb3Zsb2tldC5ubDo3ODE3XCIpO1xyXG4gICAgLy8gdGhpcy5rdjc4c29ja2V0LnN1YnNjcmliZShcIi9cIilcclxuICAgIC8vIHRoaXMua3Y3OHNvY2tldC5vbihcIm1lc3NhZ2VcIiwgKG9wQ29kZSwgLi4uY29udGVudCkgPT4ge1xyXG4gICAgLy8gICBjb25zdCBjb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoY29udGVudCk7XHJcbiAgICAvLyAgIGd1bnppcChjb250ZW50cywgYXN5bmMoZXJyb3IsIGJ1ZmZlcikgPT4geyBcclxuICAgIC8vICAgICBjb25zb2xlLmxvZyhidWZmZXIudG9TdHJpbmcoJ3V0ZjgnKSlcclxuICAgIC8vICAgfSk7XHJcbiAgICAvLyB9KTtcclxuICB9XHJcblxyXG4gIHJlbW92ZVRtaTggKGRhdGEpIDogYW55IHtcclxuICAgIHJldHVybiBkYXRhLnJlcGxhY2UoL3RtaTg6L2csIFwiXCIpO1xyXG4gIH1cclxufSIsImltcG9ydCB7IFZlaGljbGVEYXRhIH0gZnJvbSBcIi4vdHlwZXMvVmVoaWNsZURhdGFcIjtcclxuaW1wb3J0IHsgU2VydmVyIH0gZnJvbSAnaHR0cHMnO1xyXG5pbXBvcnQgeyBTb2NrZXQgfSBmcm9tICdzb2NrZXQuaW8nO1xyXG5pbXBvcnQgeyBEYXRhYmFzZSB9IGZyb20gJy4vZGF0YWJhc2UnO1xyXG5pbXBvcnQgeyBXZWJzb2NrZXRWZWhpY2xlRGF0YSB9IGZyb20gXCIuL3R5cGVzL1dlYnNvY2tldFZlaGljbGVEYXRhXCI7XHJcblxyXG5jb25zdCBidXNfdXBkYXRlX3JhdGUgPSBwYXJzZUludChwcm9jZXNzLmVudi5BUFBfQlVTX1VQREFURV9ERUxBWSk7XHJcblxyXG5leHBvcnQgY2xhc3MgV2Vic29ja2V0IHtcclxuICBcclxuICBwcml2YXRlIGlvIDogU29ja2V0O1xyXG4gIHByaXZhdGUgYWN0aXZlU29ja2V0IDogU29ja2V0O1xyXG4gIHByaXZhdGUgZGIgOiBEYXRhYmFzZTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2VydmVyIDogU2VydmVyLCBkYiA6IERhdGFiYXNlKSB7XHJcbiAgICB0aGlzLlNvY2tldEluaXQoc2VydmVyKTtcclxuICAgIHRoaXMuZGIgPSBkYjtcclxuICB9XHJcblxyXG4gIGFzeW5jIFNvY2tldEluaXQoc2VydmVyIDogU2VydmVyKSB7XHJcbiAgICBjb25zb2xlLmxvZyhgSW5pdGFsaXppbmcgd2Vic29ja2V0YClcclxuXHJcbiAgICB0aGlzLmlvID0gcmVxdWlyZShcInNvY2tldC5pb1wiKShzZXJ2ZXIsIHtcclxuICAgICAgY29yczoge1xyXG4gICAgICAgIG9yaWdpbjogXCIqXCIsXHJcbiAgICAgICAgbWV0aG9kczogW1wiR0VUXCIsIFwiUE9TVFwiXSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuaW8ub24oXCJjb25uZWN0aW9uXCIsIHNvY2tldCA9PiB7XHJcbiAgICAgIHRoaXMuU29ja2V0KHNvY2tldCk7XHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgU29ja2V0KHNvY2tldCA6IFNvY2tldCkge1xyXG4gICAgdGhpcy5hY3RpdmVTb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICBjb25zb2xlLmxvZyhcIk5ldyBjbGllbnQgY29ubmVjdGVkLlwiKTtcclxuXHJcbiAgICAvLyBjb25zdCBpbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcclxuICAgIC8vICAgICAgIC8vY29uc29sZS5sb2coXCJFbWl0dGluZyBuZXcgZGF0YS5cIik7XHJcbiAgICAvLyAgICAgICB0aGlzLmRiLkdldEFsbFZlaGljbGVzKCkudGhlbigodmVoaWNsZXMpID0+IHtcclxuICAgIC8vICAgICAgICAgc29ja2V0LmVtaXQoXCJvdmRhdGFcIiwgdmVoaWNsZXMpO1xyXG4gICAgLy8gICAgICAgfSlcclxuICAgIC8vIH0sIGJ1c191cGRhdGVfcmF0ZSk7XHJcblxyXG4gICAgc29ja2V0Lm9uKFwiZGlzY29ubmVjdFwiLCAoKSA9PiB7XHJcbiAgICAgIGNvbnNvbGUubG9nKFwiQ2xpZW50IGRpc2Nvbm5lY3RlZFwiKTtcclxuICAgICAgLy9jbGVhckludGVydmFsKGludGVydmFsKTtcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBTZW5kRGVsZXRlZFZlaGljbGVzKHZlaGljbGVzIDogQXJyYXk8VmVoaWNsZURhdGE+KSA6IHZvaWQge1xyXG4gICAgdGhpcy5pby5lbWl0KFwiZGVsZXRlZFZlaGljbGVzXCIsIHZlaGljbGVzKTtcclxuICB9XHJcblxyXG4gIENyZWF0ZUJ1ZmZlckZyb21WZWhpY2xlcyh2ZWhpY2xlcykgeyBcclxuICAgIGxldCBidWYgPSBCdWZmZXIuYWxsb2MoKDQgKyA0ICsgNCArIDE1KSAqIHZlaGljbGVzLmxlbmd0aClcclxuICAgIHZlaGljbGVzLmZvckVhY2goKHZlaGljbGUgOiBXZWJzb2NrZXRWZWhpY2xlRGF0YSwgaW5kZXgpID0+IHtcclxuICAgICAgYnVmLndyaXRlRmxvYXRCRSh2ZWhpY2xlLnBbMF0sIGluZGV4ICogMjcpXHJcbiAgICAgIGJ1Zi53cml0ZUZsb2F0QkUodmVoaWNsZS5wWzFdLCBpbmRleCAqIDI3ICsgNClcclxuICAgICAgYnVmLndyaXRlVUludDMyQkUodmVoaWNsZS52LCBpbmRleCAqIDI3ICsgNCArIDQpXHJcbiAgICAgIGJ1Zi53cml0ZShgJHt2ZWhpY2xlLmN9fCR7dmVoaWNsZS5ufWAsIGluZGV4ICogMjcgKyA0ICsgNCArIDQpXHJcbiAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCAxNSAtICh2ZWhpY2xlLmMubGVuZ3RoICsgMSArIHZlaGljbGUubi5sZW5ndGgpOyBpKyspIHtcclxuICAgICAgICBidWYud3JpdGVVSW50OCgwLCBpbmRleCAqIDI3ICsgNCArIDQgKyA0ICsgdmVoaWNsZS5jLmxlbmd0aCArIDEgKyB2ZWhpY2xlLm4ubGVuZ3RoKVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG5cclxuICAgIHJldHVybiBidWY7XHJcbiAgfVxyXG5cclxuICBFbWl0KCkge1xyXG4gICAgLy9TbWFsbCBkZWxheSB0byBtYWtlIHN1cmUgdGhlIHNlcnZlciBjYXRjaGVzIHVwLlxyXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgIHRoaXMuZGIuR2V0QWxsVmVoaWNsZXNTbWFsbCgpLnRoZW4oKHZlaGljbGVzKSA9PiB0aGlzLmlvLmVtaXQoXCJvdmRhdGFcIiwgdGhpcy5DcmVhdGVCdWZmZXJGcm9tVmVoaWNsZXModmVoaWNsZXMpKSlcclxuICAgIH0sIDEwMClcclxuICB9XHJcblxyXG59IiwiZXhwb3J0IGNvbnN0IENvbXBhbmllcyA9IHtcclxuICBBUlIgOiBcIkFSUlwiLFxyXG4gIENYWCA6IFwiQ1hYXCIsXHJcbiAgRElUUCA6IFwiRElUUFwiLFxyXG4gIEVCUyA6IFwiRUJTXCIsXHJcbiAgR1ZCIDogXCJHVkJcIixcclxuICBLRU9MSVM6IFwiS0VPTElTXCIsXHJcbiAgT1BFTk9WOiBcIk9QRU5PVlwiLFxyXG4gIFFCVVpaIDogXCJRQlVaWlwiLFxyXG4gIFJJRyA6IFwiUklHXCJcclxufSIsImV4cG9ydCBlbnVtIHZlaGljbGVTdGF0ZSB7XHJcbiAgT05ST1VURSA9ICdPTlJPVVRFJyxcclxuICBPRkZST1VURSA9ICdPRkZST1VURScsXHJcbiAgRU5EID0gXCJFTkRcIixcclxuICBERVBBUlRVUkUgPSAnREVQQVJUVVJFJyxcclxuICBJTklUID0gJ0lOSVQnLFxyXG4gIERFTEFZID0gJ0RFTEFZJyxcclxuICBPTlNUT1AgPSAnT05TVE9QJyxcclxuICBBUlJJVkFMID0gJ0FSUklWQUwnXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVmVoaWNsZURhdGEge1xyXG4gIGNvbXBhbnk6IHN0cmluZyxcclxuICBvcmlnaW5hbENvbXBhbnk6IHN0cmluZyxcclxuICBwbGFubmluZ051bWJlcjogc3RyaW5nLFxyXG4gIGpvdXJuZXlOdW1iZXI6IG51bWJlcixcclxuICBsaW5lTnVtYmVyIDogc3RyaW5nLFxyXG4gIHRpbWVzdGFtcDogbnVtYmVyLFxyXG4gIHZlaGljbGVOdW1iZXI6IG51bWJlcixcclxuICBwb3NpdGlvbjogW251bWJlciwgbnVtYmVyXSxcclxuICBzdGF0dXM6IHZlaGljbGVTdGF0ZSxcclxuICBjcmVhdGVkQXQ6IG51bWJlcixcclxuICB1cGRhdGVkQXQ6IG51bWJlcixcclxuICBwdW5jdHVhbGl0eTogQXJyYXk8bnVtYmVyPixcclxuICB1cGRhdGVkVGltZXM6IEFycmF5PG51bWJlcj4sXHJcbiAgY3VycmVudFJvdXRlSWQ6IG51bWJlcixcclxuICBjdXJyZW50VHJpcElkOiBudW1iZXJcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJAdHVyZi90dXJmXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJjaGlsZF9wcm9jZXNzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJjb3JzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJkb3RlbnZcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImV4cHJlc3NcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImZhc3QteG1sLXBhcnNlclwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZnNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImh0dHBzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJtb25nb29zZVwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwicGF0aFwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwic29ja2V0LmlvXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzcGxpdFwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwic3RyZWFtLXRvLW1vbmdvLWRiXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJ6ZXJvbXFcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInpsaWJcIik7OyIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBzdGFydHVwXG4vLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbi8vIFRoaXMgZW50cnkgbW9kdWxlIGlzIHJlZmVyZW5jZWQgYnkgb3RoZXIgbW9kdWxlcyBzbyBpdCBjYW4ndCBiZSBpbmxpbmVkXG52YXIgX193ZWJwYWNrX2V4cG9ydHNfXyA9IF9fd2VicGFja19yZXF1aXJlX18oXCIuL3NyYy9tYWluLnRzXCIpO1xuIl0sInNvdXJjZVJvb3QiOiIifQ==