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
                    originalCompany: String,
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
                this.tripsSchema.index({ tripNumber: -1, tripPlanningNumber: -1, company: -1 });
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
    //busLogic.InitKV78();
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
        this.app.get("/trip/:company/:planningnumber/:tripnumber", async (req, res) => {
            res.send(await this.database.GetTrip(req.params.tripnumber, req.params.planningnumber, req.params.company));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvYnVzbG9naWMudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL2RhdGFiYXNlLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy9tYWluLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy90eXBlcy9WZWhpY2xlRGF0YS50cyIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvd2Vic2VydmVyLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImNoaWxkX3Byb2Nlc3NcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJjb3JzXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiZG90ZW52XCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiZXhwcmVzc1wiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImZzXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiaHR0cHNcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJtb25nb29zZVwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcInBhdGhcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJzcGxpdFwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcInN0cmVhbS10by1tb25nby1kYlwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvd2VicGFjay9zdGFydHVwIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUEsdURBQStCO0FBQy9CLDZEQUF5QjtBQUd6QixrRkFBcUM7QUFNckMsTUFBYSxRQUFR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O1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7VUN0QkE7VUFDQTtVQUNBO1VBQ0EiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tIFwiLi9kYXRhYmFzZVwiO1xyXG5pbXBvcnQgeyBWZWhpY2xlRGF0YSwgdmVoaWNsZVN0YXRlIH0gZnJvbSBcIi4vdHlwZXMvVmVoaWNsZURhdGFcIjtcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCB7IFRyaXAgfSBmcm9tIFwiLi90eXBlcy9UcmlwXCI7XHJcbmltcG9ydCB7IEFwaVRyaXAgfSBmcm9tIFwiLi90eXBlcy9BcGlUcmlwXCI7XHJcbmltcG9ydCB7IGV4ZWMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcclxuaW1wb3J0IHsgUm91dGUgfSBmcm9tIFwiLi90eXBlcy9Sb3V0ZVwiO1xyXG5pbXBvcnQgeyBBcGlSb3V0ZSB9IGZyb20gXCIuL3R5cGVzL0FwaVJvdXRlXCI7XHJcbmltcG9ydCB7IEFwaVNoYXBlIH0gZnJvbSBcIi4vdHlwZXMvQXBpU2hhcGVcIjtcclxuaW1wb3J0IHsgU2hhcGUgfSBmcm9tIFwiLi90eXBlcy9TaGFwZVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEJ1c0xvZ2ljIHtcclxuXHJcbiAgcHJpdmF0ZSBkYXRhYmFzZSA6IERhdGFiYXNlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihkYXRhYmFzZSwgZG9Jbml0IDogYm9vbGVhbiA9IGZhbHNlKSB7XHJcbiAgICB0aGlzLmRhdGFiYXNlID0gZGF0YWJhc2U7XHJcblxyXG4gICAgaWYoZG9Jbml0KSB0aGlzLkluaXRpYWxpemUoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgSW5pdGlhbGl6ZSgpIHtcclxuICAgIGF3YWl0IHRoaXMuQ2xlYXJCdXNzZXMoKTtcclxuXHJcbiAgICBzZXRJbnRlcnZhbChhc3luYyAoKSA9PiB7XHJcbiAgICAgIGF3YWl0IHRoaXMuQ2xlYXJCdXNzZXMoKTtcclxuICAgIH0sIHBhcnNlSW50KHByb2Nlc3MuZW52LkFQUF9DTEVBTlVQX0RFTEFZKSlcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENsZWFycyBidXNzZXMgZXZlcnkgWCBhbW91bnQgb2YgbWludXRlcyBzcGVjaWZpZWQgaW4gLmVudiBmaWxlLlxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBDbGVhckJ1c3NlcygpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ0xFQU5VUF9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkNsZWFyaW5nIGJ1c3Nlc1wiKVxyXG4gICAgY29uc3QgY3VycmVudFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgY29uc3QgZmlmdGVlbk1pbnV0ZXNBZ28gPSBjdXJyZW50VGltZSAtICg2MCAqIHBhcnNlSW50KHByb2Nlc3MuZW52LkFQUF9DTEVBTlVQX1ZFSElDTEVfQUdFX1JFUVVJUkVNRU5UKSAqIDEwMDApO1xyXG4gICAgY29uc3QgUmVtb3ZlZFZlaGljbGVzID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5SZW1vdmVWZWhpY2xlc1doZXJlKHsgdXBkYXRlZEF0OiB7ICRsdDogZmlmdGVlbk1pbnV0ZXNBZ28gfSB9LCBwcm9jZXNzLmVudi5BUFBfRE9fQ0xFQU5VUF9MT0dHSU5HID09IFwidHJ1ZVwiKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSBcIktvcHBlbHZsYWsgNyBhbmQgOCB0dXJib1wiIGZpbGVzIHRvIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBJbml0S1Y3OCgpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0aGlzLkluaXRUcmlwc05ldygpO1xyXG4gICAgdGhpcy5Jbml0Um91dGVzKCk7XHJcbiAgICB0aGlzLkluaXRTaGFwZXMoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSB0cmlwcyBmcm9tIHRoZSBzcGVjaWZpZWQgVVJMIGluIHRoZSAuZW52ICwgb3IgXCIuLi9HVEZTL2V4dHJhY3RlZC90cmlwcy5qc29uXCIgdG8gdGhlIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gIHByaXZhdGUgSW5pdFRyaXBzTmV3KCkgOiB2b2lkIHsgXHJcbiAgICBjb25zdCB0cmlwc1BhdGggPSByZXNvbHZlKFwiR1RGUy9leHRyYWN0ZWQvdHJpcHMudHh0Lmpzb25cIik7XHJcbiAgICBjb25zdCBvdXRwdXRQYXRoID0gcmVzb2x2ZShcIkdURlMvY29udmVydGVkL3RyaXBzLmpzb25cIik7XHJcbiAgICBmcy5yZWFkRmlsZSh0cmlwc1BhdGgsICd1dGY4JywgYXN5bmMoZXJyb3IsIGRhdGEpID0+IHsgXHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgaWYoZGF0YSAmJiBwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkxvYWRlZCB0cmlwcyBmaWxlIGludG8gbWVtb3J5LlwiKTtcclxuICAgICAgZGF0YSA9IGRhdGEudHJpbSgpO1xyXG4gICAgICBjb25zdCBsaW5lcyA9IGRhdGEuc3BsaXQoXCJcXG5cIik7XHJcbiAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3V0cHV0UGF0aClcclxuICAgICAgY29uc3QgY29udmVydGVkVHJpcHMgPSBbXTtcclxuXHJcbiAgICAgIGZvcihsZXQgbGluZSBvZiBsaW5lcykge1xyXG4gICAgICAgIGNvbnN0IHRyaXBKU09OIDogQXBpVHJpcCA9IEpTT04ucGFyc2UobGluZSk7XHJcbiAgICAgICAgY29uc3QgcmVhbFRpbWVUcmlwSWQgPSB0cmlwSlNPTi5yZWFsdGltZV90cmlwX2lkLnNwbGl0KFwiOlwiKTtcclxuICAgICAgICBjb25zdCBjb21wYW55ID0gcmVhbFRpbWVUcmlwSWRbMF07XHJcbiAgICAgICAgY29uc3QgcGxhbm5pbmdOdW1iZXIgPSByZWFsVGltZVRyaXBJZFsxXTtcclxuICAgICAgICBjb25zdCB0cmlwTnVtYmVyID0gcmVhbFRpbWVUcmlwSWRbMl07XHJcblxyXG4gICAgICAgIGNvbnN0IHRyaXAgOiBUcmlwID0ge1xyXG4gICAgICAgICAgY29tcGFueTogY29tcGFueSxcclxuICAgICAgICAgIHJvdXRlSWQ6IHBhcnNlSW50KHRyaXBKU09OLnJvdXRlX2lkKSxcclxuICAgICAgICAgIHNlcnZpY2VJZDogcGFyc2VJbnQodHJpcEpTT04uc2VydmljZV9pZCksXHJcbiAgICAgICAgICB0cmlwSWQ6IHBhcnNlSW50KHRyaXBKU09OLnRyaXBfaWQpLFxyXG4gICAgICAgICAgdHJpcE51bWJlcjogcGFyc2VJbnQodHJpcE51bWJlciksXHJcbiAgICAgICAgICB0cmlwUGxhbm5pbmdOdW1iZXI6IHBsYW5uaW5nTnVtYmVyLFxyXG4gICAgICAgICAgdHJpcEhlYWRzaWduOiB0cmlwSlNPTi50cmlwX2hlYWRzaWduLFxyXG4gICAgICAgICAgdHJpcE5hbWU6IHRyaXBKU09OLnRyaXBfbG9uZ19uYW1lLFxyXG4gICAgICAgICAgZGlyZWN0aW9uSWQ6IHBhcnNlSW50KHRyaXBKU09OLmRpcmVjdGlvbl9pZCksXHJcbiAgICAgICAgICBzaGFwZUlkOiBwYXJzZUludCh0cmlwSlNPTi5zaGFwZV9pZCksXHJcbiAgICAgICAgICB3aGVlbGNoYWlyQWNjZXNzaWJsZTogcGFyc2VJbnQodHJpcEpTT04ud2hlZWxjaGFpcl9hY2Nlc3NpYmxlKVxyXG4gICAgICAgIH1cclxuICAgICAgICB3cml0ZVN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh0cmlwKSArIFwiXFxuXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB3cml0ZVN0cmVhbS5lbmQoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRmluaXNoZWQgd3JpdGluZyB0cmlwcyBmaWxlLCBpbXBvcnRpbmcgdG8gZGF0YWJhc2UuXCIpO1xyXG4gICAgICAgIGF3YWl0IHRoaXMuSW1wb3J0VHJpcHMoKTtcclxuICAgICAgfSlcclxuICAgIH0pO1xyXG4gICBcclxuICAgIFxyXG4gIH1cclxuXHJcbiAgYXN5bmMgSW1wb3J0VHJpcHMoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5kYXRhYmFzZS5Ecm9wVHJpcHNDb2xsZWN0aW9uKCk7XHJcblxyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJJbXBvcnRpbmcgdHJpcHMgdG8gbW9uZ29kYlwiKTtcclxuXHJcbiAgICBhd2FpdCBleGVjKFwibW9uZ29pbXBvcnQgLS1kYiB0YWlvdmEgLS1jb2xsZWN0aW9uIHRyaXBzIC0tZmlsZSAuL0dURlMvY29udmVydGVkL3RyaXBzLmpzb25cIiwgKGVycm9yLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzdGRlcnIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgc3RkZXJyOiAke3N0ZGVycn1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBzdGRvdXQ6ICR7c3Rkb3V0fWApO1xyXG4gICAgfSk7XHJcblxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHJvdXRlcyBmcm9tIHRoZSBzcGVjaWZpZWQgVVJMIGluIHRoZSAuZW52ICwgb3IgXCIuLi9HVEZTL2V4dHJhY3RlZC9yb3V0ZXMuanNvblwiIHRvIHRoZSBkYXRhYmFzZS5cclxuICAgKi9cclxuICBwcml2YXRlIEluaXRSb3V0ZXMgKCkge1xyXG4gICAgY29uc3Qgcm91dGVzUGF0aCA9IHJlc29sdmUoXCJHVEZTL2V4dHJhY3RlZC9yb3V0ZXMudHh0Lmpzb25cIik7XHJcbiAgICBjb25zdCBvdXRwdXRQYXRoID0gcmVzb2x2ZShcIkdURlMvY29udmVydGVkL3JvdXRlcy5qc29uXCIpO1xyXG4gICAgZnMucmVhZEZpbGUocm91dGVzUGF0aCwgJ3V0ZjgnLCBhc3luYyhlcnJvciwgZGF0YSkgPT4geyBcclxuICAgICAgaWYoZXJyb3IpIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICBpZihkYXRhICYmIHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiTG9hZGVkIHJvdXRlcyBmaWxlIGludG8gbWVtb3J5LlwiKTtcclxuICAgICAgZGF0YSA9IGRhdGEudHJpbSgpO1xyXG4gICAgICBjb25zdCBsaW5lcyA9IGRhdGEuc3BsaXQoXCJcXG5cIik7XHJcbiAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3V0cHV0UGF0aClcclxuXHJcbiAgICAgIGZvcihsZXQgbGluZSBvZiBsaW5lcykge1xyXG4gICAgICAgIGNvbnN0IHJvdXRlSnNvbiA6IEFwaVJvdXRlID0gSlNPTi5wYXJzZShsaW5lKTtcclxuICAgICAgICBjb25zdCBjb21wYW55U3BsaXQgPSByb3V0ZUpzb24uYWdlbmN5X2lkLnNwbGl0KCc6Jyk7XHJcbiAgICAgICAgY29uc3Qgcm91dGUgOiBSb3V0ZSA9IHtcclxuICAgICAgICAgIHJvdXRlSWQ6IHBhcnNlSW50KHJvdXRlSnNvbi5yb3V0ZV9pZCksXHJcbiAgICAgICAgICBjb21wYW55OiBjb21wYW55U3BsaXRbMF0sXHJcbiAgICAgICAgICBzdWJDb21wYW55OiBjb21wYW55U3BsaXRbMV0gPyBjb21wYW55U3BsaXRbMV0gOiBcIk5vbmVcIixcclxuICAgICAgICAgIHJvdXRlU2hvcnROYW1lOiByb3V0ZUpzb24ucm91dGVfc2hvcnRfbmFtZSxcclxuICAgICAgICAgIHJvdXRlTG9uZ05hbWU6IHJvdXRlSnNvbi5yb3V0ZV9sb25nX25hbWUsXHJcbiAgICAgICAgICByb3V0ZURlc2NyaXB0aW9uOiByb3V0ZUpzb24ucm91dGVfZGVzYyxcclxuICAgICAgICAgIHJvdXRlVHlwZTogcGFyc2VJbnQocm91dGVKc29uLnJvdXRlX3R5cGUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB3cml0ZVN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeShyb3V0ZSkgKyBcIlxcblwiKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgd3JpdGVTdHJlYW0uZW5kKCgpID0+IHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkZpbmlzaGVkIHdyaXRpbmcgcm91dGVzIGZpbGUsIGltcG9ydGluZyB0byBkYXRhYmFzZS5cIik7XHJcbiAgICAgICAgdGhpcy5JbXBvcnRSb3V0ZXMoKTtcclxuICAgICAgfSlcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgSW1wb3J0Um91dGVzKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuRHJvcFJvdXRlc0NvbGxlY3Rpb24oKTtcclxuXHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkltcG9ydGluZyByb3V0ZXMgdG8gbW9uZ29kYlwiKTtcclxuXHJcbiAgICBhd2FpdCBleGVjKFwibW9uZ29pbXBvcnQgLS1kYiB0YWlvdmEgLS1jb2xsZWN0aW9uIHJvdXRlcyAtLWZpbGUgLi9HVEZTL2NvbnZlcnRlZC9yb3V0ZXMuanNvblwiLCAoZXJyb3IsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBlcnJvcjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHN0ZGVycikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBzdGRlcnI6ICR7c3RkZXJyfWApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coYHN0ZG91dDogJHtzdGRvdXR9YCk7XHJcbiAgICB9KTtcclxuXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgc2hhcGVzIGZyb20gdGhlIHNwZWNpZmllZCBVUkwgaW4gdGhlIC5lbnYgLCBvciBcIi4uL0dURlMvZXh0cmFjdGVkL3JvdXRlcy5qc29uXCIgdG8gdGhlIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gICBwcml2YXRlIEluaXRTaGFwZXMgKCkge1xyXG4gICAgY29uc3Qgcm91dGVzUGF0aCA9IHJlc29sdmUoXCJHVEZTL2V4dHJhY3RlZC9zaGFwZXMudHh0Lmpzb25cIik7XHJcbiAgICBjb25zdCBvdXRwdXRQYXRoID0gcmVzb2x2ZShcIkdURlMvY29udmVydGVkL3NoYXBlcy5qc29uXCIpO1xyXG4gICAgZnMucmVhZEZpbGUocm91dGVzUGF0aCwgJ3V0ZjgnLCBhc3luYyhlcnJvciwgZGF0YSkgPT4geyBcclxuICAgICAgaWYoZXJyb3IpIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICBpZihkYXRhICYmIHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiTG9hZGVkIHNoYXBlcyBmaWxlIGludG8gbWVtb3J5LlwiKTtcclxuICAgICAgZGF0YSA9IGRhdGEudHJpbSgpO1xyXG4gICAgICBjb25zdCBsaW5lcyA9IGRhdGEuc3BsaXQoXCJcXG5cIik7XHJcbiAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3V0cHV0UGF0aClcclxuXHJcbiAgICAgIGZvcihsZXQgbGluZSBvZiBsaW5lcykge1xyXG4gICAgICAgIGNvbnN0IHNoYXBlSnNvbiA6IEFwaVNoYXBlID0gSlNPTi5wYXJzZShsaW5lKTtcclxuICAgICAgICBjb25zdCBzaGFwZSA6IFNoYXBlID0ge1xyXG4gICAgICAgICAgc2hhcGVJZDogcGFyc2VJbnQoc2hhcGVKc29uLnNoYXBlX2lkKSxcclxuICAgICAgICAgIHNoYXBlU2VxdWVuY2VOdW1iZXI6IHBhcnNlSW50KHNoYXBlSnNvbi5zaGFwZV9wdF9zZXF1ZW5jZSksXHJcbiAgICAgICAgICBQb3NpdGlvbjogW3BhcnNlRmxvYXQoc2hhcGVKc29uLnNoYXBlX3B0X2xhdCksIHBhcnNlRmxvYXQoc2hhcGVKc29uLnNoYXBlX3B0X2xvbildLFxyXG4gICAgICAgICAgRGlzdGFuY2VTaW5jZUxhc3RQb2ludDogcGFyc2VJbnQoc2hhcGVKc29uLnNoYXBlX2Rpc3RfdHJhdmVsZWQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB3cml0ZVN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeShzaGFwZSkgKyBcIlxcblwiKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgd3JpdGVTdHJlYW0uZW5kKCgpID0+IHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkZpbmlzaGVkIHdyaXRpbmcgc2hhcGVzIGZpbGUsIGltcG9ydGluZyB0byBkYXRhYmFzZS5cIik7XHJcbiAgICAgICAgdGhpcy5JbXBvcnRTaGFwZXMoKTtcclxuICAgICAgfSlcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgSW1wb3J0U2hhcGVzKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuRHJvcFNoYXBlc0NvbGxlY3Rpb24oKTtcclxuXHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkltcG9ydGluZyBzaGFwZXMgdG8gbW9uZ29kYlwiKTtcclxuXHJcbiAgICBhd2FpdCBleGVjKFwibW9uZ29pbXBvcnQgLS1kYiB0YWlvdmEgLS1jb2xsZWN0aW9uIHNoYXBlcyAtLWZpbGUgLi9HVEZTL2NvbnZlcnRlZC9zaGFwZXMuanNvblwiLCAoZXJyb3IsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBlcnJvcjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHN0ZGVycikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBzdGRlcnI6ICR7c3RkZXJyfWApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coYHN0ZG91dDogJHtzdGRvdXR9YCk7XHJcbiAgICB9KTtcclxuXHJcbiAgfVxyXG59IiwiaW1wb3J0IHsgQ29ubmVjdGlvbiwgTW9kZWwsIE1vbmdvb3NlLCBGaWx0ZXJRdWVyeSwgU2NoZW1hIH0gZnJvbSAnbW9uZ29vc2UnO1xyXG5pbXBvcnQgeyBUcmlwIH0gZnJvbSAnLi90eXBlcy9UcmlwJztcclxuaW1wb3J0IHsgVmVoaWNsZURhdGEsIHZlaGljbGVTdGF0ZSB9IGZyb20gJy4vdHlwZXMvVmVoaWNsZURhdGEnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgUm91dGUgfSBmcm9tICcuL3R5cGVzL1JvdXRlJztcclxuaW1wb3J0IHsgU2hhcGUgfSBmcm9tICcuL3R5cGVzL1NoYXBlJztcclxuY29uc3Qgc3RyZWFtVG9Nb25nb0RCID0gcmVxdWlyZSgnc3RyZWFtLXRvLW1vbmdvLWRiJykuc3RyZWFtVG9Nb25nb0RCO1xyXG5jb25zdCBzcGxpdCA9IHJlcXVpcmUoJ3NwbGl0Jyk7XHJcbmV4cG9ydCBjbGFzcyBEYXRhYmFzZSB7XHJcbiAgXHJcbiAgcHJpdmF0ZSBzdGF0aWMgaW5zdGFuY2UgOiBEYXRhYmFzZTtcclxuICBcclxuICBwcml2YXRlIGRiIDogQ29ubmVjdGlvbjtcclxuICBwcml2YXRlIG1vbmdvb3NlIDogTW9uZ29vc2U7XHJcbiAgcHJpdmF0ZSB2ZWhpY2xlU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgdHJpcHNTY2hlbWEgOiBTY2hlbWE7XHJcbiAgcHJpdmF0ZSByb3V0ZXNTY2hlbWEgOiBTY2hlbWE7XHJcbiAgcHJpdmF0ZSBzaGFwZXNTY2hlbWEgOiBTY2hlbWE7XHJcbiAgcHJpdmF0ZSB2ZWhpY2xlTW9kZWwgOiB0eXBlb2YgTW9kZWw7XHJcbiAgcHJpdmF0ZSB0cmlwTW9kZWwgOiB0eXBlb2YgTW9kZWw7XHJcbiAgcHJpdmF0ZSByb3V0ZXNNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIHNoYXBlc01vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgb3V0cHV0REJDb25maWc7XHJcblxyXG4gIHB1YmxpYyBzdGF0aWMgZ2V0SW5zdGFuY2UoKTogRGF0YWJhc2Uge1xyXG4gICAgaWYoIURhdGFiYXNlLmluc3RhbmNlKVxyXG4gICAgICBEYXRhYmFzZS5pbnN0YW5jZSA9IG5ldyBEYXRhYmFzZSgpO1xyXG5cclxuICAgIHJldHVybiBEYXRhYmFzZS5pbnN0YW5jZTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBJbml0KCkge1xyXG4gICAgY29uc3QgdXJsIDogc3RyaW5nID0gcHJvY2Vzcy5lbnYuREFUQUJBU0VfVVJMO1xyXG4gICAgY29uc3QgbmFtZSA6IHN0cmluZyA9IHByb2Nlc3MuZW52LkRBVEFCQVNFX05BTUU7XHJcblxyXG4gICAgdGhpcy5tb25nb29zZSA9IG5ldyBNb25nb29zZSgpO1xyXG4gICAgXHJcbiAgICB0aGlzLm1vbmdvb3NlLnNldCgndXNlRmluZEFuZE1vZGlmeScsIGZhbHNlKVxyXG5cclxuICAgIGlmKCF1cmwgJiYgIW5hbWUpIHRocm93IChgSW52YWxpZCBVUkwgb3IgbmFtZSBnaXZlbiwgcmVjZWl2ZWQ6IFxcbiBOYW1lOiAke25hbWV9IFxcbiBVUkw6ICR7dXJsfWApXHJcblxyXG4gICAgY29uc29sZS5sb2coYENvbm5lY3RpbmcgdG8gZGF0YWJhc2Ugd2l0aCBuYW1lOiAke25hbWV9IGF0IHVybDogJHt1cmx9YClcclxuICAgIHRoaXMubW9uZ29vc2UuY29ubmVjdChgJHt1cmx9LyR7bmFtZX1gLCB7XHJcbiAgICAgIHVzZU5ld1VybFBhcnNlcjogdHJ1ZSxcclxuICAgICAgdXNlVW5pZmllZFRvcG9sb2d5OiB0cnVlLFxyXG4gICAgICBwb29sU2l6ZTogMTIwXHJcbiAgICB9KVxyXG5cclxuICAgIHRoaXMuZGIgPSB0aGlzLm1vbmdvb3NlLmNvbm5lY3Rpb247XHJcblxyXG4gICAgdGhpcy5vdXRwdXREQkNvbmZpZyA9IHsgZGJVUkwgOiBgJHt1cmx9LyR7bmFtZX1gLCBjb2xsZWN0aW9uIDogJ3RyaXBzJyB9O1xyXG5cclxuICAgIHRoaXMuZGIub24oJ2Vycm9yJywgZXJyb3IgPT4ge1xyXG4gICAgICB0aHJvdyBuZXcgZXJyb3IoYEVycm9yIGNvbm5lY3RpbmcgdG8gZGF0YWJhc2UuICR7ZXJyb3J9YCk7XHJcbiAgICB9KVxyXG5cclxuICAgIGF3YWl0IHRoaXMuRGF0YWJhc2VMaXN0ZW5lcigpO1xyXG5cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIEdldERhdGFiYXNlKCkgOiBDb25uZWN0aW9uIHtcclxuICAgIHJldHVybiB0aGlzLmRiO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIERhdGFiYXNlTGlzdGVuZXIgKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMsIHJlaikgPT4ge1xyXG4gICAgICAgIHRoaXMuZGIub25jZShcIm9wZW5cIiwgKCkgPT4ge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0aW9uIHRvIGRhdGFiYXNlIGVzdGFibGlzaGVkLlwiKVxyXG5cclxuICAgICAgICAgIHRoaXMudmVoaWNsZVNjaGVtYSA9IG5ldyB0aGlzLm1vbmdvb3NlLlNjaGVtYSh7XHJcbiAgICAgICAgICAgIGNvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgb3JpZ2luYWxDb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHBsYW5uaW5nTnVtYmVyOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIGpvdXJuZXlOdW1iZXI6IE51bWJlcixcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHZlaGljbGVOdW1iZXI6IE51bWJlcixcclxuICAgICAgICAgICAgcG9zaXRpb246IFtOdW1iZXIsIE51bWJlcl0sXHJcbiAgICAgICAgICAgIHN0YXR1czogU3RyaW5nLFxyXG4gICAgICAgICAgICBwdW5jdHVhbGl0eTogQXJyYXksXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogTnVtYmVyLFxyXG4gICAgICAgICAgICB1cGRhdGVkQXQ6IE51bWJlcixcclxuICAgICAgICAgICAgdXBkYXRlZFRpbWVzOiBBcnJheVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHRoaXMudHJpcHNTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgc2VydmljZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRyaXBJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB0cmlwTnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRyaXBQbGFubmluZ051bWJlcjogU3RyaW5nLFxyXG4gICAgICAgICAgICB0cmlwSGVhZHNpZ246IFN0cmluZyxcclxuICAgICAgICAgICAgdHJpcE5hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgZGlyZWN0aW9uSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgc2hhcGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB3aGVlbGNoYWlyQWNjZXNzaWJsZTogTnVtYmVyXHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIHRoaXMucm91dGVzU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgcm91dGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHN1YkNvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVTaG9ydE5hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVMb25nTmFtZTogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZURlc2NyaXB0aW9uOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlVHlwZTogTnVtYmVyLFxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLnNoYXBlc1NjaGVtYSA9IG5ldyB0aGlzLm1vbmdvb3NlLlNjaGVtYSh7XHJcbiAgICAgICAgICAgIHNoYXBlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgc2hhcGVTZXF1ZW5jZU51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICBQb3NpdGlvbjogW051bWJlciwgTnVtYmVyXSxcclxuICAgICAgICAgICAgRGlzdGFuY2VTaW5jZUxhc3RQb2ludDogTnVtYmVyXHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIHRoaXMudHJpcHNTY2hlbWEuaW5kZXgoeyB0cmlwTnVtYmVyOiAtMSwgdHJpcFBsYW5uaW5nTnVtYmVyOiAtMSwgY29tcGFueTogLTEgfSlcclxuICAgICAgICAgIHRoaXMuc2hhcGVzU2NoZW1hLmluZGV4KHsgc2hhcGVJZDogLTEgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLnZlaGljbGVNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJWZWhpY2xlUG9zaXRpb25zXCIsIHRoaXMudmVoaWNsZVNjaGVtYSk7XHJcbiAgICAgICAgICB0aGlzLnRyaXBNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJ0cmlwc1wiLCB0aGlzLnRyaXBzU2NoZW1hKTtcclxuICAgICAgICAgIHRoaXMucm91dGVzTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwicm91dGVzXCIsIHRoaXMucm91dGVzU2NoZW1hKTtcclxuICAgICAgICAgIHRoaXMuc2hhcGVzTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwic2hhcGVzXCIsIHRoaXMuc2hhcGVzU2NoZW1hKTtcclxuXHJcbiAgICAgICAgICB0aGlzLnRyaXBNb2RlbC5jcmVhdGVJbmRleGVzKCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJlcygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldEFsbFZlaGljbGVzIChhcmdzID0ge30pIDogUHJvbWlzZTxBcnJheTxWZWhpY2xlRGF0YT4+IHtcclxuICAgIHJldHVybiBhd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kKHsuLi5hcmdzfSwgeyBwdW5jdHVhbGl0eTogMCwgdXBkYXRlZFRpbWVzOiAwLCBfX3YgOiAwIH0pO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFZlaGljbGUgKHZlaGljbGVOdW1iZXIsIHRyYW5zcG9ydGVyLCBmaXJzdE9ubHkgOiBib29sZWFuID0gZmFsc2UpIDogUHJvbWlzZTxWZWhpY2xlRGF0YT4ge1xyXG4gICAgcmV0dXJuIHsgXHJcbiAgICAgIC4uLmF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmRPbmUoe1xyXG4gICAgICAgIHZlaGljbGVOdW1iZXIgOiB2ZWhpY2xlTnVtYmVyLFxyXG4gICAgICAgIGNvbXBhbnk6IHRyYW5zcG9ydGVyXHJcbiAgICAgIH0pXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFZlaGljbGVFeGlzdHModmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIpIDogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5HZXRWZWhpY2xlKHZlaGljbGVOdW1iZXIsIHRyYW5zcG9ydGVyKSAhPT0gbnVsbDtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBVcGRhdGVWZWhpY2xlICh2ZWhpY2xlVG9VcGRhdGUgOiBhbnksIHVwZGF0ZWRWZWhpY2xlRGF0YSA6IFZlaGljbGVEYXRhLCBwb3NpdGlvbkNoZWNrcyA6IGJvb2xlYW4gPSBmYWxzZSkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKCF2ZWhpY2xlVG9VcGRhdGVbXCJfZG9jXCJdKSByZXR1cm5cclxuXHJcbiAgICB2ZWhpY2xlVG9VcGRhdGUgPSB2ZWhpY2xlVG9VcGRhdGVbXCJfZG9jXCJdO1xyXG4gICAgXHJcbiAgICAvL01lcmdlIHRoZSBwdW5jdHVhbGl0aWVzIG9mIHRoZSBvbGQgdmVoaWNsZURhdGEgd2l0aCB0aGUgbmV3IG9uZS5cclxuICAgIHVwZGF0ZWRWZWhpY2xlRGF0YS5wdW5jdHVhbGl0eSA9IHZlaGljbGVUb1VwZGF0ZS5wdW5jdHVhbGl0eS5jb25jYXQodXBkYXRlZFZlaGljbGVEYXRhLnB1bmN0dWFsaXR5KTtcclxuXHJcbiAgICAvL01lcmdlIHRoZSB1cGRhdGVkIHRpbWVzIG9mIHRoZSBvbGQgdmVoaWNsZURhdGEgd2l0aCB0aGUgbmV3IG9uZS5cclxuICAgIHVwZGF0ZWRWZWhpY2xlRGF0YS51cGRhdGVkVGltZXMgPSB2ZWhpY2xlVG9VcGRhdGUudXBkYXRlZFRpbWVzLmNvbmNhdCh1cGRhdGVkVmVoaWNsZURhdGEudXBkYXRlZFRpbWVzKTtcclxuXHJcbiAgICBpZihwb3NpdGlvbkNoZWNrcyAmJiB1cGRhdGVkVmVoaWNsZURhdGEuc3RhdHVzICE9PSB2ZWhpY2xlU3RhdGUuT05ST1VURSlcclxuICAgICAgdXBkYXRlZFZlaGljbGVEYXRhLnBvc2l0aW9uID0gdmVoaWNsZVRvVXBkYXRlLnBvc2l0aW9uO1xyXG5cclxuICAgIHVwZGF0ZWRWZWhpY2xlRGF0YS51cGRhdGVkQXQgPSBEYXRlLm5vdygpOyAgXHJcblxyXG4gICAgYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZUFuZFVwZGF0ZSh2ZWhpY2xlVG9VcGRhdGUsIHVwZGF0ZWRWZWhpY2xlRGF0YSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgQWRkVmVoaWNsZSAodmVoaWNsZSA6IFZlaGljbGVEYXRhLCBvbmx5QWRkV2hpbGVPblJvdXRlIDogYm9vbGVhbikgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKG9ubHlBZGRXaGlsZU9uUm91dGUgJiYgdmVoaWNsZS5zdGF0dXMgIT09IHZlaGljbGVTdGF0ZS5PTlJPVVRFKSByZXR1cm47XHJcbiAgICBuZXcgdGhpcy52ZWhpY2xlTW9kZWwoe1xyXG4gICAgICAuLi52ZWhpY2xlLFxyXG4gICAgICBwdW5jdHVhbGl0eSA6IHZlaGljbGUucHVuY3R1YWxpdHlcclxuICAgIH0pLnNhdmUoZXJyb3IgPT4ge1xyXG4gICAgICBpZihlcnJvcikgY29uc29sZS5lcnJvcihgU29tZXRoaW5nIHdlbnQgd3Jvbmcgd2hpbGUgdHJ5aW5nIHRvIGFkZCB2ZWhpY2xlOiAke3ZlaGljbGUudmVoaWNsZU51bWJlcn0uIEVycm9yOiAke2Vycm9yfWApXHJcbiAgICB9KVxyXG4gIH1cclxuICBcclxuICBwdWJsaWMgYXN5bmMgUmVtb3ZlVmVoaWNsZSAodmVoaWNsZSA6IFZlaGljbGVEYXRhKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYoIXZlaGljbGVbXCJfZG9jXCJdKSByZXR1cm5cclxuXHJcbiAgICB0aGlzLnZlaGljbGVNb2RlbC5maW5kT25lQW5kRGVsZXRlKHZlaGljbGUpXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgUmVtb3ZlVmVoaWNsZXNXaGVyZSggcGFyYW1zIDogb2JqZWN0LCBkb0xvZ2dpbmcgOiBib29sZWFuID0gZmFsc2UpIDogUHJvbWlzZTxBcnJheTxWZWhpY2xlRGF0YT4+IHtcclxuICAgIGNvbnN0IHJlbW92ZWRWZWhpY2xlcyA6IEFycmF5PFZlaGljbGVEYXRhPiA9IGF3YWl0IHRoaXMuR2V0QWxsVmVoaWNsZXMocGFyYW1zKTtcclxuICAgIHRoaXMudmVoaWNsZU1vZGVsLmRlbGV0ZU1hbnkocGFyYW1zKS50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgaWYoZG9Mb2dnaW5nKSBjb25zb2xlLmxvZyhgRGVsZXRlZCAke3Jlc3BvbnNlLmRlbGV0ZWRDb3VudH0gdmVoaWNsZXMuYCk7XHJcbiAgICAgIFxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gcmVtb3ZlZFZlaGljbGVzO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFRyaXBzKHBhcmFtcyA6IG9iamVjdCA9IHt9KSA6IFByb21pc2U8QXJyYXk8VHJpcD4+IHtcclxuICAgIHJldHVybiBhd2FpdCB0aGlzLnRyaXBNb2RlbC5maW5kKHBhcmFtcylcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRUcmlwKHRyaXBOdW1iZXIgOiBudW1iZXIsIHRyaXBQbGFubmluZ051bWJlciA6IHN0cmluZywgY29tcGFueTogc3RyaW5nKSB7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnRyaXBNb2RlbC5maW5kT25lKHtcclxuICAgICAgY29tcGFueTogY29tcGFueSxcclxuICAgICAgdHJpcE51bWJlciA6IHRyaXBOdW1iZXIsXHJcbiAgICAgIHRyaXBQbGFubmluZ051bWJlcjogdHJpcFBsYW5uaW5nTnVtYmVyXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcmVzcG9uc2UgIT09IG51bGwgPyByZXNwb25zZSA6IHt9O1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFJlbW92ZVRyaXAocGFyYW1zIDogb2JqZWN0ID0ge30sIGRvTG9nZ2luZyA6IGJvb2xlYW4gPSBmYWxzZSkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMudHJpcE1vZGVsLmRlbGV0ZU1hbnkocGFyYW1zKS50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgaWYoZG9Mb2dnaW5nKSBjb25zb2xlLmxvZyhgRGVsZXRlZCAke3Jlc3BvbnNlLmRlbGV0ZWRDb3VudH0gdHJpcHNgKTtcclxuICAgIH0pXHJcbiAgfVxyXG4gIC8qKlxyXG4gICAqIEluc2VydHMgbWFueSB0cmlwcyBhdCBvbmNlIGludG8gdGhlIGRhdGFiYXNlLlxyXG4gICAqIEBwYXJhbSB0cmlwcyBUaGUgdHJpcHMgdG8gYWRkLlxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBJbnNlcnRNYW55VHJpcHModHJpcHMpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgIGF3YWl0IHRoaXMudHJpcE1vZGVsLmluc2VydE1hbnkodHJpcHMsIHsgb3JkZXJlZDogZmFsc2UgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgXCJLb3BwZWx2bGFrIDcgYW5kIDggdHVyYm9cIiBmaWxlcyB0byBkYXRhYmFzZS5cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgSW5zZXJ0VHJpcCh0cmlwIDogVHJpcCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIG5ldyB0aGlzLnRyaXBNb2RlbCh0cmlwKS5zYXZlKGVycm9yID0+IHtcclxuICAgICAgaWYoZXJyb3IpIGNvbnNvbGUuZXJyb3IoYFNvbWV0aGluZyB3ZW50IHdyb25nIHdoaWxlIHRyeWluZyB0byBhZGQgdHJpcDogJHt0cmlwLnRyaXBIZWFkc2lnbn0uIEVycm9yOiAke2Vycm9yfWApXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIERyb3BUcmlwc0NvbGxlY3Rpb24oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwaW5nIHRyaXBzIGNvbGxlY3Rpb25cIik7XHJcbiAgICBhd2FpdCB0aGlzLnRyaXBNb2RlbC5yZW1vdmUoe30pO1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGVkIHRyaXBzIGNvbGxlY3Rpb25cIik7XHJcbiAgfVxyXG4gIHB1YmxpYyBhc3luYyBEcm9wUm91dGVzQ29sbGVjdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBpbmcgcm91dGVzIGNvbGxlY3Rpb25cIik7XHJcbiAgICBhd2FpdCB0aGlzLnJvdXRlc01vZGVsLnJlbW92ZSh7fSk7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwZWQgcm91dGVzIGNvbGxlY3Rpb25cIik7XHJcbiAgfVxyXG4gIHB1YmxpYyBhc3luYyBEcm9wU2hhcGVzQ29sbGVjdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBpbmcgc2hhcGVzIGNvbGxlY3Rpb25cIik7XHJcbiAgICBhd2FpdCB0aGlzLnNoYXBlc01vZGVsLnJlbW92ZSh7fSk7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwZWQgc2hhcGVzIGNvbGxlY3Rpb25cIik7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0Um91dGUocm91dGVJZCA6IG51bWJlcikgOiBQcm9taXNlPFJvdXRlPiB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMucm91dGVzTW9kZWwuZmluZE9uZSh7XHJcbiAgICAgIHJvdXRlSWQgOiByb3V0ZUlkLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3BvbnNlICE9PSBudWxsID8gcmVzcG9uc2UgOiB7fTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRTaGFwZShzaGFwZUlkIDogbnVtYmVyKSA6IFByb21pc2U8QXJyYXk8U2hhcGU+PiB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuc2hhcGVzTW9kZWwuZmluZCh7XHJcbiAgICAgIHNoYXBlSWQgOiBzaGFwZUlkLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3BvbnNlICE9PSBbXSA/IHJlc3BvbnNlIDogW107XHJcbiAgfVxyXG5cclxuICAvLyBwdWJsaWMgYXN5bmMgQWRkUm91dGUoKVxyXG5cclxufVxyXG4iLCIvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBBUFAgQ09ORklHXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5cclxuaW1wb3J0ICogYXMgZG90ZW52IGZyb20gJ2RvdGVudic7XHJcbmRvdGVudi5jb25maWcoKTtcclxuXHJcbmNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDMwMDE7XHJcblxyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBZQVJOIElNUE9SVFNcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcbmltcG9ydCAqIGFzIGh0dHBzIGZyb20gJ2h0dHBzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5cclxuY29uc3QgZXhwcmVzcyA9IHJlcXVpcmUoXCJleHByZXNzXCIpO1xyXG5jb25zdCBjb3JzID0gcmVxdWlyZShcImNvcnNcIik7XHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICBDVVNUT00gSU1QT1JUU1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuXHJcbmltcG9ydCB7IERhdGFiYXNlIH0gZnJvbSAnLi9kYXRhYmFzZSc7XHJcbmltcG9ydCB7IFdlYlNlcnZlciB9IGZyb20gJy4vd2Vic2VydmVyJztcclxuaW1wb3J0IHsgQnVzTG9naWMgfSBmcm9tICcuL2J1c2xvZ2ljJztcclxuaW1wb3J0IHsgRG93bmxvYWRlciB9IGZyb20gJy4vZG93bmxvYWRlcic7XHJcblxyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBTU0wgQ09ORklHXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5jb25zdCBwcml2YXRlS2V5ID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9rZXkua2V5XCIpLnRvU3RyaW5nKCk7XHJcbmNvbnN0IGNlcnRpZmljYXRlID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9jZXJ0LmNydFwiKS50b1N0cmluZygpO1xyXG5jb25zdCBjYSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUva2V5LWNhLmNydFwiKS50b1N0cmluZygpO1xyXG5cclxuY29uc3QgQXBwSW5pdCA9IGFzeW5jICgpID0+IHtcclxuICBjb25zdCBkYiA9IGF3YWl0IERhdGFiYXNlLmdldEluc3RhbmNlKCkuSW5pdCgpLnRoZW4oKTtcclxuICBjb25zdCBhcHAgPSAobW9kdWxlLmV4cG9ydHMgPSBleHByZXNzKCkpO1xyXG5cclxuICBjb25zdCBzZXJ2ZXIgPSBodHRwcy5jcmVhdGVTZXJ2ZXIoXHJcbiAgICB7XHJcbiAgICAgIGtleTogcHJpdmF0ZUtleSxcclxuICAgICAgY2VydDogY2VydGlmaWNhdGUsXHJcbiAgICAgIGNhOiBjYSxcclxuICAgICAgcmVxdWVzdENlcnQ6IHRydWUsXHJcbiAgICAgIHJlamVjdFVuYXV0aG9yaXplZDogZmFsc2UsXHJcbiAgICB9LFxyXG4gICAgYXBwXHJcbiAgKTtcclxuICBcclxuXHJcbiAgLy9USElTIElTIE5PVCBTQUZFXHJcblxyXG4gIGNvbnN0IGNvcnNPcHRpb25zID0ge1xyXG4gICAgb3JpZ2luOiAnKicsXHJcbiAgICBvcHRpb25zU3VjY2Vzc1N0YXR1czogMjAwXHJcbiAgfVxyXG5cclxuICBhcHAudXNlKGNvcnMoY29yc09wdGlvbnMpKVxyXG4gIGFwcC5vcHRpb25zKCcqJywgY29ycygpKVxyXG5cclxuXHJcbiAgbmV3IFdlYlNlcnZlcihhcHAsIGRiKTtcclxuICBjb25zdCBidXNMb2dpYyA9IG5ldyBCdXNMb2dpYyhkYiwgdHJ1ZSk7XHJcbiAgLy9uZXcgRG93bmxvYWRlcihkYik7XHJcbiAgLy9idXNMb2dpYy5Jbml0S1Y3OCgpO1xyXG4gIFxyXG4gIHNlcnZlci5saXN0ZW4ocG9ydCwgKCkgPT4gY29uc29sZS5sb2coYExpc3RlbmluZyBhdCBodHRwOi8vbG9jYWxob3N0OiR7cG9ydH1gKSk7XHJcblxyXG59XHJcblxyXG5BcHBJbml0KCk7XHJcbiIsImV4cG9ydCBlbnVtIHZlaGljbGVTdGF0ZSB7XHJcbiAgT05ST1VURSA9ICdPTlJPVVRFJyxcclxuICBPRkZST1VURSA9ICdPRkZST1VURScsXHJcbiAgRU5EID0gXCJFTkRcIixcclxuICBERVBBUlRVUkUgPSAnREVQQVJUVVJFJyxcclxuICBJTklUID0gJ0lOSVQnLFxyXG4gIERFTEFZID0gJ0RFTEFZJyxcclxuICBPTlNUT1AgPSAnT05TVE9QJyxcclxuICBBUlJJVkFMID0gJ0FSUklWQUwnXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVmVoaWNsZURhdGEge1xyXG4gIGNvbXBhbnk6IHN0cmluZyxcclxuICBvcmlnaW5hbENvbXBhbnk6IHN0cmluZyxcclxuICBwbGFubmluZ051bWJlcjogc3RyaW5nLFxyXG4gIGpvdXJuZXlOdW1iZXI6IG51bWJlcixcclxuICB0aW1lc3RhbXA6IG51bWJlcixcclxuICB2ZWhpY2xlTnVtYmVyOiBudW1iZXIsXHJcbiAgcG9zaXRpb246IFtudW1iZXIsIG51bWJlcl0sXHJcbiAgc3RhdHVzOiB2ZWhpY2xlU3RhdGUsXHJcbiAgY3JlYXRlZEF0OiBudW1iZXIsXHJcbiAgdXBkYXRlZEF0OiBudW1iZXIsXHJcbiAgcHVuY3R1YWxpdHk6IEFycmF5PG51bWJlcj4sXHJcbiAgdXBkYXRlZFRpbWVzOiBBcnJheTxudW1iZXI+XHJcbn1cclxuIiwiaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tIFwiLi9kYXRhYmFzZVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFdlYlNlcnZlciB7XHJcblxyXG4gIHByaXZhdGUgYXBwO1xyXG4gIHByaXZhdGUgZGF0YWJhc2UgOiBEYXRhYmFzZTtcclxuXHJcbiAgY29uc3RydWN0b3IoYXBwLCBkYXRhYmFzZSA6IERhdGFiYXNlKSB7XHJcbiAgICB0aGlzLmFwcCA9IGFwcDtcclxuICAgIHRoaXMuZGF0YWJhc2UgPSBkYXRhYmFzZTtcclxuICAgIHRoaXMuSW5pdGlhbGl6ZSgpO1xyXG4gIH1cclxuXHJcbiAgSW5pdGlhbGl6ZSgpIHtcclxuICAgIHRoaXMuYXBwLmdldChcIi9cIiwgKHJlcSwgcmVzKSA9PiByZXMuc2VuZChcIlRoaXMgaXMgdGhlIEFQSSBlbmRwb2ludCBmb3IgdGhlIFRBSU9WQSBhcHBsaWNhdGlvbi5cIikpO1xyXG5cclxuICAgIHRoaXMuYXBwLmdldChcIi9idXNzZXNcIiwgYXN5bmMgKHJlcSwgcmVzKSA9PiByZXMuc2VuZChcclxuICAgICAgYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRBbGxWZWhpY2xlcygpXHJcbiAgICApKVxyXG5cclxuICAgIHRoaXMuYXBwLmdldChcIi9idXNzZXMvOmNvbXBhbnkvOm51bWJlclwiLCBhc3luYyAocmVxLCByZXMpID0+IHtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0VmVoaWNsZShyZXEucGFyYW1zLm51bWJlciwgcmVxLnBhcmFtcy5jb21wYW55LCB0cnVlKTtcclxuICAgICAgaWYoT2JqZWN0LmtleXMocmVzdWx0KS5sZW5ndGggPiAwKSByZXMuc2VuZChyZXN1bHRbXCJfZG9jXCJdKTtcclxuICAgICAgZWxzZSByZXMuc2VuZCh7fSlcclxuICAgICB9KVxyXG4gICAgXHJcblxyXG4gICAgdGhpcy5hcHAuZ2V0KFwiL3RyaXAvOmNvbXBhbnkvOnBsYW5uaW5nbnVtYmVyLzp0cmlwbnVtYmVyXCIsIGFzeW5jKHJlcSwgcmVzKSA9PiB7XHJcbiAgICAgIHJlcy5zZW5kKGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0VHJpcChyZXEucGFyYW1zLnRyaXBudW1iZXIsIHJlcS5wYXJhbXMucGxhbm5pbmdudW1iZXIsIHJlcS5wYXJhbXMuY29tcGFueSkpO1xyXG4gICAgfSlcclxuXHJcbiAgICB0aGlzLmFwcC5nZXQoXCIvcm91dGUvOnJvdXRlbnVtYmVyXCIsIGFzeW5jKHJlcSwgcmVzKSA9PiB7XHJcbiAgICAgIHJlcy5zZW5kKGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0Um91dGUocmVxLnBhcmFtcy5yb3V0ZW51bWJlcikpO1xyXG4gICAgfSlcclxuXHJcbiAgICB0aGlzLmFwcC5nZXQoXCIvc2hhcGUvOnNoYXBlbnVtYmVyXCIsIGFzeW5jKHJlcSwgcmVzKSA9PiB7XHJcbiAgICAgIHJlcy5zZW5kKGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0U2hhcGUocmVxLnBhcmFtcy5zaGFwZW51bWJlcikpO1xyXG4gICAgfSlcclxuICB9XHJcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJjaGlsZF9wcm9jZXNzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJjb3JzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJkb3RlbnZcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImV4cHJlc3NcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImZzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJodHRwc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwibW9uZ29vc2VcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInBhdGhcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInNwbGl0XCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzdHJlYW0tdG8tbW9uZ28tZGJcIik7OyIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBzdGFydHVwXG4vLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbi8vIFRoaXMgZW50cnkgbW9kdWxlIGlzIHJlZmVyZW5jZWQgYnkgb3RoZXIgbW9kdWxlcyBzbyBpdCBjYW4ndCBiZSBpbmxpbmVkXG52YXIgX193ZWJwYWNrX2V4cG9ydHNfXyA9IF9fd2VicGFja19yZXF1aXJlX18oXCIuL3NyYy9tYWluLnRzXCIpO1xuIl0sInNvdXJjZVJvb3QiOiIifQ==