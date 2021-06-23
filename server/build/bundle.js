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
                this.shapesSchema = new this.mongoose.Schema({
                    shapeId: Number,
                    shapeSequenceNumber: Number,
                    Position: [Number, Number],
                    DistanceSinceLastPoint: Number
                });
                this.drivenRoutesSchema = new this.mongoose.Schema({
                    tripId: Number,
                    company: String,
                    positions: Array,
                    updatedTimes: Array
                });
                this.tripsSchema.index({ tripNumber: -1, tripPlanningNumber: -1, company: -1 });
                this.routesSchema.index({ company: -1, subCompany: -1, routeShortName: -1, routeLongName: -1 });
                this.shapesSchema.index({ shapeId: -1 });
                this.drivenRoutesSchema.index({ tripId: -1, company: -1 });
                this.vehicleModel = this.mongoose.model("VehiclePositions", this.vehicleSchema);
                this.tripModel = this.mongoose.model("trips", this.tripsSchema);
                this.routesModel = this.mongoose.model("routes", this.routesSchema);
                this.shapesModel = this.mongoose.model("shapes", this.shapesSchema);
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
            lineNUmber: 0,
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
                v: res.vehicleNumber
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
    async RemoveVehiclesWhere(params, doLogging = false) {
        const removedVehicles = await this.GetAllVehicles(params);
        this.vehicleModel.deleteMany(params).then(response => {
            if (doLogging)
                console.log(`Deleted ${response.deletedCount} vehicles.`);
        });
        return removedVehicles;
    }
    async GetTrip(tripNumber, tripPlanningNumber, company) {
        const response = await this.tripModel.findOne({
            company: company,
            tripNumber: tripNumber,
            tripPlanningNumber: tripPlanningNumber
        });
        return response !== null ? response : {};
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
    async GetTripPositions(tripId, company) {
        return await this.drivenRoutesModel.findOne({
            tripId: tripId,
            company: company,
        });
    }
    async GetRoutesByString(query) {
        return await this.routesModel.find({
            $or: [
                { routeLongName: new RegExp(query, 'i') },
                { company: new RegExp(query, 'i') }, { subCompany: new RegExp(query, 'i') },
                { routeShortName: query }
            ]
        });
    }
    async GetVehiclesByRouteId(routeId) {
        return await this.vehicleModel.find({
            currentRouteId: routeId
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

/***/ "./src/searchhandler.ts":
/*!******************************!*\
  !*** ./src/searchhandler.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SearchHandler = void 0;
class SearchHandler {
    constructor(db) {
        this.Init();
        this.database = db;
    }
    async Init() {
    }
    async SearchForEverything(searchString, limit) {
        // const priorities = {
        //   ROUTE : 10,
        //   TRIP : 5,
        //   COMPANY: 1
        // }
        const seperateTerms = searchString.split(" ");
        const firstTerm = seperateTerms[0];
        const foundRoutesByFirstTerm = await this.GetRoutes(firstTerm);
        const foundRoutesByTerms = [];
        foundRoutesByFirstTerm.forEach(route => {
            let foundTerms = 0;
            seperateTerms.forEach(term => {
                if (route.routeLongName.toLowerCase().includes(term.toLowerCase()) || route.routeShortName.toLowerCase().includes(term.toLowerCase()) || route.subCompany.toLowerCase().includes(term.toLowerCase()) || route.company.toLowerCase().includes(term.toLowerCase()))
                    foundTerms++;
            });
            if (foundTerms == seperateTerms.length)
                foundRoutesByTerms.push(route);
        });
        return foundRoutesByTerms.slice(0, limit);
    }
    async GetRoutes(searchString) {
        const foundRoutes = await this.database.GetRoutesByString(searchString);
        return foundRoutes;
    }
    SearchForTripSign(searchString) {
    }
    async SearchForVehicleByRoute(routeId) {
        return this.database.GetVehiclesByRouteId(routeId);
    }
}
exports.SearchHandler = SearchHandler;


/***/ }),

/***/ "./src/webserver.ts":
/*!**************************!*\
  !*** ./src/webserver.ts ***!
  \**************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WebServer = void 0;
const searchhandler_1 = __webpack_require__(/*! ./searchhandler */ "./src/searchhandler.ts");
class WebServer {
    constructor(app, database) {
        this.app = app;
        this.database = database;
        this.searchHandler = new searchhandler_1.SearchHandler(database);
        this.Initialize();
    }
    Initialize() {
        this.app.get("/", (req, res) => res.send("This is the API endpoint for the TAIOVA application."));
        this.app.get("/busses", async (req, res) => res.send(await this.database.GetAllVehiclesSmall()));
        this.app.get("/busses/:company/:number", async (req, res) => {
            try {
                const result = await this.database.GetVehicle(req.params.number, req.params.company, true);
                if (Object.keys(result).length > 0)
                    res.send(result["_doc"]);
                else
                    res.send({});
            }
            catch (error) {
                res.send(error.message);
            }
        });
        this.app.get("/busses/:routeId", async (req, res) => {
            try {
                res.send(await this.database.GetVehiclesByRouteId(req.params.routeId));
            }
            catch (error) {
                res.send(error.message);
            }
        });
        this.app.get("/trip/:company/:planningnumber/:tripnumber", async (req, res) => {
            try {
                res.send(await this.database.GetTrip(req.params.tripnumber, req.params.planningnumber, req.params.company));
            }
            catch (error) {
                res.send(error.message);
            }
        });
        this.app.get("/route/:routenumber", async (req, res) => {
            try {
                res.send(await this.database.GetRoute(req.params.routenumber));
            }
            catch (error) {
                res.send(error.message);
            }
        });
        this.app.get("/shape/:shapenumber", async (req, res) => {
            try {
                res.send(await this.database.GetShape(req.params.shapenumber));
            }
            catch (error) {
                res.send(error.message);
            }
        });
        this.app.get("/tripdata/:company/:tripId", async (req, res) => {
            try {
                const response = await this.database.GetTripPositions(req.params.tripId, req.params.company);
                const sortedPositions = response.positions.sort((a, b) => Math.sqrt(a[0] + a[1]) - Math.sqrt(a[0] + b[1]));
                response.positions = sortedPositions;
                res.send(response);
            }
            catch (error) {
                res.send(error.message);
            }
        });
        this.app.get("/search/:query/:limit", async (req, res) => {
            try {
                res.send(await this.searchHandler.SearchForEverything(req.params.query, req.params.limit));
            }
            catch (error) {
                res.send(error.message);
            }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvYnVzbG9naWMudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL2RhdGFiYXNlLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy9tYWluLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy9zZWFyY2hoYW5kbGVyLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy93ZWJzZXJ2ZXIudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiY2hpbGRfcHJvY2Vzc1wiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImNvcnNcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJkb3RlbnZcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJleHByZXNzXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiZnNcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJodHRwc1wiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcIm1vbmdvb3NlXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwicGF0aFwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcInNwbGl0XCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwic3RyZWFtLXRvLW1vbmdvLWRiXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3RhaW92YXNlcnZlci93ZWJwYWNrL3N0YXJ0dXAiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFQSx1REFBK0I7QUFDL0IsNkRBQXlCO0FBR3pCLGtGQUFxQztBQU1yQyxNQUFhLFFBQVE7SUFJ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QUNBQSxtQzs7Ozs7Ozs7OztBQ0FBLGdEOzs7Ozs7VUNBQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBOztVQUVBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBOzs7O1VDdEJBO1VBQ0E7VUFDQTtVQUNBIiwiZmlsZSI6ImJ1bmRsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IERhdGFiYXNlIH0gZnJvbSBcIi4vZGF0YWJhc2VcIjtcclxuaW1wb3J0IHsgVmVoaWNsZURhdGEsIHZlaGljbGVTdGF0ZSB9IGZyb20gXCIuL3R5cGVzL1ZlaGljbGVEYXRhXCI7XHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgeyBUcmlwIH0gZnJvbSBcIi4vdHlwZXMvVHJpcFwiO1xyXG5pbXBvcnQgeyBBcGlUcmlwIH0gZnJvbSBcIi4vdHlwZXMvQXBpVHJpcFwiO1xyXG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XHJcbmltcG9ydCB7IFJvdXRlIH0gZnJvbSBcIi4vdHlwZXMvUm91dGVcIjtcclxuaW1wb3J0IHsgQXBpUm91dGUgfSBmcm9tIFwiLi90eXBlcy9BcGlSb3V0ZVwiO1xyXG5pbXBvcnQgeyBBcGlTaGFwZSB9IGZyb20gXCIuL3R5cGVzL0FwaVNoYXBlXCI7XHJcbmltcG9ydCB7IFNoYXBlIH0gZnJvbSBcIi4vdHlwZXMvU2hhcGVcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBCdXNMb2dpYyB7XHJcblxyXG4gIHByaXZhdGUgZGF0YWJhc2UgOiBEYXRhYmFzZTtcclxuXHJcbiAgY29uc3RydWN0b3IoZGF0YWJhc2UsIGRvSW5pdCA6IGJvb2xlYW4gPSBmYWxzZSkge1xyXG4gICAgdGhpcy5kYXRhYmFzZSA9IGRhdGFiYXNlO1xyXG5cclxuICAgIGlmKGRvSW5pdCkgdGhpcy5Jbml0aWFsaXplKCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIEluaXRpYWxpemUoKSB7XHJcbiAgICBhd2FpdCB0aGlzLkNsZWFyQnVzc2VzKCk7XHJcblxyXG4gICAgc2V0SW50ZXJ2YWwoYXN5bmMgKCkgPT4ge1xyXG4gICAgICBhd2FpdCB0aGlzLkNsZWFyQnVzc2VzKCk7XHJcbiAgICB9LCBwYXJzZUludChwcm9jZXNzLmVudi5BUFBfQ0xFQU5VUF9ERUxBWSkpXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDbGVhcnMgYnVzc2VzIGV2ZXJ5IFggYW1vdW50IG9mIG1pbnV0ZXMgc3BlY2lmaWVkIGluIC5lbnYgZmlsZS5cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgQ2xlYXJCdXNzZXMoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NMRUFOVVBfTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJDbGVhcmluZyBidXNzZXNcIilcclxuICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnN0IGZpZnRlZW5NaW51dGVzQWdvID0gY3VycmVudFRpbWUgLSAoNjAgKiBwYXJzZUludChwcm9jZXNzLmVudi5BUFBfQ0xFQU5VUF9WRUhJQ0xFX0FHRV9SRVFVSVJFTUVOVCkgKiAxMDAwKTtcclxuICAgIGNvbnN0IFJlbW92ZWRWZWhpY2xlcyA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuUmVtb3ZlVmVoaWNsZXNXaGVyZSh7IHVwZGF0ZWRBdDogeyAkbHQ6IGZpZnRlZW5NaW51dGVzQWdvIH0gfSwgcHJvY2Vzcy5lbnYuQVBQX0RPX0NMRUFOVVBfTE9HR0lORyA9PSBcInRydWVcIik7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgXCJLb3BwZWx2bGFrIDcgYW5kIDggdHVyYm9cIiBmaWxlcyB0byBkYXRhYmFzZS5cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgSW5pdEtWNzgoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdGhpcy5Jbml0VHJpcHNOZXcoKTtcclxuICAgIHRoaXMuSW5pdFJvdXRlcygpO1xyXG4gICAgdGhpcy5Jbml0U2hhcGVzKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgdHJpcHMgZnJvbSB0aGUgc3BlY2lmaWVkIFVSTCBpbiB0aGUgLmVudiAsIG9yIFwiLi4vR1RGUy9leHRyYWN0ZWQvdHJpcHMuanNvblwiIHRvIHRoZSBkYXRhYmFzZS5cclxuICAgKi9cclxuICBwcml2YXRlIEluaXRUcmlwc05ldygpIDogdm9pZCB7IFxyXG4gICAgY29uc3QgdHJpcHNQYXRoID0gcmVzb2x2ZShcIkdURlMvZXh0cmFjdGVkL3RyaXBzLnR4dC5qc29uXCIpO1xyXG4gICAgY29uc3Qgb3V0cHV0UGF0aCA9IHJlc29sdmUoXCJHVEZTL2NvbnZlcnRlZC90cmlwcy5qc29uXCIpO1xyXG4gICAgZnMucmVhZEZpbGUodHJpcHNQYXRoLCAndXRmOCcsIGFzeW5jKGVycm9yLCBkYXRhKSA9PiB7IFxyXG4gICAgICBpZihlcnJvcikgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgIGlmKGRhdGEgJiYgcHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJMb2FkZWQgdHJpcHMgZmlsZSBpbnRvIG1lbW9yeS5cIik7XHJcbiAgICAgIGRhdGEgPSBkYXRhLnRyaW0oKTtcclxuICAgICAgY29uc3QgbGluZXMgPSBkYXRhLnNwbGl0KFwiXFxuXCIpO1xyXG4gICAgICBjb25zdCB3cml0ZVN0cmVhbSA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG91dHB1dFBhdGgpXHJcbiAgICAgIGNvbnN0IGNvbnZlcnRlZFRyaXBzID0gW107XHJcblxyXG4gICAgICBmb3IobGV0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgICAgICBjb25zdCB0cmlwSlNPTiA6IEFwaVRyaXAgPSBKU09OLnBhcnNlKGxpbmUpO1xyXG4gICAgICAgIGNvbnN0IHJlYWxUaW1lVHJpcElkID0gdHJpcEpTT04ucmVhbHRpbWVfdHJpcF9pZC5zcGxpdChcIjpcIik7XHJcbiAgICAgICAgY29uc3QgY29tcGFueSA9IHJlYWxUaW1lVHJpcElkWzBdO1xyXG4gICAgICAgIGNvbnN0IHBsYW5uaW5nTnVtYmVyID0gcmVhbFRpbWVUcmlwSWRbMV07XHJcbiAgICAgICAgY29uc3QgdHJpcE51bWJlciA9IHJlYWxUaW1lVHJpcElkWzJdO1xyXG5cclxuICAgICAgICBjb25zdCB0cmlwIDogVHJpcCA9IHtcclxuICAgICAgICAgIGNvbXBhbnk6IGNvbXBhbnksXHJcbiAgICAgICAgICByb3V0ZUlkOiBwYXJzZUludCh0cmlwSlNPTi5yb3V0ZV9pZCksXHJcbiAgICAgICAgICBzZXJ2aWNlSWQ6IHBhcnNlSW50KHRyaXBKU09OLnNlcnZpY2VfaWQpLFxyXG4gICAgICAgICAgdHJpcElkOiBwYXJzZUludCh0cmlwSlNPTi50cmlwX2lkKSxcclxuICAgICAgICAgIHRyaXBOdW1iZXI6IHBhcnNlSW50KHRyaXBOdW1iZXIpLFxyXG4gICAgICAgICAgdHJpcFBsYW5uaW5nTnVtYmVyOiBwbGFubmluZ051bWJlcixcclxuICAgICAgICAgIHRyaXBIZWFkc2lnbjogdHJpcEpTT04udHJpcF9oZWFkc2lnbixcclxuICAgICAgICAgIHRyaXBOYW1lOiB0cmlwSlNPTi50cmlwX2xvbmdfbmFtZSxcclxuICAgICAgICAgIGRpcmVjdGlvbklkOiBwYXJzZUludCh0cmlwSlNPTi5kaXJlY3Rpb25faWQpLFxyXG4gICAgICAgICAgc2hhcGVJZDogcGFyc2VJbnQodHJpcEpTT04uc2hhcGVfaWQpLFxyXG4gICAgICAgICAgd2hlZWxjaGFpckFjY2Vzc2libGU6IHBhcnNlSW50KHRyaXBKU09OLndoZWVsY2hhaXJfYWNjZXNzaWJsZSlcclxuICAgICAgICB9XHJcbiAgICAgICAgd3JpdGVTdHJlYW0ud3JpdGUoSlNPTi5zdHJpbmdpZnkodHJpcCkgKyBcIlxcblwiKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgd3JpdGVTdHJlYW0uZW5kKGFzeW5jICgpID0+IHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkZpbmlzaGVkIHdyaXRpbmcgdHJpcHMgZmlsZSwgaW1wb3J0aW5nIHRvIGRhdGFiYXNlLlwiKTtcclxuICAgICAgICBhd2FpdCB0aGlzLkltcG9ydFRyaXBzKCk7XHJcbiAgICAgIH0pXHJcbiAgICB9KTtcclxuICAgXHJcbiAgICBcclxuICB9XHJcblxyXG4gIGFzeW5jIEltcG9ydFRyaXBzKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuRHJvcFRyaXBzQ29sbGVjdGlvbigpO1xyXG5cclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiSW1wb3J0aW5nIHRyaXBzIHRvIG1vbmdvZGJcIik7XHJcblxyXG4gICAgYXdhaXQgZXhlYyhcIm1vbmdvaW1wb3J0IC0tZGIgdGFpb3ZhIC0tY29sbGVjdGlvbiB0cmlwcyAtLWZpbGUgLi9HVEZTL2NvbnZlcnRlZC90cmlwcy5qc29uXCIsIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc3RkZXJyKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYHN0ZGVycjogJHtzdGRlcnJ9YCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhgc3Rkb3V0OiAke3N0ZG91dH1gKTtcclxuICAgIH0pO1xyXG5cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSByb3V0ZXMgZnJvbSB0aGUgc3BlY2lmaWVkIFVSTCBpbiB0aGUgLmVudiAsIG9yIFwiLi4vR1RGUy9leHRyYWN0ZWQvcm91dGVzLmpzb25cIiB0byB0aGUgZGF0YWJhc2UuXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBJbml0Um91dGVzICgpIHtcclxuICAgIGNvbnN0IHJvdXRlc1BhdGggPSByZXNvbHZlKFwiR1RGUy9leHRyYWN0ZWQvcm91dGVzLnR4dC5qc29uXCIpO1xyXG4gICAgY29uc3Qgb3V0cHV0UGF0aCA9IHJlc29sdmUoXCJHVEZTL2NvbnZlcnRlZC9yb3V0ZXMuanNvblwiKTtcclxuICAgIGZzLnJlYWRGaWxlKHJvdXRlc1BhdGgsICd1dGY4JywgYXN5bmMoZXJyb3IsIGRhdGEpID0+IHsgXHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgaWYoZGF0YSAmJiBwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkxvYWRlZCByb3V0ZXMgZmlsZSBpbnRvIG1lbW9yeS5cIik7XHJcbiAgICAgIGRhdGEgPSBkYXRhLnRyaW0oKTtcclxuICAgICAgY29uc3QgbGluZXMgPSBkYXRhLnNwbGl0KFwiXFxuXCIpO1xyXG4gICAgICBjb25zdCB3cml0ZVN0cmVhbSA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG91dHB1dFBhdGgpXHJcblxyXG4gICAgICBmb3IobGV0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgICAgICBjb25zdCByb3V0ZUpzb24gOiBBcGlSb3V0ZSA9IEpTT04ucGFyc2UobGluZSk7XHJcbiAgICAgICAgY29uc3QgY29tcGFueVNwbGl0ID0gcm91dGVKc29uLmFnZW5jeV9pZC5zcGxpdCgnOicpO1xyXG4gICAgICAgIGNvbnN0IHJvdXRlIDogUm91dGUgPSB7XHJcbiAgICAgICAgICByb3V0ZUlkOiBwYXJzZUludChyb3V0ZUpzb24ucm91dGVfaWQpLFxyXG4gICAgICAgICAgY29tcGFueTogY29tcGFueVNwbGl0WzBdLFxyXG4gICAgICAgICAgc3ViQ29tcGFueTogY29tcGFueVNwbGl0WzFdID8gY29tcGFueVNwbGl0WzFdIDogXCJOb25lXCIsXHJcbiAgICAgICAgICByb3V0ZVNob3J0TmFtZTogcm91dGVKc29uLnJvdXRlX3Nob3J0X25hbWUsXHJcbiAgICAgICAgICByb3V0ZUxvbmdOYW1lOiByb3V0ZUpzb24ucm91dGVfbG9uZ19uYW1lLFxyXG4gICAgICAgICAgcm91dGVEZXNjcmlwdGlvbjogcm91dGVKc29uLnJvdXRlX2Rlc2MsXHJcbiAgICAgICAgICByb3V0ZVR5cGU6IHBhcnNlSW50KHJvdXRlSnNvbi5yb3V0ZV90eXBlKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd3JpdGVTdHJlYW0ud3JpdGUoSlNPTi5zdHJpbmdpZnkocm91dGUpICsgXCJcXG5cIik7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHdyaXRlU3RyZWFtLmVuZCgoKSA9PiB7XHJcbiAgICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJGaW5pc2hlZCB3cml0aW5nIHJvdXRlcyBmaWxlLCBpbXBvcnRpbmcgdG8gZGF0YWJhc2UuXCIpO1xyXG4gICAgICAgIHRoaXMuSW1wb3J0Um91dGVzKCk7XHJcbiAgICAgIH0pXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGFzeW5jIEltcG9ydFJvdXRlcygpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLmRhdGFiYXNlLkRyb3BSb3V0ZXNDb2xsZWN0aW9uKCk7XHJcblxyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJJbXBvcnRpbmcgcm91dGVzIHRvIG1vbmdvZGJcIik7XHJcblxyXG4gICAgYXdhaXQgZXhlYyhcIm1vbmdvaW1wb3J0IC0tZGIgdGFpb3ZhIC0tY29sbGVjdGlvbiByb3V0ZXMgLS1maWxlIC4vR1RGUy9jb252ZXJ0ZWQvcm91dGVzLmpzb25cIiwgKGVycm9yLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzdGRlcnIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgc3RkZXJyOiAke3N0ZGVycn1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBzdGRvdXQ6ICR7c3Rkb3V0fWApO1xyXG4gICAgfSk7XHJcblxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHNoYXBlcyBmcm9tIHRoZSBzcGVjaWZpZWQgVVJMIGluIHRoZSAuZW52ICwgb3IgXCIuLi9HVEZTL2V4dHJhY3RlZC9yb3V0ZXMuanNvblwiIHRvIHRoZSBkYXRhYmFzZS5cclxuICAgKi9cclxuICAgcHJpdmF0ZSBJbml0U2hhcGVzICgpIHtcclxuICAgIGNvbnN0IHJvdXRlc1BhdGggPSByZXNvbHZlKFwiR1RGUy9leHRyYWN0ZWQvc2hhcGVzLnR4dC5qc29uXCIpO1xyXG4gICAgY29uc3Qgb3V0cHV0UGF0aCA9IHJlc29sdmUoXCJHVEZTL2NvbnZlcnRlZC9zaGFwZXMuanNvblwiKTtcclxuICAgIGZzLnJlYWRGaWxlKHJvdXRlc1BhdGgsICd1dGY4JywgYXN5bmMoZXJyb3IsIGRhdGEpID0+IHsgXHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgaWYoZGF0YSAmJiBwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkxvYWRlZCBzaGFwZXMgZmlsZSBpbnRvIG1lbW9yeS5cIik7XHJcbiAgICAgIGRhdGEgPSBkYXRhLnRyaW0oKTtcclxuICAgICAgY29uc3QgbGluZXMgPSBkYXRhLnNwbGl0KFwiXFxuXCIpO1xyXG4gICAgICBjb25zdCB3cml0ZVN0cmVhbSA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG91dHB1dFBhdGgpXHJcblxyXG4gICAgICBmb3IobGV0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgICAgICBjb25zdCBzaGFwZUpzb24gOiBBcGlTaGFwZSA9IEpTT04ucGFyc2UobGluZSk7XHJcbiAgICAgICAgY29uc3Qgc2hhcGUgOiBTaGFwZSA9IHtcclxuICAgICAgICAgIHNoYXBlSWQ6IHBhcnNlSW50KHNoYXBlSnNvbi5zaGFwZV9pZCksXHJcbiAgICAgICAgICBzaGFwZVNlcXVlbmNlTnVtYmVyOiBwYXJzZUludChzaGFwZUpzb24uc2hhcGVfcHRfc2VxdWVuY2UpLFxyXG4gICAgICAgICAgUG9zaXRpb246IFtwYXJzZUZsb2F0KHNoYXBlSnNvbi5zaGFwZV9wdF9sYXQpLCBwYXJzZUZsb2F0KHNoYXBlSnNvbi5zaGFwZV9wdF9sb24pXSxcclxuICAgICAgICAgIERpc3RhbmNlU2luY2VMYXN0UG9pbnQ6IHBhcnNlSW50KHNoYXBlSnNvbi5zaGFwZV9kaXN0X3RyYXZlbGVkKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd3JpdGVTdHJlYW0ud3JpdGUoSlNPTi5zdHJpbmdpZnkoc2hhcGUpICsgXCJcXG5cIik7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHdyaXRlU3RyZWFtLmVuZCgoKSA9PiB7XHJcbiAgICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJGaW5pc2hlZCB3cml0aW5nIHNoYXBlcyBmaWxlLCBpbXBvcnRpbmcgdG8gZGF0YWJhc2UuXCIpO1xyXG4gICAgICAgIHRoaXMuSW1wb3J0U2hhcGVzKCk7XHJcbiAgICAgIH0pXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGFzeW5jIEltcG9ydFNoYXBlcygpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLmRhdGFiYXNlLkRyb3BTaGFwZXNDb2xsZWN0aW9uKCk7XHJcblxyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJJbXBvcnRpbmcgc2hhcGVzIHRvIG1vbmdvZGJcIik7XHJcblxyXG4gICAgYXdhaXQgZXhlYyhcIm1vbmdvaW1wb3J0IC0tZGIgdGFpb3ZhIC0tY29sbGVjdGlvbiBzaGFwZXMgLS1maWxlIC4vR1RGUy9jb252ZXJ0ZWQvc2hhcGVzLmpzb25cIiwgKGVycm9yLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzdGRlcnIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgc3RkZXJyOiAke3N0ZGVycn1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBzdGRvdXQ6ICR7c3Rkb3V0fWApO1xyXG4gICAgfSk7XHJcblxyXG4gIH1cclxufSIsImltcG9ydCB7IENvbm5lY3Rpb24sIE1vZGVsLCBNb25nb29zZSwgRmlsdGVyUXVlcnksIFNjaGVtYSB9IGZyb20gJ21vbmdvb3NlJztcclxuaW1wb3J0IHsgVHJpcCB9IGZyb20gJy4vdHlwZXMvVHJpcCc7XHJcbmltcG9ydCB7IFZlaGljbGVEYXRhLCB2ZWhpY2xlU3RhdGUgfSBmcm9tICcuL3R5cGVzL1ZlaGljbGVEYXRhJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IFJvdXRlIH0gZnJvbSAnLi90eXBlcy9Sb3V0ZSc7XHJcbmltcG9ydCB7IFNoYXBlIH0gZnJvbSAnLi90eXBlcy9TaGFwZSc7XHJcbmltcG9ydCB7IFRyaXBQb3NpdGlvbkRhdGEgfSBmcm9tICcuL3R5cGVzL1RyaXBQb3NpdGlvbkRhdGEnO1xyXG5pbXBvcnQgeyBXZWJzb2NrZXRWZWhpY2xlRGF0YSB9IGZyb20gJy4vdHlwZXMvV2Vic29ja2V0VmVoaWNsZURhdGEnO1xyXG5jb25zdCBzdHJlYW1Ub01vbmdvREIgPSByZXF1aXJlKCdzdHJlYW0tdG8tbW9uZ28tZGInKS5zdHJlYW1Ub01vbmdvREI7XHJcbmNvbnN0IHNwbGl0ID0gcmVxdWlyZSgnc3BsaXQnKTtcclxuZXhwb3J0IGNsYXNzIERhdGFiYXNlIHtcclxuICBcclxuICBwcml2YXRlIHN0YXRpYyBpbnN0YW5jZSA6IERhdGFiYXNlO1xyXG4gIFxyXG4gIHByaXZhdGUgZGIgOiBDb25uZWN0aW9uO1xyXG4gIHByaXZhdGUgbW9uZ29vc2UgOiBNb25nb29zZTtcclxuICBwcml2YXRlIHZlaGljbGVTY2hlbWEgOiBTY2hlbWE7XHJcbiAgcHJpdmF0ZSB0cmlwc1NjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIHJvdXRlc1NjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIHNoYXBlc1NjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIGRyaXZlblJvdXRlc1NjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIHZlaGljbGVNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIHRyaXBNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIHJvdXRlc01vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgc2hhcGVzTW9kZWwgOiB0eXBlb2YgTW9kZWw7XHJcbiAgcHJpdmF0ZSBkcml2ZW5Sb3V0ZXNNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIG91dHB1dERCQ29uZmlnO1xyXG5cclxuICBwdWJsaWMgc3RhdGljIGdldEluc3RhbmNlKCk6IERhdGFiYXNlIHtcclxuICAgIGlmKCFEYXRhYmFzZS5pbnN0YW5jZSlcclxuICAgICAgRGF0YWJhc2UuaW5zdGFuY2UgPSBuZXcgRGF0YWJhc2UoKTtcclxuXHJcbiAgICByZXR1cm4gRGF0YWJhc2UuaW5zdGFuY2U7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgSW5pdCgpIHtcclxuICAgIGNvbnN0IHVybCA6IHN0cmluZyA9IHByb2Nlc3MuZW52LkRBVEFCQVNFX1VSTDtcclxuICAgIGNvbnN0IG5hbWUgOiBzdHJpbmcgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9OQU1FO1xyXG5cclxuICAgIHRoaXMubW9uZ29vc2UgPSBuZXcgTW9uZ29vc2UoKTtcclxuICAgIFxyXG4gICAgdGhpcy5tb25nb29zZS5zZXQoJ3VzZUZpbmRBbmRNb2RpZnknLCBmYWxzZSlcclxuXHJcbiAgICBpZighdXJsICYmICFuYW1lKSB0aHJvdyAoYEludmFsaWQgVVJMIG9yIG5hbWUgZ2l2ZW4sIHJlY2VpdmVkOiBcXG4gTmFtZTogJHtuYW1lfSBcXG4gVVJMOiAke3VybH1gKVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBDb25uZWN0aW5nIHRvIGRhdGFiYXNlIHdpdGggbmFtZTogJHtuYW1lfSBhdCB1cmw6ICR7dXJsfWApXHJcbiAgICB0aGlzLm1vbmdvb3NlLmNvbm5lY3QoYCR7dXJsfS8ke25hbWV9YCwge1xyXG4gICAgICB1c2VOZXdVcmxQYXJzZXI6IHRydWUsXHJcbiAgICAgIHVzZVVuaWZpZWRUb3BvbG9neTogdHJ1ZSxcclxuICAgICAgcG9vbFNpemU6IDEyMFxyXG4gICAgfSlcclxuXHJcbiAgICB0aGlzLmRiID0gdGhpcy5tb25nb29zZS5jb25uZWN0aW9uO1xyXG5cclxuICAgIHRoaXMub3V0cHV0REJDb25maWcgPSB7IGRiVVJMIDogYCR7dXJsfS8ke25hbWV9YCwgY29sbGVjdGlvbiA6ICd0cmlwcycgfTtcclxuXHJcbiAgICB0aGlzLmRiLm9uKCdlcnJvcicsIGVycm9yID0+IHtcclxuICAgICAgdGhyb3cgbmV3IGVycm9yKGBFcnJvciBjb25uZWN0aW5nIHRvIGRhdGFiYXNlLiAke2Vycm9yfWApO1xyXG4gICAgfSlcclxuXHJcbiAgICBhd2FpdCB0aGlzLkRhdGFiYXNlTGlzdGVuZXIoKTtcclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBHZXREYXRhYmFzZSgpIDogQ29ubmVjdGlvbiB7XHJcbiAgICByZXR1cm4gdGhpcy5kYjtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBEYXRhYmFzZUxpc3RlbmVyICgpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcclxuICAgICAgICB0aGlzLmRiLm9uY2UoXCJvcGVuXCIsICgpID0+IHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdGlvbiB0byBkYXRhYmFzZSBlc3RhYmxpc2hlZC5cIilcclxuXHJcbiAgICAgICAgICB0aGlzLnZlaGljbGVTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIG9yaWdpbmFsQ29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICBwbGFubmluZ051bWJlcjogU3RyaW5nLFxyXG4gICAgICAgICAgICBqb3VybmV5TnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogTnVtYmVyLFxyXG4gICAgICAgICAgICB2ZWhpY2xlTnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiBbTnVtYmVyLCBOdW1iZXJdLFxyXG4gICAgICAgICAgICBzdGF0dXM6IFN0cmluZyxcclxuICAgICAgICAgICAgcHVuY3R1YWxpdHk6IEFycmF5LFxyXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IE51bWJlcixcclxuICAgICAgICAgICAgdXBkYXRlZEF0OiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHVwZGF0ZWRUaW1lczogQXJyYXksXHJcbiAgICAgICAgICAgIGN1cnJlbnRSb3V0ZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIGN1cnJlbnRUcmlwSWQ6IE51bWJlcixcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICB0aGlzLnRyaXBzU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgY29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHNlcnZpY2VJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB0cmlwSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgdHJpcE51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICB0cmlwUGxhbm5pbmdOdW1iZXI6IFN0cmluZyxcclxuICAgICAgICAgICAgdHJpcEhlYWRzaWduOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHRyaXBOYW1lOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIGRpcmVjdGlvbklkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHNoYXBlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgd2hlZWxjaGFpckFjY2Vzc2libGU6IE51bWJlclxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLnJvdXRlc1NjaGVtYSA9IG5ldyB0aGlzLm1vbmdvb3NlLlNjaGVtYSh7XHJcbiAgICAgICAgICAgIHJvdXRlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgY29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICBzdWJDb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlU2hvcnROYW1lOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlTG9uZ05hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVEZXNjcmlwdGlvbjogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZVR5cGU6IE51bWJlcixcclxuICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgdGhpcy5zaGFwZXNTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICBzaGFwZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHNoYXBlU2VxdWVuY2VOdW1iZXI6IE51bWJlcixcclxuICAgICAgICAgICAgUG9zaXRpb246IFtOdW1iZXIsIE51bWJlcl0sXHJcbiAgICAgICAgICAgIERpc3RhbmNlU2luY2VMYXN0UG9pbnQ6IE51bWJlclxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLmRyaXZlblJvdXRlc1NjaGVtYSA9IG5ldyB0aGlzLm1vbmdvb3NlLlNjaGVtYSh7XHJcbiAgICAgICAgICAgIHRyaXBJZCA6IE51bWJlcixcclxuICAgICAgICAgICAgY29tcGFueSA6IFN0cmluZyxcclxuICAgICAgICAgICAgcG9zaXRpb25zOiBBcnJheSxcclxuICAgICAgICAgICAgdXBkYXRlZFRpbWVzIDogQXJyYXlcclxuICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgdGhpcy50cmlwc1NjaGVtYS5pbmRleCh7IHRyaXBOdW1iZXI6IC0xLCB0cmlwUGxhbm5pbmdOdW1iZXI6IC0xLCBjb21wYW55OiAtMSB9KVxyXG4gICAgICAgICAgdGhpcy5yb3V0ZXNTY2hlbWEuaW5kZXgoeyBjb21wYW55OiAtMSwgc3ViQ29tcGFueTogLTEsIHJvdXRlU2hvcnROYW1lOiAtMSAsIHJvdXRlTG9uZ05hbWU6IC0xfSlcclxuICAgICAgICAgIHRoaXMuc2hhcGVzU2NoZW1hLmluZGV4KHsgc2hhcGVJZDogLTEgfSlcclxuICAgICAgICAgIHRoaXMuZHJpdmVuUm91dGVzU2NoZW1hLmluZGV4KHsgdHJpcElkOiAtMSwgY29tcGFueTogLTEgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLnZlaGljbGVNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJWZWhpY2xlUG9zaXRpb25zXCIsIHRoaXMudmVoaWNsZVNjaGVtYSk7XHJcbiAgICAgICAgICB0aGlzLnRyaXBNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJ0cmlwc1wiLCB0aGlzLnRyaXBzU2NoZW1hKTtcclxuICAgICAgICAgIHRoaXMucm91dGVzTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwicm91dGVzXCIsIHRoaXMucm91dGVzU2NoZW1hKTtcclxuICAgICAgICAgIHRoaXMuc2hhcGVzTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwic2hhcGVzXCIsIHRoaXMuc2hhcGVzU2NoZW1hKTtcclxuICAgICAgICAgIHRoaXMuZHJpdmVuUm91dGVzTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwiZHJpdmVucm91dGVzXCIsIHRoaXMuZHJpdmVuUm91dGVzU2NoZW1hKTtcclxuXHJcbiAgICAgICAgICB0aGlzLnRyaXBNb2RlbC5jcmVhdGVJbmRleGVzKCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJlcygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldEFsbFZlaGljbGVzIChhcmdzID0ge30pIDogUHJvbWlzZTxBcnJheTxWZWhpY2xlRGF0YT4+IHtcclxuICAgIHJldHVybiBhd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kKHsuLi5hcmdzfSwgeyBwdW5jdHVhbGl0eTogMCwgdXBkYXRlZFRpbWVzOiAwLCBfX3YgOiAwIH0pO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldEFsbFZlaGljbGVzU21hbGwgKGFyZ3MgPSB7fSkgOiBQcm9taXNlPEFycmF5PFdlYnNvY2tldFZlaGljbGVEYXRhPj4ge1xyXG4gICAgY29uc3Qgc21hbGxCdXNzZXMgOiBBcnJheTxXZWJzb2NrZXRWZWhpY2xlRGF0YT4gPSBbXTtcclxuXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kKHsuLi5hcmdzfSxcclxuICAgICAgeyBcclxuICAgICAgcHVuY3R1YWxpdHk6IDAsIFxyXG4gICAgICB1cGRhdGVkVGltZXM6IDAsIFxyXG4gICAgICBfX3YgOiAwLFxyXG4gICAgICBqb3VybmV5TnVtYmVyOiAwLFxyXG4gICAgICB0aW1lc3RhbXAgOiAwLFxyXG4gICAgICBsaW5lTlVtYmVyOiAwLFxyXG4gICAgICBjcmVhdGVkQXQ6IDAsXHJcbiAgICAgIHVwZGF0ZWRBdDogMCxcclxuICAgICAgY3VycmVudFJvdXRlSWQ6IDAsXHJcbiAgICAgIGN1cnJlbnRUcmlwSWQ6IDAsXHJcbiAgICAgIHBsYW5uaW5nTnVtYmVyOiAwLFxyXG4gICAgICBzdGF0dXM6IDBcclxuICAgIH0pXHJcblxyXG4gICAgcmVzdWx0LmZvckVhY2gocmVzID0+IHtcclxuICAgICAgc21hbGxCdXNzZXMucHVzaCh7XHJcbiAgICAgICAgcDogcmVzLnBvc2l0aW9uLFxyXG4gICAgICAgIGM6IHJlcy5jb21wYW55LCBcclxuICAgICAgICB2OiByZXMudmVoaWNsZU51bWJlclxyXG4gICAgICB9KVxyXG4gICAgfSlcclxuICAgIHJldHVybiBzbWFsbEJ1c3NlcztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRWZWhpY2xlICh2ZWhpY2xlTnVtYmVyLCB0cmFuc3BvcnRlciwgZmlyc3RPbmx5IDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8VmVoaWNsZURhdGE+IHtcclxuICAgIHJldHVybiB7IFxyXG4gICAgICAuLi5hd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kT25lKHtcclxuICAgICAgICB2ZWhpY2xlTnVtYmVyIDogdmVoaWNsZU51bWJlcixcclxuICAgICAgICBjb21wYW55OiB0cmFuc3BvcnRlclxyXG4gICAgICB9KVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBSZW1vdmVWZWhpY2xlc1doZXJlKCBwYXJhbXMgOiBvYmplY3QsIGRvTG9nZ2luZyA6IGJvb2xlYW4gPSBmYWxzZSkgOiBQcm9taXNlPEFycmF5PFZlaGljbGVEYXRhPj4ge1xyXG4gICAgY29uc3QgcmVtb3ZlZFZlaGljbGVzIDogQXJyYXk8VmVoaWNsZURhdGE+ID0gYXdhaXQgdGhpcy5HZXRBbGxWZWhpY2xlcyhwYXJhbXMpO1xyXG4gICAgdGhpcy52ZWhpY2xlTW9kZWwuZGVsZXRlTWFueShwYXJhbXMpLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICBpZihkb0xvZ2dpbmcpIGNvbnNvbGUubG9nKGBEZWxldGVkICR7cmVzcG9uc2UuZGVsZXRlZENvdW50fSB2ZWhpY2xlcy5gKTtcclxuICAgICAgXHJcbiAgICB9KTtcclxuICAgIHJldHVybiByZW1vdmVkVmVoaWNsZXM7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0VHJpcCh0cmlwTnVtYmVyIDogbnVtYmVyLCB0cmlwUGxhbm5pbmdOdW1iZXIgOiBzdHJpbmcsIGNvbXBhbnk6IHN0cmluZykge1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy50cmlwTW9kZWwuZmluZE9uZSh7XHJcbiAgICAgIGNvbXBhbnk6IGNvbXBhbnksXHJcbiAgICAgIHRyaXBOdW1iZXIgOiB0cmlwTnVtYmVyLFxyXG4gICAgICB0cmlwUGxhbm5pbmdOdW1iZXI6IHRyaXBQbGFubmluZ051bWJlclxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3BvbnNlICE9PSBudWxsID8gcmVzcG9uc2UgOiB7fTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBEcm9wVHJpcHNDb2xsZWN0aW9uKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGluZyB0cmlwcyBjb2xsZWN0aW9uXCIpO1xyXG4gICAgYXdhaXQgdGhpcy50cmlwTW9kZWwucmVtb3ZlKHt9KTtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBlZCB0cmlwcyBjb2xsZWN0aW9uXCIpO1xyXG4gIH1cclxuICBcclxuICBwdWJsaWMgYXN5bmMgRHJvcFJvdXRlc0NvbGxlY3Rpb24oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwaW5nIHJvdXRlcyBjb2xsZWN0aW9uXCIpO1xyXG4gICAgYXdhaXQgdGhpcy5yb3V0ZXNNb2RlbC5yZW1vdmUoe30pO1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGVkIHJvdXRlcyBjb2xsZWN0aW9uXCIpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIERyb3BTaGFwZXNDb2xsZWN0aW9uKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGluZyBzaGFwZXMgY29sbGVjdGlvblwiKTtcclxuICAgIGF3YWl0IHRoaXMuc2hhcGVzTW9kZWwucmVtb3ZlKHt9KTtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBlZCBzaGFwZXMgY29sbGVjdGlvblwiKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRSb3V0ZShyb3V0ZUlkIDogbnVtYmVyKSA6IFByb21pc2U8Um91dGU+IHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5yb3V0ZXNNb2RlbC5maW5kT25lKHtcclxuICAgICAgcm91dGVJZCA6IHJvdXRlSWQsXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcmVzcG9uc2UgIT09IG51bGwgPyByZXNwb25zZSA6IHt9O1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFNoYXBlKHNoYXBlSWQgOiBudW1iZXIpIDogUHJvbWlzZTxBcnJheTxTaGFwZT4+IHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5zaGFwZXNNb2RlbC5maW5kKHtcclxuICAgICAgc2hhcGVJZCA6IHNoYXBlSWQsXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcmVzcG9uc2UgIT09IFtdID8gcmVzcG9uc2UgOiBbXTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRUcmlwUG9zaXRpb25zKHRyaXBJZCA6IG51bWJlciwgY29tcGFueSA6IHN0cmluZykgOiBQcm9taXNlPFRyaXBQb3NpdGlvbkRhdGE+IHtcclxuICAgIHJldHVybiBhd2FpdCB0aGlzLmRyaXZlblJvdXRlc01vZGVsLmZpbmRPbmUoeyBcclxuICAgICAgdHJpcElkOiB0cmlwSWQsXHJcbiAgICAgIGNvbXBhbnk6IGNvbXBhbnksXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFJvdXRlc0J5U3RyaW5nIChxdWVyeSA6IHN0cmluZykgOiBQcm9taXNlPEFycmF5PFJvdXRlPj4geyAgICBcclxuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucm91dGVzTW9kZWwuZmluZChcclxuICAgICAgICB7IFxyXG4gICAgICAgICAgJG9yOiBbIFxyXG4gICAgICAgICAgICB7IHJvdXRlTG9uZ05hbWUgOiBuZXcgUmVnRXhwKHF1ZXJ5LCAnaScpIH0sIFxyXG4gICAgICAgICAgICB7IGNvbXBhbnkgOiBuZXcgUmVnRXhwKHF1ZXJ5LCAnaScpIH0sIHsgc3ViQ29tcGFueTogbmV3IFJlZ0V4cChxdWVyeSwgJ2knKSB9LCBcclxuICAgICAgICAgICAgeyByb3V0ZVNob3J0TmFtZSA6IHF1ZXJ5IH1cclxuICAgICAgICAgIF0gXHJcbiAgICAgICAgfVxyXG4gICAgICApXHJcbiAgfSBcclxuICBcclxuICBwdWJsaWMgYXN5bmMgR2V0VmVoaWNsZXNCeVJvdXRlSWQgKHJvdXRlSWQgOiBudW1iZXIpIDogUHJvbWlzZTxBcnJheTxWZWhpY2xlRGF0YT4+IHtcclxuICAgIHJldHVybiBhd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kKHsgXHJcbiAgICAgIGN1cnJlbnRSb3V0ZUlkOiByb3V0ZUlkXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbn1cclxuIiwiLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgICAgQVBQIENPTkZJR1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuXHJcbmltcG9ydCAqIGFzIGRvdGVudiBmcm9tICdkb3RlbnYnO1xyXG5kb3RlbnYuY29uZmlnKCk7XHJcblxyXG5jb25zdCBwb3J0ID0gcHJvY2Vzcy5lbnYuUE9SVCB8fCAzMDAxO1xyXG5cclxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgICAgWUFSTiBJTVBPUlRTXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5pbXBvcnQgKiBhcyBodHRwcyBmcm9tICdodHRwcyc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuXHJcbmNvbnN0IGV4cHJlc3MgPSByZXF1aXJlKFwiZXhwcmVzc1wiKTtcclxuY29uc3QgY29ycyA9IHJlcXVpcmUoXCJjb3JzXCIpO1xyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgQ1VTVE9NIElNUE9SVFNcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcblxyXG5pbXBvcnQgeyBEYXRhYmFzZSB9IGZyb20gJy4vZGF0YWJhc2UnO1xyXG5pbXBvcnQgeyBXZWJTZXJ2ZXIgfSBmcm9tICcuL3dlYnNlcnZlcic7XHJcbmltcG9ydCB7IEJ1c0xvZ2ljIH0gZnJvbSAnLi9idXNsb2dpYyc7XHJcbmltcG9ydCB7IERvd25sb2FkZXIgfSBmcm9tICcuL2Rvd25sb2FkZXInO1xyXG5cclxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgICAgU1NMIENPTkZJR1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuY29uc3QgcHJpdmF0ZUtleSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUva2V5LmtleVwiKS50b1N0cmluZygpO1xyXG5jb25zdCBjZXJ0aWZpY2F0ZSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUvY2VydC5jcnRcIikudG9TdHJpbmcoKTtcclxuY29uc3QgY2EgPSBmcy5yZWFkRmlsZVN5bmMoXCIuL2NlcnRpZmljYXRlL2tleS1jYS5jcnRcIikudG9TdHJpbmcoKTtcclxuXHJcbmNvbnN0IEFwcEluaXQgPSBhc3luYyAoKSA9PiB7XHJcbiAgY29uc3QgZGIgPSBhd2FpdCBEYXRhYmFzZS5nZXRJbnN0YW5jZSgpLkluaXQoKS50aGVuKCk7XHJcbiAgY29uc3QgYXBwID0gKG1vZHVsZS5leHBvcnRzID0gZXhwcmVzcygpKTtcclxuXHJcbiAgY29uc3Qgc2VydmVyID0gaHR0cHMuY3JlYXRlU2VydmVyKFxyXG4gICAge1xyXG4gICAgICBrZXk6IHByaXZhdGVLZXksXHJcbiAgICAgIGNlcnQ6IGNlcnRpZmljYXRlLFxyXG4gICAgICBjYTogY2EsXHJcbiAgICAgIHJlcXVlc3RDZXJ0OiB0cnVlLFxyXG4gICAgICByZWplY3RVbmF1dGhvcml6ZWQ6IGZhbHNlLFxyXG4gICAgfSxcclxuICAgIGFwcFxyXG4gICk7XHJcbiAgXHJcblxyXG4gIC8vVEhJUyBJUyBOT1QgU0FGRVxyXG5cclxuICBjb25zdCBjb3JzT3B0aW9ucyA9IHtcclxuICAgIG9yaWdpbjogJyonLFxyXG4gICAgb3B0aW9uc1N1Y2Nlc3NTdGF0dXM6IDIwMFxyXG4gIH1cclxuXHJcbiAgYXBwLnVzZShjb3JzKGNvcnNPcHRpb25zKSlcclxuICBhcHAub3B0aW9ucygnKicsIGNvcnMoKSlcclxuXHJcblxyXG4gIG5ldyBXZWJTZXJ2ZXIoYXBwLCBkYik7XHJcbiAgY29uc3QgYnVzTG9naWMgPSBuZXcgQnVzTG9naWMoZGIsIHRydWUpO1xyXG4gIC8vbmV3IERvd25sb2FkZXIoZGIpO1xyXG4gIGJ1c0xvZ2ljLkluaXRLVjc4KCk7XHJcbiAgXHJcbiAgc2VydmVyLmxpc3Rlbihwb3J0LCAoKSA9PiBjb25zb2xlLmxvZyhgTGlzdGVuaW5nIGF0IGh0dHA6Ly9sb2NhbGhvc3Q6JHtwb3J0fWApKTtcclxuXHJcbn1cclxuXHJcbkFwcEluaXQoKTtcclxuIiwiaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tIFwiLi9kYXRhYmFzZVwiO1xyXG5pbXBvcnQgeyBSb3V0ZSB9IGZyb20gXCIuL3R5cGVzL1JvdXRlXCI7XHJcbmltcG9ydCB7IFZlaGljbGVEYXRhIH0gZnJvbSBcIi4vdHlwZXMvVmVoaWNsZURhdGFcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBTZWFyY2hIYW5kbGVyIHtcclxuXHJcbiAgcHJpdmF0ZSBkYXRhYmFzZTogRGF0YWJhc2U7XHJcbiAgY29uc3RydWN0b3IoZGIgOiBEYXRhYmFzZSkge1xyXG4gICAgdGhpcy5Jbml0KCk7XHJcbiAgICB0aGlzLmRhdGFiYXNlID0gZGI7XHJcbiAgfVxyXG5cclxuICBhc3luYyBJbml0KCkge1xyXG4gICAgXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgU2VhcmNoRm9yRXZlcnl0aGluZyhzZWFyY2hTdHJpbmcgOiBzdHJpbmcsIGxpbWl0IDogbnVtYmVyKSA6IFByb21pc2U8YW55PiB7XHJcblxyXG4gICAgLy8gY29uc3QgcHJpb3JpdGllcyA9IHtcclxuICAgIC8vICAgUk9VVEUgOiAxMCxcclxuICAgIC8vICAgVFJJUCA6IDUsXHJcbiAgICAvLyAgIENPTVBBTlk6IDFcclxuICAgIC8vIH1cclxuXHJcbiAgICBjb25zdCBzZXBlcmF0ZVRlcm1zID0gc2VhcmNoU3RyaW5nLnNwbGl0KFwiIFwiKTtcclxuICAgIGNvbnN0IGZpcnN0VGVybSA9IHNlcGVyYXRlVGVybXNbMF07XHJcblxyXG4gICAgY29uc3QgZm91bmRSb3V0ZXNCeUZpcnN0VGVybSA6IEFycmF5PFJvdXRlPiA9IGF3YWl0IHRoaXMuR2V0Um91dGVzKGZpcnN0VGVybSk7XHJcblxyXG4gICAgY29uc3QgZm91bmRSb3V0ZXNCeVRlcm1zIDogQXJyYXk8Um91dGU+ID0gW107XHJcbiAgICBmb3VuZFJvdXRlc0J5Rmlyc3RUZXJtLmZvckVhY2gocm91dGUgPT4ge1xyXG4gICAgICBcclxuICAgICAgbGV0IGZvdW5kVGVybXMgPSAwO1xyXG4gICAgICBzZXBlcmF0ZVRlcm1zLmZvckVhY2godGVybSA9PiB7XHJcbiAgICAgICAgaWYocm91dGUucm91dGVMb25nTmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHRlcm0udG9Mb3dlckNhc2UoKSkgfHwgcm91dGUucm91dGVTaG9ydE5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyh0ZXJtLnRvTG93ZXJDYXNlKCkpIHx8IHJvdXRlLnN1YkNvbXBhbnkudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyh0ZXJtLnRvTG93ZXJDYXNlKCkpIHx8IHJvdXRlLmNvbXBhbnkudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyh0ZXJtLnRvTG93ZXJDYXNlKCkpKVxyXG4gICAgICAgICAgZm91bmRUZXJtcysrO1xyXG4gICAgICB9KVxyXG5cclxuICAgICAgaWYoZm91bmRUZXJtcyA9PSBzZXBlcmF0ZVRlcm1zLmxlbmd0aCkgZm91bmRSb3V0ZXNCeVRlcm1zLnB1c2gocm91dGUpO1xyXG5cclxuICAgIH0pIFxyXG4gICAgICAgICAgIFxyXG4gICAgXHJcbiAgICByZXR1cm4gZm91bmRSb3V0ZXNCeVRlcm1zLnNsaWNlKDAsIGxpbWl0KTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRSb3V0ZXMgKHNlYXJjaFN0cmluZzogc3RyaW5nKSA6IFByb21pc2U8QXJyYXk8Um91dGU+PiAge1xyXG4gICAgY29uc3QgZm91bmRSb3V0ZXMgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFJvdXRlc0J5U3RyaW5nKHNlYXJjaFN0cmluZyk7XHJcbiAgICByZXR1cm4gZm91bmRSb3V0ZXM7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgU2VhcmNoRm9yVHJpcFNpZ24gKHNlYXJjaFN0cmluZzogc3RyaW5nKSA6IGFueSB7XHJcblxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFNlYXJjaEZvclZlaGljbGVCeVJvdXRlIChyb3V0ZUlkIDogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gdGhpcy5kYXRhYmFzZS5HZXRWZWhpY2xlc0J5Um91dGVJZChyb3V0ZUlkKTtcclxuICB9XHJcblxyXG59IiwiaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tIFwiLi9kYXRhYmFzZVwiO1xyXG5pbXBvcnQgeyBTZWFyY2hIYW5kbGVyIH0gZnJvbSBcIi4vc2VhcmNoaGFuZGxlclwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFdlYlNlcnZlciB7XHJcblxyXG4gIHByaXZhdGUgYXBwO1xyXG4gIHByaXZhdGUgZGF0YWJhc2UgOiBEYXRhYmFzZTtcclxuICBwcml2YXRlIHNlYXJjaEhhbmRsZXIgOiBTZWFyY2hIYW5kbGVyO1xyXG4gIGNvbnN0cnVjdG9yKGFwcCwgZGF0YWJhc2UgOiBEYXRhYmFzZSkge1xyXG4gICAgdGhpcy5hcHAgPSBhcHA7XHJcbiAgICB0aGlzLmRhdGFiYXNlID0gZGF0YWJhc2U7XHJcbiAgICB0aGlzLnNlYXJjaEhhbmRsZXIgPSBuZXcgU2VhcmNoSGFuZGxlcihkYXRhYmFzZSk7XHJcbiAgICB0aGlzLkluaXRpYWxpemUoKTtcclxuICB9XHJcblxyXG4gIEluaXRpYWxpemUoKSB7XHJcbiAgICB0aGlzLmFwcC5nZXQoXCIvXCIsIChyZXEsIHJlcykgPT4gcmVzLnNlbmQoXCJUaGlzIGlzIHRoZSBBUEkgZW5kcG9pbnQgZm9yIHRoZSBUQUlPVkEgYXBwbGljYXRpb24uXCIpKTtcclxuXHJcbiAgICB0aGlzLmFwcC5nZXQoXCIvYnVzc2VzXCIsIGFzeW5jIChyZXEsIHJlcykgPT4gcmVzLnNlbmQoXHJcbiAgICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0QWxsVmVoaWNsZXNTbWFsbCgpXHJcbiAgICApKVxyXG5cclxuICAgIHRoaXMuYXBwLmdldChcIi9idXNzZXMvOmNvbXBhbnkvOm51bWJlclwiLCBhc3luYyAocmVxLCByZXMpID0+IHtcclxuICAgICAgXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRWZWhpY2xlKHJlcS5wYXJhbXMubnVtYmVyLCByZXEucGFyYW1zLmNvbXBhbnksIHRydWUpO1xyXG4gICAgICAgIGlmKE9iamVjdC5rZXlzKHJlc3VsdCkubGVuZ3RoID4gMCkgXHJcbiAgICAgICAgICByZXMuc2VuZChyZXN1bHRbXCJfZG9jXCJdKTtcclxuICAgICAgICBlbHNlIFxyXG4gICAgICAgICAgcmVzLnNlbmQoe30pICBcclxuICAgICAgfVxyXG4gICAgICBjYXRjaChlcnJvcikgeyByZXMuc2VuZChlcnJvci5tZXNzYWdlKSB9XHJcblxyXG4gICAgIH0pXHJcbiAgICBcclxuICAgICB0aGlzLmFwcC5nZXQoXCIvYnVzc2VzLzpyb3V0ZUlkXCIsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xyXG4gICAgICBcclxuICAgICAgdHJ5IHtcclxuICAgICAgICByZXMuc2VuZChhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFZlaGljbGVzQnlSb3V0ZUlkKHJlcS5wYXJhbXMucm91dGVJZCkpO1xyXG4gICAgICB9XHJcbiAgICAgIGNhdGNoKGVycm9yKSB7IHJlcy5zZW5kKGVycm9yLm1lc3NhZ2UpIH1cclxuXHJcbiAgICAgfSlcclxuICAgIHRoaXMuYXBwLmdldChcIi90cmlwLzpjb21wYW55LzpwbGFubmluZ251bWJlci86dHJpcG51bWJlclwiLCBhc3luYyhyZXEsIHJlcykgPT4ge1xyXG4gICAgICBcclxuICAgICAgdHJ5IHsgcmVzLnNlbmQoYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRUcmlwKHJlcS5wYXJhbXMudHJpcG51bWJlciwgcmVxLnBhcmFtcy5wbGFubmluZ251bWJlciwgcmVxLnBhcmFtcy5jb21wYW55KSk7IH1cclxuICAgICAgY2F0Y2goZXJyb3IpIHsgcmVzLnNlbmQoZXJyb3IubWVzc2FnZSkgfVxyXG5cclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy5hcHAuZ2V0KFwiL3JvdXRlLzpyb3V0ZW51bWJlclwiLCBhc3luYyhyZXEsIHJlcykgPT4ge1xyXG4gICAgICBcclxuXHJcbiAgICAgIHRyeSB7IHJlcy5zZW5kKGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0Um91dGUocmVxLnBhcmFtcy5yb3V0ZW51bWJlcikpOyB9XHJcbiAgICAgIGNhdGNoKGVycm9yKSB7IHJlcy5zZW5kKGVycm9yLm1lc3NhZ2UpIH1cclxuXHJcbiAgICB9KVxyXG5cclxuICAgIHRoaXMuYXBwLmdldChcIi9zaGFwZS86c2hhcGVudW1iZXJcIiwgYXN5bmMocmVxLCByZXMpID0+IHtcclxuICAgICAgXHJcbiAgICAgIHRyeSB7IHJlcy5zZW5kKGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0U2hhcGUocmVxLnBhcmFtcy5zaGFwZW51bWJlcikpOyB9XHJcbiAgICAgIGNhdGNoKGVycm9yKSB7IHJlcy5zZW5kKGVycm9yLm1lc3NhZ2UpIH1cclxuXHJcbiAgICB9KVxyXG5cclxuICAgIHRoaXMuYXBwLmdldChcIi90cmlwZGF0YS86Y29tcGFueS86dHJpcElkXCIsIGFzeW5jKHJlcSwgcmVzKSA9PiB7XHJcbiAgICAgIHRyeSB7IFxyXG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRUcmlwUG9zaXRpb25zKHJlcS5wYXJhbXMudHJpcElkLCByZXEucGFyYW1zLmNvbXBhbnkpO1xyXG4gICAgICAgIGNvbnN0IHNvcnRlZFBvc2l0aW9ucyA9IHJlc3BvbnNlLnBvc2l0aW9ucy5zb3J0KChhLCBiKSA9PiBNYXRoLnNxcnQoYVswXSArIGFbMV0pIC0gTWF0aC5zcXJ0KGFbMF0gKyBiWzFdKSlcclxuICAgICAgICByZXNwb25zZS5wb3NpdGlvbnMgPSBzb3J0ZWRQb3NpdGlvbnM7XHJcbiAgICAgICAgcmVzLnNlbmQocmVzcG9uc2UpOyB9XHJcbiAgICAgIGNhdGNoKGVycm9yKSB7IHJlcy5zZW5kKGVycm9yLm1lc3NhZ2UpIH0gICAgICBcclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy5hcHAuZ2V0KFwiL3NlYXJjaC86cXVlcnkvOmxpbWl0XCIsIGFzeW5jKHJlcSwgcmVzKSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgcmVzLnNlbmQoYXdhaXQgdGhpcy5zZWFyY2hIYW5kbGVyLlNlYXJjaEZvckV2ZXJ5dGhpbmcocmVxLnBhcmFtcy5xdWVyeSwgcmVxLnBhcmFtcy5saW1pdCkpO1xyXG4gICAgICB9IGNhdGNoKGVycm9yKSB7IHJlcy5zZW5kKGVycm9yLm1lc3NhZ2UpIH1cclxuICAgIH0pXHJcbiAgfVxyXG59IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiY2hpbGRfcHJvY2Vzc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiY29yc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZG90ZW52XCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJleHByZXNzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJmc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiaHR0cHNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIm1vbmdvb3NlXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJwYXRoXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzcGxpdFwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwic3RyZWFtLXRvLW1vbmdvLWRiXCIpOzsiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gc3RhcnR1cFxuLy8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4vLyBUaGlzIGVudHJ5IG1vZHVsZSBpcyByZWZlcmVuY2VkIGJ5IG90aGVyIG1vZHVsZXMgc28gaXQgY2FuJ3QgYmUgaW5saW5lZFxudmFyIF9fd2VicGFja19leHBvcnRzX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKFwiLi9zcmMvbWFpbi50c1wiKTtcbiJdLCJzb3VyY2VSb290IjoiIn0=