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
    async InitKV78() {
        this.InitTripsNew();
        this.InitRoutes();
        this.InitShapes();
    }
    /**
     * Initializes the trips from the specified URL in the .env , or "../GTFS/extracted/trips.json" to the database.
     */
    InitTripsNew() {
        const tripsPath = path_1.resolve("GTFS/extracted/trips.txt.json");
        const outputPath = path_1.resolve("GTFS/converted/trips.json");
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
            writeStream.end(async () => {
                if (process.env.APP_DO_CONVERTION_LOGGING == "true")
                    console.log("Finished writing trips file, importing to database.");
                await this.ImportTrips();
            });
        });
    }
    async ImportTrips() {
        await this.database.DropTripsCollection();
        if (process.env.APP_DO_CONVERTION_LOGGING == "true")
            console.log("Importing trips to mongodb");
        await child_process_1.exec("mongoimport --db taiova --collection trips --file ./GTFS/converted/trips.json", (error, stdout, stderr) => {
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
    /**
     * Initializes the routes from the specified URL in the .env , or "../GTFS/extracted/routes.json" to the database.
     */
    InitRoutes() {
        const routesPath = path_1.resolve("GTFS/extracted/routes.txt.json");
        const outputPath = path_1.resolve("GTFS/converted/routes.json");
        fs.readFile(routesPath, 'utf8', async (error, data) => {
            if (error)
                console.error(error);
            if (data && process.env.APP_DO_CONVERTION_LOGGING == "true")
                console.log("Loaded routes file into memory.");
            data = data.trim();
            const lines = data.split("\n");
            const writeStream = fs.createWriteStream(outputPath);
            for (let line of lines) {
                const routeJson = JSON.parse(line);
                const companySplit = routeJson.agency_id.split(':');
                const route = {
                    routeId: parseInt(routeJson.route_id),
                    company: companySplit[0],
                    subCompany: companySplit[1] ? companySplit[1] : "None",
                    routeShortName: routeJson.route_short_name,
                    routeLongName: routeJson.route_long_name,
                    routeDescription: routeJson.route_desc,
                    routeType: parseInt(routeJson.route_type)
                };
                writeStream.write(JSON.stringify(route) + "\n");
            }
            writeStream.end(() => {
                if (process.env.APP_DO_CONVERTION_LOGGING == "true")
                    console.log("Finished writing routes file, importing to database.");
                this.ImportRoutes();
            });
        });
    }
    async ImportRoutes() {
        await this.database.DropRoutesCollection();
        if (process.env.APP_DO_CONVERTION_LOGGING == "true")
            console.log("Importing routes to mongodb");
        await child_process_1.exec("mongoimport --db taiova --collection routes --file ./GTFS/converted/routes.json", (error, stdout, stderr) => {
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
    /**
     * Initializes the shapes from the specified URL in the .env , or "../GTFS/extracted/routes.json" to the database.
     */
    InitShapes() {
        const routesPath = path_1.resolve("GTFS/extracted/shapes.txt.json");
        const outputPath = path_1.resolve("GTFS/converted/shapes.json");
        fs.readFile(routesPath, 'utf8', async (error, data) => {
            if (error)
                console.error(error);
            if (data && process.env.APP_DO_CONVERTION_LOGGING == "true")
                console.log("Loaded shapes file into memory.");
            data = data.trim();
            const lines = data.split("\n");
            const writeStream = fs.createWriteStream(outputPath);
            for (let line of lines) {
                const shapeJson = JSON.parse(line);
                const shape = {
                    shapeId: parseInt(shapeJson.shape_id),
                    shapeSequenceNumber: parseInt(shapeJson.shape_pt_sequence),
                    Position: [parseFloat(shapeJson.shape_pt_lat), parseFloat(shapeJson.shape_pt_lon)],
                    DistanceSinceLastPoint: parseInt(shapeJson.shape_dist_traveled)
                };
                writeStream.write(JSON.stringify(shape) + "\n");
            }
            writeStream.end(() => {
                if (process.env.APP_DO_CONVERTION_LOGGING == "true")
                    console.log("Finished writing shapes file, importing to database.");
                this.ImportShapes();
            });
        });
    }
    async ImportShapes() {
        await this.database.DropShapesCollection();
        if (process.env.APP_DO_CONVERTION_LOGGING == "true")
            console.log("Importing shapes to mongodb");
        await child_process_1.exec("mongoimport --db taiova --collection shapes --file ./GTFS/converted/shapes.json", (error, stdout, stderr) => {
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
                this.routesSchema = new this.mongoose.Schema({
                    routeId: Number,
                    company: String,
                    subCompany: String,
                    routeShortName: String,
                    routeLongName: String,
                    routeDescription: String,
                    routeType: Number,
                });
                this.shapesSchema = new this.mongoose.Schema({
                    shapeId: Number,
                    shapeSequenceNumber: Number,
                    Position: [Number, Number],
                    DistanceSinceLastPoint: Number
                });
                this.tripsSchema.index({ tripNumber: -1, tripPlanningNumber: -1 });
                this.shapesSchema.index({ shapeId: -1 });
                this.vehicleModel = this.mongoose.model("VehiclePositions", this.vehicleSchema);
                this.tripModel = this.mongoose.model("trips", this.tripsSchema);
                this.routesModel = this.mongoose.model("routes", this.routesSchema);
                this.shapesModel = this.mongoose.model("shapes", this.shapesSchema);
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
    async DropShapesCollection() {
        if (process.env.APP_DO_CONVERTION_LOGGING == "true")
            console.log("Dropping shapes collection");
        await this.shapesModel.remove({});
        if (process.env.APP_DO_CONVERTION_LOGGING == "true")
            console.log("Dropped shapes collection");
    }
    async GetRoute(routeId) {
        const response = await this.routesModel.findOne({
            routeId: routeId,
        });
        return response !== null ? response : {};
    }
    async GetShape(shapeId) {
        const response = await this.shapesModel.find({
            shapeId: shapeId,
        });
        return response !== [] ? response : [];
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
const port = process.env.PORT || 3001;
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
const webserver_1 = __webpack_require__(/*! ./webserver */ "./src/webserver.ts");
const buslogic_1 = __webpack_require__(/*! ./buslogic */ "./src/buslogic.ts");
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
    new webserver_1.WebServer(app, db);
    const busLogic = new buslogic_1.BusLogic(db, true);
    //new Downloader(db);
    busLogic.InitKV78();
    server.listen(port, () => console.log(`Listening at http://localhost:${port}`));
};
AppInit();


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

/***/ "./src/webserver.ts":
/*!**************************!*\
  !*** ./src/webserver.ts ***!
  \**************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WebServer = void 0;
class WebServer {
    constructor(app, database) {
        this.app = app;
        this.database = database;
        this.Initialize();
    }
    Initialize() {
        this.app.get("/", (req, res) => res.send("This is the API endpoint for the TAIOVA application."));
        this.app.get("/busses", async (req, res) => res.send(await this.database.GetAllVehicles()));
        this.app.get("/busses/:company/:number", async (req, res) => {
            const result = await this.database.GetVehicle(req.params.number, req.params.company, true);
            if (Object.keys(result).length > 0)
                res.send(result["_doc"]);
            else
                res.send({});
        });
        this.app.get("/trip/:planningnumber/:tripnumber", async (req, res) => {
            res.send(await this.database.GetTrip(req.params.tripnumber, req.params.planningnumber));
        });
        this.app.get("/route/:routenumber", async (req, res) => {
            res.send(await this.database.GetRoute(req.params.routenumber));
        });
        this.app.get("/shape/:shapenumber", async (req, res) => {
            res.send(await this.database.GetShape(req.params.shapenumber));
        });
    }
}
exports.WebServer = WebServer;


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvYnVzbG9naWMudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL2RhdGFiYXNlLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy9tYWluLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy90eXBlcy9WZWhpY2xlRGF0YS50cyIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvd2Vic2VydmVyLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImNoaWxkX3Byb2Nlc3NcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJjb3JzXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiZG90ZW52XCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiZXhwcmVzc1wiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImZzXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiaHR0cHNcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJtb25nb29zZVwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcInBhdGhcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJzcGxpdFwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcInN0cmVhbS10by1tb25nby1kYlwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvd2VicGFjay9zdGFydHVwIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsbUdBQWdFO0FBQ2hFLHVEQUErQjtBQUMvQiw2REFBeUI7QUFHekIsa0ZBQXFDO0FB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QUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUMxRixDQUFDLENBQUM7UUFFRixJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxLQUFLLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQ3BELEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDakUsQ0FBQyxDQUFDO1FBRUYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsS0FBSyxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUNwRCxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXRDRCw4QkFzQ0M7Ozs7Ozs7Ozs7O0FDeENELDJDOzs7Ozs7Ozs7O0FDQUEsa0M7Ozs7Ozs7Ozs7QUNBQSxvQzs7Ozs7Ozs7OztBQ0FBLHFDOzs7Ozs7Ozs7O0FDQUEsZ0M7Ozs7Ozs7Ozs7QUNBQSxtQzs7Ozs7Ozs7OztBQ0FBLHNDOzs7Ozs7Ozs7O0FDQUEsa0M7Ozs7Ozs7Ozs7QUNBQSxtQzs7Ozs7Ozs7OztBQ0FBLGdEOzs7Ozs7VUNBQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBOztVQUVBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBOzs7O1VDdEJBO1VBQ0E7VUFDQTtVQUNBIiwiZmlsZSI6ImJ1bmRsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IERhdGFiYXNlIH0gZnJvbSBcIi4vZGF0YWJhc2VcIjtcclxuaW1wb3J0IHsgVmVoaWNsZURhdGEsIHZlaGljbGVTdGF0ZSB9IGZyb20gXCIuL3R5cGVzL1ZlaGljbGVEYXRhXCI7XHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgeyBUcmlwIH0gZnJvbSBcIi4vdHlwZXMvVHJpcFwiO1xyXG5pbXBvcnQgeyBBcGlUcmlwIH0gZnJvbSBcIi4vdHlwZXMvQXBpVHJpcFwiO1xyXG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XHJcbmltcG9ydCB7IFJvdXRlIH0gZnJvbSBcIi4vdHlwZXMvUm91dGVcIjtcclxuaW1wb3J0IHsgQXBpUm91dGUgfSBmcm9tIFwiLi90eXBlcy9BcGlSb3V0ZVwiO1xyXG5pbXBvcnQgeyBBcGlTaGFwZSB9IGZyb20gXCIuL3R5cGVzL0FwaVNoYXBlXCI7XHJcbmltcG9ydCB7IFNoYXBlIH0gZnJvbSBcIi4vdHlwZXMvU2hhcGVcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBCdXNMb2dpYyB7XHJcblxyXG4gIHByaXZhdGUgZGF0YWJhc2UgOiBEYXRhYmFzZTtcclxuXHJcbiAgY29uc3RydWN0b3IoZGF0YWJhc2UsIGRvSW5pdCA6IGJvb2xlYW4gPSBmYWxzZSkge1xyXG4gICAgdGhpcy5kYXRhYmFzZSA9IGRhdGFiYXNlO1xyXG5cclxuICAgIGlmKGRvSW5pdCkgdGhpcy5Jbml0aWFsaXplKCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIEluaXRpYWxpemUoKSB7XHJcbiAgICBhd2FpdCB0aGlzLkNsZWFyQnVzc2VzKCk7XHJcblxyXG4gICAgc2V0SW50ZXJ2YWwoYXN5bmMgKCkgPT4ge1xyXG4gICAgICBhd2FpdCB0aGlzLkNsZWFyQnVzc2VzKCk7XHJcbiAgICB9LCBwYXJzZUludChwcm9jZXNzLmVudi5BUFBfQ0xFQU5VUF9ERUxBWSkpXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGVzIG9yIGNyZWF0ZXMgYSBuZXcgYnVzIGRlcGVuZGluZyBvbiBpZiBpdCBhbHJlYWR5IGV4aXN0cyBvciBub3QuXHJcbiAgICogQHBhcmFtIGJ1c3NlcyBUaGUgbGlzdCBvZiBidXNzZXMgdG8gdXBkYXRlLlxyXG4gICAqL1xyXG4gICBwdWJsaWMgYXN5bmMgVXBkYXRlQnVzc2VzKGJ1c3NlcyA6IEFycmF5PFZlaGljbGVEYXRhPikgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIFxyXG4gICAgYXdhaXQgYnVzc2VzLmZvckVhY2goYXN5bmMgKGJ1cywgaW5kZXgpID0+IHtcclxuICAgICAgY29uc3QgZm91bmRWZWhpY2xlID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRWZWhpY2xlKGJ1cy52ZWhpY2xlTnVtYmVyLCBidXMuY29tcGFueSlcclxuICAgICAgaWYoT2JqZWN0LmtleXMoZm91bmRWZWhpY2xlKS5sZW5ndGggIT09IDApIHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fVVBEQVRFX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBVcGRhdGluZyB2ZWhpY2xlICR7YnVzLnZlaGljbGVOdW1iZXJ9IGZyb20gJHtidXMuY29tcGFueX1gKVxyXG4gICAgICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuVXBkYXRlVmVoaWNsZShmb3VuZFZlaGljbGUsIGJ1cywgdHJ1ZSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NSRUFURV9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhgY3JlYXRpbmcgbmV3IHZlaGljbGUgJHtidXMudmVoaWNsZU51bWJlcn0gZnJvbSAke2J1cy5jb21wYW55fWApXHJcbiAgICAgICAgaWYoYnVzLnN0YXR1cyA9PT0gdmVoaWNsZVN0YXRlLk9OUk9VVEUpIGF3YWl0IHRoaXMuZGF0YWJhc2UuQWRkVmVoaWNsZShidXMsIHRydWUpXHJcbiAgICAgIH1cclxuICAgICAgICAgICAgICBcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDbGVhcnMgYnVzc2VzIGV2ZXJ5IFggYW1vdW50IG9mIG1pbnV0ZXMgc3BlY2lmaWVkIGluIC5lbnYgZmlsZS5cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgQ2xlYXJCdXNzZXMoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NMRUFOVVBfTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJDbGVhcmluZyBidXNzZXNcIilcclxuICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnN0IGZpZnRlZW5NaW51dGVzQWdvID0gY3VycmVudFRpbWUgLSAoNjAgKiBwYXJzZUludChwcm9jZXNzLmVudi5BUFBfQ0xFQU5VUF9WRUhJQ0xFX0FHRV9SRVFVSVJFTUVOVCkgKiAxMDAwKTtcclxuICAgIGNvbnN0IFJlbW92ZWRWZWhpY2xlcyA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuUmVtb3ZlVmVoaWNsZXNXaGVyZSh7IHVwZGF0ZWRBdDogeyAkbHQ6IGZpZnRlZW5NaW51dGVzQWdvIH0gfSwgcHJvY2Vzcy5lbnYuQVBQX0RPX0NMRUFOVVBfTE9HR0lORyA9PSBcInRydWVcIik7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgXCJLb3BwZWx2bGFrIDcgYW5kIDggdHVyYm9cIiBmaWxlcyB0byBkYXRhYmFzZS5cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgSW5pdEtWNzgoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdGhpcy5Jbml0VHJpcHNOZXcoKTtcclxuICAgIHRoaXMuSW5pdFJvdXRlcygpO1xyXG4gICAgdGhpcy5Jbml0U2hhcGVzKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgdHJpcHMgZnJvbSB0aGUgc3BlY2lmaWVkIFVSTCBpbiB0aGUgLmVudiAsIG9yIFwiLi4vR1RGUy9leHRyYWN0ZWQvdHJpcHMuanNvblwiIHRvIHRoZSBkYXRhYmFzZS5cclxuICAgKi9cclxuICBwcml2YXRlIEluaXRUcmlwc05ldygpIDogdm9pZCB7IFxyXG4gICAgY29uc3QgdHJpcHNQYXRoID0gcmVzb2x2ZShcIkdURlMvZXh0cmFjdGVkL3RyaXBzLnR4dC5qc29uXCIpO1xyXG4gICAgY29uc3Qgb3V0cHV0UGF0aCA9IHJlc29sdmUoXCJHVEZTL2NvbnZlcnRlZC90cmlwcy5qc29uXCIpO1xyXG4gICAgZnMucmVhZEZpbGUodHJpcHNQYXRoLCAndXRmOCcsIGFzeW5jKGVycm9yLCBkYXRhKSA9PiB7IFxyXG4gICAgICBpZihlcnJvcikgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgIGlmKGRhdGEgJiYgcHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJMb2FkZWQgdHJpcHMgZmlsZSBpbnRvIG1lbW9yeS5cIik7XHJcbiAgICAgIGRhdGEgPSBkYXRhLnRyaW0oKTtcclxuICAgICAgY29uc3QgbGluZXMgPSBkYXRhLnNwbGl0KFwiXFxuXCIpO1xyXG4gICAgICBjb25zdCB3cml0ZVN0cmVhbSA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG91dHB1dFBhdGgpXHJcbiAgICAgIGNvbnN0IGNvbnZlcnRlZFRyaXBzID0gW107XHJcblxyXG4gICAgICBmb3IobGV0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgICAgICBjb25zdCB0cmlwSlNPTiA6IEFwaVRyaXAgPSBKU09OLnBhcnNlKGxpbmUpO1xyXG4gICAgICAgIGNvbnN0IHJlYWxUaW1lVHJpcElkID0gdHJpcEpTT04ucmVhbHRpbWVfdHJpcF9pZC5zcGxpdChcIjpcIik7XHJcbiAgICAgICAgY29uc3QgY29tcGFueSA9IHJlYWxUaW1lVHJpcElkWzBdO1xyXG4gICAgICAgIGNvbnN0IHBsYW5uaW5nTnVtYmVyID0gcmVhbFRpbWVUcmlwSWRbMV07XHJcbiAgICAgICAgY29uc3QgdHJpcE51bWJlciA9IHJlYWxUaW1lVHJpcElkWzJdO1xyXG5cclxuICAgICAgICBjb25zdCB0cmlwIDogVHJpcCA9IHtcclxuICAgICAgICAgIGNvbXBhbnk6IGNvbXBhbnksXHJcbiAgICAgICAgICByb3V0ZUlkOiBwYXJzZUludCh0cmlwSlNPTi5yb3V0ZV9pZCksXHJcbiAgICAgICAgICBzZXJ2aWNlSWQ6IHBhcnNlSW50KHRyaXBKU09OLnNlcnZpY2VfaWQpLFxyXG4gICAgICAgICAgdHJpcElkOiBwYXJzZUludCh0cmlwSlNPTi50cmlwX2lkKSxcclxuICAgICAgICAgIHRyaXBOdW1iZXI6IHBhcnNlSW50KHRyaXBOdW1iZXIpLFxyXG4gICAgICAgICAgdHJpcFBsYW5uaW5nTnVtYmVyOiBwbGFubmluZ051bWJlcixcclxuICAgICAgICAgIHRyaXBIZWFkc2lnbjogdHJpcEpTT04udHJpcF9oZWFkc2lnbixcclxuICAgICAgICAgIHRyaXBOYW1lOiB0cmlwSlNPTi50cmlwX2xvbmdfbmFtZSxcclxuICAgICAgICAgIGRpcmVjdGlvbklkOiBwYXJzZUludCh0cmlwSlNPTi5kaXJlY3Rpb25faWQpLFxyXG4gICAgICAgICAgc2hhcGVJZDogcGFyc2VJbnQodHJpcEpTT04uc2hhcGVfaWQpLFxyXG4gICAgICAgICAgd2hlZWxjaGFpckFjY2Vzc2libGU6IHBhcnNlSW50KHRyaXBKU09OLndoZWVsY2hhaXJfYWNjZXNzaWJsZSlcclxuICAgICAgICB9XHJcbiAgICAgICAgd3JpdGVTdHJlYW0ud3JpdGUoSlNPTi5zdHJpbmdpZnkodHJpcCkgKyBcIlxcblwiKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgd3JpdGVTdHJlYW0uZW5kKGFzeW5jICgpID0+IHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkZpbmlzaGVkIHdyaXRpbmcgdHJpcHMgZmlsZSwgaW1wb3J0aW5nIHRvIGRhdGFiYXNlLlwiKTtcclxuICAgICAgICBhd2FpdCB0aGlzLkltcG9ydFRyaXBzKCk7XHJcbiAgICAgIH0pXHJcbiAgICB9KTtcclxuICAgXHJcbiAgICBcclxuICB9XHJcblxyXG4gIGFzeW5jIEltcG9ydFRyaXBzKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuRHJvcFRyaXBzQ29sbGVjdGlvbigpO1xyXG5cclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiSW1wb3J0aW5nIHRyaXBzIHRvIG1vbmdvZGJcIik7XHJcblxyXG4gICAgYXdhaXQgZXhlYyhcIm1vbmdvaW1wb3J0IC0tZGIgdGFpb3ZhIC0tY29sbGVjdGlvbiB0cmlwcyAtLWZpbGUgLi9HVEZTL2NvbnZlcnRlZC90cmlwcy5qc29uXCIsIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc3RkZXJyKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYHN0ZGVycjogJHtzdGRlcnJ9YCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhgc3Rkb3V0OiAke3N0ZG91dH1gKTtcclxuICAgIH0pO1xyXG5cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSByb3V0ZXMgZnJvbSB0aGUgc3BlY2lmaWVkIFVSTCBpbiB0aGUgLmVudiAsIG9yIFwiLi4vR1RGUy9leHRyYWN0ZWQvcm91dGVzLmpzb25cIiB0byB0aGUgZGF0YWJhc2UuXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBJbml0Um91dGVzICgpIHtcclxuICAgIGNvbnN0IHJvdXRlc1BhdGggPSByZXNvbHZlKFwiR1RGUy9leHRyYWN0ZWQvcm91dGVzLnR4dC5qc29uXCIpO1xyXG4gICAgY29uc3Qgb3V0cHV0UGF0aCA9IHJlc29sdmUoXCJHVEZTL2NvbnZlcnRlZC9yb3V0ZXMuanNvblwiKTtcclxuICAgIGZzLnJlYWRGaWxlKHJvdXRlc1BhdGgsICd1dGY4JywgYXN5bmMoZXJyb3IsIGRhdGEpID0+IHsgXHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgaWYoZGF0YSAmJiBwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkxvYWRlZCByb3V0ZXMgZmlsZSBpbnRvIG1lbW9yeS5cIik7XHJcbiAgICAgIGRhdGEgPSBkYXRhLnRyaW0oKTtcclxuICAgICAgY29uc3QgbGluZXMgPSBkYXRhLnNwbGl0KFwiXFxuXCIpO1xyXG4gICAgICBjb25zdCB3cml0ZVN0cmVhbSA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG91dHB1dFBhdGgpXHJcblxyXG4gICAgICBmb3IobGV0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgICAgICBjb25zdCByb3V0ZUpzb24gOiBBcGlSb3V0ZSA9IEpTT04ucGFyc2UobGluZSk7XHJcbiAgICAgICAgY29uc3QgY29tcGFueVNwbGl0ID0gcm91dGVKc29uLmFnZW5jeV9pZC5zcGxpdCgnOicpO1xyXG4gICAgICAgIGNvbnN0IHJvdXRlIDogUm91dGUgPSB7XHJcbiAgICAgICAgICByb3V0ZUlkOiBwYXJzZUludChyb3V0ZUpzb24ucm91dGVfaWQpLFxyXG4gICAgICAgICAgY29tcGFueTogY29tcGFueVNwbGl0WzBdLFxyXG4gICAgICAgICAgc3ViQ29tcGFueTogY29tcGFueVNwbGl0WzFdID8gY29tcGFueVNwbGl0WzFdIDogXCJOb25lXCIsXHJcbiAgICAgICAgICByb3V0ZVNob3J0TmFtZTogcm91dGVKc29uLnJvdXRlX3Nob3J0X25hbWUsXHJcbiAgICAgICAgICByb3V0ZUxvbmdOYW1lOiByb3V0ZUpzb24ucm91dGVfbG9uZ19uYW1lLFxyXG4gICAgICAgICAgcm91dGVEZXNjcmlwdGlvbjogcm91dGVKc29uLnJvdXRlX2Rlc2MsXHJcbiAgICAgICAgICByb3V0ZVR5cGU6IHBhcnNlSW50KHJvdXRlSnNvbi5yb3V0ZV90eXBlKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd3JpdGVTdHJlYW0ud3JpdGUoSlNPTi5zdHJpbmdpZnkocm91dGUpICsgXCJcXG5cIik7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHdyaXRlU3RyZWFtLmVuZCgoKSA9PiB7XHJcbiAgICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJGaW5pc2hlZCB3cml0aW5nIHJvdXRlcyBmaWxlLCBpbXBvcnRpbmcgdG8gZGF0YWJhc2UuXCIpO1xyXG4gICAgICAgIHRoaXMuSW1wb3J0Um91dGVzKCk7XHJcbiAgICAgIH0pXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGFzeW5jIEltcG9ydFJvdXRlcygpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLmRhdGFiYXNlLkRyb3BSb3V0ZXNDb2xsZWN0aW9uKCk7XHJcblxyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJJbXBvcnRpbmcgcm91dGVzIHRvIG1vbmdvZGJcIik7XHJcblxyXG4gICAgYXdhaXQgZXhlYyhcIm1vbmdvaW1wb3J0IC0tZGIgdGFpb3ZhIC0tY29sbGVjdGlvbiByb3V0ZXMgLS1maWxlIC4vR1RGUy9jb252ZXJ0ZWQvcm91dGVzLmpzb25cIiwgKGVycm9yLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzdGRlcnIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgc3RkZXJyOiAke3N0ZGVycn1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBzdGRvdXQ6ICR7c3Rkb3V0fWApO1xyXG4gICAgfSk7XHJcblxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHNoYXBlcyBmcm9tIHRoZSBzcGVjaWZpZWQgVVJMIGluIHRoZSAuZW52ICwgb3IgXCIuLi9HVEZTL2V4dHJhY3RlZC9yb3V0ZXMuanNvblwiIHRvIHRoZSBkYXRhYmFzZS5cclxuICAgKi9cclxuICAgcHJpdmF0ZSBJbml0U2hhcGVzICgpIHtcclxuICAgIGNvbnN0IHJvdXRlc1BhdGggPSByZXNvbHZlKFwiR1RGUy9leHRyYWN0ZWQvc2hhcGVzLnR4dC5qc29uXCIpO1xyXG4gICAgY29uc3Qgb3V0cHV0UGF0aCA9IHJlc29sdmUoXCJHVEZTL2NvbnZlcnRlZC9zaGFwZXMuanNvblwiKTtcclxuICAgIGZzLnJlYWRGaWxlKHJvdXRlc1BhdGgsICd1dGY4JywgYXN5bmMoZXJyb3IsIGRhdGEpID0+IHsgXHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgaWYoZGF0YSAmJiBwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkxvYWRlZCBzaGFwZXMgZmlsZSBpbnRvIG1lbW9yeS5cIik7XHJcbiAgICAgIGRhdGEgPSBkYXRhLnRyaW0oKTtcclxuICAgICAgY29uc3QgbGluZXMgPSBkYXRhLnNwbGl0KFwiXFxuXCIpO1xyXG4gICAgICBjb25zdCB3cml0ZVN0cmVhbSA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG91dHB1dFBhdGgpXHJcblxyXG4gICAgICBmb3IobGV0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgICAgICBjb25zdCBzaGFwZUpzb24gOiBBcGlTaGFwZSA9IEpTT04ucGFyc2UobGluZSk7XHJcbiAgICAgICAgY29uc3Qgc2hhcGUgOiBTaGFwZSA9IHtcclxuICAgICAgICAgIHNoYXBlSWQ6IHBhcnNlSW50KHNoYXBlSnNvbi5zaGFwZV9pZCksXHJcbiAgICAgICAgICBzaGFwZVNlcXVlbmNlTnVtYmVyOiBwYXJzZUludChzaGFwZUpzb24uc2hhcGVfcHRfc2VxdWVuY2UpLFxyXG4gICAgICAgICAgUG9zaXRpb246IFtwYXJzZUZsb2F0KHNoYXBlSnNvbi5zaGFwZV9wdF9sYXQpLCBwYXJzZUZsb2F0KHNoYXBlSnNvbi5zaGFwZV9wdF9sb24pXSxcclxuICAgICAgICAgIERpc3RhbmNlU2luY2VMYXN0UG9pbnQ6IHBhcnNlSW50KHNoYXBlSnNvbi5zaGFwZV9kaXN0X3RyYXZlbGVkKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd3JpdGVTdHJlYW0ud3JpdGUoSlNPTi5zdHJpbmdpZnkoc2hhcGUpICsgXCJcXG5cIik7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHdyaXRlU3RyZWFtLmVuZCgoKSA9PiB7XHJcbiAgICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJGaW5pc2hlZCB3cml0aW5nIHNoYXBlcyBmaWxlLCBpbXBvcnRpbmcgdG8gZGF0YWJhc2UuXCIpO1xyXG4gICAgICAgIHRoaXMuSW1wb3J0U2hhcGVzKCk7XHJcbiAgICAgIH0pXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGFzeW5jIEltcG9ydFNoYXBlcygpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLmRhdGFiYXNlLkRyb3BTaGFwZXNDb2xsZWN0aW9uKCk7XHJcblxyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJJbXBvcnRpbmcgc2hhcGVzIHRvIG1vbmdvZGJcIik7XHJcblxyXG4gICAgYXdhaXQgZXhlYyhcIm1vbmdvaW1wb3J0IC0tZGIgdGFpb3ZhIC0tY29sbGVjdGlvbiBzaGFwZXMgLS1maWxlIC4vR1RGUy9jb252ZXJ0ZWQvc2hhcGVzLmpzb25cIiwgKGVycm9yLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzdGRlcnIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgc3RkZXJyOiAke3N0ZGVycn1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBzdGRvdXQ6ICR7c3Rkb3V0fWApO1xyXG4gICAgfSk7XHJcblxyXG4gIH1cclxufSIsImltcG9ydCB7IENvbm5lY3Rpb24sIE1vZGVsLCBNb25nb29zZSwgRmlsdGVyUXVlcnksIFNjaGVtYSB9IGZyb20gJ21vbmdvb3NlJztcclxuaW1wb3J0IHsgVHJpcCB9IGZyb20gJy4vdHlwZXMvVHJpcCc7XHJcbmltcG9ydCB7IFZlaGljbGVEYXRhLCB2ZWhpY2xlU3RhdGUgfSBmcm9tICcuL3R5cGVzL1ZlaGljbGVEYXRhJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IFJvdXRlIH0gZnJvbSAnLi90eXBlcy9Sb3V0ZSc7XHJcbmltcG9ydCB7IFNoYXBlIH0gZnJvbSAnLi90eXBlcy9TaGFwZSc7XHJcbmNvbnN0IHN0cmVhbVRvTW9uZ29EQiA9IHJlcXVpcmUoJ3N0cmVhbS10by1tb25nby1kYicpLnN0cmVhbVRvTW9uZ29EQjtcclxuY29uc3Qgc3BsaXQgPSByZXF1aXJlKCdzcGxpdCcpO1xyXG5leHBvcnQgY2xhc3MgRGF0YWJhc2Uge1xyXG4gIFxyXG4gIHByaXZhdGUgc3RhdGljIGluc3RhbmNlIDogRGF0YWJhc2U7XHJcbiAgXHJcbiAgcHJpdmF0ZSBkYiA6IENvbm5lY3Rpb247XHJcbiAgcHJpdmF0ZSBtb25nb29zZSA6IE1vbmdvb3NlO1xyXG4gIHByaXZhdGUgdmVoaWNsZVNjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIHRyaXBzU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgcm91dGVzU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgc2hhcGVzU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgdmVoaWNsZU1vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgdHJpcE1vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgcm91dGVzTW9kZWwgOiB0eXBlb2YgTW9kZWw7XHJcbiAgcHJpdmF0ZSBzaGFwZXNNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIG91dHB1dERCQ29uZmlnO1xyXG5cclxuICBwdWJsaWMgc3RhdGljIGdldEluc3RhbmNlKCk6IERhdGFiYXNlIHtcclxuICAgIGlmKCFEYXRhYmFzZS5pbnN0YW5jZSlcclxuICAgICAgRGF0YWJhc2UuaW5zdGFuY2UgPSBuZXcgRGF0YWJhc2UoKTtcclxuXHJcbiAgICByZXR1cm4gRGF0YWJhc2UuaW5zdGFuY2U7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgSW5pdCgpIHtcclxuICAgIGNvbnN0IHVybCA6IHN0cmluZyA9IHByb2Nlc3MuZW52LkRBVEFCQVNFX1VSTDtcclxuICAgIGNvbnN0IG5hbWUgOiBzdHJpbmcgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9OQU1FO1xyXG5cclxuICAgIHRoaXMubW9uZ29vc2UgPSBuZXcgTW9uZ29vc2UoKTtcclxuICAgIFxyXG4gICAgdGhpcy5tb25nb29zZS5zZXQoJ3VzZUZpbmRBbmRNb2RpZnknLCBmYWxzZSlcclxuXHJcbiAgICBpZighdXJsICYmICFuYW1lKSB0aHJvdyAoYEludmFsaWQgVVJMIG9yIG5hbWUgZ2l2ZW4sIHJlY2VpdmVkOiBcXG4gTmFtZTogJHtuYW1lfSBcXG4gVVJMOiAke3VybH1gKVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBDb25uZWN0aW5nIHRvIGRhdGFiYXNlIHdpdGggbmFtZTogJHtuYW1lfSBhdCB1cmw6ICR7dXJsfWApXHJcbiAgICB0aGlzLm1vbmdvb3NlLmNvbm5lY3QoYCR7dXJsfS8ke25hbWV9YCwge1xyXG4gICAgICB1c2VOZXdVcmxQYXJzZXI6IHRydWUsXHJcbiAgICAgIHVzZVVuaWZpZWRUb3BvbG9neTogdHJ1ZSxcclxuICAgICAgcG9vbFNpemU6IDEyMFxyXG4gICAgfSlcclxuXHJcbiAgICB0aGlzLmRiID0gdGhpcy5tb25nb29zZS5jb25uZWN0aW9uO1xyXG5cclxuICAgIHRoaXMub3V0cHV0REJDb25maWcgPSB7IGRiVVJMIDogYCR7dXJsfS8ke25hbWV9YCwgY29sbGVjdGlvbiA6ICd0cmlwcycgfTtcclxuXHJcbiAgICB0aGlzLmRiLm9uKCdlcnJvcicsIGVycm9yID0+IHtcclxuICAgICAgdGhyb3cgbmV3IGVycm9yKGBFcnJvciBjb25uZWN0aW5nIHRvIGRhdGFiYXNlLiAke2Vycm9yfWApO1xyXG4gICAgfSlcclxuXHJcbiAgICBhd2FpdCB0aGlzLkRhdGFiYXNlTGlzdGVuZXIoKTtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBHZXREYXRhYmFzZSgpIDogQ29ubmVjdGlvbiB7XHJcbiAgICByZXR1cm4gdGhpcy5kYjtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBEYXRhYmFzZUxpc3RlbmVyICgpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcclxuICAgICAgICB0aGlzLmRiLm9uY2UoXCJvcGVuXCIsICgpID0+IHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdGlvbiB0byBkYXRhYmFzZSBlc3RhYmxpc2hlZC5cIilcclxuXHJcbiAgICAgICAgICB0aGlzLnZlaGljbGVTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHBsYW5uaW5nTnVtYmVyOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIGpvdXJuZXlOdW1iZXI6IE51bWJlcixcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHZlaGljbGVOdW1iZXI6IE51bWJlcixcclxuICAgICAgICAgICAgcG9zaXRpb246IFtOdW1iZXIsIE51bWJlcl0sXHJcbiAgICAgICAgICAgIHN0YXR1czogU3RyaW5nLFxyXG4gICAgICAgICAgICBwdW5jdHVhbGl0eTogQXJyYXksXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogTnVtYmVyLFxyXG4gICAgICAgICAgICB1cGRhdGVkQXQ6IE51bWJlcixcclxuICAgICAgICAgICAgdXBkYXRlZFRpbWVzOiBBcnJheVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHRoaXMudHJpcHNTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgc2VydmljZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRyaXBJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB0cmlwTnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRyaXBQbGFubmluZ051bWJlcjogU3RyaW5nLFxyXG4gICAgICAgICAgICB0cmlwSGVhZHNpZ246IFN0cmluZyxcclxuICAgICAgICAgICAgdHJpcE5hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgZGlyZWN0aW9uSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgc2hhcGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB3aGVlbGNoYWlyQWNjZXNzaWJsZTogTnVtYmVyXHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIHRoaXMucm91dGVzU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgcm91dGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHN1YkNvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVTaG9ydE5hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVMb25nTmFtZTogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZURlc2NyaXB0aW9uOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlVHlwZTogTnVtYmVyLFxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLnNoYXBlc1NjaGVtYSA9IG5ldyB0aGlzLm1vbmdvb3NlLlNjaGVtYSh7XHJcbiAgICAgICAgICAgIHNoYXBlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgc2hhcGVTZXF1ZW5jZU51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICBQb3NpdGlvbjogW051bWJlciwgTnVtYmVyXSxcclxuICAgICAgICAgICAgRGlzdGFuY2VTaW5jZUxhc3RQb2ludDogTnVtYmVyXHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIHRoaXMudHJpcHNTY2hlbWEuaW5kZXgoeyB0cmlwTnVtYmVyOiAtMSwgdHJpcFBsYW5uaW5nTnVtYmVyOiAtMSB9KVxyXG4gICAgICAgICAgdGhpcy5zaGFwZXNTY2hlbWEuaW5kZXgoeyBzaGFwZUlkOiAtMSB9KVxyXG5cclxuICAgICAgICAgIHRoaXMudmVoaWNsZU1vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcIlZlaGljbGVQb3NpdGlvbnNcIiwgdGhpcy52ZWhpY2xlU2NoZW1hKTtcclxuICAgICAgICAgIHRoaXMudHJpcE1vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcInRyaXBzXCIsIHRoaXMudHJpcHNTY2hlbWEpO1xyXG4gICAgICAgICAgdGhpcy5yb3V0ZXNNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJyb3V0ZXNcIiwgdGhpcy5yb3V0ZXNTY2hlbWEpO1xyXG4gICAgICAgICAgdGhpcy5zaGFwZXNNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJzaGFwZXNcIiwgdGhpcy5zaGFwZXNTY2hlbWEpO1xyXG5cclxuICAgICAgICAgIHRoaXMudHJpcE1vZGVsLmNyZWF0ZUluZGV4ZXMoKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgcmVzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0QWxsVmVoaWNsZXMgKGFyZ3MgPSB7fSkgOiBQcm9taXNlPEFycmF5PFZlaGljbGVEYXRhPj4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmQoey4uLmFyZ3N9LCB7IHB1bmN0dWFsaXR5OiAwLCB1cGRhdGVkVGltZXM6IDAsIF9fdiA6IDAgfSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0VmVoaWNsZSAodmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIsIGZpcnN0T25seSA6IGJvb2xlYW4gPSBmYWxzZSkgOiBQcm9taXNlPFZlaGljbGVEYXRhPiB7XHJcbiAgICByZXR1cm4geyBcclxuICAgICAgLi4uYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZSh7XHJcbiAgICAgICAgdmVoaWNsZU51bWJlciA6IHZlaGljbGVOdW1iZXIsXHJcbiAgICAgICAgY29tcGFueTogdHJhbnNwb3J0ZXJcclxuICAgICAgfSlcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgVmVoaWNsZUV4aXN0cyh2ZWhpY2xlTnVtYmVyLCB0cmFuc3BvcnRlcikgOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIHJldHVybiBhd2FpdCB0aGlzLkdldFZlaGljbGUodmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIpICE9PSBudWxsO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFVwZGF0ZVZlaGljbGUgKHZlaGljbGVUb1VwZGF0ZSA6IGFueSwgdXBkYXRlZFZlaGljbGVEYXRhIDogVmVoaWNsZURhdGEsIHBvc2l0aW9uQ2hlY2tzIDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYoIXZlaGljbGVUb1VwZGF0ZVtcIl9kb2NcIl0pIHJldHVyblxyXG5cclxuICAgIHZlaGljbGVUb1VwZGF0ZSA9IHZlaGljbGVUb1VwZGF0ZVtcIl9kb2NcIl07XHJcbiAgICBcclxuICAgIC8vTWVyZ2UgdGhlIHB1bmN0dWFsaXRpZXMgb2YgdGhlIG9sZCB2ZWhpY2xlRGF0YSB3aXRoIHRoZSBuZXcgb25lLlxyXG4gICAgdXBkYXRlZFZlaGljbGVEYXRhLnB1bmN0dWFsaXR5ID0gdmVoaWNsZVRvVXBkYXRlLnB1bmN0dWFsaXR5LmNvbmNhdCh1cGRhdGVkVmVoaWNsZURhdGEucHVuY3R1YWxpdHkpO1xyXG5cclxuICAgIC8vTWVyZ2UgdGhlIHVwZGF0ZWQgdGltZXMgb2YgdGhlIG9sZCB2ZWhpY2xlRGF0YSB3aXRoIHRoZSBuZXcgb25lLlxyXG4gICAgdXBkYXRlZFZlaGljbGVEYXRhLnVwZGF0ZWRUaW1lcyA9IHZlaGljbGVUb1VwZGF0ZS51cGRhdGVkVGltZXMuY29uY2F0KHVwZGF0ZWRWZWhpY2xlRGF0YS51cGRhdGVkVGltZXMpO1xyXG5cclxuICAgIGlmKHBvc2l0aW9uQ2hlY2tzICYmIHVwZGF0ZWRWZWhpY2xlRGF0YS5zdGF0dXMgIT09IHZlaGljbGVTdGF0ZS5PTlJPVVRFKVxyXG4gICAgICB1cGRhdGVkVmVoaWNsZURhdGEucG9zaXRpb24gPSB2ZWhpY2xlVG9VcGRhdGUucG9zaXRpb247XHJcblxyXG4gICAgdXBkYXRlZFZlaGljbGVEYXRhLnVwZGF0ZWRBdCA9IERhdGUubm93KCk7ICBcclxuXHJcbiAgICBhd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kT25lQW5kVXBkYXRlKHZlaGljbGVUb1VwZGF0ZSwgdXBkYXRlZFZlaGljbGVEYXRhKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBBZGRWZWhpY2xlICh2ZWhpY2xlIDogVmVoaWNsZURhdGEsIG9ubHlBZGRXaGlsZU9uUm91dGUgOiBib29sZWFuKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYob25seUFkZFdoaWxlT25Sb3V0ZSAmJiB2ZWhpY2xlLnN0YXR1cyAhPT0gdmVoaWNsZVN0YXRlLk9OUk9VVEUpIHJldHVybjtcclxuICAgIG5ldyB0aGlzLnZlaGljbGVNb2RlbCh7XHJcbiAgICAgIC4uLnZlaGljbGUsXHJcbiAgICAgIHB1bmN0dWFsaXR5IDogdmVoaWNsZS5wdW5jdHVhbGl0eVxyXG4gICAgfSkuc2F2ZShlcnJvciA9PiB7XHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGBTb21ldGhpbmcgd2VudCB3cm9uZyB3aGlsZSB0cnlpbmcgdG8gYWRkIHZlaGljbGU6ICR7dmVoaWNsZS52ZWhpY2xlTnVtYmVyfS4gRXJyb3I6ICR7ZXJyb3J9YClcclxuICAgIH0pXHJcbiAgfVxyXG4gIFxyXG4gIHB1YmxpYyBhc3luYyBSZW1vdmVWZWhpY2xlICh2ZWhpY2xlIDogVmVoaWNsZURhdGEpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZighdmVoaWNsZVtcIl9kb2NcIl0pIHJldHVyblxyXG5cclxuICAgIHRoaXMudmVoaWNsZU1vZGVsLmZpbmRPbmVBbmREZWxldGUodmVoaWNsZSlcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBSZW1vdmVWZWhpY2xlc1doZXJlKCBwYXJhbXMgOiBvYmplY3QsIGRvTG9nZ2luZyA6IGJvb2xlYW4gPSBmYWxzZSkgOiBQcm9taXNlPEFycmF5PFZlaGljbGVEYXRhPj4ge1xyXG4gICAgY29uc3QgcmVtb3ZlZFZlaGljbGVzIDogQXJyYXk8VmVoaWNsZURhdGE+ID0gYXdhaXQgdGhpcy5HZXRBbGxWZWhpY2xlcyhwYXJhbXMpO1xyXG4gICAgdGhpcy52ZWhpY2xlTW9kZWwuZGVsZXRlTWFueShwYXJhbXMpLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICBpZihkb0xvZ2dpbmcpIGNvbnNvbGUubG9nKGBEZWxldGVkICR7cmVzcG9uc2UuZGVsZXRlZENvdW50fSB2ZWhpY2xlcy5gKTtcclxuICAgICAgXHJcbiAgICB9KTtcclxuICAgIHJldHVybiByZW1vdmVkVmVoaWNsZXM7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0VHJpcHMocGFyYW1zIDogb2JqZWN0ID0ge30pIDogUHJvbWlzZTxBcnJheTxUcmlwPj4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMudHJpcE1vZGVsLmZpbmQocGFyYW1zKVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFRyaXAodHJpcE51bWJlciA6IG51bWJlciwgdHJpcFBsYW5uaW5nTnVtYmVyIDogc3RyaW5nKSB7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnRyaXBNb2RlbC5maW5kT25lKHtcclxuICAgICAgdHJpcE51bWJlciA6IHRyaXBOdW1iZXIsXHJcbiAgICAgIHRyaXBQbGFubmluZ051bWJlcjogdHJpcFBsYW5uaW5nTnVtYmVyXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcmVzcG9uc2UgIT09IG51bGwgPyByZXNwb25zZSA6IHt9O1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFJlbW92ZVRyaXAocGFyYW1zIDogb2JqZWN0ID0ge30sIGRvTG9nZ2luZyA6IGJvb2xlYW4gPSBmYWxzZSkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMudHJpcE1vZGVsLmRlbGV0ZU1hbnkocGFyYW1zKS50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgaWYoZG9Mb2dnaW5nKSBjb25zb2xlLmxvZyhgRGVsZXRlZCAke3Jlc3BvbnNlLmRlbGV0ZWRDb3VudH0gdHJpcHNgKTtcclxuICAgIH0pXHJcbiAgfVxyXG4gIC8qKlxyXG4gICAqIEluc2VydHMgbWFueSB0cmlwcyBhdCBvbmNlIGludG8gdGhlIGRhdGFiYXNlLlxyXG4gICAqIEBwYXJhbSB0cmlwcyBUaGUgdHJpcHMgdG8gYWRkLlxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBJbnNlcnRNYW55VHJpcHModHJpcHMpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgIGF3YWl0IHRoaXMudHJpcE1vZGVsLmluc2VydE1hbnkodHJpcHMsIHsgb3JkZXJlZDogZmFsc2UgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgXCJLb3BwZWx2bGFrIDcgYW5kIDggdHVyYm9cIiBmaWxlcyB0byBkYXRhYmFzZS5cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgSW5zZXJ0VHJpcCh0cmlwIDogVHJpcCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIG5ldyB0aGlzLnRyaXBNb2RlbCh0cmlwKS5zYXZlKGVycm9yID0+IHtcclxuICAgICAgaWYoZXJyb3IpIGNvbnNvbGUuZXJyb3IoYFNvbWV0aGluZyB3ZW50IHdyb25nIHdoaWxlIHRyeWluZyB0byBhZGQgdHJpcDogJHt0cmlwLnRyaXBIZWFkc2lnbn0uIEVycm9yOiAke2Vycm9yfWApXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIERyb3BUcmlwc0NvbGxlY3Rpb24oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwaW5nIHRyaXBzIGNvbGxlY3Rpb25cIik7XHJcbiAgICBhd2FpdCB0aGlzLnRyaXBNb2RlbC5yZW1vdmUoe30pO1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGVkIHRyaXBzIGNvbGxlY3Rpb25cIik7XHJcbiAgfVxyXG4gIHB1YmxpYyBhc3luYyBEcm9wUm91dGVzQ29sbGVjdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBpbmcgcm91dGVzIGNvbGxlY3Rpb25cIik7XHJcbiAgICBhd2FpdCB0aGlzLnJvdXRlc01vZGVsLnJlbW92ZSh7fSk7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwZWQgcm91dGVzIGNvbGxlY3Rpb25cIik7XHJcbiAgfVxyXG4gIHB1YmxpYyBhc3luYyBEcm9wU2hhcGVzQ29sbGVjdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBpbmcgc2hhcGVzIGNvbGxlY3Rpb25cIik7XHJcbiAgICBhd2FpdCB0aGlzLnNoYXBlc01vZGVsLnJlbW92ZSh7fSk7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwZWQgc2hhcGVzIGNvbGxlY3Rpb25cIik7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0Um91dGUocm91dGVJZCA6IG51bWJlcikgOiBQcm9taXNlPFJvdXRlPiB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMucm91dGVzTW9kZWwuZmluZE9uZSh7XHJcbiAgICAgIHJvdXRlSWQgOiByb3V0ZUlkLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3BvbnNlICE9PSBudWxsID8gcmVzcG9uc2UgOiB7fTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRTaGFwZShzaGFwZUlkIDogbnVtYmVyKSA6IFByb21pc2U8QXJyYXk8U2hhcGU+PiB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuc2hhcGVzTW9kZWwuZmluZCh7XHJcbiAgICAgIHNoYXBlSWQgOiBzaGFwZUlkLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3BvbnNlICE9PSBbXSA/IHJlc3BvbnNlIDogW107XHJcbiAgfVxyXG5cclxuICAvLyBwdWJsaWMgYXN5bmMgQWRkUm91dGUoKVxyXG5cclxufVxyXG4iLCIvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBBUFAgQ09ORklHXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5cclxuaW1wb3J0ICogYXMgZG90ZW52IGZyb20gJ2RvdGVudic7XHJcbmRvdGVudi5jb25maWcoKTtcclxuXHJcbmNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDMwMDE7XHJcblxyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBZQVJOIElNUE9SVFNcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcbmltcG9ydCAqIGFzIGh0dHBzIGZyb20gJ2h0dHBzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5cclxuY29uc3QgZXhwcmVzcyA9IHJlcXVpcmUoXCJleHByZXNzXCIpO1xyXG5jb25zdCBjb3JzID0gcmVxdWlyZShcImNvcnNcIik7XHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICBDVVNUT00gSU1QT1JUU1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuXHJcbmltcG9ydCB7IERhdGFiYXNlIH0gZnJvbSAnLi9kYXRhYmFzZSc7XHJcbmltcG9ydCB7IFdlYlNlcnZlciB9IGZyb20gJy4vd2Vic2VydmVyJztcclxuaW1wb3J0IHsgQnVzTG9naWMgfSBmcm9tICcuL2J1c2xvZ2ljJztcclxuaW1wb3J0IHsgRG93bmxvYWRlciB9IGZyb20gJy4vZG93bmxvYWRlcic7XHJcblxyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBTU0wgQ09ORklHXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5jb25zdCBwcml2YXRlS2V5ID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9rZXkua2V5XCIpLnRvU3RyaW5nKCk7XHJcbmNvbnN0IGNlcnRpZmljYXRlID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9jZXJ0LmNydFwiKS50b1N0cmluZygpO1xyXG5jb25zdCBjYSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUva2V5LWNhLmNydFwiKS50b1N0cmluZygpO1xyXG5cclxuY29uc3QgQXBwSW5pdCA9IGFzeW5jICgpID0+IHtcclxuICBjb25zdCBkYiA9IGF3YWl0IERhdGFiYXNlLmdldEluc3RhbmNlKCkuSW5pdCgpLnRoZW4oKTtcclxuICBjb25zdCBhcHAgPSAobW9kdWxlLmV4cG9ydHMgPSBleHByZXNzKCkpO1xyXG5cclxuICBjb25zdCBzZXJ2ZXIgPSBodHRwcy5jcmVhdGVTZXJ2ZXIoXHJcbiAgICB7XHJcbiAgICAgIGtleTogcHJpdmF0ZUtleSxcclxuICAgICAgY2VydDogY2VydGlmaWNhdGUsXHJcbiAgICAgIGNhOiBjYSxcclxuICAgICAgcmVxdWVzdENlcnQ6IHRydWUsXHJcbiAgICAgIHJlamVjdFVuYXV0aG9yaXplZDogZmFsc2UsXHJcbiAgICB9LFxyXG4gICAgYXBwXHJcbiAgKTtcclxuICBcclxuXHJcbiAgLy9USElTIElTIE5PVCBTQUZFXHJcblxyXG4gIGNvbnN0IGNvcnNPcHRpb25zID0ge1xyXG4gICAgb3JpZ2luOiAnKicsXHJcbiAgICBvcHRpb25zU3VjY2Vzc1N0YXR1czogMjAwXHJcbiAgfVxyXG5cclxuICBhcHAudXNlKGNvcnMoY29yc09wdGlvbnMpKVxyXG4gIGFwcC5vcHRpb25zKCcqJywgY29ycygpKVxyXG5cclxuXHJcbiAgbmV3IFdlYlNlcnZlcihhcHAsIGRiKTtcclxuICBjb25zdCBidXNMb2dpYyA9IG5ldyBCdXNMb2dpYyhkYiwgdHJ1ZSk7XHJcbiAgLy9uZXcgRG93bmxvYWRlcihkYik7XHJcbiAgYnVzTG9naWMuSW5pdEtWNzgoKTtcclxuICBcclxuICBzZXJ2ZXIubGlzdGVuKHBvcnQsICgpID0+IGNvbnNvbGUubG9nKGBMaXN0ZW5pbmcgYXQgaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9YCkpO1xyXG5cclxufVxyXG5cclxuQXBwSW5pdCgpO1xyXG4iLCJleHBvcnQgZW51bSB2ZWhpY2xlU3RhdGUge1xyXG4gIE9OUk9VVEUgPSAnT05ST1VURScsXHJcbiAgT0ZGUk9VVEUgPSAnT0ZGUk9VVEUnLFxyXG4gIEVORCA9IFwiRU5EXCIsXHJcbiAgREVQQVJUVVJFID0gJ0RFUEFSVFVSRScsXHJcbiAgSU5JVCA9ICdJTklUJyxcclxuICBERUxBWSA9ICdERUxBWScsXHJcbiAgT05TVE9QID0gJ09OU1RPUCcsXHJcbiAgQVJSSVZBTCA9ICdBUlJJVkFMJ1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFZlaGljbGVEYXRhIHtcclxuICBjb21wYW55OiBzdHJpbmcsXHJcbiAgcGxhbm5pbmdOdW1iZXI6IHN0cmluZyxcclxuICBqb3VybmV5TnVtYmVyOiBudW1iZXIsXHJcbiAgdGltZXN0YW1wOiBudW1iZXIsXHJcbiAgdmVoaWNsZU51bWJlcjogbnVtYmVyLFxyXG4gIHBvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdLFxyXG4gIHN0YXR1czogdmVoaWNsZVN0YXRlLFxyXG4gIGNyZWF0ZWRBdDogbnVtYmVyLFxyXG4gIHVwZGF0ZWRBdDogbnVtYmVyLFxyXG4gIHB1bmN0dWFsaXR5OiBBcnJheTxudW1iZXI+LFxyXG4gIHVwZGF0ZWRUaW1lczogQXJyYXk8bnVtYmVyPlxyXG59XHJcbiIsImltcG9ydCB7IERhdGFiYXNlIH0gZnJvbSBcIi4vZGF0YWJhc2VcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBXZWJTZXJ2ZXIge1xyXG5cclxuICBwcml2YXRlIGFwcDtcclxuICBwcml2YXRlIGRhdGFiYXNlIDogRGF0YWJhc2U7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGFwcCwgZGF0YWJhc2UgOiBEYXRhYmFzZSkge1xyXG4gICAgdGhpcy5hcHAgPSBhcHA7XHJcbiAgICB0aGlzLmRhdGFiYXNlID0gZGF0YWJhc2U7XHJcbiAgICB0aGlzLkluaXRpYWxpemUoKTtcclxuICB9XHJcblxyXG4gIEluaXRpYWxpemUoKSB7XHJcbiAgICB0aGlzLmFwcC5nZXQoXCIvXCIsIChyZXEsIHJlcykgPT4gcmVzLnNlbmQoXCJUaGlzIGlzIHRoZSBBUEkgZW5kcG9pbnQgZm9yIHRoZSBUQUlPVkEgYXBwbGljYXRpb24uXCIpKTtcclxuXHJcbiAgICB0aGlzLmFwcC5nZXQoXCIvYnVzc2VzXCIsIGFzeW5jIChyZXEsIHJlcykgPT4gcmVzLnNlbmQoXHJcbiAgICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0QWxsVmVoaWNsZXMoKVxyXG4gICAgKSlcclxuXHJcbiAgICB0aGlzLmFwcC5nZXQoXCIvYnVzc2VzLzpjb21wYW55LzpudW1iZXJcIiwgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFZlaGljbGUocmVxLnBhcmFtcy5udW1iZXIsIHJlcS5wYXJhbXMuY29tcGFueSwgdHJ1ZSk7XHJcbiAgICAgIGlmKE9iamVjdC5rZXlzKHJlc3VsdCkubGVuZ3RoID4gMCkgcmVzLnNlbmQocmVzdWx0W1wiX2RvY1wiXSk7XHJcbiAgICAgIGVsc2UgcmVzLnNlbmQoe30pXHJcbiAgICAgfSlcclxuICAgIFxyXG5cclxuICAgIHRoaXMuYXBwLmdldChcIi90cmlwLzpwbGFubmluZ251bWJlci86dHJpcG51bWJlclwiLCBhc3luYyhyZXEsIHJlcykgPT4ge1xyXG4gICAgICByZXMuc2VuZChhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFRyaXAocmVxLnBhcmFtcy50cmlwbnVtYmVyLCByZXEucGFyYW1zLnBsYW5uaW5nbnVtYmVyKSk7XHJcbiAgICB9KVxyXG5cclxuICAgIHRoaXMuYXBwLmdldChcIi9yb3V0ZS86cm91dGVudW1iZXJcIiwgYXN5bmMocmVxLCByZXMpID0+IHtcclxuICAgICAgcmVzLnNlbmQoYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRSb3V0ZShyZXEucGFyYW1zLnJvdXRlbnVtYmVyKSk7XHJcbiAgICB9KVxyXG5cclxuICAgIHRoaXMuYXBwLmdldChcIi9zaGFwZS86c2hhcGVudW1iZXJcIiwgYXN5bmMocmVxLCByZXMpID0+IHtcclxuICAgICAgcmVzLnNlbmQoYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRTaGFwZShyZXEucGFyYW1zLnNoYXBlbnVtYmVyKSk7XHJcbiAgICB9KVxyXG4gIH1cclxufSIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImNoaWxkX3Byb2Nlc3NcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImNvcnNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImRvdGVudlwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZXhwcmVzc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZnNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImh0dHBzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJtb25nb29zZVwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwicGF0aFwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwic3BsaXRcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInN0cmVhbS10by1tb25nby1kYlwiKTs7IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIHN0YXJ0dXBcbi8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuLy8gVGhpcyBlbnRyeSBtb2R1bGUgaXMgcmVmZXJlbmNlZCBieSBvdGhlciBtb2R1bGVzIHNvIGl0IGNhbid0IGJlIGlubGluZWRcbnZhciBfX3dlYnBhY2tfZXhwb3J0c19fID0gX193ZWJwYWNrX3JlcXVpcmVfXyhcIi4vc3JjL21haW4udHNcIik7XG4iXSwic291cmNlUm9vdCI6IiJ9