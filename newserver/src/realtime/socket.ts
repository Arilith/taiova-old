/* eslint @typescript-eslint/no-var-requires: "off" */
import { Bus } from "../types/Bus";
import { Server } from 'https';
import { Socket } from 'socket.io';
import { SmallBus } from "../types/socket/Bus";
import { BusController } from "../controllers/buscontroller";
import { CreateBufferFromVehicles } from '../config/SocketConverter'
import { Server as SocketServer } from 'socket.io'
import { BusLogic } from "../logic/BusLogic";
export class Websocket {
  
  public io : SocketServer;
  private _busController : BusController;
  constructor(server : Server) {
    this.SocketInit(server);
  }

  async SocketInit(server : Server) {
    console.log(`Initalizing websocket`)

    this.io = require("socket.io")();

    this.io.attach(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      }
    })

    this.io.on("connection", socket => {
      socket.on('room', room => {
        socket.join(room);
        console.log(`New client connected to room: ${room}.`);
      })
      
      socket.on("disconnect", () => {
        console.log("Client disconnected");
        //clearInterval(interval);
      })
    })
  }



  

  Emit(room : string) {
    setTimeout(() => {
      new BusLogic().GetAllBusses(true).then((vehicles : SmallBus[]) => this.io.to(room).emit("ovdata", CreateBufferFromVehicles(vehicles)))
        //Small delay to make sure the server catches up.
    }, 100)
  }

  // EmitBikes() {
  //   .GetAllVehiclesSmall().then((bikes) => this.io.to("bikes").emit("bikes", this.CreateBufferFromBikes(bikes)))
  // }

}