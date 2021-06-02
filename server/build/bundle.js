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
    constructor(database) {
        this.database = database;
        this.Initialize();
    }
    async Initialize() {
    }
    UpdateBusses(busses) {
        busses.forEach(async (bus, index) => {
            const foundVehicle = await this.database.GetVehicle(bus.vehicleNumber, bus.company);
            if (Object.keys(foundVehicle).length !== 0) {
                console.log(`Updating vehicle ${bus.vehicleNumber} from ${bus.company}`);
                await this.database.UpdateVehicle(foundVehicle, bus, true);
            }
            else {
                console.log(`creating new vehicle ${bus.vehicleNumber} from ${bus.company}`);
                if (bus.status === VehicleData_1.vehicleState.ONROUTE)
                    await this.database.AddVehicle(bus, true);
            }
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
    decode(data) {
        let newData = data;
        if (JSON.stringify(data).includes('tmi8:'))
            newData = this.removeTmi8(data);
        return this.convertKV6ToJson(newData);
    }
    convertKV6ToJson(data) {
        let kv6posinfo = data.VV_TM_PUSH.KV6posinfo;
        const array = [];
        Object.entries(kv6posinfo).forEach(([key, value]) => {
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
                    status: VehicleData_1.vehicleState[key],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
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
                    createdAt: Number,
                    updatedAt: Number
                });
                this.vehicleModel = this.mongoose.model("VehiclePositions", this.vehicleSchema);
                res();
            });
        });
    }
    async GetAllVehicles(args = {}) {
        return await this.vehicleModel.find(args);
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
        if (positionChecks && updatedVehicleData.status !== VehicleData_1.vehicleState.ONROUTE)
            updatedVehicleData.position = vehicleToUpdate.position;
        updatedVehicleData.updatedAt = Date.now();
        await this.vehicleModel.findOneAndUpdate(vehicleToUpdate, updatedVehicleData);
    }
    async AddVehicle(vehicle, onlyAddWhileOnRoute) {
        if (onlyAddWhileOnRoute && vehicle.status !== VehicleData_1.vehicleState.ONROUTE)
            return;
        new this.vehicleModel({
            ...vehicle
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
class OVData {
    constructor(database) {
        this.Init();
        this.busLogic = new buslogic_1.BusLogic(database);
    }
    Init() {
        const converter = new converter_1.Converter();
        this.sock = zmq.socket("sub");
        this.sock.connect("tcp://pubsub.ndovloket.nl:7658");
        this.sock.subscribe("/ARR/KV6posinfo");
        this.sock.subscribe("/CXX/KV6posinfo");
        this.sock.subscribe("/EBS/KV6posinfo");
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
class Websocket {
    constructor(server) {
        this.SocketInit(server);
    }
    SocketInit(server) {
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
        });
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
        this.app.get("/busses/:company/:number/", (req, res) => {
            res.send(JSON.stringify(req.params));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvYnVzbG9naWMudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL2NvbnZlcnRlci50cyIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvZGF0YWJhc2UudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL21haW4udHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL3JlYWx0aW1lLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy9zb2NrZXQudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL3R5cGVzL1ZlaGljbGVEYXRhLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy93ZWJzZXJ2ZXIudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwiY29yc1wiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImRvdGVudlwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImV4cHJlc3NcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJmYXN0LXhtbC1wYXJzZXJcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJmc1wiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImh0dHBzXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwibW9uZ29vc2VcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJzb2NrZXQuaW9cIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJ6ZXJvbXFcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJ6bGliXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3RhaW92YXNlcnZlci93ZWJw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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esa0JBQWtCLG1CQUFPLENBQUMsNEJBQVc7QUFDckM7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFNBQVM7QUFDVDtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBLGlCQUFpQjs7Ozs7Ozs7Ozs7QUMxQko7QUFDYiw4Q0FBNkMsQ0FBQyxjQUFjLEVBQUM7QUFDN0Qsb0JBQW9CO0FBQ3BCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUMsMENBQTBDLG9CQUFvQixLQUFLOzs7Ozs7Ozs7OztBQ1p2RDtBQUNiLDhDQUE2QyxDQUFDLGNBQWMsRUFBQztBQUM3RCxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0EsaUJBQWlCOzs7Ozs7Ozs7OztBQ2pCakIsa0M7Ozs7Ozs7Ozs7QUNBQSxvQzs7Ozs7Ozs7OztBQ0FBLHFDOzs7Ozs7Ozs7O0FDQUEsNkM7Ozs7Ozs7Ozs7QUNBQSxnQzs7Ozs7Ozs7OztBQ0FBLG1DOzs7Ozs7Ozs7O0FDQUEsc0M7Ozs7Ozs7Ozs7QUNBQSx1Qzs7Ozs7Ozs7OztBQ0FBLG9DOzs7Ozs7Ozs7O0FDQUEsa0M7Ozs7OztVQ0FBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7VUN0QkE7VUFDQTtVQUNBO1VBQ0EiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5CdXNMb2dpYyA9IHZvaWQgMDtcclxuY29uc3QgVmVoaWNsZURhdGFfMSA9IHJlcXVpcmUoXCIuL3R5cGVzL1ZlaGljbGVEYXRhXCIpO1xyXG5jbGFzcyBCdXNMb2dpYyB7XHJcbiAgICBjb25zdHJ1Y3RvcihkYXRhYmFzZSkge1xyXG4gICAgICAgIHRoaXMuZGF0YWJhc2UgPSBkYXRhYmFzZTtcclxuICAgICAgICB0aGlzLkluaXRpYWxpemUoKTtcclxuICAgIH1cclxuICAgIGFzeW5jIEluaXRpYWxpemUoKSB7XHJcbiAgICB9XHJcbiAgICBVcGRhdGVCdXNzZXMoYnVzc2VzKSB7XHJcbiAgICAgICAgYnVzc2VzLmZvckVhY2goYXN5bmMgKGJ1cywgaW5kZXgpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgZm91bmRWZWhpY2xlID0gYXdhaXQgdGhpcy5kYXRhYmFzZS5HZXRWZWhpY2xlKGJ1cy52ZWhpY2xlTnVtYmVyLCBidXMuY29tcGFueSk7XHJcbiAgICAgICAgICAgIGlmIChPYmplY3Qua2V5cyhmb3VuZFZlaGljbGUpLmxlbmd0aCAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFVwZGF0aW5nIHZlaGljbGUgJHtidXMudmVoaWNsZU51bWJlcn0gZnJvbSAke2J1cy5jb21wYW55fWApO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5kYXRhYmFzZS5VcGRhdGVWZWhpY2xlKGZvdW5kVmVoaWNsZSwgYnVzLCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBjcmVhdGluZyBuZXcgdmVoaWNsZSAke2J1cy52ZWhpY2xlTnVtYmVyfSBmcm9tICR7YnVzLmNvbXBhbnl9YCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoYnVzLnN0YXR1cyA9PT0gVmVoaWNsZURhdGFfMS52ZWhpY2xlU3RhdGUuT05ST1VURSlcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmRhdGFiYXNlLkFkZFZlaGljbGUoYnVzLCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuQnVzTG9naWMgPSBCdXNMb2dpYztcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5Db252ZXJ0ZXIgPSB2b2lkIDA7XHJcbmNvbnN0IFZlaGljbGVEYXRhXzEgPSByZXF1aXJlKFwiLi90eXBlcy9WZWhpY2xlRGF0YVwiKTtcclxuY2xhc3MgQ29udmVydGVyIHtcclxuICAgIGRlY29kZShkYXRhKSB7XHJcbiAgICAgICAgbGV0IG5ld0RhdGEgPSBkYXRhO1xyXG4gICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShkYXRhKS5pbmNsdWRlcygndG1pODonKSlcclxuICAgICAgICAgICAgbmV3RGF0YSA9IHRoaXMucmVtb3ZlVG1pOChkYXRhKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5jb252ZXJ0S1Y2VG9Kc29uKG5ld0RhdGEpO1xyXG4gICAgfVxyXG4gICAgY29udmVydEtWNlRvSnNvbihkYXRhKSB7XHJcbiAgICAgICAgbGV0IGt2NnBvc2luZm8gPSBkYXRhLlZWX1RNX1BVU0guS1Y2cG9zaW5mbztcclxuICAgICAgICBjb25zdCBhcnJheSA9IFtdO1xyXG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGt2NnBvc2luZm8pLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGt2NnBvc2luZm9ba2V5XS5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdmVoaWNsZVBvc0RhdGEgPSBrdjZwb3NpbmZvW2tleV1bal07XHJcbiAgICAgICAgICAgICAgICBpZiAoIXBhcnNlSW50KHZlaGljbGVQb3NEYXRhWydyZC14J10gKyBcIlwiKSB8fCAhcGFyc2VJbnQodmVoaWNsZVBvc0RhdGFbJ3JkLXknXSArIFwiXCIpKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgYXJyYXkucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgY29tcGFueTogdmVoaWNsZVBvc0RhdGEuZGF0YW93bmVyY29kZSxcclxuICAgICAgICAgICAgICAgICAgICBwbGFubmluZ051bWJlcjogdmVoaWNsZVBvc0RhdGEubGluZXBsYW5uaW5nbnVtYmVyLnRvU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICAgICAgam91cm5leU51bWJlcjogdmVoaWNsZVBvc0RhdGEuam91cm5leW51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUucGFyc2UodmVoaWNsZVBvc0RhdGEudGltZXN0YW1wKSxcclxuICAgICAgICAgICAgICAgICAgICB2ZWhpY2xlTnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS52ZWhpY2xlbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnJkVG9MYXRMb25nKHZlaGljbGVQb3NEYXRhWydyZC14J10sIHZlaGljbGVQb3NEYXRhWydyZC15J10pLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXR1czogVmVoaWNsZURhdGFfMS52ZWhpY2xlU3RhdGVba2V5XSxcclxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBhcnJheTtcclxuICAgIH1cclxuICAgIHJlbW92ZVRtaTgoZGF0YSkge1xyXG4gICAgICAgIGxldCBkYXRhU3RyaW5nID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XHJcbiAgICAgICAgZGF0YVN0cmluZyA9IGRhdGFTdHJpbmcucmVwbGFjZSgvdG1pODovZywgXCJcIik7XHJcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoZGF0YVN0cmluZyk7XHJcbiAgICB9XHJcbiAgICByZFRvTGF0TG9uZyh4LCB5KSB7XHJcbiAgICAgICAgaWYgKHggPT09IHVuZGVmaW5lZCB8fCB5ID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIHJldHVybiBbMCwgMF07XHJcbiAgICAgICAgY29uc3QgZFggPSAoeCAtIDE1NTAwMCkgKiBNYXRoLnBvdygxMCwgLTUpO1xyXG4gICAgICAgIGNvbnN0IGRZID0gKHkgLSA0NjMwMDApICogTWF0aC5wb3coMTAsIC01KTtcclxuICAgICAgICBjb25zdCBTb21OID0gKDMyMzUuNjUzODkgKiBkWSkgKyAoLTMyLjU4Mjk3ICogTWF0aC5wb3coZFgsIDIpKSArICgtMC4yNDc1ICpcclxuICAgICAgICAgICAgTWF0aC5wb3coZFksIDIpKSArICgtMC44NDk3OCAqIE1hdGgucG93KGRYLCAyKSAqXHJcbiAgICAgICAgICAgIGRZKSArICgtMC4wNjU1ICogTWF0aC5wb3coZFksIDMpKSArICgtMC4wMTcwOSAqXHJcbiAgICAgICAgICAgIE1hdGgucG93KGRYLCAyKSAqIE1hdGgucG93KGRZLCAyKSkgKyAoLTAuMDA3MzggKlxyXG4gICAgICAgICAgICBkWCkgKyAoMC4wMDUzICogTWF0aC5wb3coZFgsIDQpKSArICgtMC4wMDAzOSAqXHJcbiAgICAgICAgICAgIE1hdGgucG93KGRYLCAyKSAqIE1hdGgucG93KGRZLCAzKSkgKyAoMC4wMDAzMyAqIE1hdGgucG93KGRYLCA0KSAqIGRZKSArICgtMC4wMDAxMiAqXHJcbiAgICAgICAgICAgIGRYICogZFkpO1xyXG4gICAgICAgIGNvbnN0IFNvbUUgPSAoNTI2MC41MjkxNiAqIGRYKSArICgxMDUuOTQ2ODQgKiBkWCAqIGRZKSArICgyLjQ1NjU2ICpcclxuICAgICAgICAgICAgZFggKiBNYXRoLnBvdyhkWSwgMikpICsgKC0wLjgxODg1ICogTWF0aC5wb3coZFgsIDMpKSArICgwLjA1NTk0ICpcclxuICAgICAgICAgICAgZFggKiBNYXRoLnBvdyhkWSwgMykpICsgKC0wLjA1NjA3ICogTWF0aC5wb3coZFgsIDMpICogZFkpICsgKDAuMDExOTkgKlxyXG4gICAgICAgICAgICBkWSkgKyAoLTAuMDAyNTYgKiBNYXRoLnBvdyhkWCwgMykgKiBNYXRoLnBvdyhkWSwgMikpICsgKDAuMDAxMjggKlxyXG4gICAgICAgICAgICBkWCAqIE1hdGgucG93KGRZLCA0KSkgKyAoMC4wMDAyMiAqIE1hdGgucG93KGRZLCAyKSkgKyAoLTAuMDAwMjIgKiBNYXRoLnBvdyhkWCwgMikpICsgKDAuMDAwMjYgKlxyXG4gICAgICAgICAgICBNYXRoLnBvdyhkWCwgNSkpO1xyXG4gICAgICAgIGNvbnN0IExhdGl0dWRlID0gNTIuMTU1MTcgKyAoU29tTiAvIDM2MDApO1xyXG4gICAgICAgIGNvbnN0IExvbmdpdHVkZSA9IDUuMzg3MjA2ICsgKFNvbUUgLyAzNjAwKTtcclxuICAgICAgICByZXR1cm4gW0xvbmdpdHVkZSwgTGF0aXR1ZGVdO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuQ29udmVydGVyID0gQ29udmVydGVyO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLkRhdGFiYXNlID0gdm9pZCAwO1xyXG5jb25zdCBtb25nb29zZV8xID0gcmVxdWlyZShcIm1vbmdvb3NlXCIpO1xyXG5jb25zdCBWZWhpY2xlRGF0YV8xID0gcmVxdWlyZShcIi4vdHlwZXMvVmVoaWNsZURhdGFcIik7XHJcbmNsYXNzIERhdGFiYXNlIHtcclxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpIHtcclxuICAgICAgICBpZiAoIURhdGFiYXNlLmluc3RhbmNlKVxyXG4gICAgICAgICAgICBEYXRhYmFzZS5pbnN0YW5jZSA9IG5ldyBEYXRhYmFzZSgpO1xyXG4gICAgICAgIHJldHVybiBEYXRhYmFzZS5pbnN0YW5jZTtcclxuICAgIH1cclxuICAgIGFzeW5jIEluaXQoKSB7XHJcbiAgICAgICAgY29uc3QgdXJsID0gcHJvY2Vzcy5lbnYuREFUQUJBU0VfVVJMO1xyXG4gICAgICAgIGNvbnN0IG5hbWUgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9OQU1FO1xyXG4gICAgICAgIHRoaXMubW9uZ29vc2UgPSBuZXcgbW9uZ29vc2VfMS5Nb25nb29zZSgpO1xyXG4gICAgICAgIHRoaXMubW9uZ29vc2Uuc2V0KCd1c2VGaW5kQW5kTW9kaWZ5JywgZmFsc2UpO1xyXG4gICAgICAgIGlmICghdXJsICYmICFuYW1lKVxyXG4gICAgICAgICAgICB0aHJvdyAoYEludmFsaWQgVVJMIG9yIG5hbWUgZ2l2ZW4sIHJlY2VpdmVkOiBcXG4gTmFtZTogJHtuYW1lfSBcXG4gVVJMOiAke3VybH1gKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgQ29ubmVjdGluZyB0byBkYXRhYmFzZSB3aXRoIG5hbWU6ICR7bmFtZX0gYXQgdXJsOiAke3VybH1gKTtcclxuICAgICAgICB0aGlzLm1vbmdvb3NlLmNvbm5lY3QoYCR7dXJsfS8ke25hbWV9YCwge1xyXG4gICAgICAgICAgICB1c2VOZXdVcmxQYXJzZXI6IHRydWUsXHJcbiAgICAgICAgICAgIHVzZVVuaWZpZWRUb3BvbG9neTogdHJ1ZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuZGIgPSB0aGlzLm1vbmdvb3NlLmNvbm5lY3Rpb247XHJcbiAgICAgICAgdGhpcy5kYi5vbignZXJyb3InLCBlcnJvciA9PiB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBlcnJvcihgRXJyb3IgY29ubmVjdGluZyB0byBkYXRhYmFzZS4gJHtlcnJvcn1gKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBhd2FpdCB0aGlzLkRhdGFiYXNlTGlzdGVuZXIoKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICAgIGFzeW5jIERhdGFiYXNlTGlzdGVuZXIoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMsIHJlaikgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmRiLm9uY2UoXCJvcGVuXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdGlvbiB0byBkYXRhYmFzZSBlc3RhYmxpc2hlZC5cIik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZlaGljbGVTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICBwbGFubmluZ051bWJlcjogU3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgIGpvdXJuZXlOdW1iZXI6IE51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IE51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICB2ZWhpY2xlTnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IFtOdW1iZXIsIE51bWJlcl0sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzOiBTdHJpbmcsXHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlZEF0OiBOdW1iZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlZEF0OiBOdW1iZXJcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy52ZWhpY2xlTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwiVmVoaWNsZVBvc2l0aW9uc1wiLCB0aGlzLnZlaGljbGVTY2hlbWEpO1xyXG4gICAgICAgICAgICAgICAgcmVzKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgR2V0QWxsVmVoaWNsZXMoYXJncyA9IHt9KSB7XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmQoYXJncyk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBHZXRWZWhpY2xlKHZlaGljbGVOdW1iZXIsIHRyYW5zcG9ydGVyLCBmaXJzdE9ubHkgPSBmYWxzZSkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIC4uLmF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmRPbmUoe1xyXG4gICAgICAgICAgICAgICAgdmVoaWNsZU51bWJlcjogdmVoaWNsZU51bWJlcixcclxuICAgICAgICAgICAgICAgIGNvbXBhbnk6IHRyYW5zcG9ydGVyXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgIGFzeW5jIFZlaGljbGVFeGlzdHModmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIpIHtcclxuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5HZXRWZWhpY2xlKHZlaGljbGVOdW1iZXIsIHRyYW5zcG9ydGVyKSAhPT0gbnVsbDtcclxuICAgIH1cclxuICAgIGFzeW5jIFVwZGF0ZVZlaGljbGUodmVoaWNsZVRvVXBkYXRlLCB1cGRhdGVkVmVoaWNsZURhdGEsIHBvc2l0aW9uQ2hlY2tzID0gZmFsc2UpIHtcclxuICAgICAgICBpZiAoIXZlaGljbGVUb1VwZGF0ZVtcIl9kb2NcIl0pXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB2ZWhpY2xlVG9VcGRhdGUgPSB2ZWhpY2xlVG9VcGRhdGVbXCJfZG9jXCJdO1xyXG4gICAgICAgIGlmIChwb3NpdGlvbkNoZWNrcyAmJiB1cGRhdGVkVmVoaWNsZURhdGEuc3RhdHVzICE9PSBWZWhpY2xlRGF0YV8xLnZlaGljbGVTdGF0ZS5PTlJPVVRFKVxyXG4gICAgICAgICAgICB1cGRhdGVkVmVoaWNsZURhdGEucG9zaXRpb24gPSB2ZWhpY2xlVG9VcGRhdGUucG9zaXRpb247XHJcbiAgICAgICAgdXBkYXRlZFZlaGljbGVEYXRhLnVwZGF0ZWRBdCA9IERhdGUubm93KCk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZUFuZFVwZGF0ZSh2ZWhpY2xlVG9VcGRhdGUsIHVwZGF0ZWRWZWhpY2xlRGF0YSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBBZGRWZWhpY2xlKHZlaGljbGUsIG9ubHlBZGRXaGlsZU9uUm91dGUpIHtcclxuICAgICAgICBpZiAob25seUFkZFdoaWxlT25Sb3V0ZSAmJiB2ZWhpY2xlLnN0YXR1cyAhPT0gVmVoaWNsZURhdGFfMS52ZWhpY2xlU3RhdGUuT05ST1VURSlcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIG5ldyB0aGlzLnZlaGljbGVNb2RlbCh7XHJcbiAgICAgICAgICAgIC4uLnZlaGljbGVcclxuICAgICAgICB9KS5zYXZlKGVycm9yID0+IHtcclxuICAgICAgICAgICAgaWYgKGVycm9yKVxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgU29tZXRoaW5nIHdlbnQgd3Jvbmcgd2hpbGUgdHJ5aW5nIHRvIGFkZCB2ZWhpY2xlOiAke3ZlaGljbGUudmVoaWNsZU51bWJlcn0uIEVycm9yOiAke2Vycm9yfWApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgUmVtb3ZlVmVoaWNsZSh2ZWhpY2xlKSB7XHJcbiAgICAgICAgaWYgKCF2ZWhpY2xlW1wiX2RvY1wiXSlcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIHRoaXMudmVoaWNsZU1vZGVsLmZpbmRPbmVBbmREZWxldGUodmVoaWNsZSk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5EYXRhYmFzZSA9IERhdGFiYXNlO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgICAgQVBQIENPTkZJR1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxudmFyIF9fY3JlYXRlQmluZGluZyA9ICh0aGlzICYmIHRoaXMuX19jcmVhdGVCaW5kaW5nKSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcclxufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBvW2syXSA9IG1ba107XHJcbn0pKTtcclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9ICh0aGlzICYmIHRoaXMuX19zZXRNb2R1bGVEZWZhdWx0KSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XHJcbn0pIDogZnVuY3Rpb24obywgdikge1xyXG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xyXG59KTtcclxudmFyIF9faW1wb3J0U3RhciA9ICh0aGlzICYmIHRoaXMuX19pbXBvcnRTdGFyKSB8fCBmdW5jdGlvbiAobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xyXG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgZG90ZW52ID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJkb3RlbnZcIikpO1xyXG5kb3RlbnYuY29uZmlnKCk7XHJcbmNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDMwMDE7XHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAgIFlBUk4gSU1QT1JUU1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuY29uc3QgaHR0cHMgPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcImh0dHBzXCIpKTtcclxuY29uc3QgZnMgPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcImZzXCIpKTtcclxuY29uc3QgZXhwcmVzcyA9IHJlcXVpcmUoXCJleHByZXNzXCIpO1xyXG5jb25zdCBjb3JzID0gcmVxdWlyZShcImNvcnNcIik7XHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICBDVVNUT00gSU1QT1JUU1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuY29uc3QgZGF0YWJhc2VfMSA9IHJlcXVpcmUoXCIuL2RhdGFiYXNlXCIpO1xyXG5jb25zdCBzb2NrZXRfMSA9IHJlcXVpcmUoXCIuL3NvY2tldFwiKTtcclxuY29uc3QgcmVhbHRpbWVfMSA9IHJlcXVpcmUoXCIuL3JlYWx0aW1lXCIpO1xyXG5jb25zdCB3ZWJzZXJ2ZXJfMSA9IHJlcXVpcmUoXCIuL3dlYnNlcnZlclwiKTtcclxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgICAgU1NMIENPTkZJR1xyXG4tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cclxuY29uc3QgcHJpdmF0ZUtleSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUva2V5LmtleVwiKS50b1N0cmluZygpO1xyXG5jb25zdCBjZXJ0aWZpY2F0ZSA9IGZzLnJlYWRGaWxlU3luYyhcIi4vY2VydGlmaWNhdGUvY2VydC5jcnRcIikudG9TdHJpbmcoKTtcclxuY29uc3QgY2EgPSBmcy5yZWFkRmlsZVN5bmMoXCIuL2NlcnRpZmljYXRlL2tleS1jYS5jcnRcIikudG9TdHJpbmcoKTtcclxuY29uc3QgQXBwSW5pdCA9IGFzeW5jICgpID0+IHtcclxuICAgIGNvbnN0IGRiID0gYXdhaXQgZGF0YWJhc2VfMS5EYXRhYmFzZS5nZXRJbnN0YW5jZSgpLkluaXQoKS50aGVuKCk7XHJcbiAgICBjb25zdCBvdiA9IG5ldyByZWFsdGltZV8xLk9WRGF0YShkYik7XHJcbiAgICBjb25zdCBhcHAgPSAobW9kdWxlLmV4cG9ydHMgPSBleHByZXNzKCkpO1xyXG4gICAgY29uc3Qgc2VydmVyID0gaHR0cHMuY3JlYXRlU2VydmVyKHtcclxuICAgICAgICBrZXk6IHByaXZhdGVLZXksXHJcbiAgICAgICAgY2VydDogY2VydGlmaWNhdGUsXHJcbiAgICAgICAgY2E6IGNhLFxyXG4gICAgICAgIHJlcXVlc3RDZXJ0OiB0cnVlLFxyXG4gICAgICAgIHJlamVjdFVuYXV0aG9yaXplZDogZmFsc2UsXHJcbiAgICB9LCBhcHApO1xyXG4gICAgLy9USElTIElTIE5PVCBTQUZFXHJcbiAgICBjb25zdCBjb3JzT3B0aW9ucyA9IHtcclxuICAgICAgICBvcmlnaW46ICcqJyxcclxuICAgICAgICBvcHRpb25zU3VjY2Vzc1N0YXR1czogMjAwXHJcbiAgICB9O1xyXG4gICAgYXBwLnVzZShjb3JzKGNvcnNPcHRpb25zKSk7XHJcbiAgICBhcHAub3B0aW9ucygnKicsIGNvcnMoKSk7XHJcbiAgICBuZXcgc29ja2V0XzEuV2Vic29ja2V0KHNlcnZlcik7XHJcbiAgICBuZXcgd2Vic2VydmVyXzEuV2ViU2VydmVyKGFwcCwgZGIpO1xyXG4gICAgc2VydmVyLmxpc3Rlbihwb3J0LCAoKSA9PiBjb25zb2xlLmxvZyhgTGlzdGVuaW5nIGF0IGh0dHA6Ly9sb2NhbGhvc3Q6JHtwb3J0fWApKTtcclxufTtcclxuQXBwSW5pdCgpO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIF9fY3JlYXRlQmluZGluZyA9ICh0aGlzICYmIHRoaXMuX19jcmVhdGVCaW5kaW5nKSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9KTtcclxufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBvW2syXSA9IG1ba107XHJcbn0pKTtcclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9ICh0aGlzICYmIHRoaXMuX19zZXRNb2R1bGVEZWZhdWx0KSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XHJcbn0pIDogZnVuY3Rpb24obywgdikge1xyXG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xyXG59KTtcclxudmFyIF9faW1wb3J0U3RhciA9ICh0aGlzICYmIHRoaXMuX19pbXBvcnRTdGFyKSB8fCBmdW5jdGlvbiAobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xyXG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5PVkRhdGEgPSB2b2lkIDA7XHJcbmNvbnN0IHpsaWJfMSA9IHJlcXVpcmUoXCJ6bGliXCIpO1xyXG5jb25zdCBjb252ZXJ0ZXJfMSA9IHJlcXVpcmUoXCIuL2NvbnZlcnRlclwiKTtcclxuY29uc3QgYnVzbG9naWNfMSA9IHJlcXVpcmUoXCIuL2J1c2xvZ2ljXCIpO1xyXG5jb25zdCB4bWwgPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcImZhc3QteG1sLXBhcnNlclwiKSk7XHJcbmNvbnN0IHptcSA9IHJlcXVpcmUoJ3plcm9tcScpO1xyXG5jbGFzcyBPVkRhdGEge1xyXG4gICAgY29uc3RydWN0b3IoZGF0YWJhc2UpIHtcclxuICAgICAgICB0aGlzLkluaXQoKTtcclxuICAgICAgICB0aGlzLmJ1c0xvZ2ljID0gbmV3IGJ1c2xvZ2ljXzEuQnVzTG9naWMoZGF0YWJhc2UpO1xyXG4gICAgfVxyXG4gICAgSW5pdCgpIHtcclxuICAgICAgICBjb25zdCBjb252ZXJ0ZXIgPSBuZXcgY29udmVydGVyXzEuQ29udmVydGVyKCk7XHJcbiAgICAgICAgdGhpcy5zb2NrID0gem1xLnNvY2tldChcInN1YlwiKTtcclxuICAgICAgICB0aGlzLnNvY2suY29ubmVjdChcInRjcDovL3B1YnN1Yi5uZG92bG9rZXQubmw6NzY1OFwiKTtcclxuICAgICAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL0FSUi9LVjZwb3NpbmZvXCIpO1xyXG4gICAgICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvQ1hYL0tWNnBvc2luZm9cIik7XHJcbiAgICAgICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9FQlMvS1Y2cG9zaW5mb1wiKTtcclxuICAgICAgICB0aGlzLnNvY2sub24oXCJtZXNzYWdlXCIsIChvcENvZGUsIC4uLmNvbnRlbnQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgY29udGVudHMgPSBCdWZmZXIuY29uY2F0KGNvbnRlbnQpO1xyXG4gICAgICAgICAgICB6bGliXzEuZ3VuemlwKGNvbnRlbnRzLCAoZXJyb3IsIGJ1ZmZlcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb25zb2xlLmVycm9yKGBTb21ldGhpbmcgd2VudCB3cm9uZyB3aGlsZSB0cnlpbmcgdG8gdW56aXAuICR7ZXJyb3J9YCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlbmNvZGVkWE1MID0gYnVmZmVyLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkZWNvZGVkID0geG1sLnBhcnNlKGVuY29kZWRYTUwpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdmVoaWNsZURhdGEgPSBjb252ZXJ0ZXIuZGVjb2RlKGRlY29kZWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idXNMb2dpYy5VcGRhdGVCdXNzZXModmVoaWNsZURhdGEpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLk9WRGF0YSA9IE9WRGF0YTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5XZWJzb2NrZXQgPSB2b2lkIDA7XHJcbmNsYXNzIFdlYnNvY2tldCB7XHJcbiAgICBjb25zdHJ1Y3RvcihzZXJ2ZXIpIHtcclxuICAgICAgICB0aGlzLlNvY2tldEluaXQoc2VydmVyKTtcclxuICAgIH1cclxuICAgIFNvY2tldEluaXQoc2VydmVyKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYEluaXRhbGl6aW5nIHdlYnNvY2tldGApO1xyXG4gICAgICAgIHRoaXMuaW8gPSByZXF1aXJlKFwic29ja2V0LmlvXCIpKHNlcnZlciwge1xyXG4gICAgICAgICAgICBjb3JzOiB7XHJcbiAgICAgICAgICAgICAgICBvcmlnaW46IFwiKlwiLFxyXG4gICAgICAgICAgICAgICAgbWV0aG9kczogW1wiR0VUXCIsIFwiUE9TVFwiXSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLmlvLm9uKFwiY29ubmVjdGlvblwiLCBzb2NrZXQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLlNvY2tldChzb2NrZXQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgU29ja2V0KHNvY2tldCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiTmV3IGNsaWVudCBjb25uZWN0ZWQuXCIpO1xyXG4gICAgICAgIHNvY2tldC5vbihcImRpc2Nvbm5lY3RcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNsaWVudCBkaXNjb25uZWN0ZWRcIik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5XZWJzb2NrZXQgPSBXZWJzb2NrZXQ7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMudmVoaWNsZVN0YXRlID0gdm9pZCAwO1xyXG52YXIgdmVoaWNsZVN0YXRlO1xyXG4oZnVuY3Rpb24gKHZlaGljbGVTdGF0ZSkge1xyXG4gICAgdmVoaWNsZVN0YXRlW1wiT05ST1VURVwiXSA9IFwiT05ST1VURVwiO1xyXG4gICAgdmVoaWNsZVN0YXRlW1wiRU5ERURcIl0gPSBcIkVOREVEXCI7XHJcbiAgICB2ZWhpY2xlU3RhdGVbXCJERVBBUlRVUkVcIl0gPSBcIkRFUEFSVFVSRVwiO1xyXG4gICAgdmVoaWNsZVN0YXRlW1wiSU5JVFwiXSA9IFwiSU5JVFwiO1xyXG4gICAgdmVoaWNsZVN0YXRlW1wiREVMQVlcIl0gPSBcIkRFTEFZXCI7XHJcbiAgICB2ZWhpY2xlU3RhdGVbXCJPTlNUT1BcIl0gPSBcIk9OU1RPUFwiO1xyXG4gICAgdmVoaWNsZVN0YXRlW1wiQVJSSVZBTFwiXSA9IFwiQVJSSVZBTFwiO1xyXG59KSh2ZWhpY2xlU3RhdGUgPSBleHBvcnRzLnZlaGljbGVTdGF0ZSB8fCAoZXhwb3J0cy52ZWhpY2xlU3RhdGUgPSB7fSkpO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLldlYlNlcnZlciA9IHZvaWQgMDtcclxuY2xhc3MgV2ViU2VydmVyIHtcclxuICAgIGNvbnN0cnVjdG9yKGFwcCwgZGF0YWJhc2UpIHtcclxuICAgICAgICB0aGlzLmFwcCA9IGFwcDtcclxuICAgICAgICB0aGlzLmRhdGFiYXNlID0gZGF0YWJhc2U7XHJcbiAgICAgICAgdGhpcy5Jbml0aWFsaXplKCk7XHJcbiAgICB9XHJcbiAgICBJbml0aWFsaXplKCkge1xyXG4gICAgICAgIHRoaXMuYXBwLmdldChcIi9cIiwgKHJlcSwgcmVzKSA9PiByZXMuc2VuZChcIlRoaXMgaXMgdGhlIEFQSSBlbmRwb2ludCBmb3IgdGhlIFRBSU9WQSBhcHBsaWNhdGlvbi5cIikpO1xyXG4gICAgICAgIHRoaXMuYXBwLmdldChcIi9idXNzZXNcIiwgYXN5bmMgKHJlcSwgcmVzKSA9PiByZXMuc2VuZChhd2FpdCB0aGlzLmRhdGFiYXNlLkdldEFsbFZlaGljbGVzKCkpKTtcclxuICAgICAgICB0aGlzLmFwcC5nZXQoXCIvYnVzc2VzLzpjb21wYW55LzpudW1iZXIvXCIsIChyZXEsIHJlcykgPT4ge1xyXG4gICAgICAgICAgICByZXMuc2VuZChKU09OLnN0cmluZ2lmeShyZXEucGFyYW1zKSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5XZWJTZXJ2ZXIgPSBXZWJTZXJ2ZXI7XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImNvcnNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImRvdGVudlwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZXhwcmVzc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZmFzdC14bWwtcGFyc2VyXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJmc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiaHR0cHNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIm1vbmdvb3NlXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzb2NrZXQuaW9cIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInplcm9tcVwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiemxpYlwiKTs7IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIHN0YXJ0dXBcbi8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuLy8gVGhpcyBlbnRyeSBtb2R1bGUgaXMgcmVmZXJlbmNlZCBieSBvdGhlciBtb2R1bGVzIHNvIGl0IGNhbid0IGJlIGlubGluZWRcbnZhciBfX3dlYnBhY2tfZXhwb3J0c19fID0gX193ZWJwYWNrX3JlcXVpcmVfXyhcIi4vc3JjL21haW4udHNcIik7XG4iXSwic291cmNlUm9vdCI6IiJ9