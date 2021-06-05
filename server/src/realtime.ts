import { VehicleData } from "./types/VehicleData";
import { gunzip } from 'zlib';
import { Converter } from './converter';
import { BusLogic } from "./buslogic";

import * as xml from 'fast-xml-parser';

const zmq = require('zeromq');
const doLogging = process.env.APP_DO_LOGGING == "true" ? true : false;
export class OVData {
  
  private sock;
  private busLogic : BusLogic;

  constructor(database) {
    this.Init();
    this.busLogic = new BusLogic(database, false);
  }

  public Init() {

    const converter = new Converter();

    this.sock = zmq.socket("sub");

    this.sock.connect("tcp://pubsub.ndovloket.nl:7658");
    this.sock.subscribe("/ARR/KV6posinfo");
    this.sock.subscribe("/CXX/KV6posinfo");
    this.sock.subscribe("/EBS/KV6posinfo");
    this.sock.subscribe("/QBUZZ/KV6posinfo");
    this.sock.subscribe("/RIG/KV6posinfo");
    this.sock.subscribe("/KEOLIS/KV6posinfo");

    this.sock.on("message", (opCode, ...content) => {
      const contents = Buffer.concat(content);

      gunzip(contents, (error, buffer) => {
        if(error) return console.error(`Something went wrong while trying to unzip. ${error}`)
        
        const encodedXML = buffer.toString();
        const decoded = xml.parse(encodedXML);

        const vehicleData = converter.decode(decoded);
        
        this.busLogic.UpdateBusses(vehicleData);

      })

    })
  }

}