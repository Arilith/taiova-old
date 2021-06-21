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
                    updatedTimes: [Date.now()],
                    currentRouteId: 0,
                    currentTripId: 0
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
                updatedTimes: [Date.now()],
                currentRouteId: 0,
                currentTripId: 0
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
                            updatedTimes: [Date.now()],
                            currentRouteId: 0,
                            currentTripId: 0
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
                            updatedTimes: [Date.now()],
                            currentRouteId: 0,
                            currentTripId: 0
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
        // this.sock.subscribe("/OPENOV/KV6posinfo");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9idXNsb2dpYy50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9jb252ZXJ0ZXIudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvZGF0YWJhc2UudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvbWFpbi50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9yZWFsdGltZS50cyIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci8uL3NyYy9zb2NrZXQudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvLi9zcmMvdHlwZXMvVmVoaWNsZURhdGEudHMiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJAdHVyZi90dXJmXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJjaGlsZF9wcm9jZXNzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJjb3JzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJkb3RlbnZcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcImV4cHJlc3NcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcImZhc3QteG1sLXBhcnNlclwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwiZnNcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcImh0dHBzXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJtb25nb29zZVwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwicGF0aFwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwic29ja2V0LmlvXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJzcGxpdFwiIiwid2VicGFjazovL3RhaW92YXJlYWx0aW1lc2VydmVyL2V4dGVybmFsIFwic3RyZWFtLXRvLW1vbmdvLWRiXCIiLCJ3ZWJwYWNrOi8vdGFpb3ZhcmVhbHRpbWVzZXJ2ZXIvZXh0ZXJuYWwgXCJ6ZXJvbXFcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci9leHRlcm5hbCBcInpsaWJcIiIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly90YWlvdmFyZWFsdGltZXNlcnZlci93ZWJwYWNrL3N0YXJ0dXAiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxtR0FBZ0U7QUFDaEUsdURBQStCO0FBQy9CLDZEQUF5QjtBQUd6QixrRkFBcUM7QUFHckMsK0VBQWtDO0FBRWxDLE1BQWEsUUFBUTtJQUluQixZQUFZLFFBQVEsRUFBRSxTQUFtQixLQUFLO1FBQzVDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBRXpCLElBQUcsTUFBTTtZQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBRU8sS0FBSyxDQUFDLFVBQVU7UUFDdEIsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFekIsV0FBVyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ3JCLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzNCLENBQUMsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRDs7O09BR0c7SUFDSyxLQUFLLENBQUMsWUFBWSxDQUFDLE1BQTJCO1FBQ3BELE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUN6QyxNQUFNLFNBQVMsR0FBVSxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDekcsTUFBTSxVQUFVLEdBQVcsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFM0UsdUNBQXVDO1lBQ3ZDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO1lBQ3ZCLEdBQUcsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZCLEdBQUcsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO1lBRXRCLElBQUcsVUFBVSxDQUFDLE9BQU87Z0JBQUUsR0FBRyxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDO1lBQ3hELElBQUcsVUFBVSxJQUFJLFVBQVUsQ0FBQyxjQUFjLElBQUksVUFBVSxDQUFDLE9BQU8sRUFBRTtnQkFDaEUsR0FBRyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsY0FBYyxDQUFDO2dCQUMzQyxHQUFHLENBQUMsY0FBYyxHQUFHLFVBQVUsQ0FBQyxPQUFPO2FBQ3hDO1lBRUQsSUFBRyxTQUFTLElBQUksU0FBUyxDQUFDLE1BQU07Z0JBQUUsR0FBRyxDQUFDLGFBQWEsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO1lBRXZFLElBQUksWUFBWSxHQUFpQixNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBR2hHLElBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUN6QyxJQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLElBQUksTUFBTTtvQkFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixHQUFHLENBQUMsYUFBYSxTQUFTLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDeEgsSUFBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRTtvQkFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxDQUFDLGFBQWEsU0FBUyxHQUFHLENBQUMsT0FBTywwQkFBMEIsQ0FBQyxDQUFDO29CQUFDLE9BQU07aUJBQUU7Z0JBRS9ILFlBQVksR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBRXBDLGtFQUFrRTtnQkFDbEUsR0FBRyxDQUFDLFdBQVcsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBRW5FLGtFQUFrRTtnQkFDbEUsR0FBRyxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBRXRFLElBQUcsR0FBRyxDQUFDLE1BQU0sS0FBSywwQkFBWSxDQUFDLE9BQU87b0JBQUUsR0FBRyxDQUFDLFFBQVEsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDO2dCQUU3RSxJQUFHLEdBQUcsQ0FBQyxNQUFNLEtBQUssMEJBQVksQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSywwQkFBWSxDQUFDLEdBQUcsRUFBRTtvQkFDdEUsR0FBRyxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUM7b0JBQ3JCLEdBQUcsQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO2lCQUN2QjtnQkFHRCxzREFBc0Q7Z0JBRXRELEdBQUcsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUMzQixJQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUM7b0JBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3ZILE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUM7YUFFM0Q7aUJBQU07Z0JBQ0wsSUFBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixJQUFJLE1BQU07b0JBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsR0FBRyxDQUFDLGFBQWEsU0FBUyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzVILElBQUcsR0FBRyxDQUFDLE1BQU0sS0FBSywwQkFBWSxDQUFDLE9BQU87b0JBQUUsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO2FBQ2xGO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU0sS0FBSyxDQUFDLHNCQUFzQixDQUFFLE1BQWUsRUFBRSxPQUFnQixFQUFFLFFBQTJCO1FBQ2pHLElBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLGtCQUFrQjtZQUFFLE9BQU87UUFDN0MsSUFBSSxzQkFBc0IsR0FBc0IsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RyxJQUFHLHNCQUFzQixFQUFFO1lBQ3pCLHNCQUFzQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQy9ELE1BQU0sZUFBZSxHQUFHLHNCQUFzQixDQUFDLFlBQVksQ0FBQztZQUM1RCxJQUFJLFdBQVcsQ0FBQztZQUVoQixJQUFHLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUM5QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUN6QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsQ0FBQztnQkFDckUsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFDbEUsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7Z0JBRXZDLE1BQU0sU0FBUyxHQUFHLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNuRSxNQUFNLFVBQVUsR0FBRyxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztnQkFDaEUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDM0YsV0FBVyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDNUM7aUJBQU07Z0JBQ0wsc0JBQXNCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDaEQsV0FBVyxHQUFHLHNCQUFzQixDQUFDLFNBQVMsQ0FBQzthQUNoRDtZQUdELHNCQUFzQixHQUFHO2dCQUN2QixNQUFNLEVBQUcsTUFBTTtnQkFDZixPQUFPLEVBQUcsT0FBTztnQkFDakIsU0FBUyxFQUFFLFdBQVc7Z0JBQ3RCLFlBQVksRUFBRyxlQUFlO2FBQy9CO1NBRUY7O1lBR0Msc0JBQXNCLEdBQUc7Z0JBQ3ZCLE1BQU0sRUFBRyxNQUFNO2dCQUNmLE9BQU8sRUFBRyxPQUFPO2dCQUNqQixTQUFTLEVBQUUsQ0FBQyxRQUFRLENBQUM7Z0JBQ3JCLFlBQVksRUFBRyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDdEM7UUFFSCxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO0lBQ25GLENBQUM7SUFJRDs7T0FFRztJQUNJLEtBQUssQ0FBQyxXQUFXO1FBQ3RCLElBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsSUFBSSxNQUFNO1lBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQztRQUMvRSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDL0IsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLEdBQUcsQ0FBQyxFQUFFLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUNoSCxNQUFNLGVBQWUsR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLElBQUksTUFBTSxDQUFDLENBQUM7SUFDM0osQ0FBQztJQUVEOztPQUVHO0lBQ0ksUUFBUTtRQUNiLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBRUQ7O09BRUc7SUFDSyxZQUFZO1FBQ2xCLE1BQU0sU0FBUyxHQUFHLGNBQU8sQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQzdELE1BQU0sVUFBVSxHQUFHLGNBQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQzFELEVBQUUsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ2xELElBQUcsS0FBSztnQkFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQy9CLElBQUcsSUFBSSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLElBQUksTUFBTTtnQkFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7WUFDMUcsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNuQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQy9CLE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUM7WUFDcEQsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDO1lBRTFCLEtBQUksSUFBSSxJQUFJLElBQUksS0FBSyxFQUFFO2dCQUNyQixNQUFNLFFBQVEsR0FBYSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM1RCxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLE1BQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDekMsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVyQyxNQUFNLElBQUksR0FBVTtvQkFDbEIsT0FBTyxFQUFFLE9BQU87b0JBQ2hCLE9BQU8sRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztvQkFDcEMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO29CQUN4QyxNQUFNLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7b0JBQ2xDLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDO29CQUNoQyxrQkFBa0IsRUFBRSxjQUFjO29CQUNsQyxZQUFZLEVBQUUsUUFBUSxDQUFDLGFBQWE7b0JBQ3BDLFFBQVEsRUFBRSxRQUFRLENBQUMsY0FBYztvQkFDakMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDO29CQUM1QyxPQUFPLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7b0JBQ3BDLG9CQUFvQixFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUM7aUJBQy9EO2dCQUNELFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQzthQUNoRDtZQUVELFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFO2dCQUNuQixJQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLElBQUksTUFBTTtvQkFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHFEQUFxRCxDQUFDLENBQUM7Z0JBQ3ZILElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNyQixDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUdMLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVztRQUNmLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBRTFDLElBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsSUFBSSxNQUFNO1lBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBRTlGLE1BQU0sb0JBQUksQ0FBQyxrRkFBa0YsRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDdkgsSUFBSSxLQUFLLEVBQUU7Z0JBQ1QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUN2QyxPQUFPO2FBQ1I7WUFFRCxJQUFJLE1BQU0sRUFBRTtnQkFDVixPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDakMsT0FBTzthQUNSO1lBRUQsSUFBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixJQUFJLE1BQU07Z0JBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDdkYsQ0FBQyxDQUFDLENBQUM7SUFFTCxDQUFDO0NBRUY7QUE5TUQsNEJBOE1DOzs7Ozs7Ozs7Ozs7OztBQ3pORCxtR0FBK0Q7QUFFL0QsTUFBYSxTQUFTO0lBRXBCLE1BQU0sQ0FBQyxJQUFvQixFQUFFLFdBQXFCLEtBQUs7UUFFckQsSUFBSSxPQUFPLEdBQVMsSUFBSSxDQUFDO1FBRXpCLElBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO1lBQ3ZDLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWxDLElBQUcsQ0FBQyxRQUFRO1lBQ1YsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFeEMsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELHNCQUFzQixDQUFDLElBQVM7UUFDOUIsTUFBTSxLQUFLLEdBQXdCLEVBQUUsQ0FBQztRQUN0QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztRQUU5QyxJQUFHLFVBQVUsQ0FBQyxNQUFNLEtBQUssU0FBUyxFQUFFO1lBQ2xDLFVBQVUsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUU7Z0JBQ2pDLE1BQU0sY0FBYyxHQUFvQixhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuRixLQUFLLENBQUMsSUFBSSxDQUFDO29CQUNULE9BQU8sRUFBRSxjQUFjLENBQUMsYUFBYTtvQkFDckMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxhQUFhO29CQUM3QyxjQUFjLEVBQUUsY0FBYyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRTtvQkFDNUQsYUFBYSxFQUFFLGNBQWMsQ0FBQyxhQUFhO29CQUMzQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDO29CQUMvQyxhQUFhLEVBQUUsY0FBYyxDQUFDLGFBQWE7b0JBQzNDLFVBQVUsRUFBRSxVQUFVO29CQUN0QixRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUMxRSxXQUFXLEVBQUUsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDO29CQUN6QyxNQUFNLEVBQUUsMEJBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNuRCxTQUFTLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTtvQkFDckIsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7b0JBQ3JCLFlBQVksRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztvQkFDMUIsY0FBYyxFQUFFLENBQUM7b0JBQ2pCLGFBQWEsRUFBRSxDQUFDO2lCQUNqQixDQUFDO1lBQ04sQ0FBQyxDQUFDO1NBQ0g7YUFBTTtZQUNMLE1BQU0sY0FBYyxHQUFvQixVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9FLEtBQUssQ0FBQyxJQUFJLENBQUM7Z0JBQ1QsT0FBTyxFQUFFLGNBQWMsQ0FBQyxhQUFhO2dCQUNyQyxlQUFlLEVBQUUsY0FBYyxDQUFDLGFBQWE7Z0JBQzdDLGNBQWMsRUFBRSxjQUFjLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFO2dCQUM1RCxhQUFhLEVBQUUsY0FBYyxDQUFDLGFBQWE7Z0JBQzNDLFNBQVMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUM7Z0JBQy9DLGFBQWEsRUFBRSxjQUFjLENBQUMsYUFBYTtnQkFDM0MsVUFBVSxFQUFFLFVBQVU7Z0JBQ3RCLFFBQVEsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzFFLFdBQVcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUM7Z0JBQ3pDLE1BQU0sRUFBRSwwQkFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hELFNBQVMsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNyQixTQUFTLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDckIsWUFBWSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUMxQixjQUFjLEVBQUUsQ0FBQztnQkFDakIsYUFBYSxFQUFFLENBQUM7YUFDakIsQ0FBQztTQUNIO1FBR0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsZ0JBQWdCLENBQUUsSUFBcUI7UUFFckMsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7UUFDNUMsTUFBTSxLQUFLLEdBQXdCLEVBQUUsQ0FBQztRQUV0QyxJQUFHLFVBQVUsSUFBSSxTQUFTLEVBQUU7WUFDMUIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFO2dCQUNsRCx1RkFBdUY7Z0JBQ3ZGLElBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsRUFBRTtvQkFFeEMsTUFBTSxjQUFjLEdBQW9CLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDeEQsSUFBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFO3dCQUN0RixLQUFLLENBQUMsSUFBSSxDQUNSOzRCQUNFLE9BQU8sRUFBRSxjQUFjLENBQUMsYUFBYTs0QkFDckMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxhQUFhOzRCQUM3QyxjQUFjLEVBQUUsY0FBYyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRTs0QkFDNUQsYUFBYSxFQUFFLGNBQWMsQ0FBQyxhQUFhOzRCQUMzQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDOzRCQUMvQyxhQUFhLEVBQUUsY0FBYyxDQUFDLGFBQWE7NEJBQzNDLFVBQVUsRUFBRSxVQUFVOzRCQUN0QixRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDOzRCQUMxRSxXQUFXLEVBQUUsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDOzRCQUN6QyxNQUFNLEVBQUUsMEJBQVksQ0FBQyxHQUFHLENBQUM7NEJBQ3pCLFNBQVMsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFOzRCQUNyQixTQUFTLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTs0QkFDckIsWUFBWSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDOzRCQUMxQixjQUFjLEVBQUUsQ0FBQzs0QkFDakIsYUFBYSxFQUFFLENBQUM7eUJBQ2pCLENBQ0Y7cUJBQ0Y7b0JBQ0gscUZBQXFGO2lCQUNwRjtxQkFBTSxJQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxFQUFFO29CQUNwRCxLQUFJLElBQUksQ0FBQyxHQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTt3QkFDN0MsTUFBTSxjQUFjLEdBQW9CLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDM0QsSUFBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQzs0QkFBRSxTQUFTO3dCQUM5RixLQUFLLENBQUMsSUFBSSxDQUNSOzRCQUNFLE9BQU8sRUFBRSxjQUFjLENBQUMsYUFBYTs0QkFDckMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxhQUFhOzRCQUM3QyxjQUFjLEVBQUUsY0FBYyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRTs0QkFDNUQsYUFBYSxFQUFFLGNBQWMsQ0FBQyxhQUFhOzRCQUMzQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDOzRCQUMvQyxhQUFhLEVBQUUsY0FBYyxDQUFDLGFBQWE7NEJBQzNDLFVBQVUsRUFBRSxVQUFVOzRCQUN0QixRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDOzRCQUMxRSxXQUFXLEVBQUUsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDOzRCQUN6QyxNQUFNLEVBQUUsMEJBQVksQ0FBQyxHQUFHLENBQUM7NEJBQ3pCLFNBQVMsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFOzRCQUNyQixTQUFTLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTs0QkFDckIsWUFBWSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDOzRCQUMxQixjQUFjLEVBQUcsQ0FBQzs0QkFDbEIsYUFBYSxFQUFHLENBQUM7eUJBQ2xCLENBQ0Y7cUJBQ0Y7aUJBQ0Y7WUFDSCxDQUFDLENBQUMsQ0FBQztTQUNKO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFFZixDQUFDO0lBRUQsVUFBVSxDQUFFLElBQXFCO1FBQy9CLElBQUksVUFBVSxHQUFZLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0MsVUFBVSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzlDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRUQsV0FBVyxDQUFFLENBQUMsRUFBRSxDQUFDO1FBQ2YsSUFBRyxDQUFDLEtBQUssU0FBUyxJQUFJLENBQUMsS0FBSyxTQUFTO1lBQUUsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVyRCxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxJQUFJLEdBQUcsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNO1lBQ3ZFLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDOUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPO1lBQzdDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU87WUFDOUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTztZQUM1QyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQ3hELEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTztZQUN4QixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDWCxNQUFNLElBQUksR0FBRyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPO1lBQy9ELEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDNUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPO1lBQ2xCLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDNUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUN2QixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQzVDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTztZQUNsQixFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVB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Ozs7Ozs7OztBQ0FBLDJDOzs7Ozs7Ozs7O0FDQUEsa0M7Ozs7Ozs7Ozs7QUNBQSxvQzs7Ozs7Ozs7OztBQ0FBLHFDOzs7Ozs7Ozs7O0FDQUEsNkM7Ozs7Ozs7Ozs7QUNBQSxnQzs7Ozs7Ozs7OztBQ0FBLG1DOzs7Ozs7Ozs7O0FDQUEsc0M7Ozs7Ozs7Ozs7QUNBQSxrQzs7Ozs7Ozs7OztBQ0FBLHVDOzs7Ozs7Ozs7O0FDQUEsbUM7Ozs7Ozs7Ozs7QUNBQSxnRDs7Ozs7Ozs7OztBQ0FBLG9DOzs7Ozs7Ozs7O0FDQUEsa0M7Ozs7OztVQ0FBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7VUN0QkE7VUFDQTtVQUNBO1VBQ0EiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tIFwiLi9kYXRhYmFzZVwiO1xyXG5pbXBvcnQgeyBWZWhpY2xlRGF0YSwgdmVoaWNsZVN0YXRlIH0gZnJvbSBcIi4vdHlwZXMvVmVoaWNsZURhdGFcIjtcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCB7IFRyaXAgfSBmcm9tIFwiLi90eXBlcy9UcmlwXCI7XHJcbmltcG9ydCB7IEFwaVRyaXAgfSBmcm9tIFwiLi90eXBlcy9BcGlUcmlwXCI7XHJcbmltcG9ydCB7IGV4ZWMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcclxuaW1wb3J0IHsgUm91dGUgfSBmcm9tIFwiLi90eXBlcy9Sb3V0ZVwiO1xyXG5pbXBvcnQgeyBUcmlwUG9zaXRpb25EYXRhIH0gZnJvbSBcIi4vdHlwZXMvVHJpcFBvc2l0aW9uRGF0YVwiO1xyXG5pbXBvcnQgKiBhcyB0dXJmIGZyb20gJ0B0dXJmL3R1cmYnXHJcblxyXG5leHBvcnQgY2xhc3MgQnVzTG9naWMge1xyXG5cclxuICBwcml2YXRlIGRhdGFiYXNlIDogRGF0YWJhc2U7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGRhdGFiYXNlLCBkb0luaXQgOiBib29sZWFuID0gZmFsc2UpIHtcclxuICAgIHRoaXMuZGF0YWJhc2UgPSBkYXRhYmFzZTtcclxuXHJcbiAgICBpZihkb0luaXQpIHRoaXMuSW5pdGlhbGl6ZSgpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBJbml0aWFsaXplKCkge1xyXG4gICAgYXdhaXQgdGhpcy5DbGVhckJ1c3NlcygpO1xyXG5cclxuICAgIHNldEludGVydmFsKGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgdGhpcy5DbGVhckJ1c3NlcygpO1xyXG4gICAgfSwgcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0NMRUFOVVBfREVMQVkpKVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRlcyBvciBjcmVhdGVzIGEgbmV3IGJ1cyBkZXBlbmRpbmcgb24gaWYgaXQgYWxyZWFkeSBleGlzdHMgb3Igbm90LlxyXG4gICAqIEBwYXJhbSBidXNzZXMgVGhlIGxpc3Qgb2YgYnVzc2VzIHRvIHVwZGF0ZS5cclxuICAgKi9cclxuICAgcHVibGljIGFzeW5jIFVwZGF0ZUJ1c3NlcyhidXNzZXMgOiBBcnJheTxWZWhpY2xlRGF0YT4pIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCBQcm9taXNlLmFsbChidXNzZXMubWFwKGFzeW5jIChidXMpID0+IHtcclxuICAgICAgY29uc3QgZm91bmRUcmlwIDogVHJpcCA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0VHJpcChidXMuam91cm5leU51bWJlciwgYnVzLnBsYW5uaW5nTnVtYmVyLCBidXMuY29tcGFueSk7XHJcbiAgICAgIGNvbnN0IGZvdW5kUm91dGUgOiBSb3V0ZSA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0Um91dGUoZm91bmRUcmlwLnJvdXRlSWQpO1xyXG5cclxuICAgICAgLy9UT0RPOiBNYXliZSB0aGlzIHNob3VsZCBiZSBkaWZmZXJlbnQuXHJcbiAgICAgIGJ1cy5saW5lTnVtYmVyID0gXCI5OTlcIjtcclxuICAgICAgYnVzLmN1cnJlbnRSb3V0ZUlkID0gMDtcclxuICAgICAgYnVzLmN1cnJlbnRUcmlwSWQgPSAwO1xyXG5cclxuICAgICAgaWYoZm91bmRSb3V0ZS5jb21wYW55KSBidXMuY29tcGFueSA9IGZvdW5kUm91dGUuY29tcGFueTtcclxuICAgICAgaWYoZm91bmRSb3V0ZSAmJiBmb3VuZFJvdXRlLnJvdXRlU2hvcnROYW1lICYmIGZvdW5kUm91dGUucm91dGVJZCkge1xyXG4gICAgICAgIGJ1cy5saW5lTnVtYmVyID0gZm91bmRSb3V0ZS5yb3V0ZVNob3J0TmFtZTtcclxuICAgICAgICBidXMuY3VycmVudFJvdXRlSWQgPSBmb3VuZFJvdXRlLnJvdXRlSWRcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYoZm91bmRUcmlwICYmIGZvdW5kVHJpcC50cmlwSWQpIGJ1cy5jdXJyZW50VHJpcElkID0gZm91bmRUcmlwLnRyaXBJZDtcclxuXHJcbiAgICAgIGxldCBmb3VuZFZlaGljbGUgOiBWZWhpY2xlRGF0YSA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0VmVoaWNsZShidXMudmVoaWNsZU51bWJlciwgYnVzLmNvbXBhbnkpO1xyXG4gICAgICBcclxuXHJcbiAgICAgIGlmKE9iamVjdC5rZXlzKGZvdW5kVmVoaWNsZSkubGVuZ3RoICE9PSAwKSB7XHJcbiAgICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX1VQREFURV9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhgVXBkYXRpbmcgdmVoaWNsZSAke2J1cy52ZWhpY2xlTnVtYmVyfSBmcm9tICR7YnVzLmNvbXBhbnl9YClcclxuICAgICAgICBpZighZm91bmRWZWhpY2xlW1wiX2RvY1wiXSkgeyBjb25zb2xlLmVycm9yKGBWZWhpY2xlICR7YnVzLnZlaGljbGVOdW1iZXJ9IGZyb20gJHtidXMuY29tcGFueX0gZGlkIG5vdCBpbmNsdWRlIGEgZG9jLiBgKTsgcmV0dXJuIH1cclxuXHJcbiAgICAgICAgZm91bmRWZWhpY2xlID0gZm91bmRWZWhpY2xlW1wiX2RvY1wiXTtcclxuICAgICAgICBcclxuICAgICAgICAvL01lcmdlIHRoZSBwdW5jdHVhbGl0aWVzIG9mIHRoZSBvbGQgdmVoaWNsZURhdGEgd2l0aCB0aGUgbmV3IG9uZS5cclxuICAgICAgICBidXMucHVuY3R1YWxpdHkgPSBmb3VuZFZlaGljbGUucHVuY3R1YWxpdHkuY29uY2F0KGJ1cy5wdW5jdHVhbGl0eSk7XHJcblxyXG4gICAgICAgIC8vTWVyZ2UgdGhlIHVwZGF0ZWQgdGltZXMgb2YgdGhlIG9sZCB2ZWhpY2xlRGF0YSB3aXRoIHRoZSBuZXcgb25lLlxyXG4gICAgICAgIGJ1cy51cGRhdGVkVGltZXMgPSBmb3VuZFZlaGljbGUudXBkYXRlZFRpbWVzLmNvbmNhdChidXMudXBkYXRlZFRpbWVzKTtcclxuXHJcbiAgICAgICAgaWYoYnVzLnN0YXR1cyAhPT0gdmVoaWNsZVN0YXRlLk9OUk9VVEUpIGJ1cy5wb3NpdGlvbiA9IGZvdW5kVmVoaWNsZS5wb3NpdGlvbjtcclxuXHJcbiAgICAgICAgaWYoYnVzLnN0YXR1cyA9PT0gdmVoaWNsZVN0YXRlLklOSVQgfHwgYnVzLnN0YXR1cyA9PT0gdmVoaWNsZVN0YXRlLkVORCkge1xyXG4gICAgICAgICAgYnVzLnB1bmN0dWFsaXR5ID0gW107XHJcbiAgICAgICAgICBidXMudXBkYXRlZFRpbWVzID0gW107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBcclxuICAgICAgICAvL1RPRE86IFJlbW92ZSBwdW5jdHVhbGl0eSBkYXRhIG9sZGVyIHRoYW4gNjAgbWludXRlcy5cclxuXHJcbiAgICAgICAgYnVzLnVwZGF0ZWRBdCA9IERhdGUubm93KCk7ICBcclxuICAgICAgICBpZihPYmplY3Qua2V5cyhmb3VuZFRyaXApLmxlbmd0aCAhPT0gMCkgdGhpcy5BZGRQb3NpdGlvblRvVHJpcFJvdXRlKGZvdW5kVHJpcC50cmlwSWQsIGZvdW5kVHJpcC5jb21wYW55LCBidXMucG9zaXRpb24pO1xyXG4gICAgICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuVXBkYXRlVmVoaWNsZShmb3VuZFZlaGljbGUsIGJ1cywgdHJ1ZSlcclxuICAgICAgICBcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ1JFQVRFX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBjcmVhdGluZyBuZXcgdmVoaWNsZSAke2J1cy52ZWhpY2xlTnVtYmVyfSBmcm9tICR7YnVzLmNvbXBhbnl9YClcclxuICAgICAgICBpZihidXMuc3RhdHVzID09PSB2ZWhpY2xlU3RhdGUuT05ST1VURSkgYXdhaXQgdGhpcy5kYXRhYmFzZS5BZGRWZWhpY2xlKGJ1cywgdHJ1ZSlcclxuICAgICAgfVxyXG4gICAgfSkpXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgQWRkUG9zaXRpb25Ub1RyaXBSb3V0ZSAodHJpcElkIDogbnVtYmVyLCBjb21wYW55IDogc3RyaW5nLCBwb3NpdGlvbiA6IFtudW1iZXIsIG51bWJlcl0pIHtcclxuICAgIGlmKHBvc2l0aW9uWzBdID09IDMuMzEzNTI5MTU2MjY0MzQ2NykgcmV0dXJuO1xyXG4gICAgbGV0IHJldHJpZXZlZFRyaXBSb3V0ZURhdGEgOiBUcmlwUG9zaXRpb25EYXRhID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRUcmlwUG9zaXRpb25zKHRyaXBJZCwgY29tcGFueSk7XHJcbiAgICBpZihyZXRyaWV2ZWRUcmlwUm91dGVEYXRhKSB7IFxyXG4gICAgICByZXRyaWV2ZWRUcmlwUm91dGVEYXRhLnVwZGF0ZWRUaW1lcy5wdXNoKG5ldyBEYXRlKCkuZ2V0VGltZSgpKTtcclxuICAgICAgY29uc3QgbmV3VXBkYXRlZFRpbWVzID0gcmV0cmlldmVkVHJpcFJvdXRlRGF0YS51cGRhdGVkVGltZXM7XHJcbiAgICAgIGxldCByZXN1bHRBcnJheTtcclxuXHJcbiAgICAgIGlmKHJldHJpZXZlZFRyaXBSb3V0ZURhdGEucG9zaXRpb25zLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICBjb25zdCB0YXJnZXRQb2ludCA9IHR1cmYucG9pbnQocG9zaXRpb24pO1xyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRMaW5lID0gdHVyZi5saW5lU3RyaW5nKHJldHJpZXZlZFRyaXBSb3V0ZURhdGEucG9zaXRpb25zKVxyXG4gICAgICAgIGNvbnN0IG5lYXJlc3QgPSB0dXJmLm5lYXJlc3RQb2ludE9uTGluZShjdXJyZW50TGluZSwgdGFyZ2V0UG9pbnQpO1xyXG4gICAgICAgIGNvbnN0IGluZGV4ID0gbmVhcmVzdC5wcm9wZXJ0aWVzLmluZGV4O1xyXG4gIFxyXG4gICAgICAgIGNvbnN0IGZpcnN0SGFsZiA9IHJldHJpZXZlZFRyaXBSb3V0ZURhdGEucG9zaXRpb25zLnNsaWNlKDAsIGluZGV4KTtcclxuICAgICAgICBjb25zdCBzZWNvbmRIYWxmID0gcmV0cmlldmVkVHJpcFJvdXRlRGF0YS5wb3NpdGlvbnMuc2xpY2UoaW5kZXgpXHJcbiAgICAgICAgZmlyc3RIYWxmLnB1c2goW3RhcmdldFBvaW50Lmdlb21ldHJ5LmNvb3JkaW5hdGVzWzBdLCB0YXJnZXRQb2ludC5nZW9tZXRyeS5jb29yZGluYXRlc1sxXV0pO1xyXG4gICAgICAgIHJlc3VsdEFycmF5ID0gZmlyc3RIYWxmLmNvbmNhdChzZWNvbmRIYWxmKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXRyaWV2ZWRUcmlwUm91dGVEYXRhLnBvc2l0aW9ucy5wdXNoKHBvc2l0aW9uKTtcclxuICAgICAgICByZXN1bHRBcnJheSA9IHJldHJpZXZlZFRyaXBSb3V0ZURhdGEucG9zaXRpb25zO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBcclxuICAgICAgcmV0cmlldmVkVHJpcFJvdXRlRGF0YSA9IHtcclxuICAgICAgICB0cmlwSWQgOiB0cmlwSWQsXHJcbiAgICAgICAgY29tcGFueSA6IGNvbXBhbnksXHJcbiAgICAgICAgcG9zaXRpb25zOiByZXN1bHRBcnJheSxcclxuICAgICAgICB1cGRhdGVkVGltZXMgOiBuZXdVcGRhdGVkVGltZXNcclxuICAgICAgfVxyXG5cclxuICAgIH1cclxuICAgICAgXHJcbiAgICBlbHNlXHJcbiAgICAgIHJldHJpZXZlZFRyaXBSb3V0ZURhdGEgPSB7XHJcbiAgICAgICAgdHJpcElkIDogdHJpcElkLFxyXG4gICAgICAgIGNvbXBhbnkgOiBjb21wYW55LFxyXG4gICAgICAgIHBvc2l0aW9uczogW3Bvc2l0aW9uXSxcclxuICAgICAgICB1cGRhdGVkVGltZXMgOiBbbmV3IERhdGUoKS5nZXRUaW1lKCldXHJcbiAgICAgIH1cclxuXHJcbiAgICBhd2FpdCB0aGlzLmRhdGFiYXNlLlVwZGF0ZVRyaXBQb3NpdGlvbnModHJpcElkLCBjb21wYW55LCByZXRyaWV2ZWRUcmlwUm91dGVEYXRhKTtcclxuICB9XHJcblxyXG4gIFxyXG5cclxuICAvKipcclxuICAgKiBDbGVhcnMgYnVzc2VzIGV2ZXJ5IFggYW1vdW50IG9mIG1pbnV0ZXMgc3BlY2lmaWVkIGluIC5lbnYgZmlsZS5cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgQ2xlYXJCdXNzZXMoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NMRUFOVVBfTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJDbGVhcmluZyBidXNzZXNcIilcclxuICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnN0IGZpZnRlZW5NaW51dGVzQWdvID0gY3VycmVudFRpbWUgLSAoNjAgKiBwYXJzZUludChwcm9jZXNzLmVudi5BUFBfQ0xFQU5VUF9WRUhJQ0xFX0FHRV9SRVFVSVJFTUVOVCkgKiAxMDAwKTtcclxuICAgIGNvbnN0IFJlbW92ZWRWZWhpY2xlcyA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuUmVtb3ZlVmVoaWNsZXNXaGVyZSh7IHVwZGF0ZWRBdDogeyAkbHQ6IGZpZnRlZW5NaW51dGVzQWdvIH0gfSwgcHJvY2Vzcy5lbnYuQVBQX0RPX0NMRUFOVVBfTE9HR0lORyA9PSBcInRydWVcIik7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgXCJLb3BwZWx2bGFrIDcgYW5kIDggdHVyYm9cIiBmaWxlcyB0byBkYXRhYmFzZS5cclxuICAgKi9cclxuICBwdWJsaWMgSW5pdEtWNzgoKSA6IHZvaWQge1xyXG4gICAgdGhpcy5Jbml0VHJpcHNOZXcoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSB0cmlwcyBmcm9tIHRoZSBzcGVjaWZpZWQgVVJMIGluIHRoZSAuZW52ICwgb3IgXCIuLi9HVEZTL2V4dHJhY3RlZC90cmlwcy5qc29uXCIgdG8gdGhlIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gIHByaXZhdGUgSW5pdFRyaXBzTmV3KCkgOiB2b2lkIHsgXHJcbiAgICBjb25zdCB0cmlwc1BhdGggPSByZXNvbHZlKFwiR1RGU1xcXFxleHRyYWN0ZWRcXFxcdHJpcHMudHh0Lmpzb25cIik7XHJcbiAgICBjb25zdCBvdXRwdXRQYXRoID0gcmVzb2x2ZShcIkdURlNcXFxcY29udmVydGVkXFxcXHRyaXBzLmpzb25cIik7XHJcbiAgICBmcy5yZWFkRmlsZSh0cmlwc1BhdGgsICd1dGY4JywgYXN5bmMoZXJyb3IsIGRhdGEpID0+IHsgXHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgaWYoZGF0YSAmJiBwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkxvYWRlZCB0cmlwcyBmaWxlIGludG8gbWVtb3J5LlwiKTtcclxuICAgICAgZGF0YSA9IGRhdGEudHJpbSgpO1xyXG4gICAgICBjb25zdCBsaW5lcyA9IGRhdGEuc3BsaXQoXCJcXG5cIik7XHJcbiAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3V0cHV0UGF0aClcclxuICAgICAgY29uc3QgY29udmVydGVkVHJpcHMgPSBbXTtcclxuXHJcbiAgICAgIGZvcihsZXQgbGluZSBvZiBsaW5lcykge1xyXG4gICAgICAgIGNvbnN0IHRyaXBKU09OIDogQXBpVHJpcCA9IEpTT04ucGFyc2UobGluZSk7XHJcbiAgICAgICAgY29uc3QgcmVhbFRpbWVUcmlwSWQgPSB0cmlwSlNPTi5yZWFsdGltZV90cmlwX2lkLnNwbGl0KFwiOlwiKTtcclxuICAgICAgICBjb25zdCBjb21wYW55ID0gcmVhbFRpbWVUcmlwSWRbMF07XHJcbiAgICAgICAgY29uc3QgcGxhbm5pbmdOdW1iZXIgPSByZWFsVGltZVRyaXBJZFsxXTtcclxuICAgICAgICBjb25zdCB0cmlwTnVtYmVyID0gcmVhbFRpbWVUcmlwSWRbMl07XHJcblxyXG4gICAgICAgIGNvbnN0IHRyaXAgOiBUcmlwID0ge1xyXG4gICAgICAgICAgY29tcGFueTogY29tcGFueSxcclxuICAgICAgICAgIHJvdXRlSWQ6IHBhcnNlSW50KHRyaXBKU09OLnJvdXRlX2lkKSxcclxuICAgICAgICAgIHNlcnZpY2VJZDogcGFyc2VJbnQodHJpcEpTT04uc2VydmljZV9pZCksXHJcbiAgICAgICAgICB0cmlwSWQ6IHBhcnNlSW50KHRyaXBKU09OLnRyaXBfaWQpLFxyXG4gICAgICAgICAgdHJpcE51bWJlcjogcGFyc2VJbnQodHJpcE51bWJlciksXHJcbiAgICAgICAgICB0cmlwUGxhbm5pbmdOdW1iZXI6IHBsYW5uaW5nTnVtYmVyLFxyXG4gICAgICAgICAgdHJpcEhlYWRzaWduOiB0cmlwSlNPTi50cmlwX2hlYWRzaWduLFxyXG4gICAgICAgICAgdHJpcE5hbWU6IHRyaXBKU09OLnRyaXBfbG9uZ19uYW1lLFxyXG4gICAgICAgICAgZGlyZWN0aW9uSWQ6IHBhcnNlSW50KHRyaXBKU09OLmRpcmVjdGlvbl9pZCksXHJcbiAgICAgICAgICBzaGFwZUlkOiBwYXJzZUludCh0cmlwSlNPTi5zaGFwZV9pZCksXHJcbiAgICAgICAgICB3aGVlbGNoYWlyQWNjZXNzaWJsZTogcGFyc2VJbnQodHJpcEpTT04ud2hlZWxjaGFpcl9hY2Nlc3NpYmxlKVxyXG4gICAgICAgIH1cclxuICAgICAgICB3cml0ZVN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh0cmlwKSArIFwiXFxuXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB3cml0ZVN0cmVhbS5lbmQoKCkgPT4ge1xyXG4gICAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRmluaXNoZWQgd3JpdGluZyB0cmlwcyBmaWxlLCBpbXBvcnRpbmcgdG8gZGF0YWJhc2UuXCIpO1xyXG4gICAgICAgIHRoaXMuSW1wb3J0VHJpcHMoKTtcclxuICAgICAgfSlcclxuICAgIH0pO1xyXG4gICBcclxuICAgIFxyXG4gIH1cclxuXHJcbiAgYXN5bmMgSW1wb3J0VHJpcHMoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5kYXRhYmFzZS5Ecm9wVHJpcHNDb2xsZWN0aW9uKCk7XHJcblxyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJJbXBvcnRpbmcgdHJpcHMgdG8gbW9uZ29kYlwiKTtcclxuXHJcbiAgICBhd2FpdCBleGVjKFwibW9uZ29pbXBvcnQgLS1kYiB0YWlvdmEgLS1jb2xsZWN0aW9uIHRyaXBzIC0tZmlsZSAuXFxcXEdURlNcXFxcY29udmVydGVkXFxcXHRyaXBzLmpzb25cIiwgKGVycm9yLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzdGRlcnIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgc3RkZXJyOiAke3N0ZGVycn1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBzdGRvdXQ6ICR7c3Rkb3V0fWApO1xyXG4gICAgfSk7XHJcblxyXG4gIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBWZWhpY2xlRGF0YSwgdmVoaWNsZVN0YXRlIH0gZnJvbSAnLi90eXBlcy9WZWhpY2xlRGF0YSdcclxuaW1wb3J0IHsgVmVoaWNsZUFwaURhdGEsIFZlaGljbGVQb3NEYXRhLCBWZWhpY2xlQXBpRGF0YUtlb2xpcyB9IGZyb20gJy4vdHlwZXMvVmVoaWNsZUFwaURhdGEnXHJcbmV4cG9ydCBjbGFzcyBDb252ZXJ0ZXIge1xyXG5cclxuICBkZWNvZGUoZGF0YTogVmVoaWNsZUFwaURhdGEsIGlzS2VvbGlzIDogYm9vbGVhbiA9IGZhbHNlKSA6IGFueSB7XHJcbiAgICBcclxuICAgIGxldCBuZXdEYXRhIDogYW55ID0gZGF0YTtcclxuXHJcbiAgICBpZihKU09OLnN0cmluZ2lmeShkYXRhKS5pbmNsdWRlcygndG1pODonKSlcclxuICAgICAgbmV3RGF0YSA9IHRoaXMucmVtb3ZlVG1pOChkYXRhKTsgXHJcblxyXG4gICAgaWYoIWlzS2VvbGlzKVxyXG4gICAgICByZXR1cm4gdGhpcy5jb252ZXJ0S1Y2VG9Kc29uKG5ld0RhdGEpO1xyXG5cclxuICAgIHJldHVybiB0aGlzLmNvbnZlcnRLVjZUb0pzb25LZW9saXMobmV3RGF0YSk7XHJcbiAgfSBcclxuXHJcbiAgY29udmVydEtWNlRvSnNvbktlb2xpcyhkYXRhOiBhbnkpIDogYW55IHtcclxuICAgIGNvbnN0IGFycmF5IDogQXJyYXk8VmVoaWNsZURhdGE+ID0gW107XHJcbiAgICBjb25zdCBrdjZwb3NpbmZvID0gZGF0YS5WVl9UTV9QVVNILktWNnBvc2luZm87XHJcbiAgICBcclxuICAgIGlmKGt2NnBvc2luZm8ubGVuZ3RoICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAga3Y2cG9zaW5mby5mb3JFYWNoKHN0YXR1c1dpdGhCdXMgPT4ge1xyXG4gICAgICAgIGNvbnN0IHZlaGljbGVQb3NEYXRhIDogVmVoaWNsZVBvc0RhdGEgPSBzdGF0dXNXaXRoQnVzW09iamVjdC5rZXlzKHN0YXR1c1dpdGhCdXMpWzBdXTtcclxuICAgICAgICAgIGFycmF5LnB1c2goe1xyXG4gICAgICAgICAgICBjb21wYW55OiB2ZWhpY2xlUG9zRGF0YS5kYXRhb3duZXJjb2RlLFxyXG4gICAgICAgICAgICBvcmlnaW5hbENvbXBhbnk6IHZlaGljbGVQb3NEYXRhLmRhdGFvd25lcmNvZGUsXHJcbiAgICAgICAgICAgIHBsYW5uaW5nTnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS5saW5lcGxhbm5pbmdudW1iZXIudG9TdHJpbmcoKSxcclxuICAgICAgICAgICAgam91cm5leU51bWJlcjogdmVoaWNsZVBvc0RhdGEuam91cm5leW51bWJlcixcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLnBhcnNlKHZlaGljbGVQb3NEYXRhLnRpbWVzdGFtcCksXHJcbiAgICAgICAgICAgIHZlaGljbGVOdW1iZXI6IHZlaGljbGVQb3NEYXRhLnZlaGljbGVudW1iZXIsXHJcbiAgICAgICAgICAgIGxpbmVOdW1iZXI6IFwiT25iZWtlbmRcIixcclxuICAgICAgICAgICAgcG9zaXRpb246IHRoaXMucmRUb0xhdExvbmcodmVoaWNsZVBvc0RhdGFbJ3JkLXgnXSwgdmVoaWNsZVBvc0RhdGFbJ3JkLXknXSksXHJcbiAgICAgICAgICAgIHB1bmN0dWFsaXR5OiBbdmVoaWNsZVBvc0RhdGEucHVuY3R1YWxpdHldLFxyXG4gICAgICAgICAgICBzdGF0dXM6IHZlaGljbGVTdGF0ZVtPYmplY3Qua2V5cyhzdGF0dXNXaXRoQnVzKVswXV0sXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICB1cGRhdGVkVGltZXM6IFtEYXRlLm5vdygpXSxcclxuICAgICAgICAgICAgY3VycmVudFJvdXRlSWQ6IDAsXHJcbiAgICAgICAgICAgIGN1cnJlbnRUcmlwSWQ6IDBcclxuICAgICAgICAgIH0pXHJcbiAgICAgIH0pXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zdCB2ZWhpY2xlUG9zRGF0YSA6IFZlaGljbGVQb3NEYXRhID0ga3Y2cG9zaW5mb1tPYmplY3Qua2V5cyhrdjZwb3NpbmZvKVswXV07XHJcbiAgICAgIGFycmF5LnB1c2goe1xyXG4gICAgICAgIGNvbXBhbnk6IHZlaGljbGVQb3NEYXRhLmRhdGFvd25lcmNvZGUsXHJcbiAgICAgICAgb3JpZ2luYWxDb21wYW55OiB2ZWhpY2xlUG9zRGF0YS5kYXRhb3duZXJjb2RlLFxyXG4gICAgICAgIHBsYW5uaW5nTnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS5saW5lcGxhbm5pbmdudW1iZXIudG9TdHJpbmcoKSxcclxuICAgICAgICBqb3VybmV5TnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS5qb3VybmV5bnVtYmVyLFxyXG4gICAgICAgIHRpbWVzdGFtcDogRGF0ZS5wYXJzZSh2ZWhpY2xlUG9zRGF0YS50aW1lc3RhbXApLFxyXG4gICAgICAgIHZlaGljbGVOdW1iZXI6IHZlaGljbGVQb3NEYXRhLnZlaGljbGVudW1iZXIsXHJcbiAgICAgICAgbGluZU51bWJlcjogXCJPbmJla2VuZFwiLFxyXG4gICAgICAgIHBvc2l0aW9uOiB0aGlzLnJkVG9MYXRMb25nKHZlaGljbGVQb3NEYXRhWydyZC14J10sIHZlaGljbGVQb3NEYXRhWydyZC15J10pLFxyXG4gICAgICAgIHB1bmN0dWFsaXR5OiBbdmVoaWNsZVBvc0RhdGEucHVuY3R1YWxpdHldLFxyXG4gICAgICAgIHN0YXR1czogdmVoaWNsZVN0YXRlW09iamVjdC5rZXlzKGt2NnBvc2luZm8pWzBdXSxcclxuICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgIHVwZGF0ZWRUaW1lczogW0RhdGUubm93KCldLFxyXG4gICAgICAgIGN1cnJlbnRSb3V0ZUlkOiAwLFxyXG4gICAgICAgIGN1cnJlbnRUcmlwSWQ6IDBcclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIFxyXG5cclxuICAgIHJldHVybiBhcnJheTtcclxuICB9XHJcblxyXG4gIGNvbnZlcnRLVjZUb0pzb24gKGRhdGEgOiBWZWhpY2xlQXBpRGF0YSkgOiBhbnkge1xyXG5cclxuICAgIGxldCBrdjZwb3NpbmZvID0gZGF0YS5WVl9UTV9QVVNILktWNnBvc2luZm87XHJcbiAgICBjb25zdCBhcnJheSA6IEFycmF5PFZlaGljbGVEYXRhPiA9IFtdO1xyXG5cclxuICAgIGlmKGt2NnBvc2luZm8gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIE9iamVjdC5lbnRyaWVzKGt2NnBvc2luZm8pLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xyXG4gICAgICAgIC8vSWYgdHJ1ZSwgdGhlIHJlY2VpdmVkIGRhdGEgaXMganVzdCBvbmUgb2JqZWN0IGluc3RlYWQgb2YgYXJyYXkuIFR5cGVvZiBWZWhpY2xlUG9zRGF0YVxyXG4gICAgICAgIGlmKHZhbHVlLmhhc093blByb3BlcnR5KFwiZGF0YW93bmVyY29kZVwiKSkgeyBcclxuXHJcbiAgICAgICAgICBjb25zdCB2ZWhpY2xlUG9zRGF0YSA6IFZlaGljbGVQb3NEYXRhID0ga3Y2cG9zaW5mb1trZXldO1xyXG4gICAgICAgICAgaWYoISghcGFyc2VJbnQodmVoaWNsZVBvc0RhdGFbJ3JkLXgnXSArIFwiXCIpIHx8ICFwYXJzZUludCh2ZWhpY2xlUG9zRGF0YVsncmQteSddICsgXCJcIikpKSB7XHJcbiAgICAgICAgICAgIGFycmF5LnB1c2goXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgY29tcGFueTogdmVoaWNsZVBvc0RhdGEuZGF0YW93bmVyY29kZSxcclxuICAgICAgICAgICAgICAgIG9yaWdpbmFsQ29tcGFueTogdmVoaWNsZVBvc0RhdGEuZGF0YW93bmVyY29kZSxcclxuICAgICAgICAgICAgICAgIHBsYW5uaW5nTnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS5saW5lcGxhbm5pbmdudW1iZXIudG9TdHJpbmcoKSxcclxuICAgICAgICAgICAgICAgIGpvdXJuZXlOdW1iZXI6IHZlaGljbGVQb3NEYXRhLmpvdXJuZXludW1iZXIsXHJcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUucGFyc2UodmVoaWNsZVBvc0RhdGEudGltZXN0YW1wKSxcclxuICAgICAgICAgICAgICAgIHZlaGljbGVOdW1iZXI6IHZlaGljbGVQb3NEYXRhLnZlaGljbGVudW1iZXIsXHJcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBcIk9uYmVrZW5kXCIsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5yZFRvTGF0TG9uZyh2ZWhpY2xlUG9zRGF0YVsncmQteCddLCB2ZWhpY2xlUG9zRGF0YVsncmQteSddKSxcclxuICAgICAgICAgICAgICAgIHB1bmN0dWFsaXR5OiBbdmVoaWNsZVBvc0RhdGEucHVuY3R1YWxpdHldLFxyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiB2ZWhpY2xlU3RhdGVba2V5XSxcclxuICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgICAgICAgIHVwZGF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgICAgICAgIHVwZGF0ZWRUaW1lczogW0RhdGUubm93KCldLFxyXG4gICAgICAgICAgICAgICAgY3VycmVudFJvdXRlSWQ6IDAsIFxyXG4gICAgICAgICAgICAgICAgY3VycmVudFRyaXBJZDogMFxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgfSAgXHJcbiAgICAgICAgLy9JZiB0aGlzIGlzIHRydWUsIHRoZSByZWNlaXZlZCBkYXRhIGlzIGFuIGFycmF5IG9mIG9iamVjdHMuICBUeXBlb2YgVmVoaWNsZVBvc0RhdGFbXVxyXG4gICAgICAgIH0gZWxzZSBpZih2YWx1ZVtPYmplY3Qua2V5cyh2YWx1ZSlbMF1dICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIGZvcihsZXQgaiA9MDsgaiA8IGt2NnBvc2luZm9ba2V5XS5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICBjb25zdCB2ZWhpY2xlUG9zRGF0YSA6IFZlaGljbGVQb3NEYXRhID0ga3Y2cG9zaW5mb1trZXldW2pdO1xyXG4gICAgICAgICAgICBpZighcGFyc2VJbnQodmVoaWNsZVBvc0RhdGFbJ3JkLXgnXSArIFwiXCIpIHx8ICFwYXJzZUludCh2ZWhpY2xlUG9zRGF0YVsncmQteSddICsgXCJcIikpIGNvbnRpbnVlOyBcclxuICAgICAgICAgICAgYXJyYXkucHVzaChcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBjb21wYW55OiB2ZWhpY2xlUG9zRGF0YS5kYXRhb3duZXJjb2RlLFxyXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxDb21wYW55OiB2ZWhpY2xlUG9zRGF0YS5kYXRhb3duZXJjb2RlLFxyXG4gICAgICAgICAgICAgICAgcGxhbm5pbmdOdW1iZXI6IHZlaGljbGVQb3NEYXRhLmxpbmVwbGFubmluZ251bWJlci50b1N0cmluZygpLFxyXG4gICAgICAgICAgICAgICAgam91cm5leU51bWJlcjogdmVoaWNsZVBvc0RhdGEuam91cm5leW51bWJlcixcclxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5wYXJzZSh2ZWhpY2xlUG9zRGF0YS50aW1lc3RhbXApLFxyXG4gICAgICAgICAgICAgICAgdmVoaWNsZU51bWJlcjogdmVoaWNsZVBvc0RhdGEudmVoaWNsZW51bWJlcixcclxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IFwiT25iZWtlbmRcIixcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnJkVG9MYXRMb25nKHZlaGljbGVQb3NEYXRhWydyZC14J10sIHZlaGljbGVQb3NEYXRhWydyZC15J10pLFxyXG4gICAgICAgICAgICAgICAgcHVuY3R1YWxpdHk6IFt2ZWhpY2xlUG9zRGF0YS5wdW5jdHVhbGl0eV0sXHJcbiAgICAgICAgICAgICAgICBzdGF0dXM6IHZlaGljbGVTdGF0ZVtrZXldLFxyXG4gICAgICAgICAgICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgdXBkYXRlZFRpbWVzOiBbRGF0ZS5ub3coKV0sXHJcbiAgICAgICAgICAgICAgICBjdXJyZW50Um91dGVJZCA6IDAsXHJcbiAgICAgICAgICAgICAgICBjdXJyZW50VHJpcElkIDogMFxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhcnJheTtcclxuXHJcbiAgfVxyXG5cclxuICByZW1vdmVUbWk4IChkYXRhIDogVmVoaWNsZUFwaURhdGEpIDogVmVoaWNsZUFwaURhdGEge1xyXG4gICAgbGV0IGRhdGFTdHJpbmcgOiBzdHJpbmcgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcclxuICAgIGRhdGFTdHJpbmcgPSBkYXRhU3RyaW5nLnJlcGxhY2UoL3RtaTg6L2csIFwiXCIpO1xyXG4gICAgcmV0dXJuIEpTT04ucGFyc2UoZGF0YVN0cmluZyk7XHJcbiAgfVxyXG5cclxuICByZFRvTGF0TG9uZyAoeCwgeSkgOiBbbnVtYmVyLCBudW1iZXJdIHtcclxuICAgIGlmKHggPT09IHVuZGVmaW5lZCB8fCB5ID09PSB1bmRlZmluZWQpIHJldHVybiBbMCwgMF07XHJcblxyXG4gICAgY29uc3QgZFggPSAoeCAtIDE1NTAwMCkgKiBNYXRoLnBvdygxMCwgLTUpO1xyXG4gICAgY29uc3QgZFkgPSAoeSAtIDQ2MzAwMCkgKiBNYXRoLnBvdygxMCwgLTUpO1xyXG4gICAgY29uc3QgU29tTiA9ICgzMjM1LjY1Mzg5ICogZFkpICsgKC0zMi41ODI5NyAqIE1hdGgucG93KGRYLCAyKSkgKyAoLTAuMjQ3NSAqXHJcbiAgICAgIE1hdGgucG93KGRZLCAyKSkgKyAoLTAuODQ5NzggKiBNYXRoLnBvdyhkWCwgMikgKlxyXG4gICAgICBkWSkgKyAoLTAuMDY1NSAqIE1hdGgucG93KGRZLCAzKSkgKyAoLTAuMDE3MDkgKlxyXG4gICAgICBNYXRoLnBvdyhkWCwgMikgKiBNYXRoLnBvdyhkWSwgMikpICsgKC0wLjAwNzM4ICpcclxuICAgICAgZFgpICsgKDAuMDA1MyAqIE1hdGgucG93KGRYLCA0KSkgKyAoLTAuMDAwMzkgKlxyXG4gICAgICBNYXRoLnBvdyhkWCwgMikgKiBNYXRoLnBvdyhkWSwgMykpICsgKDAuMDAwMzMgKiBNYXRoLnBvdyhcclxuICAgICAgZFgsIDQpICogZFkpICsgKC0wLjAwMDEyICpcclxuICAgICAgZFggKiBkWSk7XHJcbiAgICBjb25zdCBTb21FID0gKDUyNjAuNTI5MTYgKiBkWCkgKyAoMTA1Ljk0Njg0ICogZFggKiBkWSkgKyAoMi40NTY1NiAqXHJcbiAgICAgIGRYICogTWF0aC5wb3coZFksIDIpKSArICgtMC44MTg4NSAqIE1hdGgucG93KFxyXG4gICAgICBkWCwgMykpICsgKDAuMDU1OTQgKlxyXG4gICAgICBkWCAqIE1hdGgucG93KGRZLCAzKSkgKyAoLTAuMDU2MDcgKiBNYXRoLnBvdyhcclxuICAgICAgZFgsIDMpICogZFkpICsgKDAuMDExOTkgKlxyXG4gICAgICBkWSkgKyAoLTAuMDAyNTYgKiBNYXRoLnBvdyhkWCwgMykgKiBNYXRoLnBvdyhcclxuICAgICAgZFksIDIpKSArICgwLjAwMTI4ICpcclxuICAgICAgZFggKiBNYXRoLnBvdyhkWSwgNCkpICsgKDAuMDAwMjIgKiBNYXRoLnBvdyhkWSxcclxuICAgICAgMikpICsgKC0wLjAwMDIyICogTWF0aC5wb3coXHJcbiAgICAgIGRYLCAyKSkgKyAoMC4wMDAyNiAqXHJcbiAgICAgIE1hdGgucG93KGRYLCA1KSk7XHJcbiAgICBcclxuICAgIGNvbnN0IExhdGl0dWRlID0gNTIuMTU1MTcgKyAoU29tTiAvIDM2MDApO1xyXG4gICAgY29uc3QgTG9uZ2l0dWRlID0gNS4zODcyMDYgKyAoU29tRSAvIDM2MDApO1xyXG4gICAgXHJcbiAgICByZXR1cm4gW0xvbmdpdHVkZSwgTGF0aXR1ZGVdXHJcbiAgfVxyXG5cclxufSIsImltcG9ydCB7IENvbm5lY3Rpb24sIE1vZGVsLCBNb25nb29zZSwgRmlsdGVyUXVlcnksIFNjaGVtYSB9IGZyb20gJ21vbmdvb3NlJztcclxuaW1wb3J0IHsgVHJpcCB9IGZyb20gJy4vdHlwZXMvVHJpcCc7XHJcbmltcG9ydCB7IFZlaGljbGVEYXRhLCB2ZWhpY2xlU3RhdGUgfSBmcm9tICcuL3R5cGVzL1ZlaGljbGVEYXRhJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IFJvdXRlIH0gZnJvbSAnLi90eXBlcy9Sb3V0ZSc7XHJcbmltcG9ydCB7IFRyaXBQb3NpdGlvbkRhdGEgfSBmcm9tICcuL3R5cGVzL1RyaXBQb3NpdGlvbkRhdGEnO1xyXG5pbXBvcnQgeyBXZWJzb2NrZXRWZWhpY2xlRGF0YSB9IGZyb20gJy4vdHlwZXMvV2Vic29ja2V0VmVoaWNsZURhdGEnO1xyXG5jb25zdCBzdHJlYW1Ub01vbmdvREIgPSByZXF1aXJlKCdzdHJlYW0tdG8tbW9uZ28tZGInKS5zdHJlYW1Ub01vbmdvREI7XHJcbmNvbnN0IHNwbGl0ID0gcmVxdWlyZSgnc3BsaXQnKTtcclxuZXhwb3J0IGNsYXNzIERhdGFiYXNlIHtcclxuICBcclxuICBwcml2YXRlIHN0YXRpYyBpbnN0YW5jZSA6IERhdGFiYXNlO1xyXG4gIFxyXG4gIHByaXZhdGUgZGIgOiBDb25uZWN0aW9uO1xyXG4gIHByaXZhdGUgbW9uZ29vc2UgOiBNb25nb29zZTtcclxuICBwcml2YXRlIHZlaGljbGVTY2hlbWEgOiBTY2hlbWE7XHJcbiAgcHJpdmF0ZSB0cmlwc1NjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIHJvdXRlc1NjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIGRyaXZlblJvdXRlc1NjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIHZlaGljbGVNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIHRyaXBNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIHJvdXRlc01vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgZHJpdmVuUm91dGVzTW9kZWwgOiB0eXBlb2YgTW9kZWw7XHJcbiAgcHJpdmF0ZSBvdXRwdXREQkNvbmZpZztcclxuXHJcbiAgcHVibGljIHN0YXRpYyBnZXRJbnN0YW5jZSgpOiBEYXRhYmFzZSB7XHJcbiAgICBpZighRGF0YWJhc2UuaW5zdGFuY2UpXHJcbiAgICAgIERhdGFiYXNlLmluc3RhbmNlID0gbmV3IERhdGFiYXNlKCk7XHJcblxyXG4gICAgcmV0dXJuIERhdGFiYXNlLmluc3RhbmNlO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEluaXQoKSB7XHJcbiAgICBjb25zdCB1cmwgOiBzdHJpbmcgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkw7XHJcbiAgICBjb25zdCBuYW1lIDogc3RyaW5nID0gcHJvY2Vzcy5lbnYuREFUQUJBU0VfTkFNRTtcclxuXHJcbiAgICB0aGlzLm1vbmdvb3NlID0gbmV3IE1vbmdvb3NlKCk7XHJcbiAgICBcclxuICAgIHRoaXMubW9uZ29vc2Uuc2V0KCd1c2VGaW5kQW5kTW9kaWZ5JywgZmFsc2UpXHJcblxyXG4gICAgaWYoIXVybCAmJiAhbmFtZSkgdGhyb3cgKGBJbnZhbGlkIFVSTCBvciBuYW1lIGdpdmVuLCByZWNlaXZlZDogXFxuIE5hbWU6ICR7bmFtZX0gXFxuIFVSTDogJHt1cmx9YClcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgQ29ubmVjdGluZyB0byBkYXRhYmFzZSB3aXRoIG5hbWU6ICR7bmFtZX0gYXQgdXJsOiAke3VybH1gKVxyXG4gICAgdGhpcy5tb25nb29zZS5jb25uZWN0KGAke3VybH0vJHtuYW1lfWAsIHtcclxuICAgICAgdXNlTmV3VXJsUGFyc2VyOiB0cnVlLFxyXG4gICAgICB1c2VVbmlmaWVkVG9wb2xvZ3k6IHRydWUsXHJcbiAgICAgIHBvb2xTaXplOiAxMjBcclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy5kYiA9IHRoaXMubW9uZ29vc2UuY29ubmVjdGlvbjtcclxuXHJcbiAgICB0aGlzLm91dHB1dERCQ29uZmlnID0geyBkYlVSTCA6IGAke3VybH0vJHtuYW1lfWAsIGNvbGxlY3Rpb24gOiAndHJpcHMnIH07XHJcblxyXG4gICAgdGhpcy5kYi5vbignZXJyb3InLCBlcnJvciA9PiB7XHJcbiAgICAgIHRocm93IG5ldyBlcnJvcihgRXJyb3IgY29ubmVjdGluZyB0byBkYXRhYmFzZS4gJHtlcnJvcn1gKTtcclxuICAgIH0pXHJcblxyXG4gICAgYXdhaXQgdGhpcy5EYXRhYmFzZUxpc3RlbmVyKCk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgR2V0RGF0YWJhc2UoKSA6IENvbm5lY3Rpb24ge1xyXG4gICAgcmV0dXJuIHRoaXMuZGI7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgRGF0YWJhc2VMaXN0ZW5lciAoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XHJcbiAgICAgICAgdGhpcy5kYi5vbmNlKFwib3BlblwiLCAoKSA9PiB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvbm5lY3Rpb24gdG8gZGF0YWJhc2UgZXN0YWJsaXNoZWQuXCIpXHJcblxyXG4gICAgICAgICAgdGhpcy52ZWhpY2xlU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgY29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICBvcmlnaW5hbENvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgcGxhbm5pbmdOdW1iZXI6IFN0cmluZyxcclxuICAgICAgICAgICAgam91cm5leU51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IE51bWJlcixcclxuICAgICAgICAgICAgdmVoaWNsZU51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogW051bWJlciwgTnVtYmVyXSxcclxuICAgICAgICAgICAgc3RhdHVzOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIGxpbmVOdW1iZXI6IFN0cmluZyxcclxuICAgICAgICAgICAgcHVuY3R1YWxpdHk6IEFycmF5LFxyXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IE51bWJlcixcclxuICAgICAgICAgICAgdXBkYXRlZEF0OiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHVwZGF0ZWRUaW1lczogQXJyYXksXHJcbiAgICAgICAgICAgIGN1cnJlbnRSb3V0ZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIGN1cnJlbnRUcmlwSWQ6IE51bWJlcixcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICB0aGlzLnRyaXBzU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgY29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHNlcnZpY2VJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB0cmlwSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgdHJpcE51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICB0cmlwUGxhbm5pbmdOdW1iZXI6IFN0cmluZyxcclxuICAgICAgICAgICAgdHJpcEhlYWRzaWduOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHRyaXBOYW1lOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIGRpcmVjdGlvbklkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHNoYXBlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgd2hlZWxjaGFpckFjY2Vzc2libGU6IE51bWJlclxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLnJvdXRlc1NjaGVtYSA9IG5ldyB0aGlzLm1vbmdvb3NlLlNjaGVtYSh7XHJcbiAgICAgICAgICAgIHJvdXRlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgY29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICBzdWJDb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlU2hvcnROYW1lOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlTG9uZ05hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVEZXNjcmlwdGlvbjogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZVR5cGU6IE51bWJlcixcclxuICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgdGhpcy5kcml2ZW5Sb3V0ZXNTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICB0cmlwSWQgOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIGNvbXBhbnkgOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uczogQXJyYXksXHJcbiAgICAgICAgICAgIHVwZGF0ZWRUaW1lcyA6IEFycmF5XHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIHRoaXMudHJpcHNTY2hlbWEuaW5kZXgoeyB0cmlwTnVtYmVyOiAtMSwgdHJpcFBsYW5uaW5nTnVtYmVyOiAtMSwgY29tcGFueTogLTEgfSlcclxuICAgICAgICAgIHRoaXMuZHJpdmVuUm91dGVzU2NoZW1hLmluZGV4KHsgdHJpcElkOiAtMSwgY29tcGFueTogLTEgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLnZlaGljbGVNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJWZWhpY2xlUG9zaXRpb25zXCIsIHRoaXMudmVoaWNsZVNjaGVtYSk7XHJcbiAgICAgICAgICB0aGlzLnRyaXBNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJ0cmlwc1wiLCB0aGlzLnRyaXBzU2NoZW1hKTtcclxuICAgICAgICAgIHRoaXMucm91dGVzTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwicm91dGVzXCIsIHRoaXMucm91dGVzU2NoZW1hKTtcclxuICAgICAgICAgIHRoaXMuZHJpdmVuUm91dGVzTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwiZHJpdmVucm91dGVzXCIsIHRoaXMuZHJpdmVuUm91dGVzU2NoZW1hKTtcclxuXHJcbiAgICAgICAgICB0aGlzLnRyaXBNb2RlbC5jcmVhdGVJbmRleGVzKCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJlcygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldEFsbFZlaGljbGVzIChhcmdzID0ge30pIDogUHJvbWlzZTxBcnJheTxWZWhpY2xlRGF0YT4+IHtcclxuICAgIHJldHVybiBhd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kKHsuLi5hcmdzfSwgeyBwdW5jdHVhbGl0eTogMCwgdXBkYXRlZFRpbWVzOiAwLCBfX3YgOiAwIH0pO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldEFsbFZlaGljbGVzU21hbGwgKGFyZ3MgPSB7fSkgOiBQcm9taXNlPEFycmF5PFdlYnNvY2tldFZlaGljbGVEYXRhPj4ge1xyXG4gICAgY29uc3Qgc21hbGxCdXNzZXMgOiBBcnJheTxXZWJzb2NrZXRWZWhpY2xlRGF0YT4gPSBbXTtcclxuXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kKHsuLi5hcmdzfSxcclxuICAgICAgeyBcclxuICAgICAgcHVuY3R1YWxpdHk6IDAsIFxyXG4gICAgICB1cGRhdGVkVGltZXM6IDAsIFxyXG4gICAgICBfX3YgOiAwLFxyXG4gICAgICBqb3VybmV5TnVtYmVyOiAwLFxyXG4gICAgICB0aW1lc3RhbXAgOiAwLFxyXG4gICAgICBjcmVhdGVkQXQ6IDAsXHJcbiAgICAgIHVwZGF0ZWRBdDogMCxcclxuICAgICAgY3VycmVudFJvdXRlSWQ6IDAsXHJcbiAgICAgIGN1cnJlbnRUcmlwSWQ6IDAsXHJcbiAgICAgIHBsYW5uaW5nTnVtYmVyOiAwLFxyXG4gICAgICBzdGF0dXM6IDBcclxuICAgIH0pXHJcblxyXG4gICAgcmVzdWx0LmZvckVhY2gocmVzID0+IHtcclxuICAgICAgc21hbGxCdXNzZXMucHVzaCh7XHJcbiAgICAgICAgcDogcmVzLnBvc2l0aW9uLFxyXG4gICAgICAgIGM6IHJlcy5jb21wYW55LFxyXG4gICAgICAgIHY6IHJlcy52ZWhpY2xlTnVtYmVyLFxyXG4gICAgICAgIG46IHJlcy5saW5lTnVtYmVyXHJcbiAgICAgIH0pXHJcbiAgICB9KVxyXG5cclxuICAgIHJldHVybiBzbWFsbEJ1c3NlcztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRWZWhpY2xlICh2ZWhpY2xlTnVtYmVyLCB0cmFuc3BvcnRlciwgZmlyc3RPbmx5IDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8VmVoaWNsZURhdGE+IHtcclxuICAgIHJldHVybiB7IFxyXG4gICAgICAuLi5hd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kT25lKHtcclxuICAgICAgICB2ZWhpY2xlTnVtYmVyIDogdmVoaWNsZU51bWJlcixcclxuICAgICAgICBjb21wYW55OiB0cmFuc3BvcnRlclxyXG4gICAgICB9KVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBWZWhpY2xlRXhpc3RzKHZlaGljbGVOdW1iZXIsIHRyYW5zcG9ydGVyKSA6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuR2V0VmVoaWNsZSh2ZWhpY2xlTnVtYmVyLCB0cmFuc3BvcnRlcikgIT09IG51bGw7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgVXBkYXRlVmVoaWNsZSAodmVoaWNsZVRvVXBkYXRlIDogYW55LCB1cGRhdGVkVmVoaWNsZURhdGEgOiBWZWhpY2xlRGF0YSwgcG9zaXRpb25DaGVja3MgOiBib29sZWFuID0gZmFsc2UpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kT25lQW5kVXBkYXRlKHZlaGljbGVUb1VwZGF0ZSwgdXBkYXRlZFZlaGljbGVEYXRhKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBBZGRWZWhpY2xlICh2ZWhpY2xlIDogVmVoaWNsZURhdGEsIG9ubHlBZGRXaGlsZU9uUm91dGUgOiBib29sZWFuKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYob25seUFkZFdoaWxlT25Sb3V0ZSAmJiB2ZWhpY2xlLnN0YXR1cyAhPT0gdmVoaWNsZVN0YXRlLk9OUk9VVEUpIHJldHVybjtcclxuICAgIG5ldyB0aGlzLnZlaGljbGVNb2RlbCh7XHJcbiAgICAgIC4uLnZlaGljbGUsXHJcbiAgICAgIHB1bmN0dWFsaXR5IDogdmVoaWNsZS5wdW5jdHVhbGl0eVxyXG4gICAgfSkuc2F2ZShlcnJvciA9PiB7XHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGBTb21ldGhpbmcgd2VudCB3cm9uZyB3aGlsZSB0cnlpbmcgdG8gYWRkIHZlaGljbGU6ICR7dmVoaWNsZS52ZWhpY2xlTnVtYmVyfS4gRXJyb3I6ICR7ZXJyb3J9YClcclxuICAgIH0pXHJcbiAgfVxyXG4gIFxyXG4gIHB1YmxpYyBhc3luYyBSZW1vdmVWZWhpY2xlICh2ZWhpY2xlIDogVmVoaWNsZURhdGEpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZighdmVoaWNsZVtcIl9kb2NcIl0pIHJldHVyblxyXG5cclxuICAgIHRoaXMudmVoaWNsZU1vZGVsLmZpbmRPbmVBbmREZWxldGUodmVoaWNsZSlcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBSZW1vdmVWZWhpY2xlc1doZXJlKCBwYXJhbXMgOiBvYmplY3QsIGRvTG9nZ2luZyA6IGJvb2xlYW4gPSBmYWxzZSkgOiBQcm9taXNlPEFycmF5PFZlaGljbGVEYXRhPj4ge1xyXG4gICAgY29uc3QgcmVtb3ZlZFZlaGljbGVzIDogQXJyYXk8VmVoaWNsZURhdGE+ID0gYXdhaXQgdGhpcy5HZXRBbGxWZWhpY2xlcyhwYXJhbXMpO1xyXG4gICAgdGhpcy52ZWhpY2xlTW9kZWwuZGVsZXRlTWFueShwYXJhbXMpLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICBpZihkb0xvZ2dpbmcpIGNvbnNvbGUubG9nKGBEZWxldGVkICR7cmVzcG9uc2UuZGVsZXRlZENvdW50fSB2ZWhpY2xlcy5gKTtcclxuICAgICAgXHJcbiAgICB9KTtcclxuICAgIHJldHVybiByZW1vdmVkVmVoaWNsZXM7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0VHJpcHMocGFyYW1zIDogb2JqZWN0ID0ge30pIDogUHJvbWlzZTxBcnJheTxUcmlwPj4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMudHJpcE1vZGVsLmZpbmQocGFyYW1zKVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFRyaXAodHJpcE51bWJlciA6IG51bWJlciwgdHJpcFBsYW5uaW5nTnVtYmVyIDogc3RyaW5nLCBjb21wYW55IDogc3RyaW5nKSB7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnRyaXBNb2RlbC5maW5kT25lKHtcclxuICAgICAgY29tcGFueTogY29tcGFueSxcclxuICAgICAgdHJpcE51bWJlciA6IHRyaXBOdW1iZXIsXHJcbiAgICAgIHRyaXBQbGFubmluZ051bWJlcjogdHJpcFBsYW5uaW5nTnVtYmVyXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcmVzcG9uc2UgIT09IG51bGwgPyByZXNwb25zZSA6IHt9O1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFJlbW92ZVRyaXAocGFyYW1zIDogb2JqZWN0ID0ge30sIGRvTG9nZ2luZyA6IGJvb2xlYW4gPSBmYWxzZSkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMudHJpcE1vZGVsLmRlbGV0ZU1hbnkocGFyYW1zKS50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgaWYoZG9Mb2dnaW5nKSBjb25zb2xlLmxvZyhgRGVsZXRlZCAke3Jlc3BvbnNlLmRlbGV0ZWRDb3VudH0gdHJpcHNgKTtcclxuICAgIH0pXHJcbiAgfVxyXG4gIC8qKlxyXG4gICAqIEluc2VydHMgbWFueSB0cmlwcyBhdCBvbmNlIGludG8gdGhlIGRhdGFiYXNlLlxyXG4gICAqIEBwYXJhbSB0cmlwcyBUaGUgdHJpcHMgdG8gYWRkLlxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBJbnNlcnRNYW55VHJpcHModHJpcHMpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgIGF3YWl0IHRoaXMudHJpcE1vZGVsLmluc2VydE1hbnkodHJpcHMsIHsgb3JkZXJlZDogZmFsc2UgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgXCJLb3BwZWx2bGFrIDcgYW5kIDggdHVyYm9cIiBmaWxlcyB0byBkYXRhYmFzZS5cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgSW5zZXJ0VHJpcCh0cmlwIDogVHJpcCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIG5ldyB0aGlzLnRyaXBNb2RlbCh0cmlwKS5zYXZlKGVycm9yID0+IHtcclxuICAgICAgaWYoZXJyb3IpIGNvbnNvbGUuZXJyb3IoYFNvbWV0aGluZyB3ZW50IHdyb25nIHdoaWxlIHRyeWluZyB0byBhZGQgdHJpcDogJHt0cmlwLnRyaXBIZWFkc2lnbn0uIEVycm9yOiAke2Vycm9yfWApXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIERyb3BUcmlwc0NvbGxlY3Rpb24oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwaW5nIHRyaXBzIGNvbGxlY3Rpb25cIik7XHJcbiAgICBhd2FpdCB0aGlzLnRyaXBNb2RlbC5yZW1vdmUoe30pO1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGVkIHRyaXBzIGNvbGxlY3Rpb25cIik7XHJcbiAgfVxyXG4gIHB1YmxpYyBhc3luYyBEcm9wUm91dGVzQ29sbGVjdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBpbmcgcm91dGVzIGNvbGxlY3Rpb25cIik7XHJcbiAgICBhd2FpdCB0aGlzLnJvdXRlc01vZGVsLnJlbW92ZSh7fSk7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwZWQgcm91dGVzIGNvbGxlY3Rpb25cIik7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0Um91dGUocm91dGVJZCA6IG51bWJlcikgOiBQcm9taXNlPFJvdXRlPiB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMucm91dGVzTW9kZWwuZmluZE9uZSh7XHJcbiAgICAgIHJvdXRlSWQgOiByb3V0ZUlkLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3BvbnNlICE9PSBudWxsID8gcmVzcG9uc2UgOiB7fTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBVcGRhdGVUcmlwUG9zaXRpb25zKHRyaXBJZCwgY29tcGFueSwgdHJpcERhdGEgOiBUcmlwUG9zaXRpb25EYXRhKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5kcml2ZW5Sb3V0ZXNNb2RlbC5maW5kT25lQW5kVXBkYXRlKFxyXG4gICAgICB7XHJcbiAgICAgICAgdHJpcElkIDogdHJpcElkLFxyXG4gICAgICAgIGNvbXBhbnkgOiBjb21wYW55XHJcbiAgICAgIH0sIFxyXG4gICAgICB0cmlwRGF0YSwgXHJcbiAgICAgIHsgdXBzZXJ0IDogdHJ1ZSB9XHJcbiAgICApXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0VHJpcFBvc2l0aW9ucyh0cmlwSWQgOiBudW1iZXIsIGNvbXBhbnkgOiBzdHJpbmcpIDogUHJvbWlzZTxUcmlwUG9zaXRpb25EYXRhPiB7XHJcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5kcml2ZW5Sb3V0ZXNNb2RlbC5maW5kT25lKHsgXHJcbiAgICAgIHRyaXBJZDogdHJpcElkLFxyXG4gICAgICBjb21wYW55OiBjb21wYW55LFxyXG4gICAgfSlcclxuXHJcblxyXG4gIH1cclxuXHJcbiAgLy8gcHVibGljIGFzeW5jIEFkZFJvdXRlKClcclxuXHJcbn1cclxuIiwiLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgICAgQVBQIENPTkZJR1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuXHJcbmltcG9ydCAqIGFzIGRvdGVudiBmcm9tICdkb3RlbnYnO1xyXG5kb3RlbnYuY29uZmlnKCk7XHJcblxyXG5jb25zdCBwb3J0ID0gcHJvY2Vzcy5lbnYuUE9SVCB8fCAzMDAyO1xyXG5cclxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgICAgWUFSTiBJTVBPUlRTXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5pbXBvcnQgKiBhcyBodHRwcyBmcm9tICdodHRwcyc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuXHJcbmNvbnN0IGV4cHJlc3MgPSByZXF1aXJlKFwiZXhwcmVzc1wiKTtcclxuY29uc3QgY29ycyA9IHJlcXVpcmUoXCJjb3JzXCIpO1xyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgQ1VTVE9NIElNUE9SVFNcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcblxyXG5pbXBvcnQgeyBEYXRhYmFzZSB9IGZyb20gJy4vZGF0YWJhc2UnO1xyXG5pbXBvcnQgeyBXZWJzb2NrZXQgfSBmcm9tICcuL3NvY2tldCc7XHJcbmltcG9ydCB7IE9WRGF0YSB9IGZyb20gJy4vcmVhbHRpbWUnO1xyXG5cclxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgICAgU1NMIENPTkZJR1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuY29uc3QgcHJpdmF0ZUtleSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUva2V5LmtleVwiKS50b1N0cmluZygpO1xyXG5jb25zdCBjZXJ0aWZpY2F0ZSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUvY2VydC5jcnRcIikudG9TdHJpbmcoKTtcclxuY29uc3QgY2EgPSBmcy5yZWFkRmlsZVN5bmMoXCIuL2NlcnRpZmljYXRlL2tleS1jYS5jcnRcIikudG9TdHJpbmcoKTtcclxuXHJcbmNvbnN0IEFwcEluaXQgPSBhc3luYyAoKSA9PiB7XHJcbiAgY29uc3QgZGIgPSBhd2FpdCBEYXRhYmFzZS5nZXRJbnN0YW5jZSgpLkluaXQoKS50aGVuKCk7XHJcbiAgXHJcbiAgY29uc3QgYXBwID0gKG1vZHVsZS5leHBvcnRzID0gZXhwcmVzcygpKTtcclxuXHJcbiAgY29uc3Qgc2VydmVyID0gaHR0cHMuY3JlYXRlU2VydmVyKFxyXG4gICAge1xyXG4gICAgICBrZXk6IHByaXZhdGVLZXksXHJcbiAgICAgIGNlcnQ6IGNlcnRpZmljYXRlLFxyXG4gICAgICBjYTogY2EsXHJcbiAgICAgIHJlcXVlc3RDZXJ0OiB0cnVlLFxyXG4gICAgICByZWplY3RVbmF1dGhvcml6ZWQ6IGZhbHNlLFxyXG4gICAgfSxcclxuICAgIGFwcFxyXG4gICk7XHJcbiAgXHJcblxyXG4gIC8vVEhJUyBJUyBOT1QgU0FGRVxyXG5cclxuICBjb25zdCBjb3JzT3B0aW9ucyA9IHtcclxuICAgIG9yaWdpbjogJyonLFxyXG4gICAgb3B0aW9uc1N1Y2Nlc3NTdGF0dXM6IDIwMFxyXG4gIH1cclxuXHJcbiAgYXBwLnVzZShjb3JzKGNvcnNPcHRpb25zKSlcclxuICBhcHAub3B0aW9ucygnKicsIGNvcnMoKSlcclxuXHJcblxyXG4gIGNvbnN0IHNvY2tldCA9IG5ldyBXZWJzb2NrZXQoc2VydmVyLCBkYik7XHJcbiAgY29uc3Qgb3YgPSBuZXcgT1ZEYXRhKGRiLCBzb2NrZXQpO1xyXG4gIC8vYnVzTG9naWMuSW5pdEtWNzgoKTtcclxuICBcclxuICBzZXJ2ZXIubGlzdGVuKHBvcnQsICgpID0+IGNvbnNvbGUubG9nKGBMaXN0ZW5pbmcgYXQgaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9YCkpO1xyXG5cclxufVxyXG5cclxuQXBwSW5pdCgpO1xyXG4iLCJpbXBvcnQgeyBWZWhpY2xlRGF0YSB9IGZyb20gXCIuL3R5cGVzL1ZlaGljbGVEYXRhXCI7XHJcbmltcG9ydCB7IGd1bnppcCB9IGZyb20gJ3psaWInO1xyXG5pbXBvcnQgeyBDb252ZXJ0ZXIgfSBmcm9tICcuL2NvbnZlcnRlcic7XHJcbmltcG9ydCB7IEJ1c0xvZ2ljIH0gZnJvbSBcIi4vYnVzbG9naWNcIjtcclxuXHJcbmltcG9ydCAqIGFzIHhtbCBmcm9tICdmYXN0LXhtbC1wYXJzZXInO1xyXG5pbXBvcnQgeyBXZWJzb2NrZXQgfSBmcm9tIFwiLi9zb2NrZXRcIjtcclxuXHJcbmNvbnN0IHptcSA9IHJlcXVpcmUoJ3plcm9tcScpO1xyXG5jb25zdCBkb0xvZ2dpbmcgPSBwcm9jZXNzLmVudi5BUFBfRE9fTE9HR0lORyA9PSBcInRydWVcIiA/IHRydWUgOiBmYWxzZTtcclxuZXhwb3J0IGNsYXNzIE9WRGF0YSB7XHJcbiAgXHJcbiAgcHJpdmF0ZSBzb2NrO1xyXG4gIHByaXZhdGUga3Y3OHNvY2tldDtcclxuICBwcml2YXRlIGJ1c0xvZ2ljIDogQnVzTG9naWM7XHJcbiAgcHJpdmF0ZSB3ZWJzb2NrZXQgOiBXZWJzb2NrZXQ7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGRhdGFiYXNlLCBzb2NrZXQgOiBXZWJzb2NrZXQpIHtcclxuICAgIHRoaXMud2Vic29ja2V0ID0gc29ja2V0O1xyXG4gICAgdGhpcy5Jbml0KCk7XHJcbiAgICB0aGlzLmJ1c0xvZ2ljID0gbmV3IEJ1c0xvZ2ljKGRhdGFiYXNlLCBmYWxzZSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgSW5pdCgpIHtcclxuXHJcbiAgICBjb25zdCBjb252ZXJ0ZXIgPSBuZXcgQ29udmVydGVyKCk7XHJcblxyXG4gICAgdGhpcy5zb2NrID0gem1xLnNvY2tldChcInN1YlwiKTtcclxuXHJcbiAgICB0aGlzLnNvY2suY29ubmVjdChcInRjcDovL3B1YnN1Yi5uZG92bG9rZXQubmw6NzY1OFwiKTtcclxuICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvQVJSL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL0NYWC9LVjZwb3NpbmZvXCIpO1xyXG4gICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9FQlMvS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvUUJVWlovS1Y2cG9zaW5mb1wiKTtcclxuICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvUklHL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL0tFT0xJUy9LVjZwb3NpbmZvXCIpO1xyXG4gICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9TWU5UVVMvS1Y2cG9zaW5mb1wiKTtcclxuICAgIC8vIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvT1BFTk9WL0tWNnBvc2luZm9cIik7XHJcbiAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL0dWQi9LVjZwb3NpbmZvXCIpO1xyXG4gICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9ESVRQL0tWNnBvc2luZm9cIik7XHJcblxyXG4gICAgdGhpcy5zb2NrLm9uKFwibWVzc2FnZVwiLCAob3BDb2RlLCAuLi5jb250ZW50KSA9PiB7XHJcbiAgICAgIGNvbnN0IGNvbnRlbnRzID0gQnVmZmVyLmNvbmNhdChjb250ZW50KTtcclxuICAgICAgY29uc3Qgb3BlcmF0b3IgPSBvcENvZGUudG9TdHJpbmcoKTtcclxuICAgICAgZ3VuemlwKGNvbnRlbnRzLCBhc3luYyhlcnJvciwgYnVmZmVyKSA9PiB7XHJcbiAgICAgICAgaWYoZXJyb3IpIHJldHVybiBjb25zb2xlLmVycm9yKGBTb21ldGhpbmcgd2VudCB3cm9uZyB3aGlsZSB0cnlpbmcgdG8gdW56aXAuICR7ZXJyb3J9YClcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBlbmNvZGVkWE1MID0gYnVmZmVyLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgY29uc3QgZGVjb2RlZCA9IHhtbC5wYXJzZShlbmNvZGVkWE1MKTtcclxuICAgICAgICBsZXQgdmVoaWNsZURhdGE7XHJcblxyXG4gICAgICAgIFxyXG5cclxuICAgICAgICBpZihvcGVyYXRvciAhPT0gXCIvS0VPTElTL0tWNnBvc2luZm9cIiB8fCBvcGVyYXRvciAhPT0gXCIvR1ZCL0tWNnBvc2luZm9cIikgXHJcbiAgICAgICAgICB2ZWhpY2xlRGF0YSA9IGNvbnZlcnRlci5kZWNvZGUoZGVjb2RlZCk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgdmVoaWNsZURhdGEgPSBjb252ZXJ0ZXIuZGVjb2RlKGRlY29kZWQsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgIFxyXG4gICAgICAgIGF3YWl0IHRoaXMuYnVzTG9naWMuVXBkYXRlQnVzc2VzKHZlaGljbGVEYXRhKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICB9KVxyXG5cclxuICAgIH0pXHJcbiAgICBcclxuICAgIHNldEludGVydmFsKCgpID0+IHtcclxuICAgICAgdGhpcy53ZWJzb2NrZXQuRW1pdCgpO1xyXG4gICAgfSwgcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0JVU19VUERBVEVfREVMQVkpKVxyXG4gICAgXHJcbiAgICAvLyB0aGlzLmt2Nzhzb2NrZXQgPSB6bXEuc29ja2V0KFwic3ViXCIpO1xyXG4gICAgLy8gdGhpcy5rdjc4c29ja2V0LmNvbm5lY3QoXCJ0Y3A6Ly9wdWJzdWIubmRvdmxva2V0Lm5sOjc4MTdcIik7XHJcbiAgICAvLyB0aGlzLmt2Nzhzb2NrZXQuc3Vic2NyaWJlKFwiL1wiKVxyXG4gICAgLy8gdGhpcy5rdjc4c29ja2V0Lm9uKFwibWVzc2FnZVwiLCAob3BDb2RlLCAuLi5jb250ZW50KSA9PiB7XHJcbiAgICAvLyAgIGNvbnN0IGNvbnRlbnRzID0gQnVmZmVyLmNvbmNhdChjb250ZW50KTtcclxuICAgIC8vICAgZ3VuemlwKGNvbnRlbnRzLCBhc3luYyhlcnJvciwgYnVmZmVyKSA9PiB7IFxyXG4gICAgLy8gICAgIGNvbnNvbGUubG9nKGJ1ZmZlci50b1N0cmluZygndXRmOCcpKVxyXG4gICAgLy8gICB9KTtcclxuICAgIC8vIH0pO1xyXG4gIH1cclxuXHJcbiAgXHJcbn0iLCJpbXBvcnQgeyBWZWhpY2xlRGF0YSB9IGZyb20gXCIuL3R5cGVzL1ZlaGljbGVEYXRhXCI7XHJcbmltcG9ydCB7IFNlcnZlciB9IGZyb20gJ2h0dHBzJztcclxuaW1wb3J0IHsgU29ja2V0IH0gZnJvbSAnc29ja2V0LmlvJztcclxuaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tICcuL2RhdGFiYXNlJztcclxuaW1wb3J0IHsgV2Vic29ja2V0VmVoaWNsZURhdGEgfSBmcm9tIFwiLi90eXBlcy9XZWJzb2NrZXRWZWhpY2xlRGF0YVwiO1xyXG5cclxuY29uc3QgYnVzX3VwZGF0ZV9yYXRlID0gcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0JVU19VUERBVEVfREVMQVkpO1xyXG5cclxuZXhwb3J0IGNsYXNzIFdlYnNvY2tldCB7XHJcbiAgXHJcbiAgcHJpdmF0ZSBpbyA6IFNvY2tldDtcclxuICBwcml2YXRlIGFjdGl2ZVNvY2tldCA6IFNvY2tldDtcclxuICBwcml2YXRlIGRiIDogRGF0YWJhc2U7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNlcnZlciA6IFNlcnZlciwgZGIgOiBEYXRhYmFzZSkge1xyXG4gICAgdGhpcy5Tb2NrZXRJbml0KHNlcnZlcik7XHJcbiAgICB0aGlzLmRiID0gZGI7XHJcbiAgfVxyXG5cclxuICBhc3luYyBTb2NrZXRJbml0KHNlcnZlciA6IFNlcnZlcikge1xyXG4gICAgY29uc29sZS5sb2coYEluaXRhbGl6aW5nIHdlYnNvY2tldGApXHJcblxyXG4gICAgdGhpcy5pbyA9IHJlcXVpcmUoXCJzb2NrZXQuaW9cIikoc2VydmVyLCB7XHJcbiAgICAgIGNvcnM6IHtcclxuICAgICAgICBvcmlnaW46IFwiKlwiLFxyXG4gICAgICAgIG1ldGhvZHM6IFtcIkdFVFwiLCBcIlBPU1RcIl0sXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmlvLm9uKFwiY29ubmVjdGlvblwiLCBzb2NrZXQgPT4ge1xyXG4gICAgICB0aGlzLlNvY2tldChzb2NrZXQpO1xyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIFNvY2tldChzb2NrZXQgOiBTb2NrZXQpIHtcclxuICAgIHRoaXMuYWN0aXZlU29ja2V0ID0gc29ja2V0O1xyXG4gICAgY29uc29sZS5sb2coXCJOZXcgY2xpZW50IGNvbm5lY3RlZC5cIik7XHJcblxyXG4gICAgLy8gY29uc3QgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAvLyAgICAgICAvL2NvbnNvbGUubG9nKFwiRW1pdHRpbmcgbmV3IGRhdGEuXCIpO1xyXG4gICAgLy8gICAgICAgdGhpcy5kYi5HZXRBbGxWZWhpY2xlcygpLnRoZW4oKHZlaGljbGVzKSA9PiB7XHJcbiAgICAvLyAgICAgICAgIHNvY2tldC5lbWl0KFwib3ZkYXRhXCIsIHZlaGljbGVzKTtcclxuICAgIC8vICAgICAgIH0pXHJcbiAgICAvLyB9LCBidXNfdXBkYXRlX3JhdGUpO1xyXG5cclxuICAgIHNvY2tldC5vbihcImRpc2Nvbm5lY3RcIiwgKCkgPT4ge1xyXG4gICAgICBjb25zb2xlLmxvZyhcIkNsaWVudCBkaXNjb25uZWN0ZWRcIik7XHJcbiAgICAgIC8vY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgU2VuZERlbGV0ZWRWZWhpY2xlcyh2ZWhpY2xlcyA6IEFycmF5PFZlaGljbGVEYXRhPikgOiB2b2lkIHtcclxuICAgIHRoaXMuaW8uZW1pdChcImRlbGV0ZWRWZWhpY2xlc1wiLCB2ZWhpY2xlcyk7XHJcbiAgfVxyXG5cclxuICBDcmVhdGVCdWZmZXJGcm9tVmVoaWNsZXModmVoaWNsZXMpIHsgXHJcbiAgICBsZXQgYnVmID0gQnVmZmVyLmFsbG9jKCg0ICsgNCArIDQgKyAxNSkgKiB2ZWhpY2xlcy5sZW5ndGgpXHJcbiAgICB2ZWhpY2xlcy5mb3JFYWNoKCh2ZWhpY2xlIDogV2Vic29ja2V0VmVoaWNsZURhdGEsIGluZGV4KSA9PiB7XHJcbiAgICAgIGJ1Zi53cml0ZUZsb2F0QkUodmVoaWNsZS5wWzBdLCBpbmRleCAqIDI3KVxyXG4gICAgICBidWYud3JpdGVGbG9hdEJFKHZlaGljbGUucFsxXSwgaW5kZXggKiAyNyArIDQpXHJcbiAgICAgIGJ1Zi53cml0ZVVJbnQzMkJFKHZlaGljbGUudiwgaW5kZXggKiAyNyArIDQgKyA0KVxyXG4gICAgICBidWYud3JpdGUoYCR7dmVoaWNsZS5jfXwke3ZlaGljbGUubn1gLCBpbmRleCAqIDI3ICsgNCArIDQgKyA0KVxyXG4gICAgICBmb3IobGV0IGkgPSAwOyBpIDwgMTUgLSAodmVoaWNsZS5jLmxlbmd0aCArIDEgKyB2ZWhpY2xlLm4ubGVuZ3RoKTsgaSsrKSB7XHJcbiAgICAgICAgYnVmLndyaXRlVUludDgoMCwgaW5kZXggKiAyNyArIDQgKyA0ICsgNCArIHZlaGljbGUuYy5sZW5ndGggKyAxICsgdmVoaWNsZS5uLmxlbmd0aClcclxuICAgICAgfVxyXG4gICAgfSlcclxuXHJcbiAgICByZXR1cm4gYnVmO1xyXG4gIH1cclxuXHJcbiAgRW1pdCgpIHtcclxuICAgIC8vU21hbGwgZGVsYXkgdG8gbWFrZSBzdXJlIHRoZSBzZXJ2ZXIgY2F0Y2hlcyB1cC5cclxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICB0aGlzLmRiLkdldEFsbFZlaGljbGVzU21hbGwoKS50aGVuKCh2ZWhpY2xlcykgPT4gdGhpcy5pby5lbWl0KFwib3ZkYXRhXCIsIHRoaXMuQ3JlYXRlQnVmZmVyRnJvbVZlaGljbGVzKHZlaGljbGVzKSkpXHJcbiAgICB9LCAxMDApXHJcbiAgfVxyXG5cclxufSIsImV4cG9ydCBlbnVtIHZlaGljbGVTdGF0ZSB7XHJcbiAgT05ST1VURSA9ICdPTlJPVVRFJyxcclxuICBPRkZST1VURSA9ICdPRkZST1VURScsXHJcbiAgRU5EID0gXCJFTkRcIixcclxuICBERVBBUlRVUkUgPSAnREVQQVJUVVJFJyxcclxuICBJTklUID0gJ0lOSVQnLFxyXG4gIERFTEFZID0gJ0RFTEFZJyxcclxuICBPTlNUT1AgPSAnT05TVE9QJyxcclxuICBBUlJJVkFMID0gJ0FSUklWQUwnXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVmVoaWNsZURhdGEge1xyXG4gIGNvbXBhbnk6IHN0cmluZyxcclxuICBvcmlnaW5hbENvbXBhbnk6IHN0cmluZyxcclxuICBwbGFubmluZ051bWJlcjogc3RyaW5nLFxyXG4gIGpvdXJuZXlOdW1iZXI6IG51bWJlcixcclxuICBsaW5lTnVtYmVyIDogc3RyaW5nLFxyXG4gIHRpbWVzdGFtcDogbnVtYmVyLFxyXG4gIHZlaGljbGVOdW1iZXI6IG51bWJlcixcclxuICBwb3NpdGlvbjogW251bWJlciwgbnVtYmVyXSxcclxuICBzdGF0dXM6IHZlaGljbGVTdGF0ZSxcclxuICBjcmVhdGVkQXQ6IG51bWJlcixcclxuICB1cGRhdGVkQXQ6IG51bWJlcixcclxuICBwdW5jdHVhbGl0eTogQXJyYXk8bnVtYmVyPixcclxuICB1cGRhdGVkVGltZXM6IEFycmF5PG51bWJlcj4sXHJcbiAgY3VycmVudFJvdXRlSWQ6IG51bWJlcixcclxuICBjdXJyZW50VHJpcElkOiBudW1iZXJcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJAdHVyZi90dXJmXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJjaGlsZF9wcm9jZXNzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJjb3JzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJkb3RlbnZcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImV4cHJlc3NcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImZhc3QteG1sLXBhcnNlclwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZnNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImh0dHBzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJtb25nb29zZVwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwicGF0aFwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwic29ja2V0LmlvXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzcGxpdFwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwic3RyZWFtLXRvLW1vbmdvLWRiXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJ6ZXJvbXFcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInpsaWJcIik7OyIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBzdGFydHVwXG4vLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbi8vIFRoaXMgZW50cnkgbW9kdWxlIGlzIHJlZmVyZW5jZWQgYnkgb3RoZXIgbW9kdWxlcyBzbyBpdCBjYW4ndCBiZSBpbmxpbmVkXG52YXIgX193ZWJwYWNrX2V4cG9ydHNfXyA9IF9fd2VicGFja19yZXF1aXJlX18oXCIuL3NyYy9tYWluLnRzXCIpO1xuIl0sInNvdXJjZVJvb3QiOiIifQ==