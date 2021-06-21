import { VehicleData } from "./types/VehicleData";
import { Server } from 'https';
import { Socket } from 'socket.io';
import { Database } from './database';
import { WebsocketVehicleData } from "./types/WebsocketVehicleData";

const bus_update_rate = parseInt(process.env.APP_BUS_UPDATE_DELAY);

export class Websocket {
  
  private io : Socket;
  private activeSocket : Socket;
  private db : Database;

  constructor(server : Server, db : Database) {
    this.SocketInit(server);
    this.db = db;
  }

  async SocketInit(server : Server) {
    console.log(`Initalizing websocket`)

    this.io = require("socket.io")(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    this.io.on("connection", socket => {
      this.Socket(socket);
    })
  }

  Socket(socket : Socket) {
    this.activeSocket = socket;
    console.log("New client connected.");

    // const interval = setInterval(() => {
    //       //console.log("Emitting new data.");
    //       this.db.GetAllVehicles().then((vehicles) => {
    //         socket.emit("ovdata", vehicles);
    //       })
    // }, bus_update_rate);

    socket.on("disconnect", () => {
      console.log("Client disconnected");
      //clearInterval(interval);
    })
  }

  SendDeletedVehicles(vehicles : Array<VehicleData>) : void {
    this.io.emit("deletedVehicles", vehicles);
  }

  CreateBufferFromVehicles(vehicles) { 
    let buf = Buffer.alloc((4 + 4 + 4 + 15) * vehicles.length)
    vehicles.forEach((vehicle : WebsocketVehicleData, index) => {
      buf.writeFloatBE(vehicle.p[0], index * 27)
      buf.writeFloatBE(vehicle.p[1], index * 27 + 4)
      buf.writeUInt32BE(vehicle.v, index * 27 + 4 + 4)
      buf.write(`${vehicle.c}|${vehicle.n}`, index * 27 + 4 + 4 + 4)
      for(let i = 0; i < 15 - (vehicle.c.length + 1 + vehicle.n.length); i++) {
        buf.writeUInt8(0, index * 27 + 4 + 4 + 4 + vehicle.c.length + 1 + vehicle.n.length)
      }
    })

    return buf;
  }

  Emit() {
    //Small delay to make sure the server catches up.
    setTimeout(() => {
      this.db.GetAllVehiclesSmall().then((vehicles) => this.io.emit("ovdata", this.CreateBufferFromVehicles(vehicles)))
    }, 100)
  }

}