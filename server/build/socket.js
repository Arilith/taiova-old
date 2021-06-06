"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Websocket = void 0;
const bus_update_rate = parseInt(process.env.APP_BUS_UPDATE_DELAY);
class Websocket {
    constructor(server, db) {
        this.SocketInit(server);
        this.db = db;
    }
    async SocketInit(server) {
        console.log(`Initalizing websocket`);
        this.io = require("socket.io")(server, {
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
            //console.log("Emitting new data.");
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
//# sourceMappingURL=socket.js.map