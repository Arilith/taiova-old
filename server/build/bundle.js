/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/buslogic.ts":
/*!*************************!*\
  !*** ./src/buslogic.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BusLogic = void 0;
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
            if (foundVehicle[0] != undefined)
                await this.database.UpdateVehicle(foundVehicle, bus);
            else
                await this.database.AddVehicle(bus);
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
        return [Latitude, Longitude];
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
    async AddVehicle(vehicle) {
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
    const ov = new realtime_1.OVData(db);
    const app = (module.exports = express());
    const server = https.createServer({
        key: privateKey,
        cert: certificate,
        ca: ca,
        requestCert: true,
        rejectUnauthorized: false,
    }, app);
    new socket_1.Websocket(server);
    app.get("/", (req, res) => res.send("This is the API endpoint for the TAIOVA application."));
    app.get("/busses", async (req, res) => res.send(await db.GetAllVehicles()));
    app.get("/busses/:company/:number/", (req, res) => {
        res.send(JSON.stringify(req.params));
    });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvYnVzbG9naWMudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL2NvbnZlcnRlci50cyIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvLi9zcmMvZGF0YWJhc2UudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL21haW4udHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL3JlYWx0aW1lLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci8uL3NyYy9zb2NrZXQudHMiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyLy4vc3JjL3R5cGVzL1ZlaGljbGVEYXRhLnRzIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImRvdGVudlwiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImV4cHJlc3NcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJmYXN0LXhtbC1wYXJzZXJcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJmc1wiIiwid2VicGFjazovL3RhaW92YXNlcnZlci9leHRlcm5hbCBcImh0dHBzXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL2V4dGVybmFsIFwibW9uZ29vc2VcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJzb2NrZXQuaW9cIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJ6ZXJvbXFcIiIsIndlYnBhY2s6Ly90YWlvdmFzZXJ2ZXIvZXh0ZXJuYWwgXCJ6bGliXCIiLCJ3ZWJwYWNrOi8vdGFpb3Zhc2VydmVyL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3RhaW92YXNlcnZlci93ZWJwYWNrL3N0YXJ0dXAiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFhO0FBQ2IsOENBQTZDLENBQUMsY0FBYyxFQUFDO0FBQzdELGdC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QyxvQkFBb0IsS0FBSzs7Ozs7Ozs7Ozs7QUNacEUsb0M7Ozs7Ozs7Ozs7QUNBQSxxQzs7Ozs7Ozs7OztBQ0FBLDZDOzs7Ozs7Ozs7O0FDQUEsZ0M7Ozs7Ozs7Ozs7QUNBQSxtQzs7Ozs7Ozs7OztBQ0FBLHNDOzs7Ozs7Ozs7O0FDQUEsdUM7Ozs7Ozs7Ozs7QUNBQSxvQzs7Ozs7Ozs7OztBQ0FBLGtDOzs7Ozs7VUNBQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBOztVQUVBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBOzs7O1VDdEJBO1VBQ0E7VUFDQTtVQUNBIiwiZmlsZSI6ImJ1bmRsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuQnVzTG9naWMgPSB2b2lkIDA7XHJcbmNsYXNzIEJ1c0xvZ2ljIHtcclxuICAgIGNvbnN0cnVjdG9yKGRhdGFiYXNlKSB7XHJcbiAgICAgICAgdGhpcy5kYXRhYmFzZSA9IGRhdGFiYXNlO1xyXG4gICAgICAgIHRoaXMuSW5pdGlhbGl6ZSgpO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgSW5pdGlhbGl6ZSgpIHtcclxuICAgIH1cclxuICAgIFVwZGF0ZUJ1c3NlcyhidXNzZXMpIHtcclxuICAgICAgICBidXNzZXMuZm9yRWFjaChhc3luYyAoYnVzLCBpbmRleCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBmb3VuZFZlaGljbGUgPSBhd2FpdCB0aGlzLmRhdGFiYXNlLkdldFZlaGljbGUoYnVzLnZlaGljbGVOdW1iZXIsIGJ1cy5jb21wYW55KTtcclxuICAgICAgICAgICAgaWYgKGZvdW5kVmVoaWNsZVswXSAhPSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmRhdGFiYXNlLlVwZGF0ZVZlaGljbGUoZm91bmRWZWhpY2xlLCBidXMpO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmRhdGFiYXNlLkFkZFZlaGljbGUoYnVzKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLkJ1c0xvZ2ljID0gQnVzTG9naWM7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuQ29udmVydGVyID0gdm9pZCAwO1xyXG5jb25zdCBWZWhpY2xlRGF0YV8xID0gcmVxdWlyZShcIi4vdHlwZXMvVmVoaWNsZURhdGFcIik7XHJcbmNsYXNzIENvbnZlcnRlciB7XHJcbiAgICBkZWNvZGUoZGF0YSkge1xyXG4gICAgICAgIGxldCBuZXdEYXRhID0gZGF0YTtcclxuICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoZGF0YSkuaW5jbHVkZXMoJ3RtaTg6JykpXHJcbiAgICAgICAgICAgIG5ld0RhdGEgPSB0aGlzLnJlbW92ZVRtaTgoZGF0YSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29udmVydEtWNlRvSnNvbihuZXdEYXRhKTtcclxuICAgIH1cclxuICAgIGNvbnZlcnRLVjZUb0pzb24oZGF0YSkge1xyXG4gICAgICAgIGxldCBrdjZwb3NpbmZvID0gZGF0YS5WVl9UTV9QVVNILktWNnBvc2luZm87XHJcbiAgICAgICAgY29uc3QgYXJyYXkgPSBbXTtcclxuICAgICAgICBPYmplY3QuZW50cmllcyhrdjZwb3NpbmZvKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBrdjZwb3NpbmZvW2tleV0ubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHZlaGljbGVQb3NEYXRhID0ga3Y2cG9zaW5mb1trZXldW2pdO1xyXG4gICAgICAgICAgICAgICAgYXJyYXkucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgY29tcGFueTogdmVoaWNsZVBvc0RhdGEuZGF0YW93bmVyY29kZSxcclxuICAgICAgICAgICAgICAgICAgICBwbGFubmluZ051bWJlcjogdmVoaWNsZVBvc0RhdGEubGluZXBsYW5uaW5nbnVtYmVyLnRvU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICAgICAgam91cm5leU51bWJlcjogdmVoaWNsZVBvc0RhdGEuam91cm5leW51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUucGFyc2UodmVoaWNsZVBvc0RhdGEudGltZXN0YW1wKSxcclxuICAgICAgICAgICAgICAgICAgICB2ZWhpY2xlTnVtYmVyOiB2ZWhpY2xlUG9zRGF0YS52ZWhpY2xlbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB0aGlzLnJkVG9MYXRMb25nKHZlaGljbGVQb3NEYXRhWydyZC14J10sIHZlaGljbGVQb3NEYXRhWydyZC15J10pLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXR1czogVmVoaWNsZURhdGFfMS52ZWhpY2xlU3RhdGVba2V5XSxcclxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBhcnJheTtcclxuICAgIH1cclxuICAgIHJlbW92ZVRtaTgoZGF0YSkge1xyXG4gICAgICAgIGxldCBkYXRhU3RyaW5nID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XHJcbiAgICAgICAgZGF0YVN0cmluZyA9IGRhdGFTdHJpbmcucmVwbGFjZSgvdG1pODovZywgXCJcIik7XHJcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoZGF0YVN0cmluZyk7XHJcbiAgICB9XHJcbiAgICByZFRvTGF0TG9uZyh4LCB5KSB7XHJcbiAgICAgICAgaWYgKHggPT09IHVuZGVmaW5lZCB8fCB5ID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgIHJldHVybiBbMCwgMF07XHJcbiAgICAgICAgY29uc3QgZFggPSAoeCAtIDE1NTAwMCkgKiBNYXRoLnBvdygxMCwgLTUpO1xyXG4gICAgICAgIGNvbnN0IGRZID0gKHkgLSA0NjMwMDApICogTWF0aC5wb3coMTAsIC01KTtcclxuICAgICAgICBjb25zdCBTb21OID0gKDMyMzUuNjUzODkgKiBkWSkgKyAoLTMyLjU4Mjk3ICogTWF0aC5wb3coZFgsIDIpKSArICgtMC4yNDc1ICpcclxuICAgICAgICAgICAgTWF0aC5wb3coZFksIDIpKSArICgtMC44NDk3OCAqIE1hdGgucG93KGRYLCAyKSAqXHJcbiAgICAgICAgICAgIGRZKSArICgtMC4wNjU1ICogTWF0aC5wb3coZFksIDMpKSArICgtMC4wMTcwOSAqXHJcbiAgICAgICAgICAgIE1hdGgucG93KGRYLCAyKSAqIE1hdGgucG93KGRZLCAyKSkgKyAoLTAuMDA3MzggKlxyXG4gICAgICAgICAgICBkWCkgKyAoMC4wMDUzICogTWF0aC5wb3coZFgsIDQpKSArICgtMC4wMDAzOSAqXHJcbiAgICAgICAgICAgIE1hdGgucG93KGRYLCAyKSAqIE1hdGgucG93KGRZLCAzKSkgKyAoMC4wMDAzMyAqIE1hdGgucG93KGRYLCA0KSAqIGRZKSArICgtMC4wMDAxMiAqXHJcbiAgICAgICAgICAgIGRYICogZFkpO1xyXG4gICAgICAgIGNvbnN0IFNvbUUgPSAoNTI2MC41MjkxNiAqIGRYKSArICgxMDUuOTQ2ODQgKiBkWCAqIGRZKSArICgyLjQ1NjU2ICpcclxuICAgICAgICAgICAgZFggKiBNYXRoLnBvdyhkWSwgMikpICsgKC0wLjgxODg1ICogTWF0aC5wb3coZFgsIDMpKSArICgwLjA1NTk0ICpcclxuICAgICAgICAgICAgZFggKiBNYXRoLnBvdyhkWSwgMykpICsgKC0wLjA1NjA3ICogTWF0aC5wb3coZFgsIDMpICogZFkpICsgKDAuMDExOTkgKlxyXG4gICAgICAgICAgICBkWSkgKyAoLTAuMDAyNTYgKiBNYXRoLnBvdyhkWCwgMykgKiBNYXRoLnBvdyhkWSwgMikpICsgKDAuMDAxMjggKlxyXG4gICAgICAgICAgICBkWCAqIE1hdGgucG93KGRZLCA0KSkgKyAoMC4wMDAyMiAqIE1hdGgucG93KGRZLCAyKSkgKyAoLTAuMDAwMjIgKiBNYXRoLnBvdyhkWCwgMikpICsgKDAuMDAwMjYgKlxyXG4gICAgICAgICAgICBNYXRoLnBvdyhkWCwgNSkpO1xyXG4gICAgICAgIGNvbnN0IExhdGl0dWRlID0gNTIuMTU1MTcgKyAoU29tTiAvIDM2MDApO1xyXG4gICAgICAgIGNvbnN0IExvbmdpdHVkZSA9IDUuMzg3MjA2ICsgKFNvbUUgLyAzNjAwKTtcclxuICAgICAgICByZXR1cm4gW0xhdGl0dWRlLCBMb25naXR1ZGVdO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuQ29udmVydGVyID0gQ29udmVydGVyO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLkRhdGFiYXNlID0gdm9pZCAwO1xyXG5jb25zdCBtb25nb29zZV8xID0gcmVxdWlyZShcIm1vbmdvb3NlXCIpO1xyXG5jb25zdCBWZWhpY2xlRGF0YV8xID0gcmVxdWlyZShcIi4vdHlwZXMvVmVoaWNsZURhdGFcIik7XHJcbmNsYXNzIERhdGFiYXNlIHtcclxuICAgIHN0YXRpYyBnZXRJbnN0YW5jZSgpIHtcclxuICAgICAgICBpZiAoIURhdGFiYXNlLmluc3RhbmNlKVxyXG4gICAgICAgICAgICBEYXRhYmFzZS5pbnN0YW5jZSA9IG5ldyBEYXRhYmFzZSgpO1xyXG4gICAgICAgIHJldHVybiBEYXRhYmFzZS5pbnN0YW5jZTtcclxuICAgIH1cclxuICAgIGFzeW5jIEluaXQoKSB7XHJcbiAgICAgICAgY29uc3QgdXJsID0gcHJvY2Vzcy5lbnYuREFUQUJBU0VfVVJMO1xyXG4gICAgICAgIGNvbnN0IG5hbWUgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9OQU1FO1xyXG4gICAgICAgIHRoaXMubW9uZ29vc2UgPSBuZXcgbW9uZ29vc2VfMS5Nb25nb29zZSgpO1xyXG4gICAgICAgIHRoaXMubW9uZ29vc2Uuc2V0KCd1c2VGaW5kQW5kTW9kaWZ5JywgZmFsc2UpO1xyXG4gICAgICAgIGlmICghdXJsICYmICFuYW1lKVxyXG4gICAgICAgICAgICB0aHJvdyAoYEludmFsaWQgVVJMIG9yIG5hbWUgZ2l2ZW4sIHJlY2VpdmVkOiBcXG4gTmFtZTogJHtuYW1lfSBcXG4gVVJMOiAke3VybH1gKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgQ29ubmVjdGluZyB0byBkYXRhYmFzZSB3aXRoIG5hbWU6ICR7bmFtZX0gYXQgdXJsOiAke3VybH1gKTtcclxuICAgICAgICB0aGlzLm1vbmdvb3NlLmNvbm5lY3QoYCR7dXJsfS8ke25hbWV9YCwge1xyXG4gICAgICAgICAgICB1c2VOZXdVcmxQYXJzZXI6IHRydWUsXHJcbiAgICAgICAgICAgIHVzZVVuaWZpZWRUb3BvbG9neTogdHJ1ZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuZGIgPSB0aGlzLm1vbmdvb3NlLmNvbm5lY3Rpb247XHJcbiAgICAgICAgdGhpcy5kYi5vbignZXJyb3InLCBlcnJvciA9PiB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBlcnJvcihgRXJyb3IgY29ubmVjdGluZyB0byBkYXRhYmFzZS4gJHtlcnJvcn1gKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBhd2FpdCB0aGlzLkRhdGFiYXNlTGlzdGVuZXIoKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICAgIGFzeW5jIERhdGFiYXNlTGlzdGVuZXIoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMsIHJlaikgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmRiLm9uY2UoXCJvcGVuXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdGlvbiB0byBkYXRhYmFzZSBlc3RhYmxpc2hlZC5cIik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZlaGljbGVTY2hlbWEgPSBuZXcgdGhpcy5tb25nb29zZS5TY2hlbWEoe1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBhbnk6IFN0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICBwbGFubmluZ051bWJlcjogU3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgIGpvdXJuZXlOdW1iZXI6IE51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IE51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICB2ZWhpY2xlTnVtYmVyOiBOdW1iZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IFtOdW1iZXIsIE51bWJlcl0sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzOiBTdHJpbmcsXHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlZEF0OiBOdW1iZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlZEF0OiBOdW1iZXJcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy52ZWhpY2xlTW9kZWwgPSB0aGlzLm1vbmdvb3NlLm1vZGVsKFwiVmVoaWNsZVBvc2l0aW9uc1wiLCB0aGlzLnZlaGljbGVTY2hlbWEpO1xyXG4gICAgICAgICAgICAgICAgcmVzKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgR2V0QWxsVmVoaWNsZXMoYXJncyA9IHt9KSB7XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmQoYXJncyk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBHZXRWZWhpY2xlKHZlaGljbGVOdW1iZXIsIHRyYW5zcG9ydGVyLCBmaXJzdE9ubHkgPSBmYWxzZSkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIC4uLmF3YWl0IHRoaXMudmVoaWNsZU1vZGVsLmZpbmRPbmUoe1xyXG4gICAgICAgICAgICAgICAgdmVoaWNsZU51bWJlcjogdmVoaWNsZU51bWJlcixcclxuICAgICAgICAgICAgICAgIGNvbXBhbnk6IHRyYW5zcG9ydGVyXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgIGFzeW5jIFZlaGljbGVFeGlzdHModmVoaWNsZU51bWJlciwgdHJhbnNwb3J0ZXIpIHtcclxuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5HZXRWZWhpY2xlKHZlaGljbGVOdW1iZXIsIHRyYW5zcG9ydGVyKSAhPT0gbnVsbDtcclxuICAgIH1cclxuICAgIGFzeW5jIFVwZGF0ZVZlaGljbGUodmVoaWNsZVRvVXBkYXRlLCB1cGRhdGVkVmVoaWNsZURhdGEsIHBvc2l0aW9uQ2hlY2tzID0gZmFsc2UpIHtcclxuICAgICAgICBpZiAoIXZlaGljbGVUb1VwZGF0ZVtcIl9kb2NcIl0pXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB2ZWhpY2xlVG9VcGRhdGUgPSB2ZWhpY2xlVG9VcGRhdGVbXCJfZG9jXCJdO1xyXG4gICAgICAgIGlmIChwb3NpdGlvbkNoZWNrcyAmJiB1cGRhdGVkVmVoaWNsZURhdGEuc3RhdHVzICE9PSBWZWhpY2xlRGF0YV8xLnZlaGljbGVTdGF0ZS5PTlJPVVRFKVxyXG4gICAgICAgICAgICB1cGRhdGVkVmVoaWNsZURhdGEucG9zaXRpb24gPSB2ZWhpY2xlVG9VcGRhdGUucG9zaXRpb247XHJcbiAgICAgICAgdXBkYXRlZFZlaGljbGVEYXRhLnVwZGF0ZWRBdCA9IERhdGUubm93KCk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy52ZWhpY2xlTW9kZWwuZmluZE9uZUFuZFVwZGF0ZSh2ZWhpY2xlVG9VcGRhdGUsIHVwZGF0ZWRWZWhpY2xlRGF0YSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBBZGRWZWhpY2xlKHZlaGljbGUpIHtcclxuICAgICAgICBuZXcgdGhpcy52ZWhpY2xlTW9kZWwoe1xyXG4gICAgICAgICAgICAuLi52ZWhpY2xlXHJcbiAgICAgICAgfSkuc2F2ZShlcnJvciA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlcnJvcilcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFNvbWV0aGluZyB3ZW50IHdyb25nIHdoaWxlIHRyeWluZyB0byBhZGQgdmVoaWNsZTogJHt2ZWhpY2xlLnZlaGljbGVOdW1iZXJ9LiBFcnJvcjogJHtlcnJvcn1gKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGFzeW5jIFJlbW92ZVZlaGljbGUodmVoaWNsZSkge1xyXG4gICAgICAgIGlmICghdmVoaWNsZVtcIl9kb2NcIl0pXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB0aGlzLnZlaGljbGVNb2RlbC5maW5kT25lQW5kRGVsZXRlKHZlaGljbGUpO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuRGF0YWJhc2UgPSBEYXRhYmFzZTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAgIEFQUCBDT05GSUdcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcbnZhciBfX2NyZWF0ZUJpbmRpbmcgPSAodGhpcyAmJiB0aGlzLl9fY3JlYXRlQmluZGluZykgfHwgKE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfSk7XHJcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XHJcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xyXG4gICAgb1trMl0gPSBtW2tdO1xyXG59KSk7XHJcbnZhciBfX3NldE1vZHVsZURlZmF1bHQgPSAodGhpcyAmJiB0aGlzLl9fc2V0TW9kdWxlRGVmYXVsdCkgfHwgKE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufSk7XHJcbnZhciBfX2ltcG9ydFN0YXIgPSAodGhpcyAmJiB0aGlzLl9faW1wb3J0U3RhcikgfHwgZnVuY3Rpb24gKG1vZCkge1xyXG4gICAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcclxuICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayBpbiBtb2QpIGlmIChrICE9PSBcImRlZmF1bHRcIiAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobW9kLCBrKSkgX19jcmVhdGVCaW5kaW5nKHJlc3VsdCwgbW9kLCBrKTtcclxuICAgIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGRvdGVudiA9IF9faW1wb3J0U3RhcihyZXF1aXJlKFwiZG90ZW52XCIpKTtcclxuZG90ZW52LmNvbmZpZygpO1xyXG5jb25zdCBwb3J0ID0gcHJvY2Vzcy5lbnYuUE9SVCB8fCAzMDAxO1xyXG4vKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgICBZQVJOIElNUE9SVFNcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcbmNvbnN0IGh0dHBzID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJodHRwc1wiKSk7XHJcbmNvbnN0IGZzID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJmc1wiKSk7XHJcbmNvbnN0IGV4cHJlc3MgPSByZXF1aXJlKFwiZXhwcmVzc1wiKTtcclxuLyogLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIENVU1RPTSBJTVBPUlRTXHJcbi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xyXG5jb25zdCBkYXRhYmFzZV8xID0gcmVxdWlyZShcIi4vZGF0YWJhc2VcIik7XHJcbmNvbnN0IHNvY2tldF8xID0gcmVxdWlyZShcIi4vc29ja2V0XCIpO1xyXG5jb25zdCByZWFsdGltZV8xID0gcmVxdWlyZShcIi4vcmVhbHRpbWVcIik7XHJcbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAgIFNTTCBDT05GSUdcclxuLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXHJcbmNvbnN0IHByaXZhdGVLZXkgPSBmcy5yZWFkRmlsZVN5bmMoXCIuL2NlcnRpZmljYXRlL2tleS5rZXlcIikudG9TdHJpbmcoKTtcclxuY29uc3QgY2VydGlmaWNhdGUgPSBmcy5yZWFkRmlsZVN5bmMoXCIuL2NlcnRpZmljYXRlL2NlcnQuY3J0XCIpLnRvU3RyaW5nKCk7XHJcbmNvbnN0IGNhID0gZnMucmVhZEZpbGVTeW5jKFwiLi9jZXJ0aWZpY2F0ZS9rZXktY2EuY3J0XCIpLnRvU3RyaW5nKCk7XHJcbmNvbnN0IEFwcEluaXQgPSBhc3luYyAoKSA9PiB7XHJcbiAgICBjb25zdCBkYiA9IGF3YWl0IGRhdGFiYXNlXzEuRGF0YWJhc2UuZ2V0SW5zdGFuY2UoKS5Jbml0KCkudGhlbigpO1xyXG4gICAgY29uc3Qgb3YgPSBuZXcgcmVhbHRpbWVfMS5PVkRhdGEoZGIpO1xyXG4gICAgY29uc3QgYXBwID0gKG1vZHVsZS5leHBvcnRzID0gZXhwcmVzcygpKTtcclxuICAgIGNvbnN0IHNlcnZlciA9IGh0dHBzLmNyZWF0ZVNlcnZlcih7XHJcbiAgICAgICAga2V5OiBwcml2YXRlS2V5LFxyXG4gICAgICAgIGNlcnQ6IGNlcnRpZmljYXRlLFxyXG4gICAgICAgIGNhOiBjYSxcclxuICAgICAgICByZXF1ZXN0Q2VydDogdHJ1ZSxcclxuICAgICAgICByZWplY3RVbmF1dGhvcml6ZWQ6IGZhbHNlLFxyXG4gICAgfSwgYXBwKTtcclxuICAgIG5ldyBzb2NrZXRfMS5XZWJzb2NrZXQoc2VydmVyKTtcclxuICAgIGFwcC5nZXQoXCIvXCIsIChyZXEsIHJlcykgPT4gcmVzLnNlbmQoXCJUaGlzIGlzIHRoZSBBUEkgZW5kcG9pbnQgZm9yIHRoZSBUQUlPVkEgYXBwbGljYXRpb24uXCIpKTtcclxuICAgIGFwcC5nZXQoXCIvYnVzc2VzXCIsIGFzeW5jIChyZXEsIHJlcykgPT4gcmVzLnNlbmQoYXdhaXQgZGIuR2V0QWxsVmVoaWNsZXMoKSkpO1xyXG4gICAgYXBwLmdldChcIi9idXNzZXMvOmNvbXBhbnkvOm51bWJlci9cIiwgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICAgICAgcmVzLnNlbmQoSlNPTi5zdHJpbmdpZnkocmVxLnBhcmFtcykpO1xyXG4gICAgfSk7XHJcbiAgICBzZXJ2ZXIubGlzdGVuKHBvcnQsICgpID0+IGNvbnNvbGUubG9nKGBMaXN0ZW5pbmcgYXQgaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9YCkpO1xyXG59O1xyXG5BcHBJbml0KCk7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgX19jcmVhdGVCaW5kaW5nID0gKHRoaXMgJiYgdGhpcy5fX2NyZWF0ZUJpbmRpbmcpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XHJcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIGsyLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH0pO1xyXG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIG9bazJdID0gbVtrXTtcclxufSkpO1xyXG52YXIgX19zZXRNb2R1bGVEZWZhdWx0ID0gKHRoaXMgJiYgdGhpcy5fX3NldE1vZHVsZURlZmF1bHQpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBcImRlZmF1bHRcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdiB9KTtcclxufSkgOiBmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBvW1wiZGVmYXVsdFwiXSA9IHY7XHJcbn0pO1xyXG52YXIgX19pbXBvcnRTdGFyID0gKHRoaXMgJiYgdGhpcy5fX2ltcG9ydFN0YXIpIHx8IGZ1bmN0aW9uIChtb2QpIHtcclxuICAgIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XHJcbiAgICB2YXIgcmVzdWx0ID0ge307XHJcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1vZCwgaykpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwgayk7XHJcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLk9WRGF0YSA9IHZvaWQgMDtcclxuY29uc3QgemxpYl8xID0gcmVxdWlyZShcInpsaWJcIik7XHJcbmNvbnN0IGNvbnZlcnRlcl8xID0gcmVxdWlyZShcIi4vY29udmVydGVyXCIpO1xyXG5jb25zdCBidXNsb2dpY18xID0gcmVxdWlyZShcIi4vYnVzbG9naWNcIik7XHJcbmNvbnN0IHhtbCA9IF9faW1wb3J0U3RhcihyZXF1aXJlKFwiZmFzdC14bWwtcGFyc2VyXCIpKTtcclxuY29uc3Qgem1xID0gcmVxdWlyZSgnemVyb21xJyk7XHJcbmNsYXNzIE9WRGF0YSB7XHJcbiAgICBjb25zdHJ1Y3RvcihkYXRhYmFzZSkge1xyXG4gICAgICAgIHRoaXMuSW5pdCgpO1xyXG4gICAgICAgIHRoaXMuYnVzTG9naWMgPSBuZXcgYnVzbG9naWNfMS5CdXNMb2dpYyhkYXRhYmFzZSk7XHJcbiAgICB9XHJcbiAgICBJbml0KCkge1xyXG4gICAgICAgIGNvbnN0IGNvbnZlcnRlciA9IG5ldyBjb252ZXJ0ZXJfMS5Db252ZXJ0ZXIoKTtcclxuICAgICAgICB0aGlzLnNvY2sgPSB6bXEuc29ja2V0KFwic3ViXCIpO1xyXG4gICAgICAgIHRoaXMuc29jay5jb25uZWN0KFwidGNwOi8vcHVic3ViLm5kb3Zsb2tldC5ubDo3NjU4XCIpO1xyXG4gICAgICAgIHRoaXMuc29jay5zdWJzY3JpYmUoXCIvQVJSL0tWNnBvc2luZm9cIik7XHJcbiAgICAgICAgdGhpcy5zb2NrLnN1YnNjcmliZShcIi9DWFgvS1Y2cG9zaW5mb1wiKTtcclxuICAgICAgICB0aGlzLnNvY2suc3Vic2NyaWJlKFwiL0VCUy9LVjZwb3NpbmZvXCIpO1xyXG4gICAgICAgIHRoaXMuc29jay5vbihcIm1lc3NhZ2VcIiwgKG9wQ29kZSwgLi4uY29udGVudCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBjb250ZW50cyA9IEJ1ZmZlci5jb25jYXQoY29udGVudCk7XHJcbiAgICAgICAgICAgIHpsaWJfMS5ndW56aXAoY29udGVudHMsIChlcnJvciwgYnVmZmVyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbnNvbGUuZXJyb3IoYFNvbWV0aGluZyB3ZW50IHdyb25nIHdoaWxlIHRyeWluZyB0byB1bnppcC4gJHtlcnJvcn1gKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVuY29kZWRYTUwgPSBidWZmZXIudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlY29kZWQgPSB4bWwucGFyc2UoZW5jb2RlZFhNTCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWhpY2xlRGF0YSA9IGNvbnZlcnRlci5kZWNvZGUoZGVjb2RlZCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ1c0xvZ2ljLlVwZGF0ZUJ1c3Nlcyh2ZWhpY2xlRGF0YSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuT1ZEYXRhID0gT1ZEYXRhO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLldlYnNvY2tldCA9IHZvaWQgMDtcclxuY2xhc3MgV2Vic29ja2V0IHtcclxuICAgIGNvbnN0cnVjdG9yKHNlcnZlcikge1xyXG4gICAgICAgIHRoaXMuU29ja2V0SW5pdChzZXJ2ZXIpO1xyXG4gICAgfVxyXG4gICAgU29ja2V0SW5pdChzZXJ2ZXIpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgSW5pdGFsaXppbmcgd2Vic29ja2V0YCk7XHJcbiAgICAgICAgdGhpcy5pbyA9IHJlcXVpcmUoXCJzb2NrZXQuaW9cIikoc2VydmVyLCB7XHJcbiAgICAgICAgICAgIGNvcnM6IHtcclxuICAgICAgICAgICAgICAgIG9yaWdpbjogXCIqXCIsXHJcbiAgICAgICAgICAgICAgICBtZXRob2RzOiBbXCJHRVRcIiwgXCJQT1NUXCJdLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuaW8ub24oXCJjb25uZWN0aW9uXCIsIHNvY2tldCA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuU29ja2V0KHNvY2tldCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBTb2NrZXQoc29ja2V0KSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJOZXcgY2xpZW50IGNvbm5lY3RlZC5cIik7XHJcbiAgICAgICAgc29ja2V0Lm9uKFwiZGlzY29ubmVjdFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ2xpZW50IGRpc2Nvbm5lY3RlZFwiKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLldlYnNvY2tldCA9IFdlYnNvY2tldDtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy52ZWhpY2xlU3RhdGUgPSB2b2lkIDA7XHJcbnZhciB2ZWhpY2xlU3RhdGU7XHJcbihmdW5jdGlvbiAodmVoaWNsZVN0YXRlKSB7XHJcbiAgICB2ZWhpY2xlU3RhdGVbXCJPTlJPVVRFXCJdID0gXCJPTlJPVVRFXCI7XHJcbiAgICB2ZWhpY2xlU3RhdGVbXCJFTkRFRFwiXSA9IFwiRU5ERURcIjtcclxuICAgIHZlaGljbGVTdGF0ZVtcIkRFUEFSVFVSRVwiXSA9IFwiREVQQVJUVVJFXCI7XHJcbiAgICB2ZWhpY2xlU3RhdGVbXCJJTklUXCJdID0gXCJJTklUXCI7XHJcbiAgICB2ZWhpY2xlU3RhdGVbXCJERUxBWVwiXSA9IFwiREVMQVlcIjtcclxuICAgIHZlaGljbGVTdGF0ZVtcIk9OU1RPUFwiXSA9IFwiT05TVE9QXCI7XHJcbiAgICB2ZWhpY2xlU3RhdGVbXCJBUlJJVkFMXCJdID0gXCJBUlJJVkFMXCI7XHJcbn0pKHZlaGljbGVTdGF0ZSA9IGV4cG9ydHMudmVoaWNsZVN0YXRlIHx8IChleHBvcnRzLnZlaGljbGVTdGF0ZSA9IHt9KSk7XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImRvdGVudlwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZXhwcmVzc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZmFzdC14bWwtcGFyc2VyXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJmc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiaHR0cHNcIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIm1vbmdvb3NlXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzb2NrZXQuaW9cIik7OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInplcm9tcVwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiemxpYlwiKTs7IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIHN0YXJ0dXBcbi8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuLy8gVGhpcyBlbnRyeSBtb2R1bGUgaXMgcmVmZXJlbmNlZCBieSBvdGhlciBtb2R1bGVzIHNvIGl0IGNhbid0IGJlIGlubGluZWRcbnZhciBfX3dlYnBhY2tfZXhwb3J0c19fID0gX193ZWJwYWNrX3JlcXVpcmVfXyhcIi4vc3JjL21haW4udHNcIik7XG4iXSwic291cmNlUm9vdCI6IiJ9