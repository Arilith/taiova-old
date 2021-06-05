import { VehicleData } from "./types/VehicleData";
import { Server } from 'https';
import { Socket } from 'socket.io';
import { Database } from './database';

const bus_update_rate = parseInt(process.env.APP_BUS_UPDATE_DELAY);

export class Websocket {
  
  private io : Socket;
  private activeSocket : Socket;
  private db : Database;

  constructor(server : Server) {
    this.SocketInit(server);
  }

  async SocketInit(server : Server) {
    this.db = await Database.getInstance().Init().then();
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

    const interval = setInterval(() => {
          console.log("Emitting new data.");
          this.db.GetAllVehicles().then((vehicles) => {
            socket.emit("ovdata", vehicles);
          })
    }, bus_update_rate);

    socket.on("disconnect", () => {
      console.log("Client disconnected");
      clearInterval(interval);
    })
  }

  SendDeletedVehicles(vehicles : Array<VehicleData>) : void {
    this.io.emit("deletedVehicles", vehicles);
  }
}