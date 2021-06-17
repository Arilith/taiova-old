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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvYnVzbG9naWMudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL2RhdGFiYXNlLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy9tYWluLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy90eXBlcy9WZWhpY2xlRGF0YS50cyIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvd2Vic2VydmVyLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImNoaWxkX3Byb2Nlc3NcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJjb3JzXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiZG90ZW52XCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiZXhwcmVzc1wiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImZzXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiaHR0cHNcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJtb25nb29zZVwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcInBhdGhcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJzcGxpdFwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcInN0cmVhbS10by1tb25nby1kYlwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvd2VicGFjay9zdGFydHVwIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUEsdURBQStCO0FBQy9CLDZEQUF5QjtBQUd6QixrRkFBcUM7QUFNckMsTUFBYSxRQUFR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VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTs7VUFFQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTs7OztVQ3RCQTtVQUNBO1VBQ0E7VUFDQSIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEYXRhYmFzZSB9IGZyb20gXCIuL2RhdGFiYXNlXCI7XHJcbmltcG9ydCB7IFZlaGljbGVEYXRhLCB2ZWhpY2xlU3RhdGUgfSBmcm9tIFwiLi90eXBlcy9WZWhpY2xlRGF0YVwiO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0IHsgVHJpcCB9IGZyb20gXCIuL3R5cGVzL1RyaXBcIjtcclxuaW1wb3J0IHsgQXBpVHJpcCB9IGZyb20gXCIuL3R5cGVzL0FwaVRyaXBcIjtcclxuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xyXG5pbXBvcnQgeyBSb3V0ZSB9IGZyb20gXCIuL3R5cGVzL1JvdXRlXCI7XHJcbmltcG9ydCB7IEFwaVJvdXRlIH0gZnJvbSBcIi4vdHlwZXMvQXBpUm91dGVcIjtcclxuaW1wb3J0IHsgQXBpU2hhcGUgfSBmcm9tIFwiLi90eXBlcy9BcGlTaGFwZVwiO1xyXG5pbXBvcnQgeyBTaGFwZSB9IGZyb20gXCIuL3R5cGVzL1NoYXBlXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQnVzTG9naWMge1xyXG5cclxuICBwcml2YXRlIGRhdGFiYXNlIDogRGF0YWJhc2U7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGRhdGFiYXNlLCBkb0luaXQgOiBib29sZWFuID0gZmFsc2UpIHtcclxuICAgIHRoaXMuZGF0YWJhc2UgPSBkYXRhYmFzZTtcclxuXHJcbiAgICBpZihkb0luaXQpIHRoaXMuSW5pdGlhbGl6ZSgpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBJbml0aWFsaXplKCkge1xyXG4gICAgYXdhaXQgdGhpcy5DbGVhckJ1c3NlcygpO1xyXG5cclxuICAgIHNldEludGVydmFsKGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgdGhpcy5DbGVhckJ1c3NlcygpO1xyXG4gICAgfSwgcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0NMRUFOVVBfREVMQVkpKVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2xlYXJzIGJ1c3NlcyBldmVyeSBYIGFtb3VudCBvZiBtaW51dGVzIHNwZWNpZmllZCBpbiAuZW52IGZpbGUuXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIENsZWFyQnVzc2VzKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DTEVBTlVQX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiQ2xlYXJpbmcgYnVzc2VzXCIpXHJcbiAgICBjb25zdCBjdXJyZW50VGltZSA9IERhdGUubm93KCk7XHJcbiAgICBjb25zdCBmaWZ0ZWVuTWludXRlc0FnbyA9IGN1cnJlbnRUaW1lIC0gKDYwICogcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0NMRUFOVVBfVkVISUNMRV9BR0VfUkVRVUlSRU1FTlQpICogMTAwMCk7XHJcbiAgICBjb25zdCBSZW1vdmVkVmVoaWNsZXMgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLlJlbW92ZVZlaGljbGVzV2hlcmUoeyB1cGRhdGVkQXQ6IHsgJGx0OiBmaWZ0ZWVuTWludXRlc0FnbyB9IH0sIHByb2Nlc3MuZW52LkFQUF9ET19DTEVBTlVQX0xPR0dJTkcgPT0gXCJ0cnVlXCIpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIFwiS29wcGVsdmxhayA3IGFuZCA4IHR1cmJvXCIgZmlsZXMgdG8gZGF0YWJhc2UuXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIEluaXRLVjc4KCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRoaXMuSW5pdFRyaXBzTmV3KCk7XHJcbiAgICB0aGlzLkluaXRSb3V0ZXMoKTtcclxuICAgIHRoaXMuSW5pdFNoYXBlcygpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHRyaXBzIGZyb20gdGhlIHNwZWNpZmllZCBVUkwgaW4gdGhlIC5lbnYgLCBvciBcIi4uL0dURlMvZXh0cmFjdGVkL3RyaXBzLmpzb25cIiB0byB0aGUgZGF0YWJhc2UuXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBJbml0VHJpcHNOZXcoKSA6IHZvaWQgeyBcclxuICAgIGNvbnN0IHRyaXBzUGF0aCA9IHJlc29sdmUoXCJHVEZTL2V4dHJhY3RlZC90cmlwcy50eHQuanNvblwiKTtcclxuICAgIGNvbnN0IG91dHB1dFBhdGggPSByZXNvbHZlKFwiR1RGUy9jb252ZXJ0ZWQvdHJpcHMuanNvblwiKTtcclxuICAgIGZzLnJlYWRGaWxlKHRyaXBzUGF0aCwgJ3V0ZjgnLCBhc3luYyhlcnJvciwgZGF0YSkgPT4geyBcclxuICAgICAgaWYoZXJyb3IpIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICBpZihkYXRhICYmIHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiTG9hZGVkIHRyaXBzIGZpbGUgaW50byBtZW1vcnkuXCIpO1xyXG4gICAgICBkYXRhID0gZGF0YS50cmltKCk7XHJcbiAgICAgIGNvbnN0IGxpbmVzID0gZGF0YS5zcGxpdChcIlxcblwiKTtcclxuICAgICAgY29uc3Qgd3JpdGVTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShvdXRwdXRQYXRoKVxyXG4gICAgICBjb25zdCBjb252ZXJ0ZWRUcmlwcyA9IFtdO1xyXG5cclxuICAgICAgZm9yKGxldCBsaW5lIG9mIGxpbmVzKSB7XHJcbiAgICAgICAgY29uc3QgdHJpcEpTT04gOiBBcGlUcmlwID0gSlNPTi5wYXJzZShsaW5lKTtcclxuICAgICAgICBjb25zdCByZWFsVGltZVRyaXBJZCA9IHRyaXBKU09OLnJlYWx0aW1lX3RyaXBfaWQuc3BsaXQoXCI6XCIpO1xyXG4gICAgICAgIGNvbnN0IGNvbXBhbnkgPSByZWFsVGltZVRyaXBJZFswXTtcclxuICAgICAgICBjb25zdCBwbGFubmluZ051bWJlciA9IHJlYWxUaW1lVHJpcElkWzFdO1xyXG4gICAgICAgIGNvbnN0IHRyaXBOdW1iZXIgPSByZWFsVGltZVRyaXBJZFsyXTtcclxuXHJcbiAgICAgICAgY29uc3QgdHJpcCA6IFRyaXAgPSB7XHJcbiAgICAgICAgICBjb21wYW55OiBjb21wYW55LFxyXG4gICAgICAgICAgcm91dGVJZDogcGFyc2VJbnQodHJpcEpTT04ucm91dGVfaWQpLFxyXG4gICAgICAgICAgc2VydmljZUlkOiBwYXJzZUludCh0cmlwSlNPTi5zZXJ2aWNlX2lkKSxcclxuICAgICAgICAgIHRyaXBJZDogcGFyc2VJbnQodHJpcEpTT04udHJpcF9pZCksXHJcbiAgICAgICAgICB0cmlwTnVtYmVyOiBwYXJzZUludCh0cmlwTnVtYmVyKSxcclxuICAgICAgICAgIHRyaXBQbGFubmluZ051bWJlcjogcGxhbm5pbmdOdW1iZXIsXHJcbiAgICAgICAgICB0cmlwSGVhZHNpZ246IHRyaXBKU09OLnRyaXBfaGVhZHNpZ24sXHJcbiAgICAgICAgICB0cmlwTmFtZTogdHJpcEpTT04udHJpcF9sb25nX25hbWUsXHJcbiAgICAgICAgICBkaXJlY3Rpb25JZDogcGFyc2VJbnQodHJpcEpTT04uZGlyZWN0aW9uX2lkKSxcclxuICAgICAgICAgIHNoYXBlSWQ6IHBhcnNlSW50KHRyaXBKU09OLnNoYXBlX2lkKSxcclxuICAgICAgICAgIHdoZWVsY2hhaXJBY2Nlc3NpYmxlOiBwYXJzZUludCh0cmlwSlNPTi53aGVlbGNoYWlyX2FjY2Vzc2libGUpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHdyaXRlU3RyZWFtLndyaXRlKEpTT04uc3RyaW5naWZ5KHRyaXApICsgXCJcXG5cIik7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHdyaXRlU3RyZWFtLmVuZChhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJGaW5pc2hlZCB3cml0aW5nIHRyaXBzIGZpbGUsIGltcG9ydGluZyB0byBkYXRhYmFzZS5cIik7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5JbXBvcnRUcmlwcygpO1xyXG4gICAgICB9KVxyXG4gICAgfSk7XHJcbiAgIFxyXG4gICAgXHJcbiAgfVxyXG5cclxuICBhc3luYyBJbXBvcnRUcmlwcygpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLmRhdGFiYXNlLkRyb3BUcmlwc0NvbGxlY3Rpb24oKTtcclxuXHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkltcG9ydGluZyB0cmlwcyB0byBtb25nb2RiXCIpO1xyXG5cclxuICAgIGF3YWl0IGV4ZWMoXCJtb25nb2ltcG9ydCAtLWRiIHRhaW92YSAtLWNvbGxlY3Rpb24gdHJpcHMgLS1maWxlIC4vR1RGUy9jb252ZXJ0ZWQvdHJpcHMuanNvblwiLCAoZXJyb3IsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBlcnJvcjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHN0ZGVycikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBzdGRlcnI6ICR7c3RkZXJyfWApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coYHN0ZG91dDogJHtzdGRvdXR9YCk7XHJcbiAgICB9KTtcclxuXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgcm91dGVzIGZyb20gdGhlIHNwZWNpZmllZCBVUkwgaW4gdGhlIC5lbnYgLCBvciBcIi4uL0dURlMvZXh0cmFjdGVkL3JvdXRlcy5qc29uXCIgdG8gdGhlIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gIHByaXZhdGUgSW5pdFJvdXRlcyAoKSB7XHJcbiAgICBjb25zdCByb3V0ZXNQYXRoID0gcmVzb2x2ZShcIkdURlMvZXh0cmFjdGVkL3JvdXRlcy50eHQuanNvblwiKTtcclxuICAgIGNvbnN0IG91dHB1dFBhdGggPSByZXNvbHZlKFwiR1RGUy9jb252ZXJ0ZWQvcm91dGVzLmpzb25cIik7XHJcbiAgICBmcy5yZWFkRmlsZShyb3V0ZXNQYXRoLCAndXRmOCcsIGFzeW5jKGVycm9yLCBkYXRhKSA9PiB7IFxyXG4gICAgICBpZihlcnJvcikgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgIGlmKGRhdGEgJiYgcHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJMb2FkZWQgcm91dGVzIGZpbGUgaW50byBtZW1vcnkuXCIpO1xyXG4gICAgICBkYXRhID0gZGF0YS50cmltKCk7XHJcbiAgICAgIGNvbnN0IGxpbmVzID0gZGF0YS5zcGxpdChcIlxcblwiKTtcclxuICAgICAgY29uc3Qgd3JpdGVTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShvdXRwdXRQYXRoKVxyXG5cclxuICAgICAgZm9yKGxldCBsaW5lIG9mIGxpbmVzKSB7XHJcbiAgICAgICAgY29uc3Qgcm91dGVKc29uIDogQXBpUm91dGUgPSBKU09OLnBhcnNlKGxpbmUpO1xyXG4gICAgICAgIGNvbnN0IGNvbXBhbnlTcGxpdCA9IHJvdXRlSnNvbi5hZ2VuY3lfaWQuc3BsaXQoJzonKTtcclxuICAgICAgICBjb25zdCByb3V0ZSA6IFJvdXRlID0ge1xyXG4gICAgICAgICAgcm91dGVJZDogcGFyc2VJbnQocm91dGVKc29uLnJvdXRlX2lkKSxcclxuICAgICAgICAgIGNvbXBhbnk6IGNvbXBhbnlTcGxpdFswXSxcclxuICAgICAgICAgIHN1YkNvbXBhbnk6IGNvbXBhbnlTcGxpdFsxXSA/IGNvbXBhbnlTcGxpdFsxXSA6IFwiTm9uZVwiLFxyXG4gICAgICAgICAgcm91dGVTaG9ydE5hbWU6IHJvdXRlSnNvbi5yb3V0ZV9zaG9ydF9uYW1lLFxyXG4gICAgICAgICAgcm91dGVMb25nTmFtZTogcm91dGVKc29uLnJvdXRlX2xvbmdfbmFtZSxcclxuICAgICAgICAgIHJvdXRlRGVzY3JpcHRpb246IHJvdXRlSnNvbi5yb3V0ZV9kZXNjLFxyXG4gICAgICAgICAgcm91dGVUeXBlOiBwYXJzZUludChyb3V0ZUpzb24ucm91dGVfdHlwZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHdyaXRlU3RyZWFtLndyaXRlKEpTT04uc3RyaW5naWZ5KHJvdXRlKSArIFwiXFxuXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB3cml0ZVN0cmVhbS5lbmQoKCkgPT4ge1xyXG4gICAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRmluaXNoZWQgd3JpdGluZyByb3V0ZXMgZmlsZSwgaW1wb3J0aW5nIHRvIGRhdGFiYXNlLlwiKTtcclxuICAgICAgICB0aGlzLkltcG9ydFJvdXRlcygpO1xyXG4gICAgICB9KVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBJbXBvcnRSb3V0ZXMoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5kYXRhYmFzZS5Ecm9wUm91dGVzQ29sbGVjdGlvbigpO1xyXG5cclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiSW1wb3J0aW5nIHJvdXRlcyB0byBtb25nb2RiXCIpO1xyXG5cclxuICAgIGF3YWl0IGV4ZWMoXCJtb25nb2ltcG9ydCAtLWRiIHRhaW92YSAtLWNvbGxlY3Rpb24gcm91dGVzIC0tZmlsZSAuL0dURlMvY29udmVydGVkL3JvdXRlcy5qc29uXCIsIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc3RkZXJyKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYHN0ZGVycjogJHtzdGRlcnJ9YCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhgc3Rkb3V0OiAke3N0ZG91dH1gKTtcclxuICAgIH0pO1xyXG5cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSBzaGFwZXMgZnJvbSB0aGUgc3BlY2lmaWVkIFVSTCBpbiB0aGUgLmVudiAsIG9yIFwiLi4vR1RGUy9leHRyYWN0ZWQvcm91dGVzLmpzb25cIiB0byB0aGUgZGF0YWJhc2UuXHJcbiAgICovXHJcbiAgIHByaXZhdGUgSW5pdFNoYXBlcyAoKSB7XHJcbiAgICBjb25zdCByb3V0ZXNQYXRoID0gcmVzb2x2ZShcIkdURlMvZXh0cmFjdGVkL3NoYXBlcy50eHQuanNvblwiKTtcclxuICAgIGNvbnN0IG91dHB1dFBhdGggPSByZXNvbHZlKFwiR1RGUy9jb252ZXJ0ZWQvc2hhcGVzLmpzb25cIik7XHJcbiAgICBmcy5yZWFkRmlsZShyb3V0ZXNQYXRoLCAndXRmOCcsIGFzeW5jKGVycm9yLCBkYXRhKSA9PiB7IFxyXG4gICAgICBpZihlcnJvcikgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgIGlmKGRhdGEgJiYgcHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJMb2FkZWQgc2hhcGVzIGZpbGUgaW50byBtZW1vcnkuXCIpO1xyXG4gICAgICBkYXRhID0gZGF0YS50cmltKCk7XHJcbiAgICAgIGNvbnN0IGxpbmVzID0gZGF0YS5zcGxpdChcIlxcblwiKTtcclxuICAgICAgY29uc3Qgd3JpdGVTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShvdXRwdXRQYXRoKVxyXG5cclxuICAgICAgZm9yKGxldCBsaW5lIG9mIGxpbmVzKSB7XHJcbiAgICAgICAgY29uc3Qgc2hhcGVKc29uIDogQXBpU2hhcGUgPSBKU09OLnBhcnNlKGxpbmUpO1xyXG4gICAgICAgIGNvbnN0IHNoYXBlIDogU2hhcGUgPSB7XHJcbiAgICAgICAgICBzaGFwZUlkOiBwYXJzZUludChzaGFwZUpzb24uc2hhcGVfaWQpLFxyXG4gICAgICAgICAgc2hhcGVTZXF1ZW5jZU51bWJlcjogcGFyc2VJbnQoc2hhcGVKc29uLnNoYXBlX3B0X3NlcXVlbmNlKSxcclxuICAgICAgICAgIFBvc2l0aW9uOiBbcGFyc2VGbG9hdChzaGFwZUpzb24uc2hhcGVfcHRfbGF0KSwgcGFyc2VGbG9hdChzaGFwZUpzb24uc2hhcGVfcHRfbG9uKV0sXHJcbiAgICAgICAgICBEaXN0YW5jZVNpbmNlTGFzdFBvaW50OiBwYXJzZUludChzaGFwZUpzb24uc2hhcGVfZGlzdF90cmF2ZWxlZClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHdyaXRlU3RyZWFtLndyaXRlKEpTT04uc3RyaW5naWZ5KHNoYXBlKSArIFwiXFxuXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB3cml0ZVN0cmVhbS5lbmQoKCkgPT4ge1xyXG4gICAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRmluaXNoZWQgd3JpdGluZyBzaGFwZXMgZmlsZSwgaW1wb3J0aW5nIHRvIGRhdGFiYXNlLlwiKTtcclxuICAgICAgICB0aGlzLkltcG9ydFNoYXBlcygpO1xyXG4gICAgICB9KVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBJbXBvcnRTaGFwZXMoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5kYXRhYmFzZS5Ecm9wU2hhcGVzQ29sbGVjdGlvbigpO1xyXG5cclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiSW1wb3J0aW5nIHNoYXBlcyB0byBtb25nb2RiXCIpO1xyXG5cclxuICAgIGF3YWl0IGV4ZWMoXCJtb25nb2ltcG9ydCAtLWRiIHRhaW92YSAtLWNvbGxlY3Rpb24gc2hhcGVzIC0tZmlsZSAuL0dURlMvY29udmVydGVkL3NoYXBlcy5qc29uXCIsIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc3RkZXJyKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYHN0ZGVycjogJHtzdGRlcnJ9YCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhgc3Rkb3V0OiAke3N0ZG91dH1gKTtcclxuICAgIH0pO1xyXG5cclxuICB9XHJcbn0iLCJpbXBvcnQgeyBDb25uZWN0aW9uLCBNb2RlbCwgTW9uZ29vc2UsIEZpbHRlclF1ZXJ5LCBTY2hlbWEgfSBmcm9tICdtb25nb29zZSc7XHJcbmltcG9ydCB7IFRyaXAgfSBmcm9tICcuL3R5cGVzL1RyaXAnO1xyXG5pbXBvcnQgeyBWZWhpY2xlRGF0YSwgdmVoaWNsZVN0YXRlIH0gZnJvbSAnLi90eXBlcy9WZWhpY2xlRGF0YSc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBSb3V0ZSB9IGZyb20gJy4vdHlwZXMvUm91dGUnO1xyXG5pbXBvcnQgeyBTaGFwZSB9IGZyb20gJy4vdHlwZXMvU2hhcGUnO1xyXG5jb25zdCBzdHJlYW1Ub01vbmdvREIgPSByZXF1aXJlKCdzdHJlYW0tdG8tbW9uZ28tZGInKS5zdHJlYW1Ub01vbmdvREI7XHJcbmNvbnN0IHNwbGl0ID0gcmVxdWlyZSgnc3BsaXQnKTtcclxuZXhwb3J0IGNsYXNzIERhdGFiYXNlIHtcclxuICBcclxuICBwcml2YXRlIHN0YXRpYyBpbnN0YW5jZSA6IERhdGFiYXNlO1xyXG4gIFxyXG4gIHByaXZhdGUgZGIgOiBDb25uZWN0aW9uO1xyXG4gIHByaXZhdGUgbW9uZ29vc2UgOiBNb25nb29zZTtcclxuICBwcml2YXRlIHZlaGljbGVTY2hlbWEgOiBTY2hlbWE7XHJcbiAgcHJpdmF0ZSB0cmlwc1NjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIHJvdXRlc1NjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIHNoYXBlc1NjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIHZlaGljbGVNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIHRyaXBNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIHJvdXRlc01vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgc2hhcGVzTW9kZWwgOiB0eXBlb2YgTW9kZWw7XHJcbiAgcHJpdmF0ZSBvdXRwdXREQkNvbmZpZztcclxuXHJcbiAgcHVibGljIHN0YXRpYyBnZXRJbnN0YW5jZSgpOiBEYXRhYmFzZSB7XHJcbiAgICBpZighRGF0YWJhc2UuaW5zdGFuY2UpXHJcbiAgICAgIERhdGFiYXNlLmluc3RhbmNlID0gbmV3IERhdGFiYXNlKCk7XHJcblxyXG4gICAgcmV0dXJuIERhdGFiYXNlLmluc3RhbmNlO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEluaXQoKSB7XHJcbiAgICBjb25zdCB1cmwgOiBzdHJpbmcgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkw7XHJcbiAgICBjb25zdCBuYW1lIDogc3RyaW5nID0gcHJvY2Vzcy5lbnYuREFUQUJBU0VfTkFNRTtcclxuXHJcbiAgICB0aGlzLm1vbmdvb3NlID0gbmV3IE1vbmdvb3NlKCk7XHJcbiAgICBcclxuICAgIHRoaXMubW9uZ29vc2Uuc2V0KCd1c2VGaW5kQW5kTW9kaWZ5JywgZmFsc2UpXHJcblxyXG4gICAgaWYoIXVybCAmJiAhbmFtZSkgdGhyb3cgKGBJbnZhbGlkIFVSTCBvciBuYW1lIGdpdmVuLCByZWNlaXZlZDogXFxuIE5hbWU6ICR7bmFtZX0gXFxuIFVSTDogJHt1cmx9YClcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgQ29ubmVjdGluZyB0byBkYXRhYmFzZSB3aXRoIG5hbWU6ICR7bmFtZX0gYXQgdXJsOiAke3VybH1gKVxyXG4gICAgdGhpcy5tb25nb29zZS5jb25uZWN0KGAke3VybH0vJHtuYW1lfWAsIHtcclxuICAgICAgdXNlTmV3VXJsUGFyc2VyOiB0cnVlLFxyXG4gICAgICB1c2VVbmlmaWVkVG9wb2xvZ3k6IHRydWUsXHJcbiAgICAgIHBvb2xTaXplOiAxMjBcclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy5kYiA9IHRoaXMubW9uZ29vc2UuY29ubmVjdGlvbjtcclxuXHJcbiAgICB0aGlzLm91dHB1dERCQ29uZmlnID0geyBkYlVSTCA6IGAke3VybH0vJHtuYW1lfWAsIGNvbGxlY3Rpb24gOiAndHJpcHMnIH07XHJcblxyXG4gICAgdGhpcy5kYi5vbignZXJyb3InLCBlcnJvciA9PiB7XHJcbiAgICAgIHRocm93IG5ldyBlcnJvcihgRXJyb3IgY29ubmVjdGluZyB0byBkYXRhYmFzZS4gJHtlcnJvcn1gKTtcclxuICAgIH0pXHJcblxyXG4gICAgYXdhaXQgdGhpcy5EYXRhYmFzZUxpc3RlbmVyKCk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgR2V0RGF0YWJhc2UoKSA6IENvbm5lY3Rpb24ge1xyXG4gICAgcmV0dXJuIHRoaXMuZGI7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgRGF0YWJhc2VMaXN0ZW5lciAoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XHJcbiAgICAgICAgdGhpcy5kYi5vbmNlKFwib3BlblwiLCAoKSA9PiB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvbm5lY3Rpb24gdG8gZGF0YWJhc2UgZXN0YWJsaXNoZWQuXCIpXHJcblxyXG4gICAgICAgICAgdGhpcy52ZWhpY2xlU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgY29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICBwbGFubmluZ051bWJlcjogU3RyaW5nLFxyXG4gICAgICAgICAgICBqb3VybmV5TnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogTnVtYmVyLFxyXG4gICAgICAgICAgICB2ZWhpY2xlTnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBbTnVtYmVyLCBOdW1iZXJdLFxyXG4gICAgICAgICAgICBzdGF0dXM6IFN0cmluZyxcclxuICAgICAgICAgICAgcHVuY3R1YWxpdHk6IEFycmF5LFxyXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IE51bWJlcixcclxuICAgICAgICAgICAgdXBkYXRlZEF0OiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHVwZGF0ZWRUaW1lczogQXJyYXlcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICB0aGlzLnRyaXBzU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgY29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHNlcnZpY2VJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB0cmlwSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgdHJpcE51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICB0cmlwUGxhbm5pbmdOdW1iZXI6IFN0cmluZyxcclxuICAgICAgICAgICAgdHJpcEhlYWRzaWduOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHRyaXBOYW1lOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIGRpcmVjdGlvbklkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHNoYXBlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgd2hlZWxjaGFpckFjY2Vzc2libGU6IE51bWJlclxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLnJvdXRlc1NjaGVtYSA9IG5ldyB0aGlzLm1vbmdvb3NlLlNjaGVtYSh7XHJcbiAgICAgICAgICAgIHJvdXRlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgY29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICBzdWJDb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlU2hvcnROYW1lOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlTG9uZ05hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVEZXNjcmlwdGlvbjogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZVR5cGU6IE51bWJlcixcclxuICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgdGhpcy5zaGFwZXNTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICBzaGFwZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHNoYXBlU2VxdWVuY2VOdW1iZXI6IE51bWJlcixcclxuICAgICAgICAgICAgUG9zaXRpb246IFtOdW1iZXIsIE51bWJlcl0sXHJcbiAgICAgICAgICAgIERpc3RhbmNlU2luY2VMYXN0UG9pbnQ6IE51bWJlclxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLnRyaXBzU2NoZW1hLmluZGV4KHsgdHJpcE51bWJlcjogLTEsIHRyaXBQbGFubmluZ051bWJlcjogLTEsIGNvbXBhbnk6IC0xIH0pXHJcbiAgICAgICAgICB0aGlzLnNoYXBlc1NjaGVtYS5pbmRleCh7IHNoYXBlSWQ6IC0xIH0pXHJcblxyXG4gICAgICAgICAgdGhpcy52ZWhpY2xlTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwiVmVoaWNsZVBvc2l0aW9uc1wiLCB0aGlzLnZlaGljbGVTY2hlbWEpO1xyXG4gICAgICAgICAgdGhpcy50cmlwTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwidHJpcHNcIiwgdGhpcy50cmlwc1NjaGVtYSk7XHJcbiAgICAgICAgICB0aGlzLnJvdXRlc01vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcInJvdXRlc1wiLCB0aGlzLnJvdXRlc1NjaGVtYSk7XHJcbiAgICAgICAgICB0aGlzLnNoYXBlc01vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcInNoYXBlc1wiLCB0aGlzLnNoYXBlc1NjaGVtYSk7XHJcblxyXG4gICAgICAgICAgdGhpcy50cmlwTW9kZWwuY3JlYXRlSW5kZXhlcygpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZXMoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSlcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRBbGxWZWhpY2xlcyAoYXJncyA9IHt9KSA6IFByb21pc2U8QXJyYXk8VmVoaWNsZURhdGE+PiB7XHJcbiAgICByZXR1cm4gYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZCh7Li4uYXJnc30sIHsgcHVuY3R1YWxpdHk6IDAsIHVwZGF0ZWRUaW1lczogMCwgX192IDogMCB9KTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRWZWhpY2xlICh2ZWhpY2xlTnVtYmVyLCB0cmFuc3BvcnRlciwgZmlyc3RPbmx5IDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8VmVoaWNsZURhdGE+IHtcclxuICAgIHJldHVybiB7IFxyXG4gICAgICAuLi5hd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kT25lKHtcclxuICAgICAgICB2ZWhpY2xlTnVtYmVyIDogdmVoaWNsZU51bWJlcixcclxuICAgICAgICBjb21wYW55OiB0cmFuc3BvcnRlclxyXG4gICAgICB9KVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBWZWhpY2xlRXhpc3RzKHZlaGljbGVOdW1iZXIsIHRyYW5zcG9ydGVyKSA6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuR2V0VmVoaWNsZSh2ZWhpY2xlTnVtYmVyLCB0cmFuc3BvcnRlcikgIT09IG51bGw7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgVXBkYXRlVmVoaWNsZSAodmVoaWNsZVRvVXBkYXRlIDogYW55LCB1cGRhdGVkVmVoaWNsZURhdGEgOiBWZWhpY2xlRGF0YSwgcG9zaXRpb25DaGVja3MgOiBib29sZWFuID0gZmFsc2UpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZighdmVoaWNsZVRvVXBkYXRlW1wiX2RvY1wiXSkgcmV0dXJuXHJcblxyXG4gICAgdmVoaWNsZVRvVXBkYXRlID0gdmVoaWNsZVRvVXBkYXRlW1wiX2RvY1wiXTtcclxuICAgIFxyXG4gICAgLy9NZXJnZSB0aGUgcHVuY3R1YWxpdGllcyBvZiB0aGUgb2xkIHZlaGljbGVEYXRhIHdpdGggdGhlIG5ldyBvbmUuXHJcbiAgICB1cGRhdGVkVmVoaWNsZURhdGEucHVuY3R1YWxpdHkgPSB2ZWhpY2xlVG9VcGRhdGUucHVuY3R1YWxpdHkuY29uY2F0KHVwZGF0ZWRWZWhpY2xlRGF0YS5wdW5jdHVhbGl0eSk7XHJcblxyXG4gICAgLy9NZXJnZSB0aGUgdXBkYXRlZCB0aW1lcyBvZiB0aGUgb2xkIHZlaGljbGVEYXRhIHdpdGggdGhlIG5ldyBvbmUuXHJcbiAgICB1cGRhdGVkVmVoaWNsZURhdGEudXBkYXRlZFRpbWVzID0gdmVoaWNsZVRvVXBkYXRlLnVwZGF0ZWRUaW1lcy5jb25jYXQodXBkYXRlZFZlaGljbGVEYXRhLnVwZGF0ZWRUaW1lcyk7XHJcblxyXG4gICAgaWYocG9zaXRpb25DaGVja3MgJiYgdXBkYXRlZFZlaGljbGVEYXRhLnN0YXR1cyAhPT0gdmVoaWNsZVN0YXRlLk9OUk9VVEUpXHJcbiAgICAgIHVwZGF0ZWRWZWhpY2xlRGF0YS5wb3NpdGlvbiA9IHZlaGljbGVUb1VwZGF0ZS5wb3NpdGlvbjtcclxuXHJcbiAgICB1cGRhdGVkVmVoaWNsZURhdGEudXBkYXRlZEF0ID0gRGF0ZS5ub3coKTsgIFxyXG5cclxuICAgIGF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmRPbmVBbmRVcGRhdGUodmVoaWNsZVRvVXBkYXRlLCB1cGRhdGVkVmVoaWNsZURhdGEpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEFkZFZlaGljbGUgKHZlaGljbGUgOiBWZWhpY2xlRGF0YSwgb25seUFkZFdoaWxlT25Sb3V0ZSA6IGJvb2xlYW4pIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZihvbmx5QWRkV2hpbGVPblJvdXRlICYmIHZlaGljbGUuc3RhdHVzICE9PSB2ZWhpY2xlU3RhdGUuT05ST1VURSkgcmV0dXJuO1xyXG4gICAgbmV3IHRoaXMudmVoaWNsZU1vZGVsKHtcclxuICAgICAgLi4udmVoaWNsZSxcclxuICAgICAgcHVuY3R1YWxpdHkgOiB2ZWhpY2xlLnB1bmN0dWFsaXR5XHJcbiAgICB9KS5zYXZlKGVycm9yID0+IHtcclxuICAgICAgaWYoZXJyb3IpIGNvbnNvbGUuZXJyb3IoYFNvbWV0aGluZyB3ZW50IHdyb25nIHdoaWxlIHRyeWluZyB0byBhZGQgdmVoaWNsZTogJHt2ZWhpY2xlLnZlaGljbGVOdW1iZXJ9LiBFcnJvcjogJHtlcnJvcn1gKVxyXG4gICAgfSlcclxuICB9XHJcbiAgXHJcbiAgcHVibGljIGFzeW5jIFJlbW92ZVZlaGljbGUgKHZlaGljbGUgOiBWZWhpY2xlRGF0YSkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKCF2ZWhpY2xlW1wiX2RvY1wiXSkgcmV0dXJuXHJcblxyXG4gICAgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZUFuZERlbGV0ZSh2ZWhpY2xlKVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFJlbW92ZVZlaGljbGVzV2hlcmUoIHBhcmFtcyA6IG9iamVjdCwgZG9Mb2dnaW5nIDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8QXJyYXk8VmVoaWNsZURhdGE+PiB7XHJcbiAgICBjb25zdCByZW1vdmVkVmVoaWNsZXMgOiBBcnJheTxWZWhpY2xlRGF0YT4gPSBhd2FpdCB0aGlzLkdldEFsbFZlaGljbGVzKHBhcmFtcyk7XHJcbiAgICB0aGlzLnZlaGljbGVNb2RlbC5kZWxldGVNYW55KHBhcmFtcykudGhlbihyZXNwb25zZSA9PiB7XHJcbiAgICAgIGlmKGRvTG9nZ2luZykgY29uc29sZS5sb2coYERlbGV0ZWQgJHtyZXNwb25zZS5kZWxldGVkQ291bnR9IHZlaGljbGVzLmApO1xyXG4gICAgICBcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHJlbW92ZWRWZWhpY2xlcztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRUcmlwcyhwYXJhbXMgOiBvYmplY3QgPSB7fSkgOiBQcm9taXNlPEFycmF5PFRyaXA+PiB7XHJcbiAgICByZXR1cm4gYXdhaXQgdGhpcy50cmlwTW9kZWwuZmluZChwYXJhbXMpXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0VHJpcCh0cmlwTnVtYmVyIDogbnVtYmVyLCB0cmlwUGxhbm5pbmdOdW1iZXIgOiBzdHJpbmcsIGNvbXBhbnk6IHN0cmluZykge1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy50cmlwTW9kZWwuZmluZE9uZSh7XHJcbiAgICAgIGNvbXBhbnk6IGNvbXBhbnksXHJcbiAgICAgIHRyaXBOdW1iZXIgOiB0cmlwTnVtYmVyLFxyXG4gICAgICB0cmlwUGxhbm5pbmdOdW1iZXI6IHRyaXBQbGFubmluZ051bWJlclxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3BvbnNlICE9PSBudWxsID8gcmVzcG9uc2UgOiB7fTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBSZW1vdmVUcmlwKHBhcmFtcyA6IG9iamVjdCA9IHt9LCBkb0xvZ2dpbmcgOiBib29sZWFuID0gZmFsc2UpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLnRyaXBNb2RlbC5kZWxldGVNYW55KHBhcmFtcykudGhlbihyZXNwb25zZSA9PiB7XHJcbiAgICAgIGlmKGRvTG9nZ2luZykgY29uc29sZS5sb2coYERlbGV0ZWQgJHtyZXNwb25zZS5kZWxldGVkQ291bnR9IHRyaXBzYCk7XHJcbiAgICB9KVxyXG4gIH1cclxuICAvKipcclxuICAgKiBJbnNlcnRzIG1hbnkgdHJpcHMgYXQgb25jZSBpbnRvIHRoZSBkYXRhYmFzZS5cclxuICAgKiBAcGFyYW0gdHJpcHMgVGhlIHRyaXBzIHRvIGFkZC5cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgSW5zZXJ0TWFueVRyaXBzKHRyaXBzKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICBhd2FpdCB0aGlzLnRyaXBNb2RlbC5pbnNlcnRNYW55KHRyaXBzLCB7IG9yZGVyZWQ6IGZhbHNlIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIFwiS29wcGVsdmxhayA3IGFuZCA4IHR1cmJvXCIgZmlsZXMgdG8gZGF0YWJhc2UuXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIEluc2VydFRyaXAodHJpcCA6IFRyaXApIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBuZXcgdGhpcy50cmlwTW9kZWwodHJpcCkuc2F2ZShlcnJvciA9PiB7XHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGBTb21ldGhpbmcgd2VudCB3cm9uZyB3aGlsZSB0cnlpbmcgdG8gYWRkIHRyaXA6ICR7dHJpcC50cmlwSGVhZHNpZ259LiBFcnJvcjogJHtlcnJvcn1gKVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBEcm9wVHJpcHNDb2xsZWN0aW9uKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGluZyB0cmlwcyBjb2xsZWN0aW9uXCIpO1xyXG4gICAgYXdhaXQgdGhpcy50cmlwTW9kZWwucmVtb3ZlKHt9KTtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBlZCB0cmlwcyBjb2xsZWN0aW9uXCIpO1xyXG4gIH1cclxuICBwdWJsaWMgYXN5bmMgRHJvcFJvdXRlc0NvbGxlY3Rpb24oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwaW5nIHJvdXRlcyBjb2xsZWN0aW9uXCIpO1xyXG4gICAgYXdhaXQgdGhpcy5yb3V0ZXNNb2RlbC5yZW1vdmUoe30pO1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGVkIHJvdXRlcyBjb2xsZWN0aW9uXCIpO1xyXG4gIH1cclxuICBwdWJsaWMgYXN5bmMgRHJvcFNoYXBlc0NvbGxlY3Rpb24oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwaW5nIHNoYXBlcyBjb2xsZWN0aW9uXCIpO1xyXG4gICAgYXdhaXQgdGhpcy5zaGFwZXNNb2RlbC5yZW1vdmUoe30pO1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGVkIHNoYXBlcyBjb2xsZWN0aW9uXCIpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFJvdXRlKHJvdXRlSWQgOiBudW1iZXIpIDogUHJvbWlzZTxSb3V0ZT4ge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnJvdXRlc01vZGVsLmZpbmRPbmUoe1xyXG4gICAgICByb3V0ZUlkIDogcm91dGVJZCxcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiByZXNwb25zZSAhPT0gbnVsbCA/IHJlc3BvbnNlIDoge307XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0U2hhcGUoc2hhcGVJZCA6IG51bWJlcikgOiBQcm9taXNlPEFycmF5PFNoYXBlPj4ge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnNoYXBlc01vZGVsLmZpbmQoe1xyXG4gICAgICBzaGFwZUlkIDogc2hhcGVJZCxcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiByZXNwb25zZSAhPT0gW10gPyByZXNwb25zZSA6IFtdO1xyXG4gIH1cclxuXHJcbiAgLy8gcHVibGljIGFzeW5jIEFkZFJvdXRlKClcclxuXHJcbn1cclxuIiwiLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgICAgQVBQIENPTkZJR1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuXHJcbmltcG9ydCAqIGFzIGRvdGVudiBmcm9tICdkb3RlbnYnO1xyXG5kb3RlbnYuY29uZmlnKCk7XHJcblxyXG5jb25zdCBwb3J0ID0gcHJvY2Vzcy5lbnYuUE9SVCB8fCAzMDAxO1xyXG5cclxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgICAgWUFSTiBJTVBPUlRTXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5pbXBvcnQgKiBhcyBodHRwcyBmcm9tICdodHRwcyc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuXHJcbmNvbnN0IGV4cHJlc3MgPSByZXF1aXJlKFwiZXhwcmVzc1wiKTtcclxuY29uc3QgY29ycyA9IHJlcXVpcmUoXCJjb3JzXCIpO1xyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgQ1VTVE9NIElNUE9SVFNcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcblxyXG5pbXBvcnQgeyBEYXRhYmFzZSB9IGZyb20gJy4vZGF0YWJhc2UnO1xyXG5pbXBvcnQgeyBXZWJTZXJ2ZXIgfSBmcm9tICcuL3dlYnNlcnZlcic7XHJcbmltcG9ydCB7IEJ1c0xvZ2ljIH0gZnJvbSAnLi9idXNsb2dpYyc7XHJcbmltcG9ydCB7IERvd25sb2FkZXIgfSBmcm9tICcuL2Rvd25sb2FkZXInO1xyXG5cclxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgICAgU1NMIENPTkZJR1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuY29uc3QgcHJpdmF0ZUtleSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUva2V5LmtleVwiKS50b1N0cmluZygpO1xyXG5jb25zdCBjZXJ0aWZpY2F0ZSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUvY2VydC5jcnRcIikudG9TdHJpbmcoKTtcclxuY29uc3QgY2EgPSBmcy5yZWFkRmlsZVN5bmMoXCIuL2NlcnRpZmljYXRlL2tleS1jYS5jcnRcIikudG9TdHJpbmcoKTtcclxuXHJcbmNvbnN0IEFwcEluaXQgPSBhc3luYyAoKSA9PiB7XHJcbiAgY29uc3QgZGIgPSBhd2FpdCBEYXRhYmFzZS5nZXRJbnN0YW5jZSgpLkluaXQoKS50aGVuKCk7XHJcbiAgY29uc3QgYXBwID0gKG1vZHVsZS5leHBvcnRzID0gZXhwcmVzcygpKTtcclxuXHJcbiAgY29uc3Qgc2VydmVyID0gaHR0cHMuY3JlYXRlU2VydmVyKFxyXG4gICAge1xyXG4gICAgICBrZXk6IHByaXZhdGVLZXksXHJcbiAgICAgIGNlcnQ6IGNlcnRpZmljYXRlLFxyXG4gICAgICBjYTogY2EsXHJcbiAgICAgIHJlcXVlc3RDZXJ0OiB0cnVlLFxyXG4gICAgICByZWplY3RVbmF1dGhvcml6ZWQ6IGZhbHNlLFxyXG4gICAgfSxcclxuICAgIGFwcFxyXG4gICk7XHJcbiAgXHJcblxyXG4gIC8vVEhJUyBJUyBOT1QgU0FGRVxyXG5cclxuICBjb25zdCBjb3JzT3B0aW9ucyA9IHtcclxuICAgIG9yaWdpbjogJyonLFxyXG4gICAgb3B0aW9uc1N1Y2Nlc3NTdGF0dXM6IDIwMFxyXG4gIH1cclxuXHJcbiAgYXBwLnVzZShjb3JzKGNvcnNPcHRpb25zKSlcclxuICBhcHAub3B0aW9ucygnKicsIGNvcnMoKSlcclxuXHJcblxyXG4gIG5ldyBXZWJTZXJ2ZXIoYXBwLCBkYik7XHJcbiAgY29uc3QgYnVzTG9naWMgPSBuZXcgQnVzTG9naWMoZGIsIHRydWUpO1xyXG4gIC8vbmV3IERvd25sb2FkZXIoZGIpO1xyXG4gIC8vYnVzTG9naWMuSW5pdEtWNzgoKTtcclxuICBcclxuICBzZXJ2ZXIubGlzdGVuKHBvcnQsICgpID0+IGNvbnNvbGUubG9nKGBMaXN0ZW5pbmcgYXQgaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9YCkpO1xyXG5cclxufVxyXG5cclxuQXBwSW5pdCgpO1xyXG4iLCJleHBvcnQgZW51bSB2ZWhpY2xlU3RhdGUge1xyXG4gIE9OUk9VVEUgPSAnT05ST1VURScsXHJcbiAgT0ZGUk9VVEUgPSAnT0ZGUk9VVEUnLFxyXG4gIEVORCA9IFwiRU5EXCIsXHJcbiAgREVQQVJUVVJFID0gJ0RFUEFSVFVSRScsXHJcbiAgSU5JVCA9ICdJTklUJyxcclxuICBERUxBWSA9ICdERUxBWScsXHJcbiAgT05TVE9QID0gJ09OU1RPUCcsXHJcbiAgQVJSSVZBTCA9ICdBUlJJVkFMJ1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFZlaGljbGVEYXRhIHtcclxuICBjb21wYW55OiBzdHJpbmcsXHJcbiAgcGxhbm5pbmdOdW1iZXI6IHN0cmluZyxcclxuICBqb3VybmV5TnVtYmVyOiBudW1iZXIsXHJcbiAgdGltZXN0YW1wOiBudW1iZXIsXHJcbiAgdmVoaWNsZU51bWJlcjogbnVtYmVyLFxyXG4gIHBvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdLFxyXG4gIHN0YXR1czogdmVoaWNsZVN0YXRlLFxyXG4gIGNyZWF0ZWRBdDogbnVtYmVyLFxyXG4gIHVwZGF0ZWRBdDogbnVtYmVyLFxyXG4gIHB1bmN0dWFsaXR5OiBBcnJheTxudW1iZXI+LFxyXG4gIHVwZGF0ZWRUaW1lczogQXJyYXk8bnVtYmVyPlxyXG59XHJcbiIsImltcG9ydCB7IERhdGFiYXNlIH0gZnJvbSBcIi4vZGF0YWJhc2VcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBXZWJTZXJ2ZXIge1xyXG5cclxuICBwcml2YXRlIGFwcDtcclxuICBwcml2YXRlIGRhdGFiYXNlIDogRGF0YWJhc2U7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGFwcCwgZGF0YWJhc2UgOiBEYXRhYmFzZSkge1xyXG4gICAgdGhpcy5hcHAgPSBhcHA7XHJcbiAgICB0aGlzLmRhdGFiYXNlID0gZGF0YWJhc2U7XHJcbiAgICB0aGlzLkluaXRpYWxpemUoKTtcclxuICB9XHJcblxyXG4gIEluaXRpYWxpemUoKSB7XHJcbiAgICB0aGlzLmFwcC5nZXQoXCIvXCIsIChyZXEsIHJlcykgPT4gcmVzLnNlbmQoXCJUaGlzIGlzIHRoZSBBUEkgZW5kcG9pbnQgZm9yIHRoZSBUQUlPVkEgYXBwbGljYXRpb24uXCIpKTtcclxuXHJcbiAgICB0aGlzLmFwcC5nZXQoXCIvYnVzc2VzXCIsIGFzeW5jIChyZXEsIHJlcykgPT4gcmVzLnNlbmQoXHJcbiAgICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0QWxsVmVoaWNsZXMoKVxyXG4gICAgKSlcclxuXHJcbiAgICB0aGlzLmFwcC5nZXQoXCIvYnVzc2VzLzpjb21wYW55LzpudW1iZXJcIiwgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFZlaGljbGUocmVxLnBhcmFtcy5udW1iZXIsIHJlcS5wYXJhbXMuY29tcGFueSwgdHJ1ZSk7XHJcbiAgICAgIGlmKE9iamVjdC5rZXlzKHJlc3VsdCkubGVuZ3RoID4gMCkgcmVzLnNlbmQocmVzdWx0W1wiX2RvY1wiXSk7XHJcbiAgICAgIGVsc2UgcmVzLnNlbmQoe30pXHJcbiAgICAgfSlcclxuICAgIFxyXG5cclxuICAgIHRoaXMuYXBwLmdldChcIi90cmlwLzpjb21wYW55LzpwbGFubmluZ251bWJlci86dHJpcG51bWJlclwiLCBhc3luYyhyZXEsIHJlcykgPT4ge1xyXG4gICAgICByZXMuc2VuZChhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFRyaXAocmVxLnBhcmFtcy50cmlwbnVtYmVyLCByZXEucGFyYW1zLnBsYW5uaW5nbnVtYmVyLCByZXEucGFyYW1zLmNvbXBhbnkpKTtcclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy5hcHAuZ2V0KFwiL3JvdXRlLzpyb3V0ZW51bWJlclwiLCBhc3luYyhyZXEsIHJlcykgPT4ge1xyXG4gICAgICByZXMuc2VuZChhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFJvdXRlKHJlcS5wYXJhbXMucm91dGVudW1iZXIpKTtcclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy5hcHAuZ2V0KFwiL3NoYXBlLzpzaGFwZW51bWJlclwiLCBhc3luYyhyZXEsIHJlcykgPT4ge1xyXG4gICAgICByZXMuc2VuZChhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFNoYXBlKHJlcS5wYXJhbXMuc2hhcGVudW1iZXIpKTtcclxuICAgIH0pXHJcbiAgfVxyXG59IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiY2hpbGRfcHJvY2Vzc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiY29yc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZG90ZW52XCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJleHByZXNzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJmc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiaHR0cHNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIm1vbmdvb3NlXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJwYXRoXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzcGxpdFwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwic3RyZWFtLXRvLW1vbmdvLWRiXCIpOzsiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gc3RhcnR1cFxuLy8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4vLyBUaGlzIGVudHJ5IG1vZHVsZSBpcyByZWZlcmVuY2VkIGJ5IG90aGVyIG1vZHVsZXMgc28gaXQgY2FuJ3QgYmUgaW5saW5lZFxudmFyIF9fd2VicGFja19leHBvcnRzX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKFwiLi9zcmMvbWFpbi50c1wiKTtcbiJdLCJzb3VyY2VSb290IjoiIn0=