/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/buslogic.ts":
/*!*************************!*\
  !*** ./src/buslogic.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BusLogic = void 0;
const VehicleData_1 = __webpack_require__(/*! ./types/VehicleData */ "./src/types/VehicleData.ts");
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
    UpdateBusses(busses) {
        busses.forEach(async (bus, index) => {
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
    async ClearBusses() {
        if (process.env.APP_DO_CLEANUP_LOGGING == "true")
            console.log("Clearing busses");
        const currentTime = Date.now();
        const fifteenMinutesAgo = currentTime - (60 * parseInt(process.env.APP_CLEANUP_VEHICLE_AGE_REQUIREMENT) * 1000);
        const RemovedVehicles = await this.database.RemoveVehiclesWhere({ updatedAt: { $lt: fifteenMinutesAgo } }, true);
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
    decode(data) {
        let newData = data;
        if (JSON.stringify(data).includes('tmi8:'))
            newData = this.removeTmi8(data);
        return this.convertKV6ToJson(newData);
    }
    convertKV6ToJson(data) {
        let kv6posinfo = data.VV_TM_PUSH.KV6posinfo;
        const array = [];
        kv6posinfo != undefined && Object.entries(kv6posinfo).forEach(([key, value]) => {
            for (let j = 0; j < kv6posinfo[key].length; j++) {
                const vehiclePosData = kv6posinfo[key][j];
                if (!parseInt(vehiclePosData['rd-x'] + "") || !parseInt(vehiclePosData['rd-y'] + ""))
                    continue;
                array.push({
                    company: vehiclePosData.dataownercode,
                    planningNumber: vehiclePosData.lineplanningnumber.toString(),
                    journeyNumber: vehiclePosData.journeynumber,
                    timestamp: Date.parse(vehiclePosData.timestamp),
                    vehicleNumber: vehiclePosData.vehiclenumber,
                    position: this.rdToLatLong(vehiclePosData['rd-x'], vehiclePosData['rd-y']),
                    punctuality: [vehiclePosData.punctuality],
                    status: VehicleData_1.vehicleState[key],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    updatedTimes: [Date.now()]
                });
            }
        });
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
            useUnifiedTopology: true
        });
        this.db = this.mongoose.connection;
        this.db.on('error', error => {
            throw new error(`Error connecting to database. ${error}`);
        });
        await this.DatabaseListener();
        return this;
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
                this.vehicleModel = this.mongoose.model("VehiclePositions", this.vehicleSchema);
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
const socket_1 = __webpack_require__(/*! ./socket */ "./src/socket.ts");
const realtime_1 = __webpack_require__(/*! ./realtime */ "./src/realtime.ts");
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
    const ov = new realtime_1.OVData(db);
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
    new socket_1.Websocket(server);
    new webserver_1.WebServer(app, db);
    new buslogic_1.BusLogic(db, true);
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
    constructor(database) {
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
        this.sock.on("message", (opCode, ...content) => {
            const contents = Buffer.concat(content);
            zlib_1.gunzip(contents, (error, buffer) => {
                if (error)
                    return console.error(`Something went wrong while trying to unzip. ${error}`);
                const encodedXML = buffer.toString();
                const decoded = xml.parse(encodedXML);
                const vehicleData = converter.decode(decoded);
                this.busLogic.UpdateBusses(vehicleData);
            });
        });
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
const database_1 = __webpack_require__(/*! ./database */ "./src/database.ts");
const bus_update_rate = parseInt(process.env.APP_BUS_UPDATE_DELAY);
class Websocket {
    constructor(server) {
        this.SocketInit(server);
    }
    async SocketInit(server) {
        this.db = await database_1.Database.getInstance().Init().then();
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
        const interval = setInterval(() => {
            console.log("Emitting new data.");
            this.db.GetAllVehicles().then((vehicles) => {
                socket.emit("ovdata", vehicles);
            });
        }, bus_update_rate);
        socket.on("disconnect", () => {
            console.log("Client disconnected");
            clearInterval(interval);
        });
    }
    SendDeletedVehicles(vehicles) {
        this.io.emit("deletedVehicles", vehicles);
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
    vehicleState["ENDED"] = "ENDED";
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
    }
}
exports.WebServer = WebServer;


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

/***/ "socket.io":
/*!****************************!*\
  !*** external "socket.io" ***!
  \****************************/
/***/ ((module) => {

module.exports = require("socket.io");;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvYnVzbG9naWMudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL2NvbnZlcnRlci50cyIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvZGF0YWJhc2UudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL21haW4udHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL3JlYWx0aW1lLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy9zb2NrZXQudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL3R5cGVzL1ZlaGljbGVEYXRhLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy93ZWJzZXJ2ZXIudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiY29yc1wiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImRvdGVudlwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImV4cHJlc3NcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJmYXN0LXhtbC1wYXJzZXJcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJmc1wiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImh0dHBzXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwibW9uZ29vc2VcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJzb2NrZXQuaW9cIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJ6ZXJvbXFcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJ6bGliXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3RhaW92YXNlcnZlci93ZWJw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Ozs7QUNBQSxxQzs7Ozs7Ozs7OztBQ0FBLDZDOzs7Ozs7Ozs7O0FDQUEsZ0M7Ozs7Ozs7Ozs7QUNBQSxtQzs7Ozs7Ozs7OztBQ0FBLHNDOzs7Ozs7Ozs7O0FDQUEsdUM7Ozs7Ozs7Ozs7QUNBQSxvQzs7Ozs7Ozs7OztBQ0FBLGtDOzs7Ozs7VUNBQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBOztVQUVBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBOzs7O1VDdEJBO1VBQ0E7VUFDQTtVQUNBIiwiZmlsZSI6ImJ1bmRsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuQnVzTG9naWMgPSB2b2lkIDA7XHJcbmNvbnN0IFZlaGljbGVEYXRhXzEgPSByZXF1aXJlKFwiLi90eXBlcy9WZWhpY2xlRGF0YVwiKTtcclxuY2xhc3MgQnVzTG9naWMge1xyXG4gICAgY29uc3RydWN0b3IoZGF0YWJhc2UsIGRvSW5pdCA9IGZhbHNlKSB7XHJcbiAgICAgICAgdGhpcy5kYXRhYmFzZSA9IGRhdGFiYXNlO1xyXG4gICAgICAgIGlmIChkb0luaXQpXHJcbiAgICAgICAgICAgIHRoaXMuSW5pdGlhbGl6ZSgpO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgSW5pdGlhbGl6ZSgpIHtcclxuICAgICAgICBhd2FpdCB0aGlzLkNsZWFyQnVzc2VzKCk7XHJcbiAgICAgICAgc2V0SW50ZXJ2YWwoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLkNsZWFyQnVzc2VzKCk7XHJcbiAgICAgICAgfSwgcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0NMRUFOVVBfREVMQVkpKTtcclxuICAgIH1cclxuICAgIFVwZGF0ZUJ1c3NlcyhidXNzZXMpIHtcclxuICAgICAgICBidXNzZXMuZm9yRWFjaChhc3luYyAoYnVzLCBpbmRleCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBmb3VuZFZlaGljbGUgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFZlaGljbGUoYnVzLnZlaGljbGVOdW1iZXIsIGJ1cy5jb21wYW55KTtcclxuICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKGZvdW5kVmVoaWNsZSkubGVuZ3RoICE9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocHJvY2Vzcy5lbnYuQVBQX0RPX1VQREFURV9MT0dHSU5HID09IFwidHJ1ZVwiKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBVcGRhdGluZyB2ZWhpY2xlICR7YnVzLnZlaGljbGVOdW1iZXJ9IGZyb20gJHtidXMuY29tcGFueX1gKTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuZGF0YWJhc2UuVXBkYXRlVmVoaWNsZShmb3VuZFZlaGljbGUsIGJ1cywgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocHJvY2Vzcy5lbnYuQVBQX0RPX0NSRUFURV9MT0dHSU5HID09IFwidHJ1ZVwiKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBjcmVhdGluZyBuZXcgdmVoaWNsZSAke2J1cy52ZWhpY2xlTnVtYmVyfSBmcm9tICR7YnVzLmNvbXBhbnl9YCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoYnVzLnN0YXR1cyA9PT0gVmVoaWNsZURhdGFfMS52ZWhpY2xlU3RhdGUuT05ST1VURSlcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmRhdGFiYXNlLkFkZFZlaGljbGUoYnVzLCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgQ2xlYXJCdXNzZXMoKSB7XHJcbiAgICAgICAgaWYgKHByb2Nlc3MuZW52LkFQUF9ET19DTEVBTlVQX0xPR0dJTkcgPT0gXCJ0cnVlXCIpXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ2xlYXJpbmcgYnVzc2VzXCIpO1xyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgICAgICBjb25zdCBmaWZ0ZWVuTWludXRlc0FnbyA9IGN1cnJlbnRUaW1lIC0gKDYwICogcGFyc2VJbnQocHJvY2Vzcy5lbnYuQVBQX0NMRUFOVVBfVkVISUNMRV9BR0VfUkVRVUlSRU1FTlQpICogMTAwMCk7XHJcbiAgICAgICAgY29uc3QgUmVtb3ZlZFZlaGljbGVzID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5SZW1vdmVWZWhpY2xlc1doZXJlKHsgdXBkYXRlZEF0OiB7ICRsdDogZmlmdGVlbk1pbnV0ZXNBZ28gfSB9LCB0cnVlKTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLkJ1c0xvZ2ljID0gQnVzTG9naWM7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuQ29udmVydGVyID0gdm9pZCAwO1xyXG5jb25zdCBWZWhpY2xlRGF0YV8xID0gcmVxdWlyZShcIi4vdHlwZXMvVmVoaWNsZURhdGFcIik7XHJcbmNsYXNzIENvbnZlcnRlciB7XHJcbiAgICBkZWNvZGUoZGF0YSkge1xyXG4gICAgICAgIGxldCBuZXdEYXRhID0gZGF0YTtcclxuICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoZGF0YSkuaW5jbHVkZXMoJ3RtaTg6JykpXHJcbiAgICAgICAgICAgIG5ld0RhdGEgPSB0aGlzLnJlbW92ZVRtaTgoZGF0YSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29udmVydEtWNlRvSnNvbihuZXdEYXRhKTtcclxuICAgIH1cclxuICAgIGNvbnZlcnRLVjZUb0pzb24oZGF0YSkge1xyXG4gICAgICAgIGxldCBrdjZwb3NpbmZvID0gZGF0YS5WVl9UTV9QVVNILktWNnBvc2luZm87XHJcbiAgICAgICAgY29uc3QgYXJyYXkgPSBbXTtcclxuICAgICAgICBrdjZwb3NpbmZvICE9IHVuZGVmaW5lZCAmJiBPYmplY3QuZW50cmllcyhrdjZwb3NpbmZvKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBrdjZwb3NpbmZvW2tleV0ubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHZlaGljbGVQb3NEYXRhID0ga3Y2cG9zaW5mb1trZXldW2pdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFwYXJzZUludCh2ZWhpY2xlUG9zRGF0YVsncmQteCddICsgXCJcIikgfHwgIXBhcnNlSW50KHZlaGljbGVQb3NEYXRhWydyZC15J10gKyBcIlwiKSlcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGFycmF5LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBhbnk6IHZlaGljbGVQb3NEYXRhLmRhdGFvd25lcmNvZGUsXHJcbiAgICAgICAgICAgICAgICAgICAgcGxhbm5pbmdOdW1iZXI6IHZlaGljbGVQb3NEYXRhLmxpbmVwbGFubmluZ251bWJlci50b1N0cmluZygpLFxyXG4gICAgICAgICAgICAgICAgICAgIGpvdXJuZXlOdW1iZXI6IHZlaGljbGVQb3NEYXRhLmpvdXJuZXludW1iZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLnBhcnNlKHZlaGljbGVQb3NEYXRhLnRpbWVzdGFtcCksXHJcbiAgICAgICAgICAgICAgICAgICAgdmVoaWNsZU51bWJlcjogdmVoaWNsZVBvc0RhdGEudmVoaWNsZW51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5yZFRvTGF0TG9uZyh2ZWhpY2xlUG9zRGF0YVsncmQteCddLCB2ZWhpY2xlUG9zRGF0YVsncmQteSddKSxcclxuICAgICAgICAgICAgICAgICAgICBwdW5jdHVhbGl0eTogW3ZlaGljbGVQb3NEYXRhLnB1bmN0dWFsaXR5XSxcclxuICAgICAgICAgICAgICAgICAgICBzdGF0dXM6IFZlaGljbGVEYXRhXzEudmVoaWNsZVN0YXRlW2tleV0sXHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVkVGltZXM6IFtEYXRlLm5vdygpXVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gYXJyYXk7XHJcbiAgICB9XHJcbiAgICByZW1vdmVUbWk4KGRhdGEpIHtcclxuICAgICAgICBsZXQgZGF0YVN0cmluZyA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xyXG4gICAgICAgIGRhdGFTdHJpbmcgPSBkYXRhU3RyaW5nLnJlcGxhY2UoL3RtaTg6L2csIFwiXCIpO1xyXG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKGRhdGFTdHJpbmcpO1xyXG4gICAgfVxyXG4gICAgcmRUb0xhdExvbmcoeCwgeSkge1xyXG4gICAgICAgIGlmICh4ID09PSB1bmRlZmluZWQgfHwgeSA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICByZXR1cm4gWzAsIDBdO1xyXG4gICAgICAgIGNvbnN0IGRYID0gKHggLSAxNTUwMDApICogTWF0aC5wb3coMTAsIC01KTtcclxuICAgICAgICBjb25zdCBkWSA9ICh5IC0gNDYzMDAwKSAqIE1hdGgucG93KDEwLCAtNSk7XHJcbiAgICAgICAgY29uc3QgU29tTiA9ICgzMjM1LjY1Mzg5ICogZFkpICsgKC0zMi41ODI5NyAqIE1hdGgucG93KGRYLCAyKSkgKyAoLTAuMjQ3NSAqXHJcbiAgICAgICAgICAgIE1hdGgucG93KGRZLCAyKSkgKyAoLTAuODQ5NzggKiBNYXRoLnBvdyhkWCwgMikgKlxyXG4gICAgICAgICAgICBkWSkgKyAoLTAuMDY1NSAqIE1hdGgucG93KGRZLCAzKSkgKyAoLTAuMDE3MDkgKlxyXG4gICAgICAgICAgICBNYXRoLnBvdyhkWCwgMikgKiBNYXRoLnBvdyhkWSwgMikpICsgKC0wLjAwNzM4ICpcclxuICAgICAgICAgICAgZFgpICsgKDAuMDA1MyAqIE1hdGgucG93KGRYLCA0KSkgKyAoLTAuMDAwMzkgKlxyXG4gICAgICAgICAgICBNYXRoLnBvdyhkWCwgMikgKiBNYXRoLnBvdyhkWSwgMykpICsgKDAuMDAwMzMgKiBNYXRoLnBvdyhkWCwgNCkgKiBkWSkgKyAoLTAuMDAwMTIgKlxyXG4gICAgICAgICAgICBkWCAqIGRZKTtcclxuICAgICAgICBjb25zdCBTb21FID0gKDUyNjAuNTI5MTYgKiBkWCkgKyAoMTA1Ljk0Njg0ICogZFggKiBkWSkgKyAoMi40NTY1NiAqXHJcbiAgICAgICAgICAgIGRYICogTWF0aC5wb3coZFksIDIpKSArICgtMC44MTg4NSAqIE1hdGgucG93KGRYLCAzKSkgKyAoMC4wNTU5NCAqXHJcbiAgICAgICAgICAgIGRYICogTWF0aC5wb3coZFksIDMpKSArICgtMC4wNTYwNyAqIE1hdGgucG93KGRYLCAzKSAqIGRZKSArICgwLjAxMTk5ICpcclxuICAgICAgICAgICAgZFkpICsgKC0wLjAwMjU2ICogTWF0aC5wb3coZFgsIDMpICogTWF0aC5wb3coZFksIDIpKSArICgwLjAwMTI4ICpcclxuICAgICAgICAgICAgZFggKiBNYXRoLnBvdyhkWSwgNCkpICsgKDAuMDAwMjIgKiBNYXRoLnBvdyhkWSwgMikpICsgKC0wLjAwMDIyICogTWF0aC5wb3coZFgsIDIpKSArICgwLjAwMDI2ICpcclxuICAgICAgICAgICAgTWF0aC5wb3coZFgsIDUpKTtcclxuICAgICAgICBjb25zdCBMYXRpdHVkZSA9IDUyLjE1NTE3ICsgKFNvbU4gLyAzNjAwKTtcclxuICAgICAgICBjb25zdCBMb25naXR1ZGUgPSA1LjM4NzIwNiArIChTb21FIC8gMzYwMCk7XHJcbiAgICAgICAgcmV0dXJuIFtMb25naXR1ZGUsIExhdGl0dWRlXTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLkNvbnZlcnRlciA9IENvbnZlcnRlcjtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5EYXRhYmFzZSA9IHZvaWQgMDtcclxuY29uc3QgbW9uZ29vc2VfMSA9IHJlcXVpcmUoXCJtb25nb29zZVwiKTtcclxuY29uc3QgVmVoaWNsZURhdGFfMSA9IHJlcXVpcmUoXCIuL3R5cGVzL1ZlaGljbGVEYXRhXCIpO1xyXG5jbGFzcyBEYXRhYmFzZSB7XHJcbiAgICBzdGF0aWMgZ2V0SW5zdGFuY2UoKSB7XHJcbiAgICAgICAgaWYgKCFEYXRhYmFzZS5pbnN0YW5jZSlcclxuICAgICAgICAgICAgRGF0YWJhc2UuaW5zdGFuY2UgPSBuZXcgRGF0YWJhc2UoKTtcclxuICAgICAgICByZXR1cm4gRGF0YWJhc2UuaW5zdGFuY2U7XHJcbiAgICB9XHJcbiAgICBhc3luYyBJbml0KCkge1xyXG4gICAgICAgIGNvbnN0IHVybCA9IHByb2Nlc3MuZW52LkRBVEFCQVNFX1VSTDtcclxuICAgICAgICBjb25zdCBuYW1lID0gcHJvY2Vzcy5lbnYuREFUQUJBU0VfTkFNRTtcclxuICAgICAgICB0aGlzLm1vbmdvb3NlID0gbmV3IG1vbmdvb3NlXzEuTW9uZ29vc2UoKTtcclxuICAgICAgICB0aGlzLm1vbmdvb3NlLnNldCgndXNlRmluZEFuZE1vZGlmeScsIGZhbHNlKTtcclxuICAgICAgICBpZiAoIXVybCAmJiAhbmFtZSlcclxuICAgICAgICAgICAgdGhyb3cgKGBJbnZhbGlkIFVSTCBvciBuYW1lIGdpdmVuLCByZWNlaXZlZDogXFxuIE5hbWU6ICR7bmFtZX0gXFxuIFVSTDogJHt1cmx9YCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYENvbm5lY3RpbmcgdG8gZGF0YWJhc2Ugd2l0aCBuYW1lOiAke25hbWV9IGF0IHVybDogJHt1cmx9YCk7XHJcbiAgICAgICAgdGhpcy5tb25nb29zZS5jb25uZWN0KGAke3VybH0vJHtuYW1lfWAsIHtcclxuICAgICAgICAgICAgdXNlTmV3VXJsUGFyc2VyOiB0cnVlLFxyXG4gICAgICAgICAgICB1c2VVbmlmaWVkVG9wb2xvZ3k6IHRydWVcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLmRiID0gdGhpcy5tb25nb29zZS5jb25uZWN0aW9uO1xyXG4gICAgICAgIHRoaXMuZGIub24oJ2Vycm9yJywgZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgZXJyb3IoYEVycm9yIGNvbm5lY3RpbmcgdG8gZGF0YWJhc2UuICR7ZXJyb3J9YCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5EYXRhYmFzZUxpc3RlbmVyKCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbiAgICBhc3luYyBEYXRhYmFzZUxpc3RlbmVyKCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzLCByZWopID0+IHtcclxuICAgICAgICAgICAgdGhpcy5kYi5vbmNlKFwib3BlblwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvbm5lY3Rpb24gdG8gZGF0YWJhc2UgZXN0YWJsaXNoZWQuXCIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy52ZWhpY2xlU2NoZW1hID0gbmV3IHRoaXMubW9uZ29vc2UuU2NoZW1hKHtcclxuICAgICAgICAgICAgICAgICAgICBjb21wYW55OiBTdHJpbmcsXHJcbiAgICAgICAgICAgICAgICAgICAgcGxhbm5pbmdOdW1iZXI6IFN0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICBqb3VybmV5TnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBOdW1iZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgdmVoaWNsZU51bWJlcjogTnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBbTnVtYmVyLCBOdW1iZXJdLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXR1czogU3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgIHB1bmN0dWFsaXR5OiBBcnJheSxcclxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVkQXQ6IE51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVkQXQ6IE51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVkVGltZXM6IEFycmF5XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHRoaXMudmVoaWNsZU1vZGVsID0gdGhpcy5tb25nb29zZS5tb2RlbChcIlZlaGljbGVQb3NpdGlvbnNcIiwgdGhpcy52ZWhpY2xlU2NoZW1hKTtcclxuICAgICAgICAgICAgICAgIHJlcygpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGFzeW5jIEdldEFsbFZlaGljbGVzKGFyZ3MgPSB7fSkge1xyXG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnZlaGljbGVNb2RlbC5maW5kKHsgLi4uYXJncyB9LCB7IHB1bmN0dWFsaXR5OiAwLCB1cGRhdGVkVGltZXM6IDAsIF9fdjogMCB9KTtcclxuICAgIH1cclxuICAgIGFzeW5jIEdldFZlaGljbGUodmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIsIGZpcnN0T25seSA9IGZhbHNlKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgLi4uYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZSh7XHJcbiAgICAgICAgICAgICAgICB2ZWhpY2xlTnVtYmVyOiB2ZWhpY2xlTnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgY29tcGFueTogdHJhbnNwb3J0ZXJcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgYXN5bmMgVmVoaWNsZUV4aXN0cyh2ZWhpY2xlTnVtYmVyLCB0cmFuc3BvcnRlcikge1xyXG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLkdldFZlaGljbGUodmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIpICE9PSBudWxsO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgVXBkYXRlVmVoaWNsZSh2ZWhpY2xlVG9VcGRhdGUsIHVwZGF0ZWRWZWhpY2xlRGF0YSwgcG9zaXRpb25DaGVja3MgPSBmYWxzZSkge1xyXG4gICAgICAgIGlmICghdmVoaWNsZVRvVXBkYXRlW1wiX2RvY1wiXSlcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIHZlaGljbGVUb1VwZGF0ZSA9IHZlaGljbGVUb1VwZGF0ZVtcIl9kb2NcIl07XHJcbiAgICAgICAgLy9NZXJnZSB0aGUgcHVuY3R1YWxpdGllcyBvZiB0aGUgb2xkIHZlaGljbGVEYXRhIHdpdGggdGhlIG5ldyBvbmUuXHJcbiAgICAgICAgdXBkYXRlZFZlaGljbGVEYXRhLnB1bmN0dWFsaXR5ID0gdmVoaWNsZVRvVXBkYXRlLnB1bmN0dWFsaXR5LmNvbmNhdCh1cGRhdGVkVmVoaWNsZURhdGEucHVuY3R1YWxpdHkpO1xyXG4gICAgICAgIC8vTWVyZ2UgdGhlIHVwZGF0ZWQgdGltZXMgb2YgdGhlIG9sZCB2ZWhpY2xlRGF0YSB3aXRoIHRoZSBuZXcgb25lLlxyXG4gICAgICAgIHVwZGF0ZWRWZWhpY2xlRGF0YS51cGRhdGVkVGltZXMgPSB2ZWhpY2xlVG9VcGRhdGUudXBkYXRlZFRpbWVzLmNvbmNhdCh1cGRhdGVkVmVoaWNsZURhdGEudXBkYXRlZFRpbWVzKTtcclxuICAgICAgICBpZiAocG9zaXRpb25DaGVja3MgJiYgdXBkYXRlZFZlaGljbGVEYXRhLnN0YXR1cyAhPT0gVmVoaWNsZURhdGFfMS52ZWhpY2xlU3RhdGUuT05ST1VURSlcclxuICAgICAgICAgICAgdXBkYXRlZFZlaGljbGVEYXRhLnBvc2l0aW9uID0gdmVoaWNsZVRvVXBkYXRlLnBvc2l0aW9uO1xyXG4gICAgICAgIHVwZGF0ZWRWZWhpY2xlRGF0YS51cGRhdGVkQXQgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgIGF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmRPbmVBbmRVcGRhdGUodmVoaWNsZVRvVXBkYXRlLCB1cGRhdGVkVmVoaWNsZURhdGEpO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgQWRkVmVoaWNsZSh2ZWhpY2xlLCBvbmx5QWRkV2hpbGVPblJvdXRlKSB7XHJcbiAgICAgICAgaWYgKG9ubHlBZGRXaGlsZU9uUm91dGUgJiYgdmVoaWNsZS5zdGF0dXMgIT09IFZlaGljbGVEYXRhXzEudmVoaWNsZVN0YXRlLk9OUk9VVEUpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICBuZXcgdGhpcy52ZWhpY2xlTW9kZWwoe1xyXG4gICAgICAgICAgICAuLi52ZWhpY2xlLFxyXG4gICAgICAgICAgICBwdW5jdHVhbGl0eTogdmVoaWNsZS5wdW5jdHVhbGl0eVxyXG4gICAgICAgIH0pLnNhdmUoZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZXJyb3IpXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBTb21ldGhpbmcgd2VudCB3cm9uZyB3aGlsZSB0cnlpbmcgdG8gYWRkIHZlaGljbGU6ICR7dmVoaWNsZS52ZWhpY2xlTnVtYmVyfS4gRXJyb3I6ICR7ZXJyb3J9YCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBSZW1vdmVWZWhpY2xlKHZlaGljbGUpIHtcclxuICAgICAgICBpZiAoIXZlaGljbGVbXCJfZG9jXCJdKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZUFuZERlbGV0ZSh2ZWhpY2xlKTtcclxuICAgIH1cclxuICAgIGFzeW5jIFJlbW92ZVZlaGljbGVzV2hlcmUocGFyYW1zLCBkb0xvZ2dpbmcgPSBmYWxzZSkge1xyXG4gICAgICAgIGNvbnN0IHJlbW92ZWRWZWhpY2xlcyA9IGF3YWl0IHRoaXMuR2V0QWxsVmVoaWNsZXMocGFyYW1zKTtcclxuICAgICAgICB0aGlzLnZlaGljbGVNb2RlbC5kZWxldGVNYW55KHBhcmFtcykudGhlbihyZXNwb25zZSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChkb0xvZ2dpbmcpXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRGVsZXRlZCAke3Jlc3BvbnNlLmRlbGV0ZWRDb3VudH0gdmVoaWNsZXMuYCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIHJlbW92ZWRWZWhpY2xlcztcclxuICAgIH1cclxufVxyXG5leHBvcnRzLkRhdGFiYXNlID0gRGF0YWJhc2U7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBBUFAgQ09ORklHXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG52YXIgX19jcmVhdGVCaW5kaW5nID0gKHRoaXMgJiYgdGhpcy5fX2NyZWF0ZUJpbmRpbmcpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XHJcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIGsyLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH0pO1xyXG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIG9bazJdID0gbVtrXTtcclxufSkpO1xyXG52YXIgX19zZXRNb2R1bGVEZWZhdWx0ID0gKHRoaXMgJiYgdGhpcy5fX3NldE1vZHVsZURlZmF1bHQpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBcImRlZmF1bHRcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdiB9KTtcclxufSkgOiBmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBvW1wiZGVmYXVsdFwiXSA9IHY7XHJcbn0pO1xyXG52YXIgX19pbXBvcnRTdGFyID0gKHRoaXMgJiYgdGhpcy5fX2ltcG9ydFN0YXIpIHx8IGZ1bmN0aW9uIChtb2QpIHtcclxuICAgIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XHJcbiAgICB2YXIgcmVzdWx0ID0ge307XHJcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1vZCwgaykpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwgayk7XHJcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBkb3RlbnYgPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcImRvdGVudlwiKSk7XHJcbmRvdGVudi5jb25maWcoKTtcclxuY29uc3QgcG9ydCA9IHByb2Nlc3MuZW52LlBPUlQgfHwgMzAwMTtcclxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgICAgWUFSTiBJTVBPUlRTXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5jb25zdCBodHRwcyA9IF9faW1wb3J0U3RhcihyZXF1aXJlKFwiaHR0cHNcIikpO1xyXG5jb25zdCBmcyA9IF9faW1wb3J0U3RhcihyZXF1aXJlKFwiZnNcIikpO1xyXG5jb25zdCBleHByZXNzID0gcmVxdWlyZShcImV4cHJlc3NcIik7XHJcbmNvbnN0IGNvcnMgPSByZXF1aXJlKFwiY29yc1wiKTtcclxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIENVU1RPTSBJTVBPUlRTXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5jb25zdCBkYXRhYmFzZV8xID0gcmVxdWlyZShcIi4vZGF0YWJhc2VcIik7XHJcbmNvbnN0IHNvY2tldF8xID0gcmVxdWlyZShcIi4vc29ja2V0XCIpO1xyXG5jb25zdCByZWFsdGltZV8xID0gcmVxdWlyZShcIi4vcmVhbHRpbWVcIik7XHJcbmNvbnN0IHdlYnNlcnZlcl8xID0gcmVxdWlyZShcIi4vd2Vic2VydmVyXCIpO1xyXG5jb25zdCBidXNsb2dpY18xID0gcmVxdWlyZShcIi4vYnVzbG9naWNcIik7XHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAgIFNTTCBDT05GSUdcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcbmNvbnN0IHByaXZhdGVLZXkgPSBmcy5yZWFkRmlsZVN5bmMoXCIuL2NlcnRpZmljYXRlL2tleS5rZXlcIikudG9TdHJpbmcoKTtcclxuY29uc3QgY2VydGlmaWNhdGUgPSBmcy5yZWFkRmlsZVN5bmMoXCIuL2NlcnRpZmljYXRlL2NlcnQuY3J0XCIpLnRvU3RyaW5nKCk7XHJcbmNvbnN0IGNhID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9rZXktY2EuY3J0XCIpLnRvU3RyaW5nKCk7XHJcbmNvbnN0IEFwcEluaXQgPSBhc3luYyAoKSA9PiB7XHJcbiAgICBjb25zdCBkYiA9IGF3YWl0IGRhdGFiYXNlXzEuRGF0YWJhc2UuZ2V0SW5zdGFuY2UoKS5Jbml0KCkudGhlbigpO1xyXG4gICAgY29uc3Qgb3YgPSBuZXcgcmVhbHRpbWVfMS5PVkRhdGEoZGIpO1xyXG4gICAgY29uc3QgYXBwID0gKG1vZHVsZS5leHBvcnRzID0gZXhwcmVzcygpKTtcclxuICAgIGNvbnN0IHNlcnZlciA9IGh0dHBzLmNyZWF0ZVNlcnZlcih7XHJcbiAgICAgICAga2V5OiBwcml2YXRlS2V5LFxyXG4gICAgICAgIGNlcnQ6IGNlcnRpZmljYXRlLFxyXG4gICAgICAgIGNhOiBjYSxcclxuICAgICAgICByZXF1ZXN0Q2VydDogdHJ1ZSxcclxuICAgICAgICByZWplY3RVbmF1dGhvcml6ZWQ6IGZhbHNlLFxyXG4gICAgfSwgYXBwKTtcclxuICAgIC8vVEhJUyBJUyBOT1QgU0FGRVxyXG4gICAgY29uc3QgY29yc09wdGlvbnMgPSB7XHJcbiAgICAgICAgb3JpZ2luOiAnKicsXHJcbiAgICAgICAgb3B0aW9uc1N1Y2Nlc3NTdGF0dXM6IDIwMFxyXG4gICAgfTtcclxuICAgIGFwcC51c2UoY29ycyhjb3JzT3B0aW9ucykpO1xyXG4gICAgYXBwLm9wdGlvbnMoJyonLCBjb3JzKCkpO1xyXG4gICAgbmV3IHNvY2tldF8xLldlYnNvY2tldChzZXJ2ZXIpO1xyXG4gICAgbmV3IHdlYnNlcnZlcl8xLldlYlNlcnZlcihhcHAsIGRiKTtcclxuICAgIG5ldyBidXNsb2dpY18xLkJ1c0xvZ2ljKGRiLCB0cnVlKTtcclxuICAgIHNlcnZlci5saXN0ZW4ocG9ydCwgKCkgPT4gY29uc29sZS5sb2coYExpc3RlbmluZyBhdCBodHRwOi8vbG9jYWxob3N0OiR7cG9ydH1gKSk7XHJcbn07XHJcbkFwcEluaXQoKTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBfX2NyZWF0ZUJpbmRpbmcgPSAodGhpcyAmJiB0aGlzLl9fY3JlYXRlQmluZGluZykgfHwgKE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfSk7XHJcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XHJcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xyXG4gICAgb1trMl0gPSBtW2tdO1xyXG59KSk7XHJcbnZhciBfX3NldE1vZHVsZURlZmF1bHQgPSAodGhpcyAmJiB0aGlzLl9fc2V0TW9kdWxlRGVmYXVsdCkgfHwgKE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufSk7XHJcbnZhciBfX2ltcG9ydFN0YXIgPSAodGhpcyAmJiB0aGlzLl9faW1wb3J0U3RhcikgfHwgZnVuY3Rpb24gKG1vZCkge1xyXG4gICAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcclxuICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayBpbiBtb2QpIGlmIChrICE9PSBcImRlZmF1bHRcIiAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobW9kLCBrKSkgX19jcmVhdGVCaW5kaW5nKHJlc3VsdCwgbW9kLCBrKTtcclxuICAgIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuT1ZEYXRhID0gdm9pZCAwO1xyXG5jb25zdCB6bGliXzEgPSByZXF1aXJlKFwiemxpYlwiKTtcclxuY29uc3QgY29udmVydGVyXzEgPSByZXF1aXJlKFwiLi9jb252ZXJ0ZXJcIik7XHJcbmNvbnN0IGJ1c2xvZ2ljXzEgPSByZXF1aXJlKFwiLi9idXNsb2dpY1wiKTtcclxuY29uc3QgeG1sID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJmYXN0LXhtbC1wYXJzZXJcIikpO1xyXG5jb25zdCB6bXEgPSByZXF1aXJlKCd6ZXJvbXEnKTtcclxuY29uc3QgZG9Mb2dnaW5nID0gcHJvY2Vzcy5lbnYuQVBQX0RPX0xPR0dJTkcgPT0gXCJ0cnVlXCIgPyB0cnVlIDogZmFsc2U7XHJcbmNsYXNzIE9WRGF0YSB7XHJcbiAgICBjb25zdHJ1Y3RvcihkYXRhYmFzZSkge1xyXG4gICAgICAgIHRoaXMuSW5pdCgpO1xyXG4gICAgICAgIHRoaXMuYnVzTG9naWMgPSBuZXcgYnVzbG9naWNfMS5CdXNMb2dpYyhkYXRhYmFzZSwgZmFsc2UpO1xyXG4gICAgfVxyXG4gICAgSW5pdCgpIHtcclxuICAgICAgICBjb25zdCBjb252ZXJ0ZXIgPSBuZXcgY29udmVydGVyXzEuQ29udmVydGVyKCk7XHJcbiAgICAgICAgdGhpcy5zb2NrID0gem1xLnNvY2tldChcInN1YlwiKTtcclxuICAgICAgICB0aGlzLnNvY2suY29ubmVjdChcInRjcDovL3B1YnN1Yi5uZG92bG9rZXQubmw6NzY1OFwiKTtcclxuICAgICAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL0FSUi9LVjZwb3NpbmZvXCIpO1xyXG4gICAgICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvQ1hYL0tWNnBvc2luZm9cIik7XHJcbiAgICAgICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9FQlMvS1Y2cG9zaW5mb1wiKTtcclxuICAgICAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL1FCVVpaL0tWNnBvc2luZm9cIik7XHJcbiAgICAgICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9SSUcvS1Y2cG9zaW5mb1wiKTtcclxuICAgICAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL0tFT0xJUy9LVjZwb3NpbmZvXCIpO1xyXG4gICAgICAgIHRoaXMuc29jay5vbihcIm1lc3NhZ2VcIiwgKG9wQ29kZSwgLi4uY29udGVudCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBjb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoY29udGVudCk7XHJcbiAgICAgICAgICAgIHpsaWJfMS5ndW56aXAoY29udGVudHMsIChlcnJvciwgYnVmZmVyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbnNvbGUuZXJyb3IoYFNvbWV0aGluZyB3ZW50IHdyb25nIHdoaWxlIHRyeWluZyB0byB1bnppcC4gJHtlcnJvcn1gKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVuY29kZWRYTUwgPSBidWZmZXIudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlY29kZWQgPSB4bWwucGFyc2UoZW5jb2RlZFhNTCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWhpY2xlRGF0YSA9IGNvbnZlcnRlci5kZWNvZGUoZGVjb2RlZCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ1c0xvZ2ljLlVwZGF0ZUJ1c3Nlcyh2ZWhpY2xlRGF0YSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuT1ZEYXRhID0gT1ZEYXRhO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLldlYnNvY2tldCA9IHZvaWQgMDtcclxuY29uc3QgZGF0YWJhc2VfMSA9IHJlcXVpcmUoXCIuL2RhdGFiYXNlXCIpO1xyXG5jb25zdCBidXNfdXBkYXRlX3JhdGUgPSBwYXJzZUludChwcm9jZXNzLmVudi5BUFBfQlVTX1VQREFURV9ERUxBWSk7XHJcbmNsYXNzIFdlYnNvY2tldCB7XHJcbiAgICBjb25zdHJ1Y3RvcihzZXJ2ZXIpIHtcclxuICAgICAgICB0aGlzLlNvY2tldEluaXQoc2VydmVyKTtcclxuICAgIH1cclxuICAgIGFzeW5jIFNvY2tldEluaXQoc2VydmVyKSB7XHJcbiAgICAgICAgdGhpcy5kYiA9IGF3YWl0IGRhdGFiYXNlXzEuRGF0YWJhc2UuZ2V0SW5zdGFuY2UoKS5Jbml0KCkudGhlbigpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBJbml0YWxpemluZyB3ZWJzb2NrZXRgKTtcclxuICAgICAgICB0aGlzLmlvID0gcmVxdWlyZShcInNvY2tldC5pb1wiKShzZXJ2ZXIsIHtcclxuICAgICAgICAgICAgY29yczoge1xyXG4gICAgICAgICAgICAgICAgb3JpZ2luOiBcIipcIixcclxuICAgICAgICAgICAgICAgIG1ldGhvZHM6IFtcIkdFVFwiLCBcIlBPU1RcIl0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5pby5vbihcImNvbm5lY3Rpb25cIiwgc29ja2V0ID0+IHtcclxuICAgICAgICAgICAgdGhpcy5Tb2NrZXQoc29ja2V0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIFNvY2tldChzb2NrZXQpIHtcclxuICAgICAgICB0aGlzLmFjdGl2ZVNvY2tldCA9IHNvY2tldDtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIk5ldyBjbGllbnQgY29ubmVjdGVkLlwiKTtcclxuICAgICAgICBjb25zdCBpbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJFbWl0dGluZyBuZXcgZGF0YS5cIik7XHJcbiAgICAgICAgICAgIHRoaXMuZGIuR2V0QWxsVmVoaWNsZXMoKS50aGVuKCh2ZWhpY2xlcykgPT4ge1xyXG4gICAgICAgICAgICAgICAgc29ja2V0LmVtaXQoXCJvdmRhdGFcIiwgdmVoaWNsZXMpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LCBidXNfdXBkYXRlX3JhdGUpO1xyXG4gICAgICAgIHNvY2tldC5vbihcImRpc2Nvbm5lY3RcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNsaWVudCBkaXNjb25uZWN0ZWRcIik7XHJcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgU2VuZERlbGV0ZWRWZWhpY2xlcyh2ZWhpY2xlcykge1xyXG4gICAgICAgIHRoaXMuaW8uZW1pdChcImRlbGV0ZWRWZWhpY2xlc1wiLCB2ZWhpY2xlcyk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5XZWJzb2NrZXQgPSBXZWJzb2NrZXQ7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMudmVoaWNsZVN0YXRlID0gdm9pZCAwO1xyXG52YXIgdmVoaWNsZVN0YXRlO1xyXG4oZnVuY3Rpb24gKHZlaGljbGVTdGF0ZSkge1xyXG4gICAgdmVoaWNsZVN0YXRlW1wiT05ST1VURVwiXSA9IFwiT05ST1VURVwiO1xyXG4gICAgdmVoaWNsZVN0YXRlW1wiRU5ERURcIl0gPSBcIkVOREVEXCI7XHJcbiAgICB2ZWhpY2xlU3RhdGVbXCJERVBBUlRVUkVcIl0gPSBcIkRFUEFSVFVSRVwiO1xyXG4gICAgdmVoaWNsZVN0YXRlW1wiSU5JVFwiXSA9IFwiSU5JVFwiO1xyXG4gICAgdmVoaWNsZVN0YXRlW1wiREVMQVlcIl0gPSBcIkRFTEFZXCI7XHJcbiAgICB2ZWhpY2xlU3RhdGVbXCJPTlNUT1BcIl0gPSBcIk9OU1RPUFwiO1xyXG4gICAgdmVoaWNsZVN0YXRlW1wiQVJSSVZBTFwiXSA9IFwiQVJSSVZBTFwiO1xyXG59KSh2ZWhpY2xlU3RhdGUgPSBleHBvcnRzLnZlaGljbGVTdGF0ZSB8fCAoZXhwb3J0cy52ZWhpY2xlU3RhdGUgPSB7fSkpO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLldlYlNlcnZlciA9IHZvaWQgMDtcclxuY2xhc3MgV2ViU2VydmVyIHtcclxuICAgIGNvbnN0cnVjdG9yKGFwcCwgZGF0YWJhc2UpIHtcclxuICAgICAgICB0aGlzLmFwcCA9IGFwcDtcclxuICAgICAgICB0aGlzLmRhdGFiYXNlID0gZGF0YWJhc2U7XHJcbiAgICAgICAgdGhpcy5Jbml0aWFsaXplKCk7XHJcbiAgICB9XHJcbiAgICBJbml0aWFsaXplKCkge1xyXG4gICAgICAgIHRoaXMuYXBwLmdldChcIi9cIiwgKHJlcSwgcmVzKSA9PiByZXMuc2VuZChcIlRoaXMgaXMgdGhlIEFQSSBlbmRwb2ludCBmb3IgdGhlIFRBSU9WQSBhcHBsaWNhdGlvbi5cIikpO1xyXG4gICAgICAgIHRoaXMuYXBwLmdldChcIi9idXNzZXNcIiwgYXN5bmMgKHJlcSwgcmVzKSA9PiByZXMuc2VuZChhd2FpdCB0aGlzLmRhdGFiYXNlLkdldEFsbFZlaGljbGVzKCkpKTtcclxuICAgICAgICB0aGlzLmFwcC5nZXQoXCIvYnVzc2VzLzpjb21wYW55LzpudW1iZXJcIiwgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZGF0YWJhc2UuR2V0VmVoaWNsZShyZXEucGFyYW1zLm51bWJlciwgcmVxLnBhcmFtcy5jb21wYW55LCB0cnVlKTtcclxuICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKHJlc3VsdCkubGVuZ3RoID4gMClcclxuICAgICAgICAgICAgICAgIHJlcy5zZW5kKHJlc3VsdFtcIl9kb2NcIl0pO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICByZXMuc2VuZCh7fSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5XZWJTZXJ2ZXIgPSBXZWJTZXJ2ZXI7XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImNvcnNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImRvdGVudlwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZXhwcmVzc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZmFzdC14bWwtcGFyc2VyXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJmc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiaHR0cHNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIm1vbmdvb3NlXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzb2NrZXQuaW9cIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInplcm9tcVwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiemxpYlwiKTs7IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIHN0YXJ0dXBcbi8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuLy8gVGhpcyBlbnRyeSBtb2R1bGUgaXMgcmVmZXJlbmNlZCBieSBvdGhlciBtb2R1bGVzIHNvIGl0IGNhbid0IGJlIGlubGluZWRcbnZhciBfX3dlYnBhY2tfZXhwb3J0c19fID0gX193ZWJwYWNrX3JlcXVpcmVfXyhcIi4vc3JjL21haW4udHNcIik7XG4iXSwic291cmNlUm9vdCI6IiJ9