/* --------------------
        IMPORTS
----------------------*/
const express = require('express')
const zmq = require('zeromq')
const zlib = require('zlib')
const mongoose = require('mongoose')
const xml = require('fast-xml-parser')
const fs = require('fs')
const io = require("socket.io")(3001, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });
const http = require("http");
const convert = require('./convertToLatLong')

/* --------------------
        CONSTANTS
----------------------*/
const app = express()
const port = process.env.port || 5000
const sock = zmq.socket('sub');
const router = express.Router();

/* --------------------
    DATABASE CONFIG
----------------------*/
let db
let vehicleSchema
let vehicleModel

/* --------------------
    APP CONFIG
----------------------*/
const refreshRateInMilliseconds = 5000;

const addVehicleToDatabase = vehicle => {

    const newVehicle = new vehicleModel({
        vehicleId: vehicle.vehiclenumber,
        vehicleData: {...vehicle, position: convert.rd2wgs(vehicle["rd-x"], vehicle["rd-y"])}
    })

    newVehicle.save(error => {
        if(error) console.error(error)
    })
}

const findVehicle = async vehicleId => {
    return await vehicleModel.find({ vehicleId: vehicleId })
}

const getAllVehicles = async () => {
    return await vehicleModel.find({})
}

const writeVehiclePositionToDatabase = (vehicleToUpdate, updatedVehicleData) => {
    vehicleToUpdate.vehicleData = updatedVehicleData
    vehicleToUpdate.save().then(savedDoc => {
        vehicleToUpdate === savedDoc ? null : console.log("Error updating vehicle")
    });

}

const ovInit = () => {

    console.log("Starting OV socket.")

    sock.connect('tcp://pubsub.ndovloket.nl:7658')
    sock.subscribe('/ARR/KV6posinfo')
    
    sock.on('message', function () {
        const message = Array.prototype.slice.call(arguments)
       
        address = message[0].toString()
        var contents = Buffer.concat(message.slice(1));
       
        zlib.gunzip(contents, (err, buffer) => {
            if (err) {
                console.error(err);
                return;
            }
            const result = buffer.toString();
            const json = xml.parse(result)            
            const vehiclesOnRoute = json.VV_TM_PUSH.KV6posinfo.ONROUTE;

            Array.isArray(vehiclesOnRoute) && vehiclesOnRoute.map(vehicleData => {
                const vehicleId = vehicleData.vehiclenumber;

                findVehicle(vehicleId).then(data => {
                    vehicleData = {
                        position: convert.rd2wgs(vehicleData["rd-x"], vehicleData["rd-y"]),
                        ...vehicleData
                    }
                    if(data.length == 0) {
                        console.log(`No vehicle with id ${vehicleId} found in database! Adding...`)
                        addVehicleToDatabase(vehicleData)
                    } else {
                        console.log(`Vehicle with id ${vehicleId} found in database! Updating...`)
                        writeVehiclePositionToDatabase(data[0], vehicleData)
                        
                    }
                })
            })

            //emit()

            //TODO: Fix empty parses.

        });
    
    });
}

const databaseInit = (url, databaseName) => {

    console.log(`Connecting to database with name: ${databaseName} at url: ${url}`)

    mongoose.connect(`${url}/${databaseName}`, { useNewUrlParser: true, useUnifiedTopology: true });
    db = mongoose.connection;

    db.on('error', console.error.bind(console, 'Connection error:'));
    db.once('open', () => {
        console.log('Connection to database established.')

        vehicleSchema = new mongoose.Schema({
            vehicleId: Number,
            vehicleData: Object
        })

        vehicleModel = mongoose.model('Vehicle Position', vehicleSchema);

        ovInit();
    })

    

}


databaseInit('mongodb://localhost:27017', 'ov-info');

io.on("connection", (socket) => {
    console.log("New client connected");

    const interval = setInterval(() => {
        console.log("Emitting new data.")

        getAllVehicles().then(vehicles => {
            socket.emit("ovdata", vehicles)
        })

    }, refreshRateInMilliseconds);

    socket.on("disconnect", () => {
      console.log("Client disconnected");
      clearInterval(interval)
    });


});


app.get('/', (req, res) => res.send('Hello Worlds!'))

app.listen(port, () => console.log(`Listening at http://localhost:${port}`))