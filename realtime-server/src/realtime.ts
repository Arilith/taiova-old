import { VehicleData } from "./types/VehicleData";
import { gunzip } from 'zlib';
import { Converter } from './converter';
import { BusLogic } from "./buslogic";

import * as xml from 'fast-xml-parser';
import { Websocket } from "./socket";

const zmq = require('zeromq');
const doLogging = process.env.APP_DO_LOGGING == "true" ? true : false;
export class OVData {
  
  private sock;
  private kv78socket;
  private busLogic : BusLogic;
  private websocket : Websocket;

  constructor(database, socket : Websocket) {
    this.websocket = socket;
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
    this.sock.subscribe("/SYNTUS/KV6posinfo");
    this.sock.subscribe("/OPENOV/KV6posinfo");
    this.sock.subscribe("/GVB/KV6posinfo");
    this.sock.subscribe("/DITP/KV6posinfo");

    this.sock.on("message", (opCode, ...content) => {
      const contents = Buffer.concat(content);
      const operator = opCode.toString();
      gunzip(contents, async(error, buffer) => {
        if(error) return console.error(`Something went wrong while trying to unzip. ${error}`)
        
        const encodedXML = buffer.toString();
        const decoded = xml.parse(encodedXML);
        let vehicleData;

        

        if(operator !== "/KEOLIS/KV6posinfo" || operator !== "/GVB/KV6posinfo") 
          vehicleData = converter.decode(decoded);
        else
          vehicleData = converter.decode(decoded, true);
                 
        await this.busLogic.UpdateBusses(vehicleData);
                
      })

    })
    
    setInterval(() => {
      this.websocket.Emit();
    }, parseInt(process.env.APP_BUS_UPDATE_DELAY))
    
    // this.kv78socket = zmq.socket("sub");
    // this.kv78socket.connect("tcp://pubsub.ndovloket.nl:7817");
    // this.kv78socket.subscribe("/")
    // this.kv78socket.on("message", (opCode, ...content) => {
    //   const contents = Buffer.concat(content);
    //   gunzip(contents, async(error, buffer) => { 
    //     console.log(buffer.toString('utf8'))
    //   });
    // });
  }

  
}