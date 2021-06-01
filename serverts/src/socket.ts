import { VehicleData } from "./types/VehicleData";
import { Server } from 'https';
import { Socket } from 'socket.io';

export class Websocket {
  
  private io;

  constructor(server : Server) {
    this.SocketInit(server);
  }

  SocketInit(server : Server) {
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
    console.log("New client connected.");

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    })

  }

}