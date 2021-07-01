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
     * Initializes the trips from the specified URL in the .env , or "../GTFS/converted/trips.json" to the database.
     */
    InitTripsNew() {
        const tripsPath = path_1.resolve("GTFS/converted/trips.json");
        const outputPath = path_1.resolve("GTFS/custom/trips.json");
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
        await child_process_1.exec("mongoimport --db taiova --collection trips --file ./GTFS/custom/trips.json", (error, stdout, stderr) => {
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
     * Initializes the routes from the specified URL in the .env , or "../GTFS/converted/routes.json" to the database.
     */
    InitRoutes() {
        const routesPath = path_1.resolve("GTFS/converted/routes.json");
        const outputPath = path_1.resolve("GTFS/custom/routes.json");
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
        await child_process_1.exec("mongoimport --db taiova --collection routes --file ./GTFS/custom/routes.json", (error, stdout, stderr) => {
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
     * Initializes the shapes from the specified URL in the .env , or "../GTFS/converted/routes.json" to the database.
     */
    InitShapes() {
        const routesPath = path_1.resolve("GTFS/converted/shapes.json");
        const outputPath = path_1.resolve("GTFS/custom/shapes.json");
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
        await child_process_1.exec("mongoimport --db taiova --collection shapes --file ./GTFS/custom/shapes.json", (error, stdout, stderr) => {
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

/***/ "./src/converters/date.ts":
/*!********************************!*\
  !*** ./src/converters/date.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DateYYYYMMDD = void 0;
const DateYYYYMMDD = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() < 10
        ? `0${currentDate.getMonth() + 1}`
        : currentDate.getMonth() + 1;
    const currentDay = currentDate.getUTCDate() < 10
        ? `0${currentDate.getUTCDate()}`
        : currentDate.getUTCDate();
    return `${currentYear}${currentMonth}${currentDay}`;
};
exports.DateYYYYMMDD = DateYYYYMMDD;


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

/***/ "./src/downloader.ts":
/*!***************************!*\
  !*** ./src/downloader.ts ***!
  \***************************/
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
exports.Downloader = void 0;
const fs = __importStar(__webpack_require__(/*! fs */ "fs"));
const http = __importStar(__webpack_require__(/*! http */ "http"));
const path_1 = __webpack_require__(/*! path */ "path");
const buslogic_1 = __webpack_require__(/*! ./buslogic */ "./src/buslogic.ts");
const date_1 = __webpack_require__(/*! ./converters/date */ "./src/converters/date.ts");
const extract = __webpack_require__(/*! extract-zip */ "extract-zip");
const csv = __webpack_require__(/*! csvtojson */ "csvtojson");
class Downloader {
    constructor(db) {
        this.CheckForFilesInFolder = (path) => {
            fs.readdir(path, (err, files) => {
                if (err)
                    throw err;
                if (files)
                    console.log(`Found files in ${path}, deleting before proceeding.`);
                for (const file of files) {
                    fs.unlink(`${path}/${file}`, (err) => {
                        if (err)
                            throw err;
                    });
                }
            });
        };
        this.convertCSVtoJSON = (path, file) => {
            return new Promise((resolve, reject) => {
                const newName = file.split('.')[0] + ".json";
                let newPath = `./GTFS/converted/${newName}`;
                console.log(`Started converting ${path} to ${newPath}`);
                const readStream = fs.createReadStream(path);
                const writeStream = fs.createWriteStream(newPath);
                readStream.pipe(csv()).pipe(writeStream);
                writeStream.on('finish', () => {
                    resolve("Finished!");
                });
                writeStream.on('error', () => {
                    reject(`Failed to convert ${newPath}`);
                });
            });
        };
        this.busLogic = new buslogic_1.BusLogic(db);
    }
    async DownloadGTFS(callback) {
        this.callback = callback;
        this.CheckLatestGTFS();
    }
    DownloadCentraalHalteBestand(callback) {
        this.callback = callback;
        this.CheckLatestCHB();
    }
    async ExtractFile(path) {
        try {
            const targetPath = path_1.resolve("GTFS/extracted");
            this.CheckForFilesInFolder(targetPath);
            console.log(`Starting extraction of ${path}`);
            await extract(path, { dir: targetPath });
            console.log("Extraction complete");
            this.ConvertExtractedFiles(targetPath);
        }
        catch (err) {
            // handle any errors
            console.log(err);
        }
    }
    CheckLatestGTFS() {
        const dest = process.env.GTFS_DOWNLOAD_LOCATION ? path_1.resolve(`${process.env.GTFS_DOWNLOAD_LOCATION}/${date_1.DateYYYYMMDD()}.zip`) : path_1.resolve(`GTFS/${date_1.DateYYYYMMDD()}.zip`);
        if (!fs.existsSync(dest))
            this.DownloadLatestGTFS();
        else {
            console.error("Latest GTFS already downloaded. Extracting instead...");
            this.ExtractFile(dest);
        }
    }
    async DownloadLatestGTFS() {
        const url = process.env.GTFS_URL || "http://gtfs.openov.nl/gtfs-rt/gtfs-openov-nl.zip";
        const dest = process.env.GTFS_DOWNLOAD_LOCATION ? path_1.resolve(`${process.env.GTFS_DOWNLOAD_LOCATION}/${date_1.DateYYYYMMDD()}.zip`) : path_1.resolve(`GTFS/${date_1.DateYYYYMMDD()}.zip`);
        console.log("Starting bus information download.");
        const file = fs.createWriteStream(dest);
        http.get(url, function (response) {
            response.pipe(file);
            file.on("finish", function () {
                file.close();
                console.log("Finished downloading");
                console.log("Started extracting");
                this.ExtractFile(dest);
            });
        }).on("error", function (err) {
            fs.unlink(dest, this);
            console.error(err);
        });
    }
    async DownloadLatestCHB() {
        this.callback();
    }
    async CheckLatestCHB() {
        this.DownloadLatestCHB();
    }
    ConvertExtractedFiles(path) {
        const promises = [];
        fs.readdir(path, (error, files) => {
            files.forEach((file) => {
                if (file !== "stop_times.txt")
                    promises.push(this.convertCSVtoJSON(`${path}/${file}`, file));
            });
            Promise.allSettled(promises).then((values) => {
                console.log("Done extracting!");
                this.callback();
            });
        });
    }
}
exports.Downloader = Downloader;


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
const downloader_1 = __webpack_require__(/*! ./downloader */ "./src/downloader.ts");
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
    const downloader = new downloader_1.Downloader(db);
    //Todo: Dit moet beter.
    downloader.DownloadGTFS(() => downloader.DownloadCentraalHalteBestand(() => busLogic.InitKV78()));
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

/***/ "csvtojson":
/*!****************************!*\
  !*** external "csvtojson" ***!
  \****************************/
/***/ ((module) => {

module.exports = require("csvtojson");;

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

/***/ "extract-zip":
/*!******************************!*\
  !*** external "extract-zip" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("extract-zip");;

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");;

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvYnVzbG9naWMudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL2NvbnZlcnRlcnMvZGF0ZS50cyIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvZGF0YWJhc2UudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL2Rvd25sb2FkZXIudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL21haW4udHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL3NlYXJjaGhhbmRsZXIudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL3dlYnNlcnZlci50cyIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJjaGlsZF9wcm9jZXNzXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiY29yc1wiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImNzdnRvanNvblwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImRvdGVudlwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImV4cHJlc3NcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJleHRyYWN0LXppcFwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImZzXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiaHR0cFwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImh0dHBzXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwibW9uZ29vc2VcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJwYXRoXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwic3BsaXRcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJzdHJlYW0tdG8tbW9uZ28tZGJcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL3dlYnBhY2svc3RhcnR1cCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLHVEQUErQjtBQUMvQiw2REFBeUI7QUFHekIsa0ZBQXFDO0FBTXJDLE1BQWEsUUFBUTtJQUluQixZQUFZLFFBQVEsRUFBRSxTQUFtQixLQUFLO1FBQzVDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBRXpCLElBQUcsTUFBTTtZQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBRU8sS0FBSyxDQUFDLFVBQVU7UUFDdEIsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFekIsV0FBVyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ3JCLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzNCLENBQUMsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRDs7T0FFRztJQUNJLEtBQUssQ0FBQyxXQUFXO1FBQ3RCLElBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsSUFBSSxNQUFNO1lBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQztRQUMvRSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDL0IsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLEdBQUcsQ0FBQyxFQUFFLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUNoSCxNQUFNLGVBQWUsR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsRUFBRSxTQUFTLEVBQUUs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LEtBQUssRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDNUY7WUFBQyxPQUFNLEtBQUssRUFBRTtnQkFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7YUFBRTtRQUM1QyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUE3RUQsOEJBNkVDOzs7Ozs7Ozs7OztBQ2hGRCwyQzs7Ozs7Ozs7OztBQ0FBLGtDOzs7Ozs7Ozs7O0FDQUEsdUM7Ozs7Ozs7Ozs7QUNBQSxvQzs7Ozs7Ozs7OztBQ0FBLHFDOzs7Ozs7Ozs7O0FDQUEseUM7Ozs7Ozs7Ozs7QUNBQSxnQzs7Ozs7Ozs7OztBQ0FBLGtDOzs7Ozs7Ozs7O0FDQUEsbUM7Ozs7Ozs7Ozs7QUNBQSxzQzs7Ozs7Ozs7OztBQ0FBLGtDOzs7Ozs7Ozs7O0FDQUEsbUM7Ozs7Ozs7Ozs7QUNBQSxnRDs7Ozs7O1VDQUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTs7VUFFQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTs7OztVQ3RCQTtVQUNBO1VBQ0E7VUFDQSIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEYXRhYmFzZSB9IGZyb20gXCIuL2RhdGFiYXNlXCI7XHJcbmltcG9ydCB7IFZlaGljbGVEYXRhLCB2ZWhpY2xlU3RhdGUgfSBmcm9tIFwiLi90eXBlcy9WZWhpY2xlRGF0YVwiO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0IHsgVHJpcCB9IGZyb20gXCIuL3R5cGVzL1RyaXBcIjtcclxuaW1wb3J0IHsgQXBpVHJpcCB9IGZyb20gXCIuL3R5cGVzL0FwaVRyaXBcIjtcclxuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xyXG5pbXBvcnQgeyBSb3V0ZSB9IGZyb20gXCIuL3R5cGVzL1JvdXRlXCI7XHJcbmltcG9ydCB7IEFwaVJvdXRlIH0gZnJvbSBcIi4vdHlwZXMvQXBpUm91dGVcIjtcclxuaW1wb3J0IHsgQXBpU2hhcGUgfSBmcm9tIFwiLi90eXBlcy9BcGlTaGFwZVwiO1xyXG5pbXBvcnQgeyBTaGFwZSB9IGZyb20gXCIuL3R5cGVzL1NoYXBlXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQnVzTG9naWMge1xyXG5cclxuICBwcml2YXRlIGRhdGFiYXNlIDogRGF0YWJhc2U7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGRhdGFiYXNlLCBkb0luaXQgOiBib29sZWFuID0gZmFsc2UpIHtcclxuICAgIHRoaXMuZGF0YWJhc2UgPSBkYXRhYmFzZTtcclxuXHJcbiAgICBpZihkb0luaXQpIHRoaXMuSW5pdGlhbGl6ZSgpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBJbml0aWFsaXplKCkge1xyXG4gICAgYXdhaXQgdGhpcy5DbGVhckJ1c3NlcygpO1xyXG5cclxuICAgIHNldEludGVydmFsKGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgdGhpcy5DbGVhckJ1c3NlcygpO1xyXG4gICAgfSwgcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0NMRUFOVVBfREVMQVkpKVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2xlYXJzIGJ1c3NlcyBldmVyeSBYIGFtb3VudCBvZiBtaW51dGVzIHNwZWNpZmllZCBpbiAuZW52IGZpbGUuXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIENsZWFyQnVzc2VzKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DTEVBTlVQX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiQ2xlYXJpbmcgYnVzc2VzXCIpXHJcbiAgICBjb25zdCBjdXJyZW50VGltZSA9IERhdGUubm93KCk7XHJcbiAgICBjb25zdCBmaWZ0ZWVuTWludXRlc0FnbyA9IGN1cnJlbnRUaW1lIC0gKDYwICogcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0NMRUFOVVBfVkVISUNMRV9BR0VfUkVRVUlSRU1FTlQpICogMTAwMCk7XHJcbiAgICBjb25zdCBSZW1vdmVkVmVoaWNsZXMgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLlJlbW92ZVZlaGljbGVzV2hlcmUoeyB1cGRhdGVkQXQ6IHsgJGx0OiBmaWZ0ZWVuTWludXRlc0FnbyB9IH0sIHByb2Nlc3MuZW52LkFQUF9ET19DTEVBTlVQX0xPR0dJTkcgPT0gXCJ0cnVlXCIpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIFwiS29wcGVsdmxhayA3IGFuZCA4IHR1cmJvXCIgZmlsZXMgdG8gZGF0YWJhc2UuXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIEluaXRLVjc4KCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRoaXMuSW5pdFRyaXBzTmV3KCk7XHJcbiAgICB0aGlzLkluaXRSb3V0ZXMoKTtcclxuICAgIHRoaXMuSW5pdFNoYXBlcygpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHRyaXBzIGZyb20gdGhlIHNwZWNpZmllZCBVUkwgaW4gdGhlIC5lbnYgLCBvciBcIi4uL0dURlMvY29udmVydGVkL3RyaXBzLmpzb25cIiB0byB0aGUgZGF0YWJhc2UuXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBJbml0VHJpcHNOZXcoKSA6IHZvaWQgeyBcclxuICAgIGNvbnN0IHRyaXBzUGF0aCA9IHJlc29sdmUoXCJHVEZTL2NvbnZlcnRlZC90cmlwcy5qc29uXCIpO1xyXG4gICAgY29uc3Qgb3V0cHV0UGF0aCA9IHJlc29sdmUoXCJHVEZTL2N1c3RvbS90cmlwcy5qc29uXCIpO1xyXG4gICAgZnMucmVhZEZpbGUodHJpcHNQYXRoLCAndXRmOCcsIGFzeW5jKGVycm9yLCBkYXRhKSA9PiB7IFxyXG4gICAgICBpZihlcnJvcikgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgIGlmKGRhdGEgJiYgcHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJMb2FkZWQgdHJpcHMgZmlsZSBpbnRvIG1lbW9yeS5cIik7XHJcbiAgICAgIGRhdGEgPSBkYXRhLnRyaW0oKTtcclxuICAgICAgY29uc3QgbGluZXMgPSBkYXRhLnNwbGl0KFwiXFxuXCIpO1xyXG4gICAgICBjb25zdCB3cml0ZVN0cmVhbSA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG91dHB1dFBhdGgpXHJcbiAgICAgIGNvbnN0IGNvbnZlcnRlZFRyaXBzID0gW107XHJcblxyXG4gICAgICBmb3IobGV0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgICAgICBjb25zdCB0cmlwSlNPTiA6IEFwaVRyaXAgPSBKU09OLnBhcnNlKGxpbmUpO1xyXG4gICAgICAgIGNvbnN0IHJlYWxUaW1lVHJpcElkID0gdHJpcEpTT04ucmVhbHRpbWVfdHJpcF9pZC5zcGxpdChcIjpcIik7XHJcbiAgICAgICAgY29uc3QgY29tcGFueSA9IHJlYWxUaW1lVHJpcElkWzBdO1xyXG4gICAgICAgIGNvbnN0IHBsYW5uaW5nTnVtYmVyID0gcmVhbFRpbWVUcmlwSWRbMV07XHJcbiAgICAgICAgY29uc3QgdHJpcE51bWJlciA9IHJlYWxUaW1lVHJpcElkWzJdO1xyXG5cclxuICAgICAgICBjb25zdCB0cmlwIDogVHJpcCA9IHtcclxuICAgICAgICAgIGNvbXBhbnk6IGNvbXBhbnksXHJcbiAgICAgICAgICByb3V0ZUlkOiBwYXJzZUludCh0cmlwSlNPTi5yb3V0ZV9pZCksXHJcbiAgICAgICAgICBzZXJ2aWNlSWQ6IHBhcnNlSW50KHRyaXBKU09OLnNlcnZpY2VfaWQpLFxyXG4gICAgICAgICAgdHJpcElkOiBwYXJzZUludCh0cmlwSlNPTi50cmlwX2lkKSxcclxuICAgICAgICAgIHRyaXBOdW1iZXI6IHBhcnNlSW50KHRyaXBOdW1iZXIpLFxyXG4gICAgICAgICAgdHJpcFBsYW5uaW5nTnVtYmVyOiBwbGFubmluZ051bWJlcixcclxuICAgICAgICAgIHRyaXBIZWFkc2lnbjogdHJpcEpTT04udHJpcF9oZWFkc2lnbixcclxuICAgICAgICAgIHRyaXBOYW1lOiB0cmlwSlNPTi50cmlwX2xvbmdfbmFtZSxcclxuICAgICAgICAgIGRpcmVjdGlvbklkOiBwYXJzZUludCh0cmlwSlNPTi5kaXJlY3Rpb25faWQpLFxyXG4gICAgICAgICAgc2hhcGVJZDogcGFyc2VJbnQodHJpcEpTT04uc2hhcGVfaWQpLFxyXG4gICAgICAgICAgd2hlZWxjaGFpckFjY2Vzc2libGU6IHBhcnNlSW50KHRyaXBKU09OLndoZWVsY2hhaXJfYWNjZXNzaWJsZSlcclxuICAgICAgICB9XHJcbiAgICAgICAgd3JpdGVTdHJlYW0ud3JpdGUoSlNPTi5zdHJpbmdpZnkodHJpcCkgKyBcIlxcblwiKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgd3JpdGVTdHJlYW0uZW5kKGFzeW5jICgpID0+IHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkZpbmlzaGVkIHdyaXRpbmcgdHJpcHMgZmlsZSwgaW1wb3J0aW5nIHRvIGRhdGFiYXNlLlwiKTtcclxuICAgICAgICBhd2FpdCB0aGlzLkltcG9ydFRyaXBzKCk7XHJcbiAgICAgIH0pXHJcbiAgICB9KTtcclxuICAgXHJcbiAgICBcclxuICB9XHJcblxyXG4gIGFzeW5jIEltcG9ydFRyaXBzKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuRHJvcFRyaXBzQ29sbGVjdGlvbigpO1xyXG5cclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiSW1wb3J0aW5nIHRyaXBzIHRvIG1vbmdvZGJcIik7XHJcblxyXG4gICAgYXdhaXQgZXhlYyhcIm1vbmdvaW1wb3J0IC0tZGIgdGFpb3ZhIC0tY29sbGVjdGlvbiB0cmlwcyAtLWZpbGUgLi9HVEZTL2N1c3RvbS90cmlwcy5qc29uXCIsIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc3RkZXJyKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYHN0ZGVycjogJHtzdGRlcnJ9YCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhgc3Rkb3V0OiAke3N0ZG91dH1gKTtcclxuICAgIH0pO1xyXG5cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemVzIHRoZSByb3V0ZXMgZnJvbSB0aGUgc3BlY2lmaWVkIFVSTCBpbiB0aGUgLmVudiAsIG9yIFwiLi4vR1RGUy9jb252ZXJ0ZWQvcm91dGVzLmpzb25cIiB0byB0aGUgZGF0YWJhc2UuXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBJbml0Um91dGVzICgpIHtcclxuICAgIGNvbnN0IHJvdXRlc1BhdGggPSByZXNvbHZlKFwiR1RGUy9jb252ZXJ0ZWQvcm91dGVzLmpzb25cIik7XHJcbiAgICBjb25zdCBvdXRwdXRQYXRoID0gcmVzb2x2ZShcIkdURlMvY3VzdG9tL3JvdXRlcy5qc29uXCIpO1xyXG4gICAgZnMucmVhZEZpbGUocm91dGVzUGF0aCwgJ3V0ZjgnLCBhc3luYyhlcnJvciwgZGF0YSkgPT4geyBcclxuICAgICAgaWYoZXJyb3IpIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICBpZihkYXRhICYmIHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiTG9hZGVkIHJvdXRlcyBmaWxlIGludG8gbWVtb3J5LlwiKTtcclxuICAgICAgZGF0YSA9IGRhdGEudHJpbSgpO1xyXG4gICAgICBjb25zdCBsaW5lcyA9IGRhdGEuc3BsaXQoXCJcXG5cIik7XHJcbiAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3V0cHV0UGF0aClcclxuXHJcbiAgICAgIGZvcihsZXQgbGluZSBvZiBsaW5lcykge1xyXG4gICAgICAgIGNvbnN0IHJvdXRlSnNvbiA6IEFwaVJvdXRlID0gSlNPTi5wYXJzZShsaW5lKTtcclxuICAgICAgICBjb25zdCBjb21wYW55U3BsaXQgPSByb3V0ZUpzb24uYWdlbmN5X2lkLnNwbGl0KCc6Jyk7XHJcbiAgICAgICAgY29uc3Qgcm91dGUgOiBSb3V0ZSA9IHtcclxuICAgICAgICAgIHJvdXRlSWQ6IHBhcnNlSW50KHJvdXRlSnNvbi5yb3V0ZV9pZCksXHJcbiAgICAgICAgICBjb21wYW55OiBjb21wYW55U3BsaXRbMF0sXHJcbiAgICAgICAgICBzdWJDb21wYW55OiBjb21wYW55U3BsaXRbMV0gPyBjb21wYW55U3BsaXRbMV0gOiBcIk5vbmVcIixcclxuICAgICAgICAgIHJvdXRlU2hvcnROYW1lOiByb3V0ZUpzb24ucm91dGVfc2hvcnRfbmFtZSxcclxuICAgICAgICAgIHJvdXRlTG9uZ05hbWU6IHJvdXRlSnNvbi5yb3V0ZV9sb25nX25hbWUsXHJcbiAgICAgICAgICByb3V0ZURlc2NyaXB0aW9uOiByb3V0ZUpzb24ucm91dGVfZGVzYyxcclxuICAgICAgICAgIHJvdXRlVHlwZTogcGFyc2VJbnQocm91dGVKc29uLnJvdXRlX3R5cGUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB3cml0ZVN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeShyb3V0ZSkgKyBcIlxcblwiKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgd3JpdGVTdHJlYW0uZW5kKCgpID0+IHtcclxuICAgICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkZpbmlzaGVkIHdyaXRpbmcgcm91dGVzIGZpbGUsIGltcG9ydGluZyB0byBkYXRhYmFzZS5cIik7XHJcbiAgICAgICAgdGhpcy5JbXBvcnRSb3V0ZXMoKTtcclxuICAgICAgfSlcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgSW1wb3J0Um91dGVzKCkgOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuRHJvcFJvdXRlc0NvbGxlY3Rpb24oKTtcclxuXHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkltcG9ydGluZyByb3V0ZXMgdG8gbW9uZ29kYlwiKTtcclxuXHJcbiAgICBhd2FpdCBleGVjKFwibW9uZ29pbXBvcnQgLS1kYiB0YWlvdmEgLS1jb2xsZWN0aW9uIHJvdXRlcyAtLWZpbGUgLi9HVEZTL2N1c3RvbS9yb3V0ZXMuanNvblwiLCAoZXJyb3IsIHN0ZG91dCwgc3RkZXJyKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBlcnJvcjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHN0ZGVycikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBzdGRlcnI6ICR7c3RkZXJyfWApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coYHN0ZG91dDogJHtzdGRvdXR9YCk7XHJcbiAgICB9KTtcclxuXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplcyB0aGUgc2hhcGVzIGZyb20gdGhlIHNwZWNpZmllZCBVUkwgaW4gdGhlIC5lbnYgLCBvciBcIi4uL0dURlMvY29udmVydGVkL3JvdXRlcy5qc29uXCIgdG8gdGhlIGRhdGFiYXNlLlxyXG4gICAqL1xyXG4gICBwcml2YXRlIEluaXRTaGFwZXMgKCkge1xyXG4gICAgY29uc3Qgcm91dGVzUGF0aCA9IHJlc29sdmUoXCJHVEZTL2NvbnZlcnRlZC9zaGFwZXMuanNvblwiKTtcclxuICAgIGNvbnN0IG91dHB1dFBhdGggPSByZXNvbHZlKFwiR1RGUy9jdXN0b20vc2hhcGVzLmpzb25cIik7XHJcbiAgICBmcy5yZWFkRmlsZShyb3V0ZXNQYXRoLCAndXRmOCcsIGFzeW5jKGVycm9yLCBkYXRhKSA9PiB7IFxyXG4gICAgICBpZihlcnJvcikgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgIGlmKGRhdGEgJiYgcHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJMb2FkZWQgc2hhcGVzIGZpbGUgaW50byBtZW1vcnkuXCIpO1xyXG4gICAgICBkYXRhID0gZGF0YS50cmltKCk7XHJcbiAgICAgIGNvbnN0IGxpbmVzID0gZGF0YS5zcGxpdChcIlxcblwiKTtcclxuICAgICAgY29uc3Qgd3JpdGVTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShvdXRwdXRQYXRoKVxyXG5cclxuICAgICAgZm9yKGxldCBsaW5lIG9mIGxpbmVzKSB7XHJcbiAgICAgICAgY29uc3Qgc2hhcGVKc29uIDogQXBpU2hhcGUgPSBKU09OLnBhcnNlKGxpbmUpO1xyXG4gICAgICAgIGNvbnN0IHNoYXBlIDogU2hhcGUgPSB7XHJcbiAgICAgICAgICBzaGFwZUlkOiBwYXJzZUludChzaGFwZUpzb24uc2hhcGVfaWQpLFxyXG4gICAgICAgICAgc2hhcGVTZXF1ZW5jZU51bWJlcjogcGFyc2VJbnQoc2hhcGVKc29uLnNoYXBlX3B0X3NlcXVlbmNlKSxcclxuICAgICAgICAgIFBvc2l0aW9uOiBbcGFyc2VGbG9hdChzaGFwZUpzb24uc2hhcGVfcHRfbGF0KSwgcGFyc2VGbG9hdChzaGFwZUpzb24uc2hhcGVfcHRfbG9uKV0sXHJcbiAgICAgICAgICBEaXN0YW5jZVNpbmNlTGFzdFBvaW50OiBwYXJzZUludChzaGFwZUpzb24uc2hhcGVfZGlzdF90cmF2ZWxlZClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHdyaXRlU3RyZWFtLndyaXRlKEpTT04uc3RyaW5naWZ5KHNoYXBlKSArIFwiXFxuXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB3cml0ZVN0cmVhbS5lbmQoKCkgPT4ge1xyXG4gICAgICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRmluaXNoZWQgd3JpdGluZyBzaGFwZXMgZmlsZSwgaW1wb3J0aW5nIHRvIGRhdGFiYXNlLlwiKTtcclxuICAgICAgICB0aGlzLkltcG9ydFNoYXBlcygpO1xyXG4gICAgICB9KVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBJbXBvcnRTaGFwZXMoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5kYXRhYmFzZS5Ecm9wU2hhcGVzQ29sbGVjdGlvbigpO1xyXG5cclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiSW1wb3J0aW5nIHNoYXBlcyB0byBtb25nb2RiXCIpO1xyXG5cclxuICAgIGF3YWl0IGV4ZWMoXCJtb25nb2ltcG9ydCAtLWRiIHRhaW92YSAtLWNvbGxlY3Rpb24gc2hhcGVzIC0tZmlsZSAuL0dURlMvY3VzdG9tL3NoYXBlcy5qc29uXCIsIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc3RkZXJyKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYHN0ZGVycjogJHtzdGRlcnJ9YCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhgc3Rkb3V0OiAke3N0ZG91dH1gKTtcclxuICAgIH0pO1xyXG5cclxuICB9XHJcbn0iLCJleHBvcnQgY29uc3QgRGF0ZVlZWVlNTUREID0gKCkgPT4ge1xyXG4gIGNvbnN0IGN1cnJlbnREYXRlID0gbmV3IERhdGUoKTtcclxuICBjb25zdCBjdXJyZW50WWVhciA9IGN1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCk7XHJcbiAgY29uc3QgY3VycmVudE1vbnRoID1cclxuICAgIGN1cnJlbnREYXRlLmdldE1vbnRoKCkgPCAxMFxyXG4gICAgICA/IGAwJHtjdXJyZW50RGF0ZS5nZXRNb250aCgpICsgMX1gXHJcbiAgICAgIDogY3VycmVudERhdGUuZ2V0TW9udGgoKSArIDE7XHJcblxyXG4gIGNvbnN0IGN1cnJlbnREYXkgPVxyXG4gICAgY3VycmVudERhdGUuZ2V0VVRDRGF0ZSgpIDwgMTBcclxuICAgICAgPyBgMCR7Y3VycmVudERhdGUuZ2V0VVRDRGF0ZSgpfWBcclxuICAgICAgOiBjdXJyZW50RGF0ZS5nZXRVVENEYXRlKCk7XHJcblxyXG4gIHJldHVybiBgJHtjdXJyZW50WWVhcn0ke2N1cnJlbnRNb250aH0ke2N1cnJlbnREYXl9YDtcclxufTsiLCJpbXBvcnQgeyBDb25uZWN0aW9uLCBNb2RlbCwgTW9uZ29vc2UsIEZpbHRlclF1ZXJ5LCBTY2hlbWEgfSBmcm9tICdtb25nb29zZSc7XHJcbmltcG9ydCB7IFRyaXAgfSBmcm9tICcuL3R5cGVzL1RyaXAnO1xyXG5pbXBvcnQgeyBWZWhpY2xlRGF0YSwgdmVoaWNsZVN0YXRlIH0gZnJvbSAnLi90eXBlcy9WZWhpY2xlRGF0YSc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBSb3V0ZSB9IGZyb20gJy4vdHlwZXMvUm91dGUnO1xyXG5pbXBvcnQgeyBTaGFwZSB9IGZyb20gJy4vdHlwZXMvU2hhcGUnO1xyXG5pbXBvcnQgeyBUcmlwUG9zaXRpb25EYXRhIH0gZnJvbSAnLi90eXBlcy9UcmlwUG9zaXRpb25EYXRhJztcclxuaW1wb3J0IHsgV2Vic29ja2V0VmVoaWNsZURhdGEgfSBmcm9tICcuL3R5cGVzL1dlYnNvY2tldFZlaGljbGVEYXRhJztcclxuY29uc3Qgc3RyZWFtVG9Nb25nb0RCID0gcmVxdWlyZSgnc3RyZWFtLXRvLW1vbmdvLWRiJykuc3RyZWFtVG9Nb25nb0RCO1xyXG5jb25zdCBzcGxpdCA9IHJlcXVpcmUoJ3NwbGl0Jyk7XHJcbmV4cG9ydCBjbGFzcyBEYXRhYmFzZSB7XHJcbiAgXHJcbiAgcHJpdmF0ZSBzdGF0aWMgaW5zdGFuY2UgOiBEYXRhYmFzZTtcclxuICBcclxuICBwcml2YXRlIGRiIDogQ29ubmVjdGlvbjtcclxuICBwcml2YXRlIG1vbmdvb3NlIDogTW9uZ29vc2U7XHJcbiAgcHJpdmF0ZSB2ZWhpY2xlU2NoZW1hIDogU2NoZW1hO1xyXG4gIHByaXZhdGUgdHJpcHNTY2hlbWEgOiBTY2hlbWE7XHJcbiAgcHJpdmF0ZSByb3V0ZXNTY2hlbWEgOiBTY2hlbWE7XHJcbiAgcHJpdmF0ZSBzaGFwZXNTY2hlbWEgOiBTY2hlbWE7XHJcbiAgcHJpdmF0ZSBkcml2ZW5Sb3V0ZXNTY2hlbWEgOiBTY2hlbWE7XHJcbiAgcHJpdmF0ZSB2ZWhpY2xlTW9kZWwgOiB0eXBlb2YgTW9kZWw7XHJcbiAgcHJpdmF0ZSB0cmlwTW9kZWwgOiB0eXBlb2YgTW9kZWw7XHJcbiAgcHJpdmF0ZSByb3V0ZXNNb2RlbCA6IHR5cGVvZiBNb2RlbDtcclxuICBwcml2YXRlIHNoYXBlc01vZGVsIDogdHlwZW9mIE1vZGVsO1xyXG4gIHByaXZhdGUgZHJpdmVuUm91dGVzTW9kZWwgOiB0eXBlb2YgTW9kZWw7XHJcbiAgcHJpdmF0ZSBvdXRwdXREQkNvbmZpZztcclxuXHJcbiAgcHVibGljIHN0YXRpYyBnZXRJbnN0YW5jZSgpOiBEYXRhYmFzZSB7XHJcbiAgICBpZighRGF0YWJhc2UuaW5zdGFuY2UpXHJcbiAgICAgIERhdGFiYXNlLmluc3RhbmNlID0gbmV3IERhdGFiYXNlKCk7XHJcblxyXG4gICAgcmV0dXJuIERhdGFiYXNlLmluc3RhbmNlO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEluaXQoKSB7XHJcbiAgICBjb25zdCB1cmwgOiBzdHJpbmcgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkw7XHJcbiAgICBjb25zdCBuYW1lIDogc3RyaW5nID0gcHJvY2Vzcy5lbnYuREFUQUJBU0VfTkFNRTtcclxuXHJcbiAgICB0aGlzLm1vbmdvb3NlID0gbmV3IE1vbmdvb3NlKCk7XHJcbiAgICBcclxuICAgIHRoaXMubW9uZ29vc2Uuc2V0KCd1c2VGaW5kQW5kTW9kaWZ5JywgZmFsc2UpXHJcblxyXG4gICAgaWYoIXVybCAmJiAhbmFtZSkgdGhyb3cgKGBJbnZhbGlkIFVSTCBvciBuYW1lIGdpdmVuLCByZWNlaXZlZDogXFxuIE5hbWU6ICR7bmFtZX0gXFxuIFVSTDogJHt1cmx9YClcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgQ29ubmVjdGluZyB0byBkYXRhYmFzZSB3aXRoIG5hbWU6ICR7bmFtZX0gYXQgdXJsOiAke3VybH1gKVxyXG4gICAgdGhpcy5tb25nb29zZS5jb25uZWN0KGAke3VybH0vJHtuYW1lfWAsIHtcclxuICAgICAgdXNlTmV3VXJsUGFyc2VyOiB0cnVlLFxyXG4gICAgICB1c2VVbmlmaWVkVG9wb2xvZ3k6IHRydWUsXHJcbiAgICAgIHBvb2xTaXplOiAxMjBcclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy5kYiA9IHRoaXMubW9uZ29vc2UuY29ubmVjdGlvbjtcclxuXHJcbiAgICB0aGlzLm91dHB1dERCQ29uZmlnID0geyBkYlVSTCA6IGAke3VybH0vJHtuYW1lfWAsIGNvbGxlY3Rpb24gOiAndHJpcHMnIH07XHJcblxyXG4gICAgdGhpcy5kYi5vbignZXJyb3InLCBlcnJvciA9PiB7XHJcbiAgICAgIHRocm93IG5ldyBlcnJvcihgRXJyb3IgY29ubmVjdGluZyB0byBkYXRhYmFzZS4gJHtlcnJvcn1gKTtcclxuICAgIH0pXHJcblxyXG4gICAgYXdhaXQgdGhpcy5EYXRhYmFzZUxpc3RlbmVyKCk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgR2V0RGF0YWJhc2UoKSA6IENvbm5lY3Rpb24ge1xyXG4gICAgcmV0dXJuIHRoaXMuZGI7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgRGF0YWJhc2VMaXN0ZW5lciAoKSA6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiB7XHJcbiAgICAgICAgdGhpcy5kYi5vbmNlKFwib3BlblwiLCAoKSA9PiB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvbm5lY3Rpb24gdG8gZGF0YWJhc2UgZXN0YWJsaXNoZWQuXCIpXHJcblxyXG4gICAgICAgICAgdGhpcy52ZWhpY2xlU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgY29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICBvcmlnaW5hbENvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgcGxhbm5pbmdOdW1iZXI6IFN0cmluZyxcclxuICAgICAgICAgICAgam91cm5leU51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IE51bWJlcixcclxuICAgICAgICAgICAgdmVoaWNsZU51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICBwb3NpdGlvbjogW051bWJlciwgTnVtYmVyXSxcclxuICAgICAgICAgICAgc3RhdHVzOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHB1bmN0dWFsaXR5OiBBcnJheSxcclxuICAgICAgICAgICAgY3JlYXRlZEF0OiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHVwZGF0ZWRBdDogTnVtYmVyLFxyXG4gICAgICAgICAgICB1cGRhdGVkVGltZXM6IEFycmF5LFxyXG4gICAgICAgICAgICBjdXJyZW50Um91dGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICBjdXJyZW50VHJpcElkOiBOdW1iZXIsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgdGhpcy50cmlwc1NjaGVtYSA9IG5ldyB0aGlzLm1vbmdvb3NlLlNjaGVtYSh7XHJcbiAgICAgICAgICAgIGNvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICBzZXJ2aWNlSWQ6IE51bWJlcixcclxuICAgICAgICAgICAgdHJpcElkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHRyaXBOdW1iZXI6IE51bWJlcixcclxuICAgICAgICAgICAgdHJpcFBsYW5uaW5nTnVtYmVyOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHRyaXBIZWFkc2lnbjogU3RyaW5nLFxyXG4gICAgICAgICAgICB0cmlwTmFtZTogU3RyaW5nLFxyXG4gICAgICAgICAgICBkaXJlY3Rpb25JZDogTnVtYmVyLFxyXG4gICAgICAgICAgICBzaGFwZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIHdoZWVsY2hhaXJBY2Nlc3NpYmxlOiBOdW1iZXJcclxuICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgdGhpcy5yb3V0ZXNTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICByb3V0ZUlkOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIGNvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgc3ViQ29tcGFueTogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZVNob3J0TmFtZTogU3RyaW5nLFxyXG4gICAgICAgICAgICByb3V0ZUxvbmdOYW1lOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHJvdXRlRGVzY3JpcHRpb246IFN0cmluZyxcclxuICAgICAgICAgICAgcm91dGVUeXBlOiBOdW1iZXIsXHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIHRoaXMuc2hhcGVzU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgc2hhcGVJZDogTnVtYmVyLFxyXG4gICAgICAgICAgICBzaGFwZVNlcXVlbmNlTnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIFBvc2l0aW9uOiBbTnVtYmVyLCBOdW1iZXJdLFxyXG4gICAgICAgICAgICBEaXN0YW5jZVNpbmNlTGFzdFBvaW50OiBOdW1iZXJcclxuICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgdGhpcy5kcml2ZW5Sb3V0ZXNTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICB0cmlwSWQgOiBOdW1iZXIsXHJcbiAgICAgICAgICAgIGNvbXBhbnkgOiBTdHJpbmcsXHJcbiAgICAgICAgICAgIHBvc2l0aW9uczogQXJyYXksXHJcbiAgICAgICAgICAgIHVwZGF0ZWRUaW1lcyA6IEFycmF5XHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIHRoaXMudHJpcHNTY2hlbWEuaW5kZXgoeyB0cmlwTnVtYmVyOiAtMSwgdHJpcFBsYW5uaW5nTnVtYmVyOiAtMSwgY29tcGFueTogLTEgfSlcclxuICAgICAgICAgIHRoaXMucm91dGVzU2NoZW1hLmluZGV4KHsgY29tcGFueTogLTEsIHN1YkNvbXBhbnk6IC0xLCByb3V0ZVNob3J0TmFtZTogLTEgLCByb3V0ZUxvbmdOYW1lOiAtMX0pXHJcbiAgICAgICAgICB0aGlzLnNoYXBlc1NjaGVtYS5pbmRleCh7IHNoYXBlSWQ6IC0xIH0pXHJcbiAgICAgICAgICB0aGlzLmRyaXZlblJvdXRlc1NjaGVtYS5pbmRleCh7IHRyaXBJZDogLTEsIGNvbXBhbnk6IC0xIH0pXHJcblxyXG4gICAgICAgICAgdGhpcy52ZWhpY2xlTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwiVmVoaWNsZVBvc2l0aW9uc1wiLCB0aGlzLnZlaGljbGVTY2hlbWEpO1xyXG4gICAgICAgICAgdGhpcy50cmlwTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwidHJpcHNcIiwgdGhpcy50cmlwc1NjaGVtYSk7XHJcbiAgICAgICAgICB0aGlzLnJvdXRlc01vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcInJvdXRlc1wiLCB0aGlzLnJvdXRlc1NjaGVtYSk7XHJcbiAgICAgICAgICB0aGlzLnNoYXBlc01vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcInNoYXBlc1wiLCB0aGlzLnNoYXBlc1NjaGVtYSk7XHJcbiAgICAgICAgICB0aGlzLmRyaXZlblJvdXRlc01vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcImRyaXZlbnJvdXRlc1wiLCB0aGlzLmRyaXZlblJvdXRlc1NjaGVtYSk7XHJcblxyXG4gICAgICAgICAgdGhpcy50cmlwTW9kZWwuY3JlYXRlSW5kZXhlcygpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZXMoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSlcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRBbGxWZWhpY2xlcyAoYXJncyA9IHt9KSA6IFByb21pc2U8QXJyYXk8VmVoaWNsZURhdGE+PiB7XHJcbiAgICByZXR1cm4gYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZCh7Li4uYXJnc30sIHsgcHVuY3R1YWxpdHk6IDAsIHVwZGF0ZWRUaW1lczogMCwgX192IDogMCB9KTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRBbGxWZWhpY2xlc1NtYWxsIChhcmdzID0ge30pIDogUHJvbWlzZTxBcnJheTxXZWJzb2NrZXRWZWhpY2xlRGF0YT4+IHtcclxuICAgIGNvbnN0IHNtYWxsQnVzc2VzIDogQXJyYXk8V2Vic29ja2V0VmVoaWNsZURhdGE+ID0gW107XHJcblxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZCh7Li4uYXJnc30sXHJcbiAgICAgIHsgXHJcbiAgICAgIHB1bmN0dWFsaXR5OiAwLCBcclxuICAgICAgdXBkYXRlZFRpbWVzOiAwLCBcclxuICAgICAgX192IDogMCxcclxuICAgICAgam91cm5leU51bWJlcjogMCxcclxuICAgICAgdGltZXN0YW1wIDogMCxcclxuICAgICAgbGluZU5VbWJlcjogMCxcclxuICAgICAgY3JlYXRlZEF0OiAwLFxyXG4gICAgICB1cGRhdGVkQXQ6IDAsXHJcbiAgICAgIGN1cnJlbnRSb3V0ZUlkOiAwLFxyXG4gICAgICBjdXJyZW50VHJpcElkOiAwLFxyXG4gICAgICBwbGFubmluZ051bWJlcjogMCxcclxuICAgICAgc3RhdHVzOiAwXHJcbiAgICB9KVxyXG5cclxuICAgIHJlc3VsdC5mb3JFYWNoKHJlcyA9PiB7XHJcbiAgICAgIHNtYWxsQnVzc2VzLnB1c2goe1xyXG4gICAgICAgIHA6IHJlcy5wb3NpdGlvbixcclxuICAgICAgICBjOiByZXMuY29tcGFueSwgXHJcbiAgICAgICAgdjogcmVzLnZlaGljbGVOdW1iZXJcclxuICAgICAgfSlcclxuICAgIH0pXHJcbiAgICByZXR1cm4gc21hbGxCdXNzZXM7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0VmVoaWNsZSAodmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIsIGZpcnN0T25seSA6IGJvb2xlYW4gPSBmYWxzZSkgOiBQcm9taXNlPFZlaGljbGVEYXRhPiB7XHJcbiAgICByZXR1cm4geyBcclxuICAgICAgLi4uYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZSh7XHJcbiAgICAgICAgdmVoaWNsZU51bWJlciA6IHZlaGljbGVOdW1iZXIsXHJcbiAgICAgICAgY29tcGFueTogdHJhbnNwb3J0ZXJcclxuICAgICAgfSlcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgUmVtb3ZlVmVoaWNsZXNXaGVyZSggcGFyYW1zIDogb2JqZWN0LCBkb0xvZ2dpbmcgOiBib29sZWFuID0gZmFsc2UpIDogUHJvbWlzZTxBcnJheTxWZWhpY2xlRGF0YT4+IHtcclxuICAgIGNvbnN0IHJlbW92ZWRWZWhpY2xlcyA6IEFycmF5PFZlaGljbGVEYXRhPiA9IGF3YWl0IHRoaXMuR2V0QWxsVmVoaWNsZXMocGFyYW1zKTtcclxuICAgIHRoaXMudmVoaWNsZU1vZGVsLmRlbGV0ZU1hbnkocGFyYW1zKS50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgaWYoZG9Mb2dnaW5nKSBjb25zb2xlLmxvZyhgRGVsZXRlZCAke3Jlc3BvbnNlLmRlbGV0ZWRDb3VudH0gdmVoaWNsZXMuYCk7XHJcbiAgICAgIFxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gcmVtb3ZlZFZlaGljbGVzO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFRyaXAodHJpcE51bWJlciA6IG51bWJlciwgdHJpcFBsYW5uaW5nTnVtYmVyIDogc3RyaW5nLCBjb21wYW55OiBzdHJpbmcpIHtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMudHJpcE1vZGVsLmZpbmRPbmUoe1xyXG4gICAgICBjb21wYW55OiBjb21wYW55LFxyXG4gICAgICB0cmlwTnVtYmVyIDogdHJpcE51bWJlcixcclxuICAgICAgdHJpcFBsYW5uaW5nTnVtYmVyOiB0cmlwUGxhbm5pbmdOdW1iZXJcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiByZXNwb25zZSAhPT0gbnVsbCA/IHJlc3BvbnNlIDoge307XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgRHJvcFRyaXBzQ29sbGVjdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBpbmcgdHJpcHMgY29sbGVjdGlvblwiKTtcclxuICAgIGF3YWl0IHRoaXMudHJpcE1vZGVsLnJlbW92ZSh7fSk7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwZWQgdHJpcHMgY29sbGVjdGlvblwiKTtcclxuICB9XHJcbiAgXHJcbiAgcHVibGljIGFzeW5jIERyb3BSb3V0ZXNDb2xsZWN0aW9uKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYocHJvY2Vzcy5lbnYuQVBQX0RPX0NPTlZFUlRJT05fTE9HR0lORyA9PSBcInRydWVcIikgY29uc29sZS5sb2coXCJEcm9wcGluZyByb3V0ZXMgY29sbGVjdGlvblwiKTtcclxuICAgIGF3YWl0IHRoaXMucm91dGVzTW9kZWwucmVtb3ZlKHt9KTtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBlZCByb3V0ZXMgY29sbGVjdGlvblwiKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBEcm9wU2hhcGVzQ29sbGVjdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmKHByb2Nlc3MuZW52LkFQUF9ET19DT05WRVJUSU9OX0xPR0dJTkcgPT0gXCJ0cnVlXCIpIGNvbnNvbGUubG9nKFwiRHJvcHBpbmcgc2hhcGVzIGNvbGxlY3Rpb25cIik7XHJcbiAgICBhd2FpdCB0aGlzLnNoYXBlc01vZGVsLnJlbW92ZSh7fSk7XHJcbiAgICBpZihwcm9jZXNzLmVudi5BUFBfRE9fQ09OVkVSVElPTl9MT0dHSU5HID09IFwidHJ1ZVwiKSBjb25zb2xlLmxvZyhcIkRyb3BwZWQgc2hhcGVzIGNvbGxlY3Rpb25cIik7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0Um91dGUocm91dGVJZCA6IG51bWJlcikgOiBQcm9taXNlPFJvdXRlPiB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMucm91dGVzTW9kZWwuZmluZE9uZSh7XHJcbiAgICAgIHJvdXRlSWQgOiByb3V0ZUlkLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3BvbnNlICE9PSBudWxsID8gcmVzcG9uc2UgOiB7fTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRTaGFwZShzaGFwZUlkIDogbnVtYmVyKSA6IFByb21pc2U8QXJyYXk8U2hhcGU+PiB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuc2hhcGVzTW9kZWwuZmluZCh7XHJcbiAgICAgIHNoYXBlSWQgOiBzaGFwZUlkLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3BvbnNlICE9PSBbXSA/IHJlc3BvbnNlIDogW107XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgR2V0VHJpcFBvc2l0aW9ucyh0cmlwSWQgOiBudW1iZXIsIGNvbXBhbnkgOiBzdHJpbmcpIDogUHJvbWlzZTxUcmlwUG9zaXRpb25EYXRhPiB7XHJcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5kcml2ZW5Sb3V0ZXNNb2RlbC5maW5kT25lKHsgXHJcbiAgICAgIHRyaXBJZDogdHJpcElkLFxyXG4gICAgICBjb21wYW55OiBjb21wYW55LFxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBHZXRSb3V0ZXNCeVN0cmluZyAocXVlcnkgOiBzdHJpbmcpIDogUHJvbWlzZTxBcnJheTxSb3V0ZT4+IHsgICAgXHJcbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJvdXRlc01vZGVsLmZpbmQoXHJcbiAgICAgICAgeyBcclxuICAgICAgICAgICRvcjogWyBcclxuICAgICAgICAgICAgeyByb3V0ZUxvbmdOYW1lIDogbmV3IFJlZ0V4cChxdWVyeSwgJ2knKSB9LCBcclxuICAgICAgICAgICAgeyBjb21wYW55IDogbmV3IFJlZ0V4cChxdWVyeSwgJ2knKSB9LCB7IHN1YkNvbXBhbnk6IG5ldyBSZWdFeHAocXVlcnksICdpJykgfSwgXHJcbiAgICAgICAgICAgIHsgcm91dGVTaG9ydE5hbWUgOiBxdWVyeSB9XHJcbiAgICAgICAgICBdIFxyXG4gICAgICAgIH1cclxuICAgICAgKVxyXG4gIH0gXHJcbiAgXHJcbiAgcHVibGljIGFzeW5jIEdldFZlaGljbGVzQnlSb3V0ZUlkIChyb3V0ZUlkIDogbnVtYmVyKSA6IFByb21pc2U8QXJyYXk8VmVoaWNsZURhdGE+PiB7XHJcbiAgICByZXR1cm4gYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZCh7IFxyXG4gICAgICBjdXJyZW50Um91dGVJZDogcm91dGVJZFxyXG4gICAgfSlcclxuICB9XHJcblxyXG59XHJcbiIsImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcclxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBCdXNMb2dpYyB9IGZyb20gJy4vYnVzbG9naWMnO1xyXG5pbXBvcnQgeyBEYXRlWVlZWU1NREQgfSBmcm9tICcuL2NvbnZlcnRlcnMvZGF0ZSc7XHJcbmltcG9ydCB7IERhdGFiYXNlIH0gZnJvbSAnLi9kYXRhYmFzZSc7XHJcbmNvbnN0IGV4dHJhY3QgPSByZXF1aXJlKFwiZXh0cmFjdC16aXBcIik7XHJcbmNvbnN0IGNzdiA9IHJlcXVpcmUoXCJjc3Z0b2pzb25cIik7XHJcblxyXG5leHBvcnQgY2xhc3MgRG93bmxvYWRlciB7XHJcblxyXG4gIHByaXZhdGUgdXJsOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBidXNMb2dpYyA6IEJ1c0xvZ2ljO1xyXG5cclxuICBwcml2YXRlIGNhbGxiYWNrIDogKCkgPT4gYW55O1xyXG4gIGNvbnN0cnVjdG9yKGRiIDogRGF0YWJhc2UpIHtcclxuICAgIFxyXG4gICAgdGhpcy5idXNMb2dpYyA9IG5ldyBCdXNMb2dpYyhkYik7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgRG93bmxvYWRHVEZTKGNhbGxiYWNrIDogKCkgPT4gYW55KSB7XHJcbiAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XHJcbiAgICB0aGlzLkNoZWNrTGF0ZXN0R1RGUygpOyAgXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgRG93bmxvYWRDZW50cmFhbEhhbHRlQmVzdGFuZChjYWxsYmFjayA6ICgpID0+IGFueSkge1xyXG4gICAgdGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xyXG4gICAgdGhpcy5DaGVja0xhdGVzdENIQigpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBFeHRyYWN0RmlsZShwYXRoKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB0YXJnZXRQYXRoID0gcmVzb2x2ZShcIkdURlMvZXh0cmFjdGVkXCIpO1xyXG4gICAgICB0aGlzLkNoZWNrRm9yRmlsZXNJbkZvbGRlcih0YXJnZXRQYXRoKTtcclxuICAgICAgY29uc29sZS5sb2coYFN0YXJ0aW5nIGV4dHJhY3Rpb24gb2YgJHtwYXRofWApO1xyXG4gICAgICBhd2FpdCBleHRyYWN0KHBhdGgsIHsgZGlyOiB0YXJnZXRQYXRoIH0pO1xyXG4gICAgICBjb25zb2xlLmxvZyhcIkV4dHJhY3Rpb24gY29tcGxldGVcIik7XHJcbiAgICAgIHRoaXMuQ29udmVydEV4dHJhY3RlZEZpbGVzKHRhcmdldFBhdGgpO1xyXG4gICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgIC8vIGhhbmRsZSBhbnkgZXJyb3JzXHJcbiAgICAgIGNvbnNvbGUubG9nKGVycik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIENoZWNrTGF0ZXN0R1RGUygpIHtcclxuICAgIGNvbnN0IGRlc3QgPSBwcm9jZXNzLmVudi5HVEZTX0RPV05MT0FEX0xPQ0FUSU9OID8gcmVzb2x2ZShgJHtwcm9jZXNzLmVudi5HVEZTX0RPV05MT0FEX0xPQ0FUSU9OfS8ke0RhdGVZWVlZTU1ERCgpfS56aXBgKSA6IHJlc29sdmUoYEdURlMvJHtEYXRlWVlZWU1NREQoKX0uemlwYClcclxuICAgIGlmKCFmcy5leGlzdHNTeW5jKGRlc3QpKSB0aGlzLkRvd25sb2FkTGF0ZXN0R1RGUygpO1xyXG4gICAgZWxzZSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJMYXRlc3QgR1RGUyBhbHJlYWR5IGRvd25sb2FkZWQuIEV4dHJhY3RpbmcgaW5zdGVhZC4uLlwiKTtcclxuICAgICAgdGhpcy5FeHRyYWN0RmlsZShkZXN0KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgRG93bmxvYWRMYXRlc3RHVEZTKCkgIHtcclxuICAgIGNvbnN0IHVybCA9IHByb2Nlc3MuZW52LkdURlNfVVJMIHx8IFwiaHR0cDovL2d0ZnMub3Blbm92Lm5sL2d0ZnMtcnQvZ3Rmcy1vcGVub3YtbmwuemlwXCI7XHJcbiAgICBjb25zdCBkZXN0ID0gcHJvY2Vzcy5lbnYuR1RGU19ET1dOTE9BRF9MT0NBVElPTiA/IHJlc29sdmUoYCR7cHJvY2Vzcy5lbnYuR1RGU19ET1dOTE9BRF9MT0NBVElPTn0vJHtEYXRlWVlZWU1NREQoKX0uemlwYCkgOiByZXNvbHZlKGBHVEZTLyR7RGF0ZVlZWVlNTUREKCl9LnppcGApXHJcblxyXG4gICAgY29uc29sZS5sb2coXCJTdGFydGluZyBidXMgaW5mb3JtYXRpb24gZG93bmxvYWQuXCIpO1xyXG4gICAgY29uc3QgZmlsZSA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGRlc3QpO1xyXG4gICAgaHR0cC5nZXQodXJsLCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICByZXNwb25zZS5waXBlKGZpbGUpO1xyXG4gICAgICAgIGZpbGUub24oXCJmaW5pc2hcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgZmlsZS5jbG9zZSgpO1xyXG4gICAgICAgICAgY29uc29sZS5sb2coXCJGaW5pc2hlZCBkb3dubG9hZGluZ1wiKTtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiU3RhcnRlZCBleHRyYWN0aW5nXCIpO1xyXG4gICAgICAgICAgdGhpcy5FeHRyYWN0RmlsZShkZXN0KTtcclxuICAgICAgICB9KTtcclxuICAgIH0pLm9uKFwiZXJyb3JcIiwgZnVuY3Rpb24gKGVycikge1xyXG4gICAgICBmcy51bmxpbmsoZGVzdCwgdGhpcyk7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBEb3dubG9hZExhdGVzdENIQigpIHtcclxuICAgIHRoaXMuY2FsbGJhY2soKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgQ2hlY2tMYXRlc3RDSEIgKCkge1xyXG4gICAgdGhpcy5Eb3dubG9hZExhdGVzdENIQigpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBDaGVja0ZvckZpbGVzSW5Gb2xkZXIgPSAocGF0aCkgPT4ge1xyXG4gICAgZnMucmVhZGRpcihwYXRoLCAoZXJyLCBmaWxlcykgPT4ge1xyXG4gICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XHJcbiAgICAgIGlmIChmaWxlcylcclxuICAgICAgICBjb25zb2xlLmxvZyhgRm91bmQgZmlsZXMgaW4gJHtwYXRofSwgZGVsZXRpbmcgYmVmb3JlIHByb2NlZWRpbmcuYCk7XHJcbiAgXHJcbiAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xyXG4gICAgICAgIGZzLnVubGluayhgJHtwYXRofS8ke2ZpbGV9YCwgKGVycikgPT4ge1xyXG4gICAgICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgQ29udmVydEV4dHJhY3RlZEZpbGVzIChwYXRoKSB7XHJcbiAgICBjb25zdCBwcm9taXNlcyA6IEFycmF5PFByb21pc2U8YW55Pj4gPSBbXTtcclxuICAgIGZzLnJlYWRkaXIocGF0aCwgKGVycm9yLCBmaWxlcykgPT4ge1xyXG4gICAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XHJcbiAgICAgICAgICBpZihmaWxlICE9PSBcInN0b3BfdGltZXMudHh0XCIpXHJcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuY29udmVydENTVnRvSlNPTihgJHtwYXRofS8ke2ZpbGV9YCwgZmlsZSkpO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIFByb21pc2UuYWxsU2V0dGxlZChwcm9taXNlcykudGhlbigodmFsdWVzKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJEb25lIGV4dHJhY3RpbmchXCIpO1xyXG4gICAgICAgIHRoaXMuY2FsbGJhY2soKTtcclxuICAgICAgfSlcclxuXHJcbiAgICB9KTtcclxuXHJcbiAgICBcclxuICAgIFxyXG4gIH1cclxuXHJcblxyXG4gIHByaXZhdGUgY29udmVydENTVnRvSlNPTiA9IChwYXRoLCBmaWxlKSA9PiB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICBjb25zdCBuZXdOYW1lID0gZmlsZS5zcGxpdCgnLicpWzBdICsgXCIuanNvblwiXHJcbiAgICAgIGxldCBuZXdQYXRoID0gYC4vR1RGUy9jb252ZXJ0ZWQvJHtuZXdOYW1lfWA7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBTdGFydGVkIGNvbnZlcnRpbmcgJHtwYXRofSB0byAke25ld1BhdGh9YCk7XHJcbiAgICBcclxuICAgICAgY29uc3QgcmVhZFN0cmVhbSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0ocGF0aCk7XHJcbiAgICAgIGNvbnN0IHdyaXRlU3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0obmV3UGF0aCk7XHJcbiAgICAgIFxyXG4gICAgICByZWFkU3RyZWFtLnBpcGUoY3N2KCkpLnBpcGUod3JpdGVTdHJlYW0pO1xyXG4gICAgICB3cml0ZVN0cmVhbS5vbignZmluaXNoJywgKCkgPT4ge1xyXG4gICAgICAgIHJlc29sdmUoXCJGaW5pc2hlZCFcIik7XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICB3cml0ZVN0cmVhbS5vbignZXJyb3InLCAoKSA9PiB7XHJcbiAgICAgICAgcmVqZWN0KGBGYWlsZWQgdG8gY29udmVydCAke25ld1BhdGh9YClcclxuICAgICAgfSlcclxuICAgICAgXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbn0iLCIvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBBUFAgQ09ORklHXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5cclxuaW1wb3J0ICogYXMgZG90ZW52IGZyb20gJ2RvdGVudic7XHJcbmRvdGVudi5jb25maWcoKTtcclxuXHJcbmNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDMwMDE7XHJcblxyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBZQVJOIElNUE9SVFNcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcbmltcG9ydCAqIGFzIGh0dHBzIGZyb20gJ2h0dHBzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5cclxuY29uc3QgZXhwcmVzcyA9IHJlcXVpcmUoXCJleHByZXNzXCIpO1xyXG5jb25zdCBjb3JzID0gcmVxdWlyZShcImNvcnNcIik7XHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICBDVVNUT00gSU1QT1JUU1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuXHJcbmltcG9ydCB7IERhdGFiYXNlIH0gZnJvbSAnLi9kYXRhYmFzZSc7XHJcbmltcG9ydCB7IFdlYlNlcnZlciB9IGZyb20gJy4vd2Vic2VydmVyJztcclxuaW1wb3J0IHsgQnVzTG9naWMgfSBmcm9tICcuL2J1c2xvZ2ljJztcclxuaW1wb3J0IHsgRG93bmxvYWRlciB9IGZyb20gJy4vZG93bmxvYWRlcic7XHJcblxyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBTU0wgQ09ORklHXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5jb25zdCBwcml2YXRlS2V5ID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9rZXkua2V5XCIpLnRvU3RyaW5nKCk7XHJcbmNvbnN0IGNlcnRpZmljYXRlID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9jZXJ0LmNydFwiKS50b1N0cmluZygpO1xyXG5jb25zdCBjYSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUva2V5LWNhLmNydFwiKS50b1N0cmluZygpO1xyXG5cclxuY29uc3QgQXBwSW5pdCA9IGFzeW5jICgpID0+IHtcclxuICBjb25zdCBkYiA9IGF3YWl0IERhdGFiYXNlLmdldEluc3RhbmNlKCkuSW5pdCgpLnRoZW4oKTtcclxuICBjb25zdCBhcHAgPSAobW9kdWxlLmV4cG9ydHMgPSBleHByZXNzKCkpO1xyXG5cclxuICBjb25zdCBzZXJ2ZXIgPSBodHRwcy5jcmVhdGVTZXJ2ZXIoXHJcbiAgICB7XHJcbiAgICAgIGtleTogcHJpdmF0ZUtleSxcclxuICAgICAgY2VydDogY2VydGlmaWNhdGUsXHJcbiAgICAgIGNhOiBjYSxcclxuICAgICAgcmVxdWVzdENlcnQ6IHRydWUsXHJcbiAgICAgIHJlamVjdFVuYXV0aG9yaXplZDogZmFsc2UsXHJcbiAgICB9LFxyXG4gICAgYXBwXHJcbiAgKTtcclxuICBcclxuXHJcbiAgY29uc3QgY29yc09wdGlvbnMgPSB7XHJcbiAgICBvcmlnaW46ICcqJyxcclxuICAgIG9wdGlvbnNTdWNjZXNzU3RhdHVzOiAyMDBcclxuICB9XHJcblxyXG4gIGFwcC51c2UoY29ycyhjb3JzT3B0aW9ucykpXHJcbiAgYXBwLm9wdGlvbnMoJyonLCBjb3JzKCkpXHJcblxyXG5cclxuICBuZXcgV2ViU2VydmVyKGFwcCwgZGIpO1xyXG4gIGNvbnN0IGJ1c0xvZ2ljID0gbmV3IEJ1c0xvZ2ljKGRiLCB0cnVlKTtcclxuICBjb25zdCBkb3dubG9hZGVyID0gbmV3IERvd25sb2FkZXIoZGIpO1xyXG5cclxuXHJcbiAgLy9Ub2RvOiBEaXQgbW9ldCBiZXRlci5cclxuICBkb3dubG9hZGVyLkRvd25sb2FkR1RGUygoKSA9PiBkb3dubG9hZGVyLkRvd25sb2FkQ2VudHJhYWxIYWx0ZUJlc3RhbmQoKCkgPT4gYnVzTG9naWMuSW5pdEtWNzgoKSkpO1xyXG5cclxuICBcclxuICBzZXJ2ZXIubGlzdGVuKHBvcnQsICgpID0+IGNvbnNvbGUubG9nKGBMaXN0ZW5pbmcgYXQgaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9YCkpO1xyXG5cclxufVxyXG5cclxuQXBwSW5pdCgpO1xyXG4iLCJpbXBvcnQgeyBEYXRhYmFzZSB9IGZyb20gXCIuL2RhdGFiYXNlXCI7XHJcbmltcG9ydCB7IFJvdXRlIH0gZnJvbSBcIi4vdHlwZXMvUm91dGVcIjtcclxuaW1wb3J0IHsgVmVoaWNsZURhdGEgfSBmcm9tIFwiLi90eXBlcy9WZWhpY2xlRGF0YVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNlYXJjaEhhbmRsZXIge1xyXG5cclxuICBwcml2YXRlIGRhdGFiYXNlOiBEYXRhYmFzZTtcclxuICBjb25zdHJ1Y3RvcihkYiA6IERhdGFiYXNlKSB7XHJcbiAgICB0aGlzLkluaXQoKTtcclxuICAgIHRoaXMuZGF0YWJhc2UgPSBkYjtcclxuICB9XHJcblxyXG4gIGFzeW5jIEluaXQoKSB7XHJcbiAgICBcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhc3luYyBTZWFyY2hGb3JFdmVyeXRoaW5nKHNlYXJjaFN0cmluZyA6IHN0cmluZywgbGltaXQgOiBudW1iZXIpIDogUHJvbWlzZTxhbnk+IHtcclxuXHJcbiAgICAvLyBjb25zdCBwcmlvcml0aWVzID0ge1xyXG4gICAgLy8gICBST1VURSA6IDEwLFxyXG4gICAgLy8gICBUUklQIDogNSxcclxuICAgIC8vICAgQ09NUEFOWTogMVxyXG4gICAgLy8gfVxyXG5cclxuICAgIGNvbnN0IHNlcGVyYXRlVGVybXMgPSBzZWFyY2hTdHJpbmcuc3BsaXQoXCIgXCIpO1xyXG4gICAgY29uc3QgZmlyc3RUZXJtID0gc2VwZXJhdGVUZXJtc1swXTtcclxuXHJcbiAgICBjb25zdCBmb3VuZFJvdXRlc0J5Rmlyc3RUZXJtIDogQXJyYXk8Um91dGU+ID0gYXdhaXQgdGhpcy5HZXRSb3V0ZXMoZmlyc3RUZXJtKTtcclxuXHJcbiAgICBjb25zdCBmb3VuZFJvdXRlc0J5VGVybXMgOiBBcnJheTxSb3V0ZT4gPSBbXTtcclxuICAgIGZvdW5kUm91dGVzQnlGaXJzdFRlcm0uZm9yRWFjaChyb3V0ZSA9PiB7XHJcbiAgICAgIFxyXG4gICAgICBsZXQgZm91bmRUZXJtcyA9IDA7XHJcbiAgICAgIHNlcGVyYXRlVGVybXMuZm9yRWFjaCh0ZXJtID0+IHtcclxuICAgICAgICBpZihyb3V0ZS5yb3V0ZUxvbmdOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModGVybS50b0xvd2VyQ2FzZSgpKSB8fCByb3V0ZS5yb3V0ZVNob3J0TmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHRlcm0udG9Mb3dlckNhc2UoKSkgfHwgcm91dGUuc3ViQ29tcGFueS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHRlcm0udG9Mb3dlckNhc2UoKSkgfHwgcm91dGUuY29tcGFueS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHRlcm0udG9Mb3dlckNhc2UoKSkpXHJcbiAgICAgICAgICBmb3VuZFRlcm1zKys7XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBpZihmb3VuZFRlcm1zID09IHNlcGVyYXRlVGVybXMubGVuZ3RoKSBmb3VuZFJvdXRlc0J5VGVybXMucHVzaChyb3V0ZSk7XHJcblxyXG4gICAgfSkgXHJcbiAgICAgICAgICAgXHJcbiAgICBcclxuICAgIHJldHVybiBmb3VuZFJvdXRlc0J5VGVybXMuc2xpY2UoMCwgbGltaXQpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFzeW5jIEdldFJvdXRlcyAoc2VhcmNoU3RyaW5nOiBzdHJpbmcpIDogUHJvbWlzZTxBcnJheTxSb3V0ZT4+ICB7XHJcbiAgICBjb25zdCBmb3VuZFJvdXRlcyA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0Um91dGVzQnlTdHJpbmcoc2VhcmNoU3RyaW5nKTtcclxuICAgIHJldHVybiBmb3VuZFJvdXRlcztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBTZWFyY2hGb3JUcmlwU2lnbiAoc2VhcmNoU3RyaW5nOiBzdHJpbmcpIDogYW55IHtcclxuXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXN5bmMgU2VhcmNoRm9yVmVoaWNsZUJ5Um91dGUgKHJvdXRlSWQgOiBudW1iZXIpIHtcclxuICAgIHJldHVybiB0aGlzLmRhdGFiYXNlLkdldFZlaGljbGVzQnlSb3V0ZUlkKHJvdXRlSWQpO1xyXG4gIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBEYXRhYmFzZSB9IGZyb20gXCIuL2RhdGFiYXNlXCI7XHJcbmltcG9ydCB7IFNlYXJjaEhhbmRsZXIgfSBmcm9tIFwiLi9zZWFyY2hoYW5kbGVyXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgV2ViU2VydmVyIHtcclxuXHJcbiAgcHJpdmF0ZSBhcHA7XHJcbiAgcHJpdmF0ZSBkYXRhYmFzZSA6IERhdGFiYXNlO1xyXG4gIHByaXZhdGUgc2VhcmNoSGFuZGxlciA6IFNlYXJjaEhhbmRsZXI7XHJcbiAgY29uc3RydWN0b3IoYXBwLCBkYXRhYmFzZSA6IERhdGFiYXNlKSB7XHJcbiAgICB0aGlzLmFwcCA9IGFwcDtcclxuICAgIHRoaXMuZGF0YWJhc2UgPSBkYXRhYmFzZTtcclxuICAgIHRoaXMuc2VhcmNoSGFuZGxlciA9IG5ldyBTZWFyY2hIYW5kbGVyKGRhdGFiYXNlKTtcclxuICAgIHRoaXMuSW5pdGlhbGl6ZSgpO1xyXG4gIH1cclxuXHJcbiAgSW5pdGlhbGl6ZSgpIHtcclxuICAgIHRoaXMuYXBwLmdldChcIi9cIiwgKHJlcSwgcmVzKSA9PiByZXMuc2VuZChcIlRoaXMgaXMgdGhlIEFQSSBlbmRwb2ludCBmb3IgdGhlIFRBSU9WQSBhcHBsaWNhdGlvbi5cIikpO1xyXG5cclxuICAgIHRoaXMuYXBwLmdldChcIi9idXNzZXNcIiwgYXN5bmMgKHJlcSwgcmVzKSA9PiByZXMuc2VuZChcclxuICAgICAgYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRBbGxWZWhpY2xlc1NtYWxsKClcclxuICAgICkpXHJcblxyXG4gICAgdGhpcy5hcHAuZ2V0KFwiL2J1c3Nlcy86Y29tcGFueS86bnVtYmVyXCIsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xyXG4gICAgICBcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFZlaGljbGUocmVxLnBhcmFtcy5udW1iZXIsIHJlcS5wYXJhbXMuY29tcGFueSwgdHJ1ZSk7XHJcbiAgICAgICAgaWYoT2JqZWN0LmtleXMocmVzdWx0KS5sZW5ndGggPiAwKSBcclxuICAgICAgICAgIHJlcy5zZW5kKHJlc3VsdFtcIl9kb2NcIl0pO1xyXG4gICAgICAgIGVsc2UgXHJcbiAgICAgICAgICByZXMuc2VuZCh7fSkgIFxyXG4gICAgICB9XHJcbiAgICAgIGNhdGNoKGVycm9yKSB7IHJlcy5zZW5kKGVycm9yLm1lc3NhZ2UpIH1cclxuXHJcbiAgICAgfSlcclxuICAgIFxyXG4gICAgIHRoaXMuYXBwLmdldChcIi9idXNzZXMvOnJvdXRlSWRcIiwgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICAgIFxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIHJlcy5zZW5kKGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0VmVoaWNsZXNCeVJvdXRlSWQocmVxLnBhcmFtcy5yb3V0ZUlkKSk7XHJcbiAgICAgIH1cclxuICAgICAgY2F0Y2goZXJyb3IpIHsgcmVzLnNlbmQoZXJyb3IubWVzc2FnZSkgfVxyXG5cclxuICAgICB9KVxyXG4gICAgdGhpcy5hcHAuZ2V0KFwiL3RyaXAvOmNvbXBhbnkvOnBsYW5uaW5nbnVtYmVyLzp0cmlwbnVtYmVyXCIsIGFzeW5jKHJlcSwgcmVzKSA9PiB7XHJcbiAgICAgIFxyXG4gICAgICB0cnkgeyByZXMuc2VuZChhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFRyaXAocmVxLnBhcmFtcy50cmlwbnVtYmVyLCByZXEucGFyYW1zLnBsYW5uaW5nbnVtYmVyLCByZXEucGFyYW1zLmNvbXBhbnkpKTsgfVxyXG4gICAgICBjYXRjaChlcnJvcikgeyByZXMuc2VuZChlcnJvci5tZXNzYWdlKSB9XHJcblxyXG4gICAgfSlcclxuXHJcbiAgICB0aGlzLmFwcC5nZXQoXCIvcm91dGUvOnJvdXRlbnVtYmVyXCIsIGFzeW5jKHJlcSwgcmVzKSA9PiB7XHJcbiAgICAgIFxyXG5cclxuICAgICAgdHJ5IHsgcmVzLnNlbmQoYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRSb3V0ZShyZXEucGFyYW1zLnJvdXRlbnVtYmVyKSk7IH1cclxuICAgICAgY2F0Y2goZXJyb3IpIHsgcmVzLnNlbmQoZXJyb3IubWVzc2FnZSkgfVxyXG5cclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy5hcHAuZ2V0KFwiL3NoYXBlLzpzaGFwZW51bWJlclwiLCBhc3luYyhyZXEsIHJlcykgPT4ge1xyXG4gICAgICBcclxuICAgICAgdHJ5IHsgcmVzLnNlbmQoYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRTaGFwZShyZXEucGFyYW1zLnNoYXBlbnVtYmVyKSk7IH1cclxuICAgICAgY2F0Y2goZXJyb3IpIHsgcmVzLnNlbmQoZXJyb3IubWVzc2FnZSkgfVxyXG5cclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy5hcHAuZ2V0KFwiL3RyaXBkYXRhLzpjb21wYW55Lzp0cmlwSWRcIiwgYXN5bmMocmVxLCByZXMpID0+IHtcclxuICAgICAgdHJ5IHsgXHJcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFRyaXBQb3NpdGlvbnMocmVxLnBhcmFtcy50cmlwSWQsIHJlcS5wYXJhbXMuY29tcGFueSk7XHJcbiAgICAgICAgY29uc3Qgc29ydGVkUG9zaXRpb25zID0gcmVzcG9uc2UucG9zaXRpb25zLnNvcnQoKGEsIGIpID0+IE1hdGguc3FydChhWzBdICsgYVsxXSkgLSBNYXRoLnNxcnQoYVswXSArIGJbMV0pKVxyXG4gICAgICAgIHJlc3BvbnNlLnBvc2l0aW9ucyA9IHNvcnRlZFBvc2l0aW9ucztcclxuICAgICAgICByZXMuc2VuZChyZXNwb25zZSk7IH1cclxuICAgICAgY2F0Y2goZXJyb3IpIHsgcmVzLnNlbmQoZXJyb3IubWVzc2FnZSkgfSAgICAgIFxyXG4gICAgfSlcclxuXHJcbiAgICB0aGlzLmFwcC5nZXQoXCIvc2VhcmNoLzpxdWVyeS86bGltaXRcIiwgYXN5bmMocmVxLCByZXMpID0+IHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICByZXMuc2VuZChhd2FpdCB0aGlzLnNlYXJjaEhhbmRsZXIuU2VhcmNoRm9yRXZlcnl0aGluZyhyZXEucGFyYW1zLnF1ZXJ5LCByZXEucGFyYW1zLmxpbWl0KSk7XHJcbiAgICAgIH0gY2F0Y2goZXJyb3IpIHsgcmVzLnNlbmQoZXJyb3IubWVzc2FnZSkgfVxyXG4gICAgfSlcclxuICB9XHJcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJjaGlsZF9wcm9jZXNzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJjb3JzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJjc3Z0b2pzb25cIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImRvdGVudlwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZXhwcmVzc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZXh0cmFjdC16aXBcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImZzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJodHRwXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJodHRwc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwibW9uZ29vc2VcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInBhdGhcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInNwbGl0XCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzdHJlYW0tdG8tbW9uZ28tZGJcIik7OyIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBzdGFydHVwXG4vLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbi8vIFRoaXMgZW50cnkgbW9kdWxlIGlzIHJlZmVyZW5jZWQgYnkgb3RoZXIgbW9kdWxlcyBzbyBpdCBjYW4ndCBiZSBpbmxpbmVkXG52YXIgX193ZWJwYWNrX2V4cG9ydHNfXyA9IF9fd2VicGFja19yZXF1aXJlX18oXCIuL3NyYy9tYWluLnRzXCIpO1xuIl0sInNvdXJjZVJvb3QiOiIifQ==