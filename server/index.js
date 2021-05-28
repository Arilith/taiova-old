/* --------------------
        IMPORTS
----------------------*/
const express = require("express");
const zmq = require("zeromq");
const zlib = require("zlib");
const axios = require("axios");
const mongoose = require("mongoose");
const xml = require("fast-xml-parser");
const fs = require("fs");
const io = require("socket.io")(3001, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const http = require("http");
const convert = require("./convertToLatLong");
const BusInformation = require("./api/GTFSConvert");
const trips = require("./api/Trips");
/* --------------------
        CONSTANTS
----------------------*/
const app = express();
const port = process.env.port || 5000;
const sock = zmq.socket("sub");
const router = express.Router();

/* --------------------
    DATABASE CONFIG
----------------------*/
let db;
let vehicleSchema;
let vehicleModel;

/* --------------------
    APP CONFIG
----------------------*/
const refreshRateInMilliseconds = 2000;

const addVehicleToDatabase = (vehicle) => {
  findVehicle(vehicle.vehicleNumber).then((result) => {
    if (result != []) return;
  });

  const newVehicle = new vehicleModel({
    vehicleData: vehicle,
    vehicleId: vehicle.vehicleNumber,
    type: vehicle.status,
  });

  newVehicle.save((error) => {
    if (error) console.error(error);
  });
};

const findVehicle = async (vehicleId, company) => {
  return await vehicleModel.find({
    vehicleId: vehicleId,
    "vehicleData.company": company,
  });
};

const getAllVehicles = async () => {
  return await vehicleModel.find({ type: { $ne: "END" } });
};

const updateVehicle = (vehicleToUpdate, updatedVehicleData) => {
  const oldPos = vehicleToUpdate.vehicleData.position;
  vehicleToUpdate.vehicleData = updatedVehicleData;
  vehicleToUpdate.type = updatedVehicleData.status;

  if (vehicleToUpdate.vehicleData.status != "ONROUTE")
    vehicleToUpdate.vehicleData.position = oldPos;

  vehicleToUpdate.save().then((savedDoc) => {
    vehicleToUpdate === savedDoc ? null : console.log("Error updating vehicle");
  });
};

const convertJSONToDatabaseData = (json) => {
  const kv6posinfo = json.VV_TM_PUSH.KV6posinfo;

  const busses = [];
  kv6posinfo != undefined &&
    Object.entries(kv6posinfo).forEach(([key, value]) => {
      //If is an array of objects
      if (value[1] !== undefined) {
        value.map((busData) => {
          const timeStamp = new Date(busData.timestamp);
          const position = busData["rd-x"]
            ? convert.rd2wgs(busData["rd-x"], busData["rd-y"])
            : "0, 0";

          busses.push({
            company: busData.dataownercode,
            planningNumber: busData.lineplanningnumber,
            journeyNumber: busData.journeynumber,
            timestamp: timeStamp.getTime(),
            vehicleNumber: busData.vehiclenumber,
            position: position,
            status: key,
          });
        });
        //If is single object
      } else {
        const timeStamp = new Date(value.timestamp);
        const position = value["rd-x"]
          ? convert.rd2wgs(value["rd-x"], value["rd-y"])
          : "0, 0";

        busses.push({
          company: value.dataownercode,
          planningNumber: value.lineplanningnumber,
          journeyNumber: value.journeynumber,
          timestamp: timeStamp.getTime(),
          vehicleNumber: value.vehiclenumber,
          position: position,
          status: key,
        });
      }
    });

  return busses;
};

const cutOffTmi8 = (json) => {
  let stringJson = JSON.stringify(json);
  stringJson = stringJson.replace(/tmi8:/g, "");

  return JSON.parse(stringJson);
};

const ovInit = () => {
  console.log("Starting OV socket.");

  sock.connect("tcp://pubsub.ndovloket.nl:7658");
  sock.subscribe("/ARR/KV6posinfo");
  sock.subscribe("/CXX/KV6posinfo");
  sock.subscribe("/EBS/KV6posinfo");
  sock.subscribe("/QBUZZ/KV6posinfo");
  sock.subscribe("/RIG/KV6posinfo");
  sock.subscribe("/KEOLIS/KV6posinfo");

  // sock.subscribe("/GVB/KV6posinfo"); // ALL OBJECTS INSIDE OBJECT ;(
  // sock.subscribe("/OPENOV/KV6posinfo"); // ALL POSITIONS -1 -1

  sock.on("message", function () {
    const message = Array.prototype.slice.call(arguments);
    address = message[0].toString();
    var contents = Buffer.concat(message.slice(1));

    zlib.gunzip(contents, (err, buffer) => {
      if (err) {
        console.error(err);
        return;
      }
      const result = buffer.toString();
      //                    //
      // UNCOMMENT TO DEBUG //
      // console.log(JSON.stringify(xml.parse(result)) || "Niets");
      const json = cutOffTmi8(xml.parse(result));
      const databaseData = convertJSONToDatabaseData(json);

      databaseData.map((bus) => {
        const vehicleNumber = bus.vehicleNumber;
        let company = bus.company;

        //DE ULTIEME HACK
        company == "RIG" ? (company = "RET") : company;

        if (vehicleNumber === undefined) return;
        findVehicle(vehicleNumber, company).then((result) => {
          if (result.length == 0) {
            console.log(
              `No vehicle found with id ${vehicleNumber} and company: ${company}.  Adding...`
            );
            addVehicleToDatabase(bus);
          } else if (result.length == 1) {
            console.log(
              `Vehicle found with id ${vehicleNumber} and company: ${company}. Updating...`
            );
            updateVehicle(result[0], bus);
          }
        });
      });
    });
  });
};

const databaseInit = (url, databaseName) => {
  console.log(
    `Connecting to database with name: ${databaseName} at url: ${url}`
  );

  mongoose.connect(`${url}/${databaseName}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  db = mongoose.connection;

  db.on("error", console.error.bind(console, "Connection error:"));
  db.once("open", () => {
    console.log("Connection to database established.");

    vehicleSchema = new mongoose.Schema({
      vehicleId: Number,
      vehicleData: Object,
      type: String,
    });

    vehicleModel = mongoose.model("VehiclePositions", vehicleSchema);

    ovInit();
    //BusInformation.busApiInit();
    // trips.databaseInit(db);
  });
};

databaseInit("mongodb://localhost:27017", "taiova");

io.on("connection", (socket) => {
  console.log("New client connected");

  const interval = setInterval(() => {
    console.log("Emitting new data.");

    getAllVehicles().then((vehicles) => {
      socket.emit("ovdata", vehicles);
    });
  }, refreshRateInMilliseconds);

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    clearInterval(interval);
  });
});

app.get("/", (req, res) => res.send("Hello Worlds!"));

app.get("/busses/:company/:number/", (req, res) => {
  res.send("Hello world!" + JSON.stringify(req.params));
});

app.listen(port, () => console.log(`Listening at http://localhost:${port}`));
