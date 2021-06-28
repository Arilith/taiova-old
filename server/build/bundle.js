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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvYnVzbG9naWMudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL2RhdGFiYXNlLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy9tYWluLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy9zZWFyY2hoYW5kbGVyLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy93ZWJzZXJ2ZXIudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiY2hpbGRfcHJvY2Vzc1wiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImNvcnNcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJkb3RlbnZcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJleHByZXNzXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiZnNcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJodHRwc1wiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcIm1vbmdvb3NlXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwicGF0aFwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcInNwbGl0XCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwic3RyZWFtLXRvLW1vbmdvLWRiXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3RhaW92YXNlcnZlci93ZWJwYWNrL3N0YXJ0dXAiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFQSx1REFBK0I7QUFDL0IsNkRBQXlCO0FBR3pCLGtGQUFxQztBQU1yQyxNQUFhLFFBQVE7SUFJ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Q0FBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7VUN0QkE7VUFDQTtVQUNBO1VBQ0EiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tIFwiLi9kYXRhYmFzZVwiO1xyXG5pbXBvcnQgeyBWZWhpY2xlRGF0YSwgdmVoaWNsZVN0YXRlIH0gZnJvbSBcIi4vdHlwZXMvVmVoaWNsZURhdGFcIjtcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCB7IFRyaXAgfSBmcm9tIFwiLi90eXBlcy9UcmlwXCI7XHJcbmltcG9ydCB7IEFwaVRyaXAgfSBmcm9tIFwiLi90eXBlcy9BcGlUcmlwXCI7XHJcbmltcG9ydCB7IGV4ZWMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcclxuaW1wb3J0IHsgUm91dGUgfSBmcm9tIFwiLi90eXBlcy9Sb3V0ZVwiO1xyXG5pbXBvcnQgeyBBcGlSb3V0ZSB9IGZyb20gXCIuL3R5cGVzL0FwaVJvdXRlXCI7XHJcbmltcG9ydCB7IEFwaVNoYXBlIH0gZnJvbSBcIi4vdHlwZXMvQXBpU2hhcGVcIjtcclxuaW1wb3J0IHsgU2hhcGUgfSBmcm9tIFwiLi90eXBlcy9TaGFwZVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEJ1c0xvZ2ljIHtcclxuXHJcbiAgcHJpdmF0ZSBkYXRhYmFzZSA6IERhdGFiYXNlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihkYXRhYmFzZSwgZG9Jbml0IDogYm9vbGVhbiA9IGZhbHNlKSB7XHJcbiAgICB0aGlzLmRhdGFiYXNlID0gZGF0YWJhc2U7XHJcblxyXG4gICAgaWYoZG9Jbml0KSB0aGlzLkluaXRpYWxpemUoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgSW5pdGlhbGl6ZSgpIHtcclxuICAgIGF3YWl0IHRoaXMuQ2xlYXJCdXNzZXMoKTtcclxuXHJcbiAgICBzZXRJbnRlcnZhbChhc3luYyAoKSA9PiB7XHJcbiAgICAgIGF3YWl0IHRoaXMuQ2xlYXJCdXNzZXMoKTtcclxuICAgIH0sIHBhcnNlSW50KHByb2Nlc3MuZW52LkFQUF9DTEVBTlVQX0RFTEFZKSlcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENsZWFycyBidXNzZXMgZXZlcnkgWCBhbW91bnQgb2YgbWludXRlcyBzcGVjaWZpZWQgaW4gLmVudiBmaWxlLlxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBDbGVhckJ1c3NlcygpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ0xFQU5VUF9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkNsZWFyaW5nIGJ1c3Nlc1wiKVxyXG4gICAgY29uc3QgY3VycmVudFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgY29uc3QgZmlmdGVlbk1pbnV0ZXNBZ28gPSBjdXJyZW50VGltZSAtICg2MCAqIHBhcnNlSW50KHByb2Nlc3MuZW52LkFQUF9DTEVBTlVQX1ZFSElDTEVfQUdFX1JFUVVJUkVNRU5UKSAqIDEwMDApO1xyXG4gICAgY29uc3QgUmVtb3ZlZFZlaGljbGVzID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5SZW1vdmVWZWhpY2xlc1doZXJlKHsgdXBkYXRlZEF0OiB7ICRsdDogZmlmdGVlbk1pbnV0ZXNBZ28gfSB9LCBwcm9jZXNzLmVudi5BUFBfRE9fQ0xFQU5VUF9MT0dHSU5HID09IFwidHJ1ZVwiKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSBcIktvcHBlbHZsYWsgNyBhbmQgOCB0dXJib1wiIGZpbGVzIHRvIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBJbml0S1Y3OCgpIDogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0aGlzLkluaXRUcmlwc05ldygpO1xyXG4gICAgdGhpcy5Jbml0Um91dGVzKCk7XHJcbiAgICB0aGlzLkluaXRTaGFwZXMoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSB0cmlwcyBmcm9tIHRoZSBzcGVjaWZpZWQgVVJMIGluIHRoZSAuZW52ICwgb3IgXCIuLi9HVEZTL2V4dHJhY3RlZC90cmlwcy5qc29uXCIgdG8gdGhlIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gIHByaXZhdGUgSW5pdFRyaXBzTmV3KCkgOiB2b2lkIHsgXHJcbiAgICBjb25zdCB0cmlwc1BhdGggPSByZXNvbHZlKFwiR1RGUy9leHRyYWN0ZWQvdHJpcHMudHh0Lmpzb25cIik7XHJcbiAgICBjb25zdCBvdXRwdXRQYXRoID0gcmVzb2x2ZShcIkdURlMvY29udmVydGVkL3RyaXBzLmpzb25cIik7XHJcbiAgICBmcy5yZWFkRmlsZSh0cmlwc1BhdGgsICd1dGY4JywgYXN5bmMoZXJyb3IsIGRhdGEpID0+IHsgXHJcbiAgICAgIGlmKGVycm9yKSBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgaWYoZGF0YSAmJiBwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkxvYWRlZCB0cmlwcyBmaWxlIGludG8gbWVtb3J5LlwiKTtcclxuICAgICAgZGF0YSA9IGRhdGEudHJpbSgpO1xyXG4gICAgICBjb25zdCBsaW5lcyA9IGRhdGEuc3BsaXQoXCJcXG5cIik7XHJcbiAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3V0cHV0UGF0aClcclxuICAgICAgY29uc3QgY29udmVydGVkVHJpcHMgPSBbXTtcclxuXHJcbiAgICAgIGZvcihsZXQgbGluZSBvZiBsaW5lcykge1xyXG4gICAgICAgIGNvbnN0IHRyaXBKU09OIDogQXBpVHJpcCA9IEpTT04ucGFyc2UobGluZSk7XHJcbiAgICAgICAgY29uc3QgcmVhbFRpbWVUcmlwSWQgPSB0cmlwSlNPTi5yZWFsdGltZV90cmlwX2lkLnNwbGl0KFwiOlwiKTtcclxuICAgICAgICBjb25zdCBjb21wYW55ID0gcmVhbFRpbWVUcmlwSWRbMF07XHJcbiAgICAgICAgY29uc3QgcGxhbm5pbmdOdW1iZXIgPSByZWFsVGltZVRyaXBJZFsxXTtcclxuICAgICAgICBjb25zdCB0cmlwTnVtYmVyID0gcmVhbFRpbWVUcmlwSWRbMl07XHJcblxyXG4gICAgICAgIGNvbnN0IHRyaXAgOiBUcmlwID0ge1xyXG4gICAgICAgICAgY29tcGFueTogY29tcGFueSxcclxuICAgICAgICAgIHJvdXRlSWQ6IHBhcnNlSW50KHRyaXBKU09OLnJvdXRlX2lkKSxcclxuICAgICAgICAgIHNlcnZpY2VJZDogcGFyc2VJbnQodHJpcEpTT04uc2VydmljZV9pZCksXHJcbiAgICAgICAgICB0cmlwSWQ6IHBhcnNlSW50KHRyaXBKU09OLnRyaXBfaWQpLFxyXG4gICAgICAgICAgdHJpcE51bWJlcjogcGFyc2VJbnQodHJpcE51bWJlciksXHJcbiAgICAgICAgICB0cmlwUGxhbm5pbmdOdW1iZXI6IHBsYW5uaW5nTnVtYmVyLFxyXG4gICAgICAgICAgdHJpcEhlYWRzaWduOiB0cmlwSlNPTi50cmlwX2hlYWRzaWduLFxyXG4gICAgICAgICAgdHJpcE5hbWU6IHRyaXBKU09OLnRyaXBfbG9uZ19uYW1lLFxyXG4gICAgICAgICAgZGlyZWN0aW9uSWQ6IHBhcnNlSW50KHRyaXBKU09OLmRpcmVjdGlvbl9pZCksXHJcbiAgICAgICAgICBzaGFwZUlkOiBwYXJzZUludCh0cmlwSlNPTi5zaGFwZV9pZCksXHJcbiAgICAgICAgICB3aGVlbGNoYWlyQWNjZXNzaWJsZTogcGFyc2VJbnQodHJpcEpTT04ud2hlZWxjaGFpcl9hY2Nlc3NpYmxlKVxyXG4gICAgICAgIH1cclxuICAgICAgICB3cml0ZVN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh0cmlwKSArIFwiXFxuXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB3cml0ZVN0cmVhbS5lbmQoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRmluaXNoZWQgd3JpdGluZyB0cmlwcyBmaWxlLCBpbXBvcnRpbmcgdG8gZGF0YWJhc2UuXCIpO1xyXG4gICAgICAgIGF3YWl0IHRoaXMuSW1wb3J0VHJpcHMoKTtcclxuICAgICAgfSlcclxuICAgIH0pO1xyXG4gICBcclxuICAgIFxyXG4gIH1cclxuXHJcbiAgYXN5bmMgSW1wb3J0VHJpcHMoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5kYXRhYmFzZS5Ecm9wVHJpcHNDb2xsZWN0aW9uKCk7XHJcblxyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJJbXBvcnRpbmcgdHJpcHMgdG8gbW9uZ29kYlwiKTtcclxuXHJcbiAgICBhd2FpdCBleGVjKFwibW9uZ29pbXBvcnQgLS1kYiB0YWlvdmEgLS1jb2xsZWN0aW9uIHRyaXBzIC0tZmlsZSAuL0dURlMvY29udmVydGVkL3RyaXBzLmpzb25cIiwgKGVycm9yLCBzdGRvdXQsIHN0ZGVycikgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzdGRlcnIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgc3RkZXJyOiAke3N0ZGVycn1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKGBzdGRvdXQ6ICR7c3Rkb3V0fWApO1xyXG4gICAgfSk7XHJcblxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHJvdXRlcyBmcm9tIHRoZSBzcGVjaWZpZWQgVVJMIGluIHRoZSAuZW52ICwgb3IgXCIuLi9HVEZTL2V4dHJhY3RlZC9yb3V0ZXMuanNvblwiIHRvIHRoZSBkYXRhYmFzZS5cclxuICAgKi9cclxuICBwcml2YXRlIEluaXRSb3V0ZXMgKCkge1xyXG4gICAgY29uc3Qgcm91dGVzUGF0aCA9IHJlc29sdmUoXCJHVEZTL2V4dHJhY3RlZC9yb3V0ZXMudHh0Lmpzb25cIik7XHJcbiAgICBjb25zdCBvdXRwdXRQYXRoID0gcmVzb2x2ZShcIkdURlMvY29udmVydGVkL3JvdXRlcy5qc29uXCIpO1xyXG4gICAgZnMucmVhZEZpbGUocm91dGVzUGF0aCwgJ3V0ZjgnLCBhc3luYyhlcnJvciwgZGF0YSkgPT4geyBcclxuICAgICAgaWYoZXJyb3IpIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICBpZihkYXRhICYmIHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiTG9hZGVkIHJvdXRlcyBmaWxlIGludG8gbWVtb3J5LlwiKTtcclxuICAgICAgZGF0YSA9IGRhdGEudHJpbSgpO1xyXG4gICAgICBjb25zdCBsaW5lcyA9IGRhdGEuc3BsaXQoXCJcXG5cIik7XHJcbiAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3V0cHV0UGF0aClcclxuXHJcbiAgICAgIGZvcihsZXQgbGluZSBvZiBsaW5lcykge1xyXG4gICAgICAgIGNvbnN0IHJvdXRlSnNvbiA6IEFwaVJvdXRlID0gSlNPTi5wYXJzZShsaW5lKTtcclxuICAgICAgICBjb25zdCBjb21wYW55U3BsaXQgPSByb3V0ZUpzb24uYWdlbmN5X2lkLnNwbGl0KCc6Jyk7XHJcbiAgICAgICAgY29uc3Qgcm91dGUgOiBSb3V0ZSA9IHtcclxuICAgICAgICAgIHJvdXRlSWQ6IHBhcnNlSW50KHJvdXRlSnNvbi5yb3V0ZV9pZCksXHJcbiAgICAgICAgICBjb21wYW55OiBjb21wYW55U3BsaXRbMF0sXHJcbiAgICAgICAgICBzdWJDb21wYW55OiBjb21wYW55U3BsaXRbMV0gPyBjb21wYW55U3BsaXRbMV0gOiBcIk5vbmVcIixcclxuICAgICAgICAgIHJvdXRlU2hvcnROYW1lOiByb3V0ZUpzb24ucm91dGVfc2hvcnRfbmFtZSxcclxuICAgICAgICAgIHJvdXRlTG9uZ05hbWU6IHJvdXRlSnNvbi5yb3V0ZV9sb25nX25hbWUsXHJcbiAgICAgICAgICByb3V0ZURlc2NyaXB0aW9uOiByb3V0ZUpzb24ucm91dGVfZGVzYyxcclxuICAgICAgICAgIHJvdXRlVHlwZTogcGFyc2VJbnQocm91dGVKc29uLnJvdXRlX3R5cGUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB3cml0ZVN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeShyb3V0ZSkgKyBcIlxcblwiKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgd3JpdGVTdHJlYW0uZW5kKCgpID0+IHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkZpbmlzaGVkIHdyaXRpbmcgcm91dGVzIGZpbGUsIGltcG9ydGluZyB0byBkYXRhYmFzZS5cIik7XHJcbiAgICAgICAgdGhpcy5JbXBvcnRSb3V0ZXMoKTtcclxuICAgICAgfSlcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgSW1wb3J0Um91dGVzKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuRHJvcFJvdXRlc0NvbGxlY3Rpb24oKTtcclxuXHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkltcG9ydGluZyByb3V0ZXMgdG8gbW9uZ29kYlwiKTtcclxuXHJcbiAgICBhd2FpdCBleGVjKFwibW9uZ29pbXBvcnQgLS1kYiB0YWlvdmEgLS1jb2xsZWN0aW9uIHJvdXRlcyAtLWZpbGUgLi9HVEZTL2NvbnZlcnRlZC9yb3V0ZXMuanNvblwiLCAoZXJyb3IsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBlcnJvcjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHN0ZGVycikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBzdGRlcnI6ICR7c3RkZXJyfWApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coYHN0ZG91dDogJHtzdGRvdXR9YCk7XHJcbiAgICB9KTtcclxuXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgc2hhcGVzIGZyb20gdGhlIHNwZWNpZmllZCBVUkwgaW4gdGhlIC5lbnYgLCBvciBcIi4uL0dURlMvZXh0cmFjdGVkL3JvdXRlcy5qc29uXCIgdG8gdGhlIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gICBwcml2YXRlIEluaXRTaGFwZXMgKCkge1xyXG4gICAgY29uc3Qgcm91dGVzUGF0aCA9IHJlc29sdmUoXCJHVEZTL2V4dHJhY3RlZC9zaGFwZXMudHh0Lmpzb25cIik7XHJcbiAgICBjb25zdCBvdXRwdXRQYXRoID0gcmVzb2x2ZShcIkdURlMvY29udmVydGVkL3NoYXBlcy5qc29uXCIpO1xyXG4gICAgZnMucmVhZEZpbGUocm91dGVzUGF0aCwgJ3V0ZjgnLCBhc3luYyhlcnJvciwgZGF0YSkgPT4geyBcclxuICAgICAgaWYoZXJyb3IpIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICBpZihkYXRhICYmIHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiTG9hZGVkIHNoYXBlcyBmaWxlIGludG8gbWVtb3J5LlwiKTtcclxuICAgICAgZGF0YSA9IGRhdGEudHJpbSgpO1xyXG4gICAgICBjb25zdCBsaW5lcyA9IGRhdGEuc3BsaXQoXCJcXG5cIik7XHJcbiAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3V0cHV0UGF0aClcclxuXHJcbiAgICAgIGZvcihsZXQgbGluZSBvZiBsaW5lcykge1xyXG4gICAgICAgIGNvbnN0IHNoYXBlSnNvbiA6IEFwaVNoYXBlID0gSlNPTi5wYXJzZShsaW5lKTtcclxuICAgICAgICBjb25zdCBzaGFwZSA6IFNoYXBlID0ge1xyXG4gICAgICAgICAgc2hhcGVJZDogcGFyc2VJbnQoc2hhcGVKc29uLnNoYXBlX2lkKSxcclxuICAgICAgICAgIHNoYXBlU2VxdWVuY2VOdW1iZXI6IHBhcnNlSW50KHNoYXBlSnNvbi5zaGFwZV9wdF9zZXF1ZW5jZSksXHJcbiAgICAgICAgICBQb3NpdGlvbjogW3BhcnNlRmxvYXQoc2hhcGVKc29uLnNoYXBlX3B0X2xhdCksIHBhcnNlRmxvYXQoc2hhcGVKc29uLnNoYXBlX3B0X2xvbildLFxyXG4gICAgICAgICAgRGlzdGFuY2VTaW5jZUxhc3RQb2ludDogcGFyc2VJbnQoc2hhcGVKc29uLnNoYXBlX2Rpc3RfdHJhdmVsZWQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB3cml0ZVN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeShzaGFwZSkgKyBcIlxcblwiKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgd3JpdGVTdHJlYW0uZW5kKCgpID0+IHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkZpbmlzaGVkIHdyaXRpbmcgc2hhcGVzIGZpbGUsIGltcG9ydGluZyB0byBkYXRhYmFzZS5cIik7XHJcbiAgICAgICAgdGhpcy5JbXBvcnRTaGFwZXMoKTtcclxuICAgICAgfSlcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgSW1wb3J0U2hhcGVzKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuRHJvcFNoYXBlc0NvbGxlY3Rpb24oKTtcclxuXHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkltcG9ydGluZyBzaGFwZXMgdG8gbW9uZ29kYlwiKTtcclxuXHJcbiAgICBhd2FpdCBleGVjKFwibW9uZ29pbXBvcnQgLS1kYiB0YWlvdmEgLS1jb2xsZWN0aW9uIHNoYXBlcyAtLWZpbGUgLi9HVEZTL2NvbnZlcnRlZC9zaGFwZXMuanNvblwiLCAoZXJyb3IsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBlcnJvcjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHN0ZGVycikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBzdGRlcnI6ICR7c3RkZXJyfWApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coYHN0ZG91dDogJHtzdGRvdXR9YCk7XHJcbiAgICB9KTtcclxuXHJcbiAgfVxyXG59IiwiaW1wb3J0IHsgQ29ubmVjdGlvbiwgTW9kZWwsIE1vbmdvb3NlLCBGaWx0ZXJRdWVyeSwgU2NoZW1hIH0gZnJvbSAnbW9uZ29vc2UnO1xyXG5pbXBvcnQgeyBUcmlwIH0gZnJvbSAnLi90eXBlcy9UcmlwJztcclxuaW1wb3J0IHsgVmVoaWNsZURhdGEsIHZlaGljbGVTdGF0ZSB9IGZyb20gJy4vdHlwZXMvVmVoaWNsZURhdGEnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgUm91dGUgfSBmcm9tICcuL3R5cGVzL1JvdXRlJztcclxuaW1wb3J0IHsgU2hhcGUgfSBmcm9tICcuL3R5cGVzL1NoYXBlJztcclxuaW1wb3J0IHsgVHJpcFBvc2l0aW9uRGF0YSB9IGZyb20gJy4vdHlwZXMvVHJpcFBvc2l0aW9uRGF0YSc7XHJcbmltcG9ydCB7IFdlYnNvY2tldFZlaGljbGVEYXRhIH0gZnJvbSAnLi90eXBlcy9XZWJzb2NrZXRWZWhpY2xlRGF0YSc7XHJcbmNvbnN0IHN0cmVhbVRvTW9uZ29EQiA9IHJlcXVpcmUoJ3N0cmVhbS10by1tb25nby1kYicpLnN0cmVhbVRvTW9uZ29EQjtcclxuY29uc3Qgc3BsaXQgPSByZXF1aXJlKCdzcGxpdCcpO1xyXG5leHBvcnQgY2xhc3MgRGF0YWJhc2Uge1xyXG4gIFxyXG4gIHByaXZhdGUgc3RhdGljIGluc3RhbmNlIDogRGF0YWJhc2U7XHJcbiAgXHJcbiAgcHJpdmF0ZSBkYiA6IENvbm5lY3Rpb247XHJcbiAgcHJpdmF0ZSBtb25nb29zZSA6IE1vbmdvb3NlO1xyXG4gIHByaXZhdGUgdmVoaWNsZVNjaGVtYSA6IFNjaGVtYTtcclxuICBwcml2YXRlIHRyaXBzU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgcm91dGVzU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgc2hhcGVzU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgZHJpdmVuUm91dGVzU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgdmVoaWNsZU1vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgdHJpcE1vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgcm91dGVzTW9kZWwgOiB0eXBlb2YgTW9kZWw7XHJcbiAgcHJpdmF0ZSBzaGFwZXNNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIGRyaXZlblJvdXRlc01vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgb3V0cHV0REJDb25maWc7XHJcblxyXG4gIHB1YmxpYyBzdGF0aWMgZ2V0SW5zdGFuY2UoKTogRGF0YWJhc2Uge1xyXG4gICAgaWYoIURhdGFiYXNlLmluc3RhbmNlKVxyXG4gICAgICBEYXRhYmFzZS5pbnN0YW5jZSA9IG5ldyBEYXRhYmFzZSgpO1xyXG5cclxuICAgIHJldHVybiBEYXRhYmFzZS5pbnN0YW5jZTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBJbml0KCkge1xyXG4gICAgY29uc3QgdXJsIDogc3RyaW5nID0gcHJvY2Vzcy5lbnYuREFUQUJBU0VfVVJMO1xyXG4gICAgY29uc3QgbmFtZSA6IHN0cmluZyA9IHByb2Nlc3MuZW52LkRBVEFCQVNFX05BTUU7XHJcblxyXG4gICAgdGhpcy5tb25nb29zZSA9IG5ldyBNb25nb29zZSgpO1xyXG4gICAgXHJcbiAgICB0aGlzLm1vbmdvb3NlLnNldCgndXNlRmluZEFuZE1vZGlmeScsIGZhbHNlKVxyXG5cclxuICAgIGlmKCF1cmwgJiYgIW5hbWUpIHRocm93IChgSW52YWxpZCBVUkwgb3IgbmFtZSBnaXZlbiwgcmVjZWl2ZWQ6IFxcbiBOYW1lOiAke25hbWV9IFxcbiBVUkw6ICR7dXJsfWApXHJcblxyXG4gICAgY29uc29sZS5sb2coYENvbm5lY3RpbmcgdG8gZGF0YWJhc2Ugd2l0aCBuYW1lOiAke25hbWV9IGF0IHVybDogJHt1cmx9YClcclxuICAgIHRoaXMubW9uZ29vc2UuY29ubmVjdChgJHt1cmx9LyR7bmFtZX1gLCB7XHJcbiAgICAgIHVzZU5ld1VybFBhcnNlcjogdHJ1ZSxcclxuICAgICAgdXNlVW5pZmllZFRvcG9sb2d5OiB0cnVlLFxyXG4gICAgICBwb29sU2l6ZTogMTIwXHJcbiAgICB9KVxyXG5cclxuICAgIHRoaXMuZGIgPSB0aGlzLm1vbmdvb3NlLmNvbm5lY3Rpb247XHJcblxyXG4gICAgdGhpcy5vdXRwdXREQkNvbmZpZyA9IHsgZGJVUkwgOiBgJHt1cmx9LyR7bmFtZX1gLCBjb2xsZWN0aW9uIDogJ3RyaXBzJyB9O1xyXG5cclxuICAgIHRoaXMuZGIub24oJ2Vycm9yJywgZXJyb3IgPT4ge1xyXG4gICAgICB0aHJvdyBuZXcgZXJyb3IoYEVycm9yIGNvbm5lY3RpbmcgdG8gZGF0YWJhc2UuICR7ZXJyb3J9YCk7XHJcbiAgICB9KVxyXG5cclxuICAgIGF3YWl0IHRoaXMuRGF0YWJhc2VMaXN0ZW5lcigpO1xyXG5cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIEdldERhdGFiYXNlKCkgOiBDb25uZWN0aW9uIHtcclxuICAgIHJldHVybiB0aGlzLmRiO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIERhdGFiYXNlTGlzdGVuZXIgKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMsIHJlaikgPT4ge1xyXG4gICAgICAgIHRoaXMuZGIub25jZShcIm9wZW5cIiwgKCkgPT4ge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0aW9uIHRvIGRhdGFiYXNlIGVzdGFibGlzaGVkLlwiKVxyXG5cclxuICAgICAgICAgIHRoaXMudmVoaWNsZVNjaGVtYSA9IG5ldyB0aGlzLm1vbmdvb3NlLlNjaGVtYSh7XHJcbiAgICAgICAgICAgIGNvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgb3JpZ2luYWxDb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHBsYW5uaW5nTnVtYmVyOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIGpvdXJuZXlOdW1iZXI6IE51bWJlcixcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHZlaGljbGVOdW1iZXI6IE51bWJlcixcclxuICAgICAgICAgICAgcG9zaXRpb246IFtOdW1iZXIsIE51bWJlcl0sXHJcbiAgICAgICAgICAgIHN0YXR1czogU3RyaW5nLFxyXG4gICAgICAgICAgICBwdW5jdHVhbGl0eTogQXJyYXksXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogTnVtYmVyLFxyXG4gICAgICAgICAgICB1cGRhdGVkQXQ6IE51bWJlcixcclxuICAgICAgICAgICAgdXBkYXRlZFRpbWVzOiBBcnJheSxcclxuICAgICAgICAgICAgY3VycmVudFJvdXRlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgY3VycmVudFRyaXBJZDogTnVtYmVyLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHRoaXMudHJpcHNTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgc2VydmljZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRyaXBJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB0cmlwTnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRyaXBQbGFubmluZ051bWJlcjogU3RyaW5nLFxyXG4gICAgICAgICAgICB0cmlwSGVhZHNpZ246IFN0cmluZyxcclxuICAgICAgICAgICAgdHJpcE5hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgZGlyZWN0aW9uSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgc2hhcGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICB3aGVlbGNoYWlyQWNjZXNzaWJsZTogTnVtYmVyXHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIHRoaXMucm91dGVzU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgcm91dGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHN1YkNvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVTaG9ydE5hbWU6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVMb25nTmFtZTogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZURlc2NyaXB0aW9uOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlVHlwZTogTnVtYmVyLFxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLnNoYXBlc1NjaGVtYSA9IG5ldyB0aGlzLm1vbmdvb3NlLlNjaGVtYSh7XHJcbiAgICAgICAgICAgIHNoYXBlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgc2hhcGVTZXF1ZW5jZU51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICBQb3NpdGlvbjogW051bWJlciwgTnVtYmVyXSxcclxuICAgICAgICAgICAgRGlzdGFuY2VTaW5jZUxhc3RQb2ludDogTnVtYmVyXHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIHRoaXMuZHJpdmVuUm91dGVzU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgdHJpcElkIDogTnVtYmVyLFxyXG4gICAgICAgICAgICBjb21wYW55IDogU3RyaW5nLFxyXG4gICAgICAgICAgICBwb3NpdGlvbnM6IEFycmF5LFxyXG4gICAgICAgICAgICB1cGRhdGVkVGltZXMgOiBBcnJheVxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICB0aGlzLnRyaXBzU2NoZW1hLmluZGV4KHsgdHJpcE51bWJlcjogLTEsIHRyaXBQbGFubmluZ051bWJlcjogLTEsIGNvbXBhbnk6IC0xIH0pXHJcbiAgICAgICAgICB0aGlzLnJvdXRlc1NjaGVtYS5pbmRleCh7IGNvbXBhbnk6IC0xLCBzdWJDb21wYW55OiAtMSwgcm91dGVTaG9ydE5hbWU6IC0xICwgcm91dGVMb25nTmFtZTogLTF9KVxyXG4gICAgICAgICAgdGhpcy5zaGFwZXNTY2hlbWEuaW5kZXgoeyBzaGFwZUlkOiAtMSB9KVxyXG4gICAgICAgICAgdGhpcy5kcml2ZW5Sb3V0ZXNTY2hlbWEuaW5kZXgoeyB0cmlwSWQ6IC0xLCBjb21wYW55OiAtMSB9KVxyXG5cclxuICAgICAgICAgIHRoaXMudmVoaWNsZU1vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcIlZlaGljbGVQb3NpdGlvbnNcIiwgdGhpcy52ZWhpY2xlU2NoZW1hKTtcclxuICAgICAgICAgIHRoaXMudHJpcE1vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcInRyaXBzXCIsIHRoaXMudHJpcHNTY2hlbWEpO1xyXG4gICAgICAgICAgdGhpcy5yb3V0ZXNNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJyb3V0ZXNcIiwgdGhpcy5yb3V0ZXNTY2hlbWEpO1xyXG4gICAgICAgICAgdGhpcy5zaGFwZXNNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJzaGFwZXNcIiwgdGhpcy5zaGFwZXNTY2hlbWEpO1xyXG4gICAgICAgICAgdGhpcy5kcml2ZW5Sb3V0ZXNNb2RlbCA9IHRoaXMubW9uZ29vc2UubW9kZWwoXCJkcml2ZW5yb3V0ZXNcIiwgdGhpcy5kcml2ZW5Sb3V0ZXNTY2hlbWEpO1xyXG5cclxuICAgICAgICAgIHRoaXMudHJpcE1vZGVsLmNyZWF0ZUluZGV4ZXMoKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgcmVzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0QWxsVmVoaWNsZXMgKGFyZ3MgPSB7fSkgOiBQcm9taXNlPEFycmF5PFZlaGljbGVEYXRhPj4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmQoey4uLmFyZ3N9LCB7IHB1bmN0dWFsaXR5OiAwLCB1cGRhdGVkVGltZXM6IDAsIF9fdiA6IDAgfSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0QWxsVmVoaWNsZXNTbWFsbCAoYXJncyA9IHt9KSA6IFByb21pc2U8QXJyYXk8V2Vic29ja2V0VmVoaWNsZURhdGE+PiB7XHJcbiAgICBjb25zdCBzbWFsbEJ1c3NlcyA6IEFycmF5PFdlYnNvY2tldFZlaGljbGVEYXRhPiA9IFtdO1xyXG5cclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmQoey4uLmFyZ3N9LFxyXG4gICAgICB7IFxyXG4gICAgICBwdW5jdHVhbGl0eTogMCwgXHJcbiAgICAgIHVwZGF0ZWRUaW1lczogMCwgXHJcbiAgICAgIF9fdiA6IDAsXHJcbiAgICAgIGpvdXJuZXlOdW1iZXI6IDAsXHJcbiAgICAgIHRpbWVzdGFtcCA6IDAsXHJcbiAgICAgIGxpbmVOVW1iZXI6IDAsXHJcbiAgICAgIGNyZWF0ZWRBdDogMCxcclxuICAgICAgdXBkYXRlZEF0OiAwLFxyXG4gICAgICBjdXJyZW50Um91dGVJZDogMCxcclxuICAgICAgY3VycmVudFRyaXBJZDogMCxcclxuICAgICAgcGxhbm5pbmdOdW1iZXI6IDAsXHJcbiAgICAgIHN0YXR1czogMFxyXG4gICAgfSlcclxuXHJcbiAgICByZXN1bHQuZm9yRWFjaChyZXMgPT4ge1xyXG4gICAgICBzbWFsbEJ1c3Nlcy5wdXNoKHtcclxuICAgICAgICBwOiByZXMucG9zaXRpb24sXHJcbiAgICAgICAgYzogcmVzLmNvbXBhbnksIFxyXG4gICAgICAgIHY6IHJlcy52ZWhpY2xlTnVtYmVyXHJcbiAgICAgIH0pXHJcbiAgICB9KVxyXG4gICAgcmV0dXJuIHNtYWxsQnVzc2VzO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFZlaGljbGUgKHZlaGljbGVOdW1iZXIsIHRyYW5zcG9ydGVyLCBmaXJzdE9ubHkgOiBib29sZWFuID0gZmFsc2UpIDogUHJvbWlzZTxWZWhpY2xlRGF0YT4ge1xyXG4gICAgcmV0dXJuIHsgXHJcbiAgICAgIC4uLmF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmRPbmUoe1xyXG4gICAgICAgIHZlaGljbGVOdW1iZXIgOiB2ZWhpY2xlTnVtYmVyLFxyXG4gICAgICAgIGNvbXBhbnk6IHRyYW5zcG9ydGVyXHJcbiAgICAgIH0pXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFJlbW92ZVZlaGljbGVzV2hlcmUoIHBhcmFtcyA6IG9iamVjdCwgZG9Mb2dnaW5nIDogYm9vbGVhbiA9IGZhbHNlKSA6IFByb21pc2U8QXJyYXk8VmVoaWNsZURhdGE+PiB7XHJcbiAgICBjb25zdCByZW1vdmVkVmVoaWNsZXMgOiBBcnJheTxWZWhpY2xlRGF0YT4gPSBhd2FpdCB0aGlzLkdldEFsbFZlaGljbGVzKHBhcmFtcyk7XHJcbiAgICB0aGlzLnZlaGljbGVNb2RlbC5kZWxldGVNYW55KHBhcmFtcykudGhlbihyZXNwb25zZSA9PiB7XHJcbiAgICAgIGlmKGRvTG9nZ2luZykgY29uc29sZS5sb2coYERlbGV0ZWQgJHtyZXNwb25zZS5kZWxldGVkQ291bnR9IHZlaGljbGVzLmApO1xyXG4gICAgICBcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHJlbW92ZWRWZWhpY2xlcztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRUcmlwKHRyaXBOdW1iZXIgOiBudW1iZXIsIHRyaXBQbGFubmluZ051bWJlciA6IHN0cmluZywgY29tcGFueTogc3RyaW5nKSB7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnRyaXBNb2RlbC5maW5kT25lKHtcclxuICAgICAgY29tcGFueTogY29tcGFueSxcclxuICAgICAgdHJpcE51bWJlciA6IHRyaXBOdW1iZXIsXHJcbiAgICAgIHRyaXBQbGFubmluZ051bWJlcjogdHJpcFBsYW5uaW5nTnVtYmVyXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcmVzcG9uc2UgIT09IG51bGwgPyByZXNwb25zZSA6IHt9O1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIERyb3BUcmlwc0NvbGxlY3Rpb24oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwaW5nIHRyaXBzIGNvbGxlY3Rpb25cIik7XHJcbiAgICBhd2FpdCB0aGlzLnRyaXBNb2RlbC5yZW1vdmUoe30pO1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGVkIHRyaXBzIGNvbGxlY3Rpb25cIik7XHJcbiAgfVxyXG4gIFxyXG4gIHB1YmxpYyBhc3luYyBEcm9wUm91dGVzQ29sbGVjdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBpbmcgcm91dGVzIGNvbGxlY3Rpb25cIik7XHJcbiAgICBhd2FpdCB0aGlzLnJvdXRlc01vZGVsLnJlbW92ZSh7fSk7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwZWQgcm91dGVzIGNvbGxlY3Rpb25cIik7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgRHJvcFNoYXBlc0NvbGxlY3Rpb24oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwaW5nIHNoYXBlcyBjb2xsZWN0aW9uXCIpO1xyXG4gICAgYXdhaXQgdGhpcy5zaGFwZXNNb2RlbC5yZW1vdmUoe30pO1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGVkIHNoYXBlcyBjb2xsZWN0aW9uXCIpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFJvdXRlKHJvdXRlSWQgOiBudW1iZXIpIDogUHJvbWlzZTxSb3V0ZT4ge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnJvdXRlc01vZGVsLmZpbmRPbmUoe1xyXG4gICAgICByb3V0ZUlkIDogcm91dGVJZCxcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiByZXNwb25zZSAhPT0gbnVsbCA/IHJlc3BvbnNlIDoge307XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0U2hhcGUoc2hhcGVJZCA6IG51bWJlcikgOiBQcm9taXNlPEFycmF5PFNoYXBlPj4ge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnNoYXBlc01vZGVsLmZpbmQoe1xyXG4gICAgICBzaGFwZUlkIDogc2hhcGVJZCxcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiByZXNwb25zZSAhPT0gW10gPyByZXNwb25zZSA6IFtdO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFRyaXBQb3NpdGlvbnModHJpcElkIDogbnVtYmVyLCBjb21wYW55IDogc3RyaW5nKSA6IFByb21pc2U8VHJpcFBvc2l0aW9uRGF0YT4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuZHJpdmVuUm91dGVzTW9kZWwuZmluZE9uZSh7IFxyXG4gICAgICB0cmlwSWQ6IHRyaXBJZCxcclxuICAgICAgY29tcGFueTogY29tcGFueSxcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0Um91dGVzQnlTdHJpbmcgKHF1ZXJ5IDogc3RyaW5nKSA6IFByb21pc2U8QXJyYXk8Um91dGU+PiB7ICAgIFxyXG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5yb3V0ZXNNb2RlbC5maW5kKFxyXG4gICAgICAgIHsgXHJcbiAgICAgICAgICAkb3I6IFsgXHJcbiAgICAgICAgICAgIHsgcm91dGVMb25nTmFtZSA6IG5ldyBSZWdFeHAocXVlcnksICdpJykgfSwgXHJcbiAgICAgICAgICAgIHsgY29tcGFueSA6IG5ldyBSZWdFeHAocXVlcnksICdpJykgfSwgeyBzdWJDb21wYW55OiBuZXcgUmVnRXhwKHF1ZXJ5LCAnaScpIH0sIFxyXG4gICAgICAgICAgICB7IHJvdXRlU2hvcnROYW1lIDogcXVlcnkgfVxyXG4gICAgICAgICAgXSBcclxuICAgICAgICB9XHJcbiAgICAgIClcclxuICB9IFxyXG4gIFxyXG4gIHB1YmxpYyBhc3luYyBHZXRWZWhpY2xlc0J5Um91dGVJZCAocm91dGVJZCA6IG51bWJlcikgOiBQcm9taXNlPEFycmF5PFZlaGljbGVEYXRhPj4ge1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmQoeyBcclxuICAgICAgY3VycmVudFJvdXRlSWQ6IHJvdXRlSWRcclxuICAgIH0pXHJcbiAgfVxyXG5cclxufVxyXG4iLCIvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBBUFAgQ09ORklHXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5cclxuaW1wb3J0ICogYXMgZG90ZW52IGZyb20gJ2RvdGVudic7XHJcbmRvdGVudi5jb25maWcoKTtcclxuXHJcbmNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDMwMDE7XHJcblxyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBZQVJOIElNUE9SVFNcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcbmltcG9ydCAqIGFzIGh0dHBzIGZyb20gJ2h0dHBzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5cclxuY29uc3QgZXhwcmVzcyA9IHJlcXVpcmUoXCJleHByZXNzXCIpO1xyXG5jb25zdCBjb3JzID0gcmVxdWlyZShcImNvcnNcIik7XHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICBDVVNUT00gSU1QT1JUU1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuXHJcbmltcG9ydCB7IERhdGFiYXNlIH0gZnJvbSAnLi9kYXRhYmFzZSc7XHJcbmltcG9ydCB7IFdlYlNlcnZlciB9IGZyb20gJy4vd2Vic2VydmVyJztcclxuaW1wb3J0IHsgQnVzTG9naWMgfSBmcm9tICcuL2J1c2xvZ2ljJztcclxuaW1wb3J0IHsgRG93bmxvYWRlciB9IGZyb20gJy4vZG93bmxvYWRlcic7XHJcblxyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBTU0wgQ09ORklHXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5jb25zdCBwcml2YXRlS2V5ID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9rZXkua2V5XCIpLnRvU3RyaW5nKCk7XHJcbmNvbnN0IGNlcnRpZmljYXRlID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9jZXJ0LmNydFwiKS50b1N0cmluZygpO1xyXG5jb25zdCBjYSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUva2V5LWNhLmNydFwiKS50b1N0cmluZygpO1xyXG5cclxuY29uc3QgQXBwSW5pdCA9IGFzeW5jICgpID0+IHtcclxuICBjb25zdCBkYiA9IGF3YWl0IERhdGFiYXNlLmdldEluc3RhbmNlKCkuSW5pdCgpLnRoZW4oKTtcclxuICBjb25zdCBhcHAgPSAobW9kdWxlLmV4cG9ydHMgPSBleHByZXNzKCkpO1xyXG5cclxuICBjb25zdCBzZXJ2ZXIgPSBodHRwcy5jcmVhdGVTZXJ2ZXIoXHJcbiAgICB7XHJcbiAgICAgIGtleTogcHJpdmF0ZUtleSxcclxuICAgICAgY2VydDogY2VydGlmaWNhdGUsXHJcbiAgICAgIGNhOiBjYSxcclxuICAgICAgcmVxdWVzdENlcnQ6IHRydWUsXHJcbiAgICAgIHJlamVjdFVuYXV0aG9yaXplZDogZmFsc2UsXHJcbiAgICB9LFxyXG4gICAgYXBwXHJcbiAgKTtcclxuICBcclxuXHJcbiAgY29uc3QgY29yc09wdGlvbnMgPSB7XHJcbiAgICBvcmlnaW46ICcqJyxcclxuICAgIG9wdGlvbnNTdWNjZXNzU3RhdHVzOiAyMDBcclxuICB9XHJcblxyXG4gIGFwcC51c2UoY29ycyhjb3JzT3B0aW9ucykpXHJcbiAgYXBwLm9wdGlvbnMoJyonLCBjb3JzKCkpXHJcblxyXG5cclxuICBuZXcgV2ViU2VydmVyKGFwcCwgZGIpO1xyXG4gIGNvbnN0IGJ1c0xvZ2ljID0gbmV3IEJ1c0xvZ2ljKGRiLCB0cnVlKTtcclxuICAvL25ldyBEb3dubG9hZGVyKGRiKTtcclxuICAvL2J1c0xvZ2ljLkluaXRLVjc4KCk7XHJcbiAgXHJcbiAgc2VydmVyLmxpc3Rlbihwb3J0LCAoKSA9PiBjb25zb2xlLmxvZyhgTGlzdGVuaW5nIGF0IGh0dHA6Ly9sb2NhbGhvc3Q6JHtwb3J0fWApKTtcclxuXHJcbn1cclxuXHJcbkFwcEluaXQoKTtcclxuIiwiaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tIFwiLi9kYXRhYmFzZVwiO1xyXG5pbXBvcnQgeyBSb3V0ZSB9IGZyb20gXCIuL3R5cGVzL1JvdXRlXCI7XHJcbmltcG9ydCB7IFZlaGljbGVEYXRhIH0gZnJvbSBcIi4vdHlwZXMvVmVoaWNsZURhdGFcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBTZWFyY2hIYW5kbGVyIHtcclxuXHJcbiAgcHJpdmF0ZSBkYXRhYmFzZTogRGF0YWJhc2U7XHJcbiAgY29uc3RydWN0b3IoZGIgOiBEYXRhYmFzZSkge1xyXG4gICAgdGhpcy5Jbml0KCk7XHJcbiAgICB0aGlzLmRhdGFiYXNlID0gZGI7XHJcbiAgfVxyXG5cclxuICBhc3luYyBJbml0KCkge1xyXG4gICAgXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgU2VhcmNoRm9yRXZlcnl0aGluZyhzZWFyY2hTdHJpbmcgOiBzdHJpbmcsIGxpbWl0IDogbnVtYmVyKSA6IFByb21pc2U8YW55PiB7XHJcblxyXG4gICAgLy8gY29uc3QgcHJpb3JpdGllcyA9IHtcclxuICAgIC8vICAgUk9VVEUgOiAxMCxcclxuICAgIC8vICAgVFJJUCA6IDUsXHJcbiAgICAvLyAgIENPTVBBTlk6IDFcclxuICAgIC8vIH1cclxuXHJcbiAgICBjb25zdCBzZXBlcmF0ZVRlcm1zID0gc2VhcmNoU3RyaW5nLnNwbGl0KFwiIFwiKTtcclxuICAgIGNvbnN0IGZpcnN0VGVybSA9IHNlcGVyYXRlVGVybXNbMF07XHJcblxyXG4gICAgY29uc3QgZm91bmRSb3V0ZXNCeUZpcnN0VGVybSA6IEFycmF5PFJvdXRlPiA9IGF3YWl0IHRoaXMuR2V0Um91dGVzKGZpcnN0VGVybSk7XHJcblxyXG4gICAgY29uc3QgZm91bmRSb3V0ZXNCeVRlcm1zIDogQXJyYXk8Um91dGU+ID0gW107XHJcbiAgICBmb3VuZFJvdXRlc0J5Rmlyc3RUZXJtLmZvckVhY2gocm91dGUgPT4ge1xyXG4gICAgICBcclxuICAgICAgbGV0IGZvdW5kVGVybXMgPSAwO1xyXG4gICAgICBzZXBlcmF0ZVRlcm1zLmZvckVhY2godGVybSA9PiB7XHJcbiAgICAgICAgaWYocm91dGUucm91dGVMb25nTmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHRlcm0udG9Mb3dlckNhc2UoKSkgfHwgcm91dGUucm91dGVTaG9ydE5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyh0ZXJtLnRvTG93ZXJDYXNlKCkpIHx8IHJvdXRlLnN1YkNvbXBhbnkudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyh0ZXJtLnRvTG93ZXJDYXNlKCkpIHx8IHJvdXRlLmNvbXBhbnkudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyh0ZXJtLnRvTG93ZXJDYXNlKCkpKVxyXG4gICAgICAgICAgZm91bmRUZXJtcysrO1xyXG4gICAgICB9KVxyXG5cclxuICAgICAgaWYoZm91bmRUZXJtcyA9PSBzZXBlcmF0ZVRlcm1zLmxlbmd0aCkgZm91bmRSb3V0ZXNCeVRlcm1zLnB1c2gocm91dGUpO1xyXG5cclxuICAgIH0pIFxyXG4gICAgICAgICAgIFxyXG4gICAgXHJcbiAgICByZXR1cm4gZm91bmRSb3V0ZXNCeVRlcm1zLnNsaWNlKDAsIGxpbWl0KTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRSb3V0ZXMgKHNlYXJjaFN0cmluZzogc3RyaW5nKSA6IFByb21pc2U8QXJyYXk8Um91dGU+PiAge1xyXG4gICAgY29uc3QgZm91bmRSb3V0ZXMgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFJvdXRlc0J5U3RyaW5nKHNlYXJjaFN0cmluZyk7XHJcbiAgICByZXR1cm4gZm91bmRSb3V0ZXM7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgU2VhcmNoRm9yVHJpcFNpZ24gKHNlYXJjaFN0cmluZzogc3RyaW5nKSA6IGFueSB7XHJcblxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIFNlYXJjaEZvclZlaGljbGVCeVJvdXRlIChyb3V0ZUlkIDogbnVtYmVyKSB7XHJcbiAgICByZXR1cm4gdGhpcy5kYXRhYmFzZS5HZXRWZWhpY2xlc0J5Um91dGVJZChyb3V0ZUlkKTtcclxuICB9XHJcblxyXG59IiwiaW1wb3J0IHsgRGF0YWJhc2UgfSBmcm9tIFwiLi9kYXRhYmFzZVwiO1xyXG5pbXBvcnQgeyBTZWFyY2hIYW5kbGVyIH0gZnJvbSBcIi4vc2VhcmNoaGFuZGxlclwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFdlYlNlcnZlciB7XHJcblxyXG4gIHByaXZhdGUgYXBwO1xyXG4gIHByaXZhdGUgZGF0YWJhc2UgOiBEYXRhYmFzZTtcclxuICBwcml2YXRlIHNlYXJjaEhhbmRsZXIgOiBTZWFyY2hIYW5kbGVyO1xyXG4gIGNvbnN0cnVjdG9yKGFwcCwgZGF0YWJhc2UgOiBEYXRhYmFzZSkge1xyXG4gICAgdGhpcy5hcHAgPSBhcHA7XHJcbiAgICB0aGlzLmRhdGFiYXNlID0gZGF0YWJhc2U7XHJcbiAgICB0aGlzLnNlYXJjaEhhbmRsZXIgPSBuZXcgU2VhcmNoSGFuZGxlcihkYXRhYmFzZSk7XHJcbiAgICB0aGlzLkluaXRpYWxpemUoKTtcclxuICB9XHJcblxyXG4gIEluaXRpYWxpemUoKSB7XHJcbiAgICB0aGlzLmFwcC5nZXQoXCIvXCIsIChyZXEsIHJlcykgPT4gcmVzLnNlbmQoXCJUaGlzIGlzIHRoZSBBUEkgZW5kcG9pbnQgZm9yIHRoZSBUQUlPVkEgYXBwbGljYXRpb24uXCIpKTtcclxuXHJcbiAgICB0aGlzLmFwcC5nZXQoXCIvYnVzc2VzXCIsIGFzeW5jIChyZXEsIHJlcykgPT4gcmVzLnNlbmQoXHJcbiAgICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0QWxsVmVoaWNsZXNTbWFsbCgpXHJcbiAgICApKVxyXG5cclxuICAgIHRoaXMuYXBwLmdldChcIi9idXNzZXMvOmNvbXBhbnkvOm51bWJlclwiLCBhc3luYyAocmVxLCByZXMpID0+IHtcclxuICAgICAgXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRWZWhpY2xlKHJlcS5wYXJhbXMubnVtYmVyLCByZXEucGFyYW1zLmNvbXBhbnksIHRydWUpO1xyXG4gICAgICAgIGlmKE9iamVjdC5rZXlzKHJlc3VsdCkubGVuZ3RoID4gMCkgXHJcbiAgICAgICAgICByZXMuc2VuZChyZXN1bHRbXCJfZG9jXCJdKTtcclxuICAgICAgICBlbHNlIFxyXG4gICAgICAgICAgcmVzLnNlbmQoe30pICBcclxuICAgICAgfVxyXG4gICAgICBjYXRjaChlcnJvcikgeyByZXMuc2VuZChlcnJvci5tZXNzYWdlKSB9XHJcblxyXG4gICAgIH0pXHJcbiAgICBcclxuICAgICB0aGlzLmFwcC5nZXQoXCIvYnVzc2VzLzpyb3V0ZUlkXCIsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xyXG4gICAgICBcclxuICAgICAgdHJ5IHtcclxuICAgICAgICByZXMuc2VuZChhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFZlaGljbGVzQnlSb3V0ZUlkKHJlcS5wYXJhbXMucm91dGVJZCkpO1xyXG4gICAgICB9XHJcbiAgICAgIGNhdGNoKGVycm9yKSB7IHJlcy5zZW5kKGVycm9yLm1lc3NhZ2UpIH1cclxuXHJcbiAgICAgfSlcclxuICAgIHRoaXMuYXBwLmdldChcIi90cmlwLzpjb21wYW55LzpwbGFubmluZ251bWJlci86dHJpcG51bWJlclwiLCBhc3luYyhyZXEsIHJlcykgPT4ge1xyXG4gICAgICBcclxuICAgICAgdHJ5IHsgcmVzLnNlbmQoYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRUcmlwKHJlcS5wYXJhbXMudHJpcG51bWJlciwgcmVxLnBhcmFtcy5wbGFubmluZ251bWJlciwgcmVxLnBhcmFtcy5jb21wYW55KSk7IH1cclxuICAgICAgY2F0Y2goZXJyb3IpIHsgcmVzLnNlbmQoZXJyb3IubWVzc2FnZSkgfVxyXG5cclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy5hcHAuZ2V0KFwiL3JvdXRlLzpyb3V0ZW51bWJlclwiLCBhc3luYyhyZXEsIHJlcykgPT4ge1xyXG4gICAgICBcclxuXHJcbiAgICAgIHRyeSB7IHJlcy5zZW5kKGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0Um91dGUocmVxLnBhcmFtcy5yb3V0ZW51bWJlcikpOyB9XHJcbiAgICAgIGNhdGNoKGVycm9yKSB7IHJlcy5zZW5kKGVycm9yLm1lc3NhZ2UpIH1cclxuXHJcbiAgICB9KVxyXG5cclxuICAgIHRoaXMuYXBwLmdldChcIi9zaGFwZS86c2hhcGVudW1iZXJcIiwgYXN5bmMocmVxLCByZXMpID0+IHtcclxuICAgICAgXHJcbiAgICAgIHRyeSB7IHJlcy5zZW5kKGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0U2hhcGUocmVxLnBhcmFtcy5zaGFwZW51bWJlcikpOyB9XHJcbiAgICAgIGNhdGNoKGVycm9yKSB7IHJlcy5zZW5kKGVycm9yLm1lc3NhZ2UpIH1cclxuXHJcbiAgICB9KVxyXG5cclxuICAgIHRoaXMuYXBwLmdldChcIi90cmlwZGF0YS86Y29tcGFueS86dHJpcElkXCIsIGFzeW5jKHJlcSwgcmVzKSA9PiB7XHJcbiAgICAgIHRyeSB7IFxyXG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRUcmlwUG9zaXRpb25zKHJlcS5wYXJhbXMudHJpcElkLCByZXEucGFyYW1zLmNvbXBhbnkpO1xyXG4gICAgICAgIGNvbnN0IHNvcnRlZFBvc2l0aW9ucyA9IHJlc3BvbnNlLnBvc2l0aW9ucy5zb3J0KChhLCBiKSA9PiBNYXRoLnNxcnQoYVswXSArIGFbMV0pIC0gTWF0aC5zcXJ0KGFbMF0gKyBiWzFdKSlcclxuICAgICAgICByZXNwb25zZS5wb3NpdGlvbnMgPSBzb3J0ZWRQb3NpdGlvbnM7XHJcbiAgICAgICAgcmVzLnNlbmQocmVzcG9uc2UpOyB9XHJcbiAgICAgIGNhdGNoKGVycm9yKSB7IHJlcy5zZW5kKGVycm9yLm1lc3NhZ2UpIH0gICAgICBcclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy5hcHAuZ2V0KFwiL3NlYXJjaC86cXVlcnkvOmxpbWl0XCIsIGFzeW5jKHJlcSwgcmVzKSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgcmVzLnNlbmQoYXdhaXQgdGhpcy5zZWFyY2hIYW5kbGVyLlNlYXJjaEZvckV2ZXJ5dGhpbmcocmVxLnBhcmFtcy5xdWVyeSwgcmVxLnBhcmFtcy5saW1pdCkpO1xyXG4gICAgICB9IGNhdGNoKGVycm9yKSB7IHJlcy5zZW5kKGVycm9yLm1lc3NhZ2UpIH1cclxuICAgIH0pXHJcbiAgfVxyXG59IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiY2hpbGRfcHJvY2Vzc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiY29yc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZG90ZW52XCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJleHByZXNzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJmc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiaHR0cHNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIm1vbmdvb3NlXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJwYXRoXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzcGxpdFwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwic3RyZWFtLXRvLW1vbmdvLWRiXCIpOzsiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gc3RhcnR1cFxuLy8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4vLyBUaGlzIGVudHJ5IG1vZHVsZSBpcyByZWZlcmVuY2VkIGJ5IG90aGVyIG1vZHVsZXMgc28gaXQgY2FuJ3QgYmUgaW5saW5lZFxudmFyIF9fd2VicGFja19leHBvcnRzX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKFwiLi9zcmMvbWFpbi50c1wiKTtcbiJdLCJzb3VyY2VSb290IjoiIn0=