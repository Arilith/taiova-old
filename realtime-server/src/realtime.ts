import { gunzip } from 'zlib';
import { Converter } from './converter';
import { BusLogic } from "./buslogic";

import * as xml from 'fast-xml-parser';
import { Websocket } from "./socket";

import * as fs from 'fs';
import { Database } from './database';

// const zmq = require('zeromq');
import * as zmq from 'zeromq';
import { VehicleData } from './types/VehicleData';
export class OVData {
  
  private busSocket : zmq.Socket;
  private trainSocket : zmq.Socket;
  //private kv78socket;
  private busLogic : BusLogic;
  private websocket : Websocket;

  constructor(database : Database, socket : Websocket) {
    this.websocket = socket;
    this.Init();
    this.busLogic = new BusLogic(database, false);
  }

  public Init() {

    const converter = new Converter();

    this.busSocket = zmq.socket("sub");
    // this.trainSocket = zmq.socket("sub");
    
    this.busSocket.connect("tcp://pubsub.ndovloket.nl:7658");
    this.busSocket.subscribe("/ARR/KV6posinfo");
    this.busSocket.subscribe("/CXX/KV6posinfo");
    this.busSocket.subscribe("/DITP/KV6posinfo");
    this.busSocket.subscribe("/EBS/KV6posinfo");
    this.busSocket.subscribe("/GVB/KV6posinfo");
    this.busSocket.subscribe("/OPENOV/KV6posinfo");
    this.busSocket.subscribe("/QBUZZ/KV6posinfo");
    this.busSocket.subscribe("/RIG/KV6posinfo");
    this.busSocket.subscribe("/KEOLIS/KV6posinfo");

    this.busSocket.on("message", (opCode : any, ...content : any) => {
      const contents = Buffer.concat(content);
      const operator = opCode.toString();
      gunzip(contents, async(error, buffer) => {
        if(error) return console.error(`Something went wrong while trying to unzip. ${error}`)
        
        const encodedXML = buffer.toString();
        const decoded = xml.parse(this.removeTmi8(encodedXML));
        
        let vehicleData : Array<VehicleData> = converter.decode(decoded, operator);
        

        await this.busLogic.UpdateBusses(vehicleData);
                
      })

    })
    
    
    // this.trainSocket.connect("tcp://pubsub.ndovloket.nl:7664");
    // this.trainSocket.subscribe("/RIG/InfoPlusVTBSInterface5");
    // this.trainSocket.subscribe("/RIG/InfoPlusVTBLInterface5");

    // this.trainSocket.on("message", (opCode : any, ...content : any) => {
    //   const contents = Buffer.concat(content);
    //   const operator = opCode.toString();
    //   console.log(operator);
    //   gunzip(contents, async(error, buffer) => {
    //     if(error) return console.error(`Something went wrong while trying to unzip. ${error}`)

    //     const encodedXML = buffer.toString();
    //     const decoded = xml.parse(this.removeTmi8(encodedXML));

    //     fs.writeFile("InfoPlusVTBSInterface5.json", JSON.stringify(decoded), () => {})
    //     // console.log(decoded)
    //     // let vehicleData : Array<VehicleData> = converter.decode(decoded, operator);
        
    //     // await this.busLogic.UpdateBusses(vehicleData);
                
    //   })

    // })

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

  removeTmi8 (data) : any {
    return data.replace(/tmi8:/g, "");
  }
}