/* --------------------
        IMPORTS
----------------------*/
const { Database } = require('./database');

const express = require("express");
const http = require("http");
const zmq = require("zeromq");
const zlib = require("zlib");
const xml = require("fast-xml-parser");
const fs = require("fs");
let app = (module.exports = express());
let https = require("https");

/* --------------------
        CUSTOM
----------------------*/
const convert = require("./convertToLatLong");
const BusInformation = require("./api/GTFSConvert");
const trips = require("./api/Trips");

/* --------------------
        CONSTANTS
----------------------*/
const port = process.env.port || 3001;
const sock = zmq.socket("sub");
const router = express.Router();


/* --------------------
      SSL CONFIG
----------------------*/
const privateKey = fs.readFileSync("key.key").toString();
const certificate = fs.readFileSync("cert.crt").toString();
const ca = fs.readFileSync("key-ca.crt").toString();

/* --------------------
    APP CONFIG
----------------------*/
const server = https.createServer(
  {
    key: privateKey,
    cert: certificate,
    ca: ca,
    requestCert: true,
    rejectUnauthorized: false,
  },
  app
);

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

server.listen(port);

const refreshRateInMilliseconds = 5000;

/* -----------------------
        Application
-------------------------*/
const db = new Database("mongodb://localhost:27017", "taiova");

;(async() => {
  await db.InitializeDatabase();
  console.log(await db.GetAllVehicles({type: { $ne: "END" }}))
  
  

})();

console.log("This runs before.")



// const updateVehicle = (vehicleToUpdate, updatedVehicleData) => {
//   const oldPos = vehicleToUpdate.vehicleData.position;
//   vehicleToUpdate.vehicleData = updatedVehicleData;
//   vehicleToUpdate.type = updatedVehicleData.status;

//   if (vehicleToUpdate.vehicleData.status != "ONROUTE")
//     vehicleToUpdate.vehicleData.position = oldPos;

//   vehicleToUpdate.save().then((savedDoc) => {
//     vehicleToUpdate === savedDoc ? null : console.log("Error updating vehicle");
//   });
// };

// const convertJSONToDatabaseData = (json) => {
//   const kv6posinfo = json.VV_TM_PUSH.KV6posinfo;

//   const busses = [];
//   kv6posinfo != undefined &&
//     Object.entries(kv6posinfo).forEach(([key, value]) => {
//       //If is an array of objects
//       if (value[1] !== undefined) {
//         value.map((busData) => {
//           const timeStamp = new Date(busData.timestamp);
//           const position = busData["rd-x"]
//             ? convert.rd2wgs(busData["rd-x"], busData["rd-y"])
//             : "0, 0";

//           busses.push({
//             company: busData.dataownercode,
//             planningNumber: busData.lineplanningnumber,
//             journeyNumber: busData.journeynumber,
//             timestamp: timeStamp.getTime(),
//             vehicleNumber: busData.vehiclenumber,
//             position: position,
//             status: key,
//           });
//         });
//         //If is single object
//       } else {
//         const timeStamp = new Date(value.timestamp);
//         const position = value["rd-x"]
//           ? convert.rd2wgs(value["rd-x"], value["rd-y"])
//           : "0, 0";

//         busses.push({
//           company: value.dataownercode,
//           planningNumber: value.lineplanningnumber,
//           journeyNumber: value.journeynumber,
//           timestamp: timeStamp.getTime(),
//           vehicleNumber: value.vehiclenumber,
//           position: position,
//           status: key,
//         });
//       }
//     });

//   return busses;
// };

// const cutOffTmi8 = (json) => {
//   let stringJson = JSON.stringify(json);
//   stringJson = stringJson.replace(/tmi8:/g, "");

//   return JSON.parse(stringJson);
// };

// const ovInit = () => {
//   console.log("Starting OV socket.");

//   sock.connect("tcp://pubsub.ndovloket.nl:7658");
//   sock.subscribe("/ARR/KV6posinfo");
//   sock.subscribe("/CXX/KV6posinfo");
//   sock.subscribe("/EBS/KV6posinfo");
//   sock.subscribe("/QBUZZ/KV6posinfo");
//   sock.subscribe("/RIG/KV6posinfo");
//   sock.subscribe("/KEOLIS/KV6posinfo");

//   // sock.subscribe("/GVB/KV6posinfo"); // ALL OBJECTS INSIDE OBJECT ;(
//   // sock.subscribe("/OPENOV/KV6posinfo"); // ALL POSITIONS -1 -1

//   sock.on("message", message => {
    const message = Array.prototype.slice.call(arguments);
    address = message[0].toString();
    var contents = Buffer.concat(message.slice(1));

//     zlib.gunzip(contents, (err, buffer) => {
//       if (err) {
//         console.error(err);
//         return;
//       }
//       const result = buffer.toString();
//       //                    //
//       // UNCOMMENT TO DEBUG //
//       // console.log(JSON.stringify(xml.parse(result)) || "Niets");
//       const json = cutOffTmi8(xml.parse(result));
//       const databaseData = convertJSONToDatabaseData(json);

//       databaseData.map((bus) => {
//         const vehicleNumber = bus.vehicleNumber;
//         let company = bus.company;

//         //DE ULTIEME HACK
//         company == "RIG" ? (company = "RET") : company;

//         if (vehicleNumber === undefined) return;
//         findVehicle(vehicleNumber, company).then((result) => {
//           if (result.length == 0) {
//             // console.log(
//             //   `No vehicle found with id ${vehicleNumber} and company: ${company}.  Adding...`
//             // );
//             addVehicleToDatabase(bus);
//           } else if (result.length == 1) {
//             // console.log(
//             //   `Vehicle found with id ${vehicleNumber} and company: ${company}. Updating...`
//             // );
//             updateVehicle(result[0], bus);
//           }
//         });
//       });
//     });
//   });
// };


// if(database != null) {
//   ovInit();
// }

// io.on("connection", (socket) => {
//   console.log("New client connected");

//   const interval = setInterval(() => {
//     console.log("Emitting new data.");

//     getAllVehicles().then((vehicles) => {
//       socket.emit("ovdata", vehicles);
//     });
//   }, refreshRateInMilliseconds);

//   socket.on("disconnect", () => {
//     console.log("Client disconnected");
//     clearInterval(interval);
//   });
// });

// app.get("/", (req, res) => res.send("Hello Worlds!"));

// app.get("/busses/:company/:number/", (req, res) => {
//   res.send("Hello world!" + JSON.stringify(req.params));
// });

// app.listen(port, () => console.log(`Listening at http://localhost:${port}`));
