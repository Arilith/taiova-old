import { gunzip } from 'zlib';
import { Converter } from './converter';

import * as xml from 'fast-xml-parser';
import { Websocket } from "./socket";

import * as zmq from 'zeromq';
import { Bus } from '../types/Bus';
import { BusLogic } from '../logic/BusLogic';
import { DatabaseBus } from '../database/models/bus';
export class BusSocket {
  
  private busSocket : zmq.Socket;
  private converter : Converter;
  private websocket : Websocket;

  private BusLogic : BusLogic;

  private companies : Array<string> = ["ARR", "CXX", "DITP", "EBS", "GVB", "OPENOV", "QBUZZ", "RIG", "KEOLIS"];
  constructor(socket : Websocket) {
    this.websocket = socket;
    this.converter = new Converter();
    this.BusLogic = new BusLogic();
    this.Init();
  }

  private SubToSockets() {
    this.busSocket = zmq.socket("sub");
    
    this.busSocket.connect("tcp://pubsub.ndovloket.nl:7658");

    for(const company of this.companies)
      this.busSocket.subscribe(`/${company}/KV6posinfo`);
  }

  private Init() {

    this.SubToSockets();

    this.busSocket.on("message", (opCode : any, ...content : any) => {
      const contents = Buffer.concat(content);
      const operator = opCode.toString();
      gunzip(contents, async(error, buffer) => {
        if(error) return console.error(`Something went wrong while trying to unzip. ${error}`)
        
        const encodedXML = buffer.toString();
        const decoded = xml.parse(this.converter.removeTmi8(encodedXML));
        
        const convertedBusses : Array<DatabaseBus> = this.converter.decode(decoded, operator);
        //Use this to debug the empty vehicles?
        //if(convertedBusses.length == 0) console.log(JSON.stringify(decoded));
        await this.BusLogic.CheckBusses(convertedBusses);     
      })

    })
    

    setInterval(() => {
      this.websocket.Emit("slow");
    }, parseInt(process.env.APP_BUS_UPDATE_DELAY_SLOW))
    setInterval(() => {
      this.websocket.Emit("normal");
    }, parseInt(process.env.APP_BUS_UPDATE_NORMAL))
    
    setInterval(() => {
      this.websocket.Emit("fast");
    }, parseInt(process.env.APP_BUS_UPDATE_DELAY_FAST))
    setInterval(() => {
      this.websocket.Emit("veryfast");
    }, parseInt(process.env.APP_BUS_UPDATE_DELAY_VERYFAST))
    setInterval(() => {
      this.websocket.Emit("superfast");
    }, parseInt(process.env.APP_BUS_UPDATE_DELAY_SUPERFAST))
  }


}