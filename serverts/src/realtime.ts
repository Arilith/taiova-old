import { VehicleData } from "./types/VehicleData";
import { gunzip } from 'zlib';
import { Converter } from './converter';
import * as xml from 'fast-xml-parser';

const zmq = require('zeromq');

export class OVData {
  
  private sock;

  constructor() {
    this.Init();
  }

  private static instance : OVData;
  
  public static getInstance(): OVData {
    if(!OVData.instance)
    OVData.instance = new OVData();

    return OVData.instance;
  }

  public Init() {
    const converter = new Converter();

    this.sock = zmq.socket("sub");

    this.sock.connect("tcp://pubsub.ndovloket.nl:7658");
    this.sock.subscribe("/ARR/KV6posinfo");

    this.sock.on("message", (opCode, ...content) => {
      console.log(opCode.toString());

      const contents = Buffer.concat(content);

      gunzip(contents, (error, buffer) => {
        if(error) return console.error(`Something went wrong while trying to unzip. ${error}`)
        
        const encodedXML = buffer.toString();
        const decoded = xml.parse(encodedXML);

        console.log(converter.convertKV6ToJson(decoded));

      })

    })
  }

  public convertToVehicleData (json : JSON) : VehicleData {

    return null;
  }

}